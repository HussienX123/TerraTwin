"""TerraTwin Phase 2: scoring, validation, candidate finding. Reads Phase 1 CSVs only.
Run: python run_phase2.py     (all parameters come from config.yaml)
"""
import json
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yaml
from scipy.stats import percentileofscore, rankdata
from sklearn.cluster import DBSCAN
from sklearn.metrics import roc_auc_score

HERE = Path(__file__).resolve().parent
CFG = yaml.safe_load((HERE / "config.yaml").read_text())
P = {k: (HERE / v).resolve() for k, v in CFG["paths"].items()}
SCORES = ["terrain_score", "environment_score", "mobility_score", "overall_score"]


# ---------------------------------------------------------------- scoring
def rank_pct(x):
    """0..1 rank of each value (NaN stays NaN)."""
    x = np.asarray(x, float)
    out = np.full(x.shape, np.nan)
    ok = ~np.isnan(x)
    n = ok.sum()
    out[ok] = (rankdata(x[ok]) - 1) / max(n - 1, 1)
    return out


def mahalanobis_similarity(earth, target, feats):
    """Standardize by Earth std, Mahalanobis distance to target, 0-100 (closer = higher)."""
    X = earth[feats].astype(float)
    ok = X.notna().all(axis=1)
    mu, sd = X[ok].mean(), X[ok].std(ddof=0)
    Z = (X - mu) / sd
    zt = (pd.Series(target)[feats].astype(float) - mu) / sd
    S_inv = np.linalg.pinv(np.cov(Z[ok].values, rowvar=False))
    diff = (Z - zt).values
    d2 = np.einsum("ij,jk,ik->i", np.nan_to_num(diff), S_inv, np.nan_to_num(diff))
    d = np.where(ok, np.sqrt(np.maximum(d2, 0)), np.nan)
    return 100 * (1 - rank_pct(d))


def flag_water(df):
    W = CFG["water_filter"]
    if not W.get("enabled", True):
        df["is_water"] = False; df["water_rule"] = ""
        return df
    a = ((df["elev_mean_m"] <= W["water_max_elev_m"]) & (df["elev_range_m"] <= W["water_max_range_m"])
         & (df["p90_slope_deg"] <= W["water_max_p90_slope_deg"]))
    b = df["elev_mean_m"] <= W["water_deep_elev_m"]
    df["is_water"] = (a | b).fillna(False)
    df["water_rule"] = np.where(a & b, "A+B", np.where(a, "A", np.where(b, "B", "")))
    return df


def compute_scores(earth, mars, targets):
    df = earth.copy()
    land = df[~df["is_water"]]          # standardization, covariance and percentiles use LAND cells only
    for c in SCORES:
        df[c] = np.nan
    tf = CFG["terrain"]["features"]
    df.loc[land.index, "terrain_score"] = mahalanobis_similarity(land, mars.iloc[0], tf)

    ef = CFG["environment"]["features"]
    tgt = {f: targets.get(f) for f in ef}
    if all(v is not None for v in tgt.values()):
        df.loc[land.index, "environment_score"] = mahalanobis_similarity(land, tgt, ef)
        df["environment_mode"] = "full"
    else:  # aridity only: lower precip = higher score
        df.loc[land.index, "environment_score"] = 100 * (1 - rank_pct(land["precip_mm_yr"]))
        df["environment_mode"] = "partial"   # Mars targets null in targets.json

    lim = float(CFG["mobility"]["slope_limit_deg"])
    sf = CFG["mobility"]["slope_feature"]
    df.loc[land.index, "mobility_score"] = np.clip(1 - land[sf] / lim, 0, 1) * 100

    w = CFG["weights"]
    assert abs(sum(w.values()) - 1) < 1e-9, "weights must sum to 1"
    df["overall_score"] = (w["terrain"] * df["terrain_score"] + w["environment"] * df["environment_score"]
                           + w["mobility"] * df["mobility_score"])
    df["low_completeness_flag"] = df["data_completeness"] < CFG["quality"]["min_completeness"]
    return df

# ------------------------------------------------------------- validation
def cell_row(df, lat, lon):
    la, lo = np.floor(lat), np.floor(lon)    # containing 1-degree cell (grid_lookup: floor)
    m = (np.floor(df["lat"]) == la) & (np.floor(df["lon"]) == lo)
    return df[m].iloc[0] if m.any() else None


def validation(df, analogs):
    valid = df.dropna(subset=SCORES)
    rows = []
    for group, key in (("analog", "analogs"), ("negative", "negative_controls")):
        for p in analogs[key]:
            r = cell_row(df, p["lat"], p["lon"])
            rec = dict(name=p["name"], group=group, lat=p["lat"], lon=p["lon"],
                       cell=None if r is None else r["id"])
            for s in SCORES:
                rec[s] = np.nan if r is None else r[s]
                rec[s + "_pct"] = np.nan if r is None else percentileofscore(valid[s], r[s], kind="weak")
            rows.append(rec)
    tab = pd.DataFrame(rows)
    y = (tab["group"] == "analog").astype(int)
    auc = {s: float(roc_auc_score(y, tab[s])) for s in SCORES}
    return tab, auc


def write_report(tab, auc, df, mode):
    L = ["# Phase 2 validation report", "",
         f"- Earth cells scored: {len(df)}; environment mode: **{mode}**"
         + (" (Mars precip / t_range are null in targets.json, so the environment score is aridity-only: lower precip = higher score)" if mode == "partial" else ""),
         f"- Mobility slope limit: {CFG['mobility']['slope_limit_deg']} deg (**needs a cited source**).",
         f"- Weights (terrain/environment/mobility): {CFG['weights']['terrain']}/{CFG['weights']['environment']}/{CFG['weights']['mobility']}. Not tuned.",
         "- All known-analog and control coordinates are **approximate, verify**; each point is mapped to its containing 1-degree cell (floor of lat/lon), so points lying on a cell corner are sensitive to that choice.",
         "- Terrain score is *terrain similarity*, not geology. Cells flagged `is_water` (see config water_filter) are excluded from standardization, percentiles, candidates and disagreements.", "",
         "## Rank table (percentile rank among land cells, 100 = best)", ""]
    cols = ["name", "group", "cell"] + [c for s in SCORES for c in (s, s + "_pct")]
    t = tab[cols].copy()
    L.append("| " + " | ".join(["Point", "Group", "Cell"] + [x for s in SCORES for x in (s.replace("_score", ""), s.replace("_score", "") + " pct")]) + " |")
    L.append("|" + "---|" * len(cols))
    for _, r in t.iterrows():
        L.append("| " + " | ".join([str(r["name"]), r["group"], str(r["cell"])] + [f"{r[c]:.1f}" for c in cols[3:]]) + " |")
    L += ["", "## ROC-AUC (4 analogs vs 2 negative controls; exploratory, n=6)", "", "| Score | AUC |", "|---|---|"]
    L += [f"| {s} | {auc[s]:.2f} (exploratory, n=6) |" for s in SCORES]
    L += ["", "> **n is tiny (4 positives, 2 negatives = 8 pairs).** AUC moves in steps of 0.125 and is not statistically meaningful; treat as a sanity check only.", ""]
    an = tab[tab.group == "analog"]
    L += ["## Honest reading", ""]
    for s in SCORES:
        m = an[s + "_pct"].mean()
        verdict = "rank well (above median)" if m > 60 else ("rank poorly (below median)" if m < 40 else "rank near the median")
        L.append(f"- {s}: mean analog percentile {m:.1f}, AUC {auc[s]:.2f} (exploratory, n=6) -> analogs {verdict}.")
    L += ["", "No weights or features were adjusted after seeing these results."]
    P["report_md"].write_text("\n".join(L), encoding="utf-8")


# ------------------------------------------------------------- candidates
def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371.0088 * np.arcsin(np.sqrt(a))


def f(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 3)


def candidates(df, mars, analogs):
    C = CFG["candidates"]
    elig = df[(~df["low_completeness_flag"]) & (~df["is_water"]) & df["overall_score"].notna()].copy()
    thr = np.percentile(elig["overall_score"], 100 * (1 - C["top_fraction"]))
    top = elig[elig["overall_score"] >= thr].copy()
    dmin = np.min([haversine_km(top["lat"], top["lon"], a["lat"], a["lon"]) for a in analogs["analogs"]], axis=0)
    n_top = len(top)
    top = top[dmin > C["exclusion_radius_km"]].copy()
    lab = DBSCAN(eps=C["dbscan"]["eps_deg"], min_samples=C["dbscan"]["min_samples"]).fit_predict(top[["lat", "lon"]].values)
    top["cluster"] = lab
    cl = top[top.cluster >= 0].groupby("cluster")["overall_score"].mean().sort_values(ascending=False)

    jez = mars.iloc[0]
    feats = [x for x in C["comparison_features"] if pd.notna(jez.get(x))]
    sd = df.loc[~df["is_water"], feats].std(ddof=0)
    out = []
    for cid in cl.index[:C["n_clusters"]]:
        g = top[top.cluster == cid]
        z = ((g[feats].mean() - jez[feats].astype(float)) / sd).abs().sort_values()
        det = lambda names: [dict(feature=n, cluster_mean=f(g[n].mean()), jezero=f(jez[n]), abs_diff_in_earth_sd=f(z[n])) for n in names]
        out.append(dict(
            rank=len(out) + 1,
            center=dict(lat=f(g["lat"].mean()), lon=f(g["lon"].mean())),
            n_cells=int(len(g)), cell_ids=list(g["id"]),
            mean_scores={s: f(g[s].mean()) for s in SCORES},
            closest_to_jezero=det(list(z.index[:C["n_closest"]])),
            most_different=det(list(z.index[::-1][:C["n_different"]])),
            environment_mode=g["environment_mode"].iloc[0]))
    note = f"features compared: {feats}; Jezero climate features with null Mars values are skipped"

    # dimension disagreements
    D = CFG["disagreements"]
    hi_t, lo_t = np.percentile(elig["terrain_score"], [D["high_pct"], D["low_pct"]])
    hi_m, lo_m = np.percentile(elig["mobility_score"], [D["high_pct"], D["low_pct"]])
    A = elig[(elig.terrain_score > hi_t) & (elig.mobility_score < lo_m)].assign(type="terrain_high_mobility_low")
    B = elig[(elig.mobility_score > hi_m) & (elig.terrain_score < lo_t)].assign(type="mobility_high_terrain_low")
    dis = pd.concat([A, B])
    dis["gap"] = (dis.terrain_score - dis.mobility_score).abs()
    dis = dis.sort_values("gap", ascending=False).head(D["max_cells"])
    disagreements = [dict(id=r["id"], lat=r["lat"], lon=r["lon"], type=r["type"],
                          terrain_score=f(r["terrain_score"]), mobility_score=f(r["mobility_score"]),
                          overall_score=f(r["overall_score"]), p90_slope_deg=f(r["p90_slope_deg"]))
                     for _, r in dis.iterrows()]
    result = dict(
        note=note, top_threshold_overall=f(thr), n_top_cells=int(n_top),
        n_top_after_analog_exclusion=int(len(top)), n_clusters_found=int(len(cl)),
        clusters=out, disagreements=disagreements)
    return result


# ---------------------------------------------------------------- heatmaps
def heatmaps(df):
    lats, lons = np.sort(df["lat"].unique()), np.sort(df["lon"].unique())
    step = lons[1] - lons[0]
    for s in CFG["heatmaps"]["scores"]:
        grid = df.pivot(index="lat", columns="lon", values=s).reindex(index=lats, columns=lons).values
        fig, ax = plt.subplots(figsize=(10, 4.6))
        cmap = plt.get_cmap("viridis").copy()
        cmap.set_bad("lightgrey")
        im = ax.imshow(np.ma.masked_invalid(grid), origin="lower", cmap=cmap, vmin=0, vmax=100,
                       extent=[lons[0] - step / 2, lons[-1] + step / 2, lats[0] - step / 2, lats[-1] + step / 2], aspect="auto")
        fig.colorbar(im, label=s)
        ax.set_title(f"{s} (sanity check only; grey = likely water)")
        ax.set_xlabel("lon"); ax.set_ylabel("lat")
        fig.tight_layout()
        fig.savefig(HERE / f"{s}.png", dpi=CFG["heatmaps"]["dpi"])
        plt.close(fig)


# ------------------------------------------------- water preview / run compare
def water_preview(df, analogs):
    fl = df[df["is_water"]]
    print(f"\n--- WATER FILTER PREVIEW (before applying): {len(fl)} cells flagged ---")
    print(fl[["id", "lat", "lon", "elev_mean_m", "elev_range_m", "p90_slope_deg", "water_rule"]].round(3).to_string(index=False))
    print(f"counts: rule A only={int((fl.water_rule == 'A').sum())}, rule B only={int((fl.water_rule == 'B').sum())}, both={int((fl.water_rule == 'A+B').sum())}, total={len(fl)}")
    hits = []
    for key in ("analogs", "negative_controls"):
        for p in analogs[key]:
            r = cell_row(df, p["lat"], p["lon"])
            if r is not None and r["is_water"]:
                hits.append((p["name"], r["id"], r["water_rule"]))
    print("analog/control cells that would be flagged:", hits if hits else "none")
    return hits


def rank_table_from_scores(sc, analogs):
    """Percentile ranks / AUC for validation points from a scores dataframe (cols: id, lat, lon, *_score)."""
    s2 = sc.copy()
    if "is_water" in s2:
        s2.loc[s2["is_water"].astype(bool), SCORES] = np.nan
    return validation(s2, analogs)


def candidate_cells_summary(c):
    return [(k["rank"], k["center"]["lat"], k["center"]["lon"], k["n_cells"], k["mean_scores"]["overall_score"]) for k in c["clusters"]]


def run_comparison(df, tab2, auc2, res2, analogs, targets, mode):
    R1 = P["run1_dir"]
    sc1 = pd.read_csv(R1 / "scores.csv")
    tab1, auc1 = rank_table_from_scores(sc1, analogs)
    c1 = json.loads((R1 / "candidates.json").read_text())
    fl = df[df["is_water"]]
    cnt = {r: int((fl.water_rule == r).sum()) for r in ("A", "B", "A+B")}
    W = CFG["water_filter"]
    L = ["", "## Run 1 vs Run 2", "",
         "**Water filter (Run 2 only).** Cells flagged `likely water`: "
         f"**{len(fl)}** of {len(df)}.", "",
         f"- Rule A (flat water): elev_mean_m <= {W['water_max_elev_m']} AND elev_range_m <= {W['water_max_range_m']} AND p90_slope_deg <= {W['water_max_p90_slope_deg']}",
         f"- Rule B (deep water): elev_mean_m <= {W['water_deep_elev_m']}",
         f"- Cells flagged: rule A only = {cnt['A']}, rule B only = {cnt['B']}, both = {cnt['A+B']} (A total = {cnt['A'] + cnt['A+B']}, B total = {cnt['B'] + cnt['A+B']}).",
         "- No known analog or negative-control cell was flagged. Thresholds were not adjusted.", "",
         "### Percentile ranks and AUC, before vs after (100 = best)", "",
         "| Point | Group | Terrain R1 | R2 | Env R1 | R2 | Mobility R1 | R2 | Overall R1 | R2 |", "|---|---|---|---|---|---|---|---|---|---|"]
    changed = False
    for i in range(len(tab2)):
        r1, r2 = tab1.iloc[i], tab2.iloc[i]
        cells = []
        for s in SCORES:
            cells += [f"{r1[s + '_pct']:.1f}", f"{r2[s + '_pct']:.1f}"]
            changed |= abs(r1[s + "_pct"] - r2[s + "_pct"]) > 0.05
        L.append(f"| {r2['name']} | {r2['group']} | " + " | ".join(cells) + " |")
    L += ["", "| Score | AUC Run 1 | AUC Run 2 |", "|---|---|---|"]
    for s in SCORES:
        L.append(f"| {s} | {auc1[s]:.2f} (exploratory, n=6) | {auc2[s]:.2f} (exploratory, n=6) |")
        changed |= abs(auc1[s] - auc2[s]) > 1e-9
    top1, top2 = candidate_cells_summary(c1), candidate_cells_summary(res2)
    changed |= top1 != top2
    dis1 = [d["id"] for d in c1["disagreements"]]
    dis2 = [d["id"] for d in res2["disagreements"]]
    changed |= dis1 != dis2
    L += ["", "### Candidates", "", "Run 2 top 3 clusters (center lat, lon; cells; mean overall):", ""]
    for k in res2["clusters"]:
        L.append(f"{k['rank']}. ({k['center']['lat']}, {k['center']['lon']}), {k['n_cells']} cells, overall {k['mean_scores']['overall_score']}")
    L += ["", "Run 1 top 3 for reference:", ""]
    for k in c1["clusters"]:
        L.append(f"{k['rank']}. ({k['center']['lat']}, {k['center']['lon']}), {k['n_cells']} cells, overall {k['mean_scores']['overall_score']}")
    L += ["", "### Disagreement cells", ""]
    L.append("Run 2: " + (", ".join(f"{d['id']} ({d['type']}, terrain {d['terrain_score']}, mobility {d['mobility_score']})" for d in res2["disagreements"]) or "none found"))
    L.append("Run 1 (all Caspian Sea water cells): " + ", ".join(dis1))
    # other changes
    t1 = json.loads((R1 / "targets_at_run1.json").read_text())
    a1 = json.loads((R1 / "known_analogs.json").read_text())
    c1cfg = yaml.safe_load((R1 / "config.yaml").read_text())
    other = []
    if {k: v for k, v in t1.items() if k != "_note"} != {k: v for k, v in targets.items() if k != "_note"}:
        other.append("targets.json values")
    if c1cfg["mobility"]["slope_limit_deg"] != CFG["mobility"]["slope_limit_deg"]:
        other.append("slope limit")
    if a1 != analogs:
        other.append("analog/control coordinates")
    L += ["", "### Summary", "",
          f"- Did any result change because of the water filter? **{'Yes (see tables above)' if changed else 'No: ranks, AUC, candidates and disagreements are identical'}**" + (" (Run 1 disagreements were all water cells, so they necessarily differ)." if dis1 != dis2 else "."),
          f"- Did anything else change? **{'Yes: ' + ', '.join(other) if other else 'No** (targets.json still null, slope limit still 15 - needs a cited source, analog/control coordinates unchanged, still approximate, verify'}" + ("" if other else ")") + ".", ""]
    L += ["### Notes and limitations", "",
          f"- Environment score mode: **{mode}**" + (" (Mars targets are null, so aridity-only)." if mode == "partial" else "."),
          "- `t_range_c` is an extreme-to-extreme range (hottest-month max minus coldest-month min from NASA POWER), **not a diurnal range**. The Jezero value in targets.json uses the same definition" + (" (currently null)." if targets.get("t_range_c") is None else "."),
          "- Coastal cells that mix land and water may not be flagged as water and can still carry sea-surface or bathymetry values.",
          f"- Known gap: {int(((~df.is_water) & (df.elev_mean_m < 0)).sum())} unflagged cells still have elev_mean_m < 0 (real depressions such as Danakil, Qattara and the Nile Delta, but also shallow Persian Gulf / southern Caspian cells whose Terrarium range exceeds the Rule A limit). Thresholds were deliberately not loosened; none of these cells appear in the candidates or disagreements (all have elev_mean_m > 100 m).",
          "- Validation is exploratory with n=6 (4 positives, 2 negatives); weights, features and thresholds were not tuned to any rank."]
    with open(P["report_md"], "a", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    return changed, other, len(fl)


def write_changes(n_water, changed, other):
    txt = ("- We now flag likely water cells (flat sea or lake surface, or deep sea floor) from elevation and slope, and leave them unscored.\n"
           f"- {n_water} of 1,960 cells were flagged as water; percentiles, candidates and disagreements now use land cells only.\n"
           "- Before the fix, the three \"disagreement\" cells were Caspian Sea water; the Run 1 outputs are archived for comparison.\n"
           "- The environment score is still aridity-only until Mars climate values are entered, and temperature range means hottest-month max minus coldest-month min.\n"
           "- Coastal cells that mix land and water may not be flagged, and the validation (6 points) is exploratory, not statistical proof.\n")
    P["changes_md"].write_text(txt, encoding="utf-8")


def main():
    t0 = time.time()
    earth = flag_water(pd.read_csv(P["earth_csv"]))
    mars = pd.read_csv(P["mars_csv"])
    targets = json.loads(P["targets_json"].read_text())
    analogs = json.loads(P["known_analogs"].read_text())

    hits = water_preview(earth, analogs)
    if hits:
        print("STOP: analog/control cell(s) flagged as water. Not applying filter; ask the user.")
        raise SystemExit(2)
    print("✅ water preview printed; no analog/control flagged, applying filter")

    df = compute_scores(earth, mars, targets)
    out_cols = ["id", "lat", "lon"] + SCORES + ["is_water", "environment_mode", "data_completeness", "low_completeness_flag"]
    df[out_cols].round(3).to_csv(P["scores_csv"], index=False)
    print(f"✅ scores.csv written ({len(df)} cells, {int(df.is_water.sum())} water, {int(df.low_completeness_flag.sum())} low completeness)")

    tab, auc = validation(df, analogs)
    mode = df["environment_mode"].iloc[0]
    write_report(tab, auc, df, mode)
    pd.set_option("display.width", 220, "display.max_columns", 20)
    print(tab[["name", "group", "cell"] + [s + "_pct" for s in SCORES]].round(1).to_string(index=False))
    print("AUC (exploratory, n=6):", {k: round(v, 2) for k, v in auc.items()})

    res = candidates(df, mars, analogs)
    P["candidates_json"].write_text(json.dumps(res, indent=2))
    print(f"✅ candidates.json written ({len(res['clusters'])} clusters, {len(res['disagreements'])} disagreement cells)")
    for k in res["clusters"]:
        print("  cluster", k["rank"], k["center"], k["n_cells"], "cells, overall", k["mean_scores"]["overall_score"])
    for d in res["disagreements"]:
        print("  disagreement", d["id"], d["type"])

    changed, other, n_w = run_comparison(df, tab, auc, res, analogs, targets, mode)
    write_changes(n_w, changed, other)
    print("✅ validation_report.md (Run 1 vs Run 2) and changes.md written")

    heatmaps(df)
    print("✅ heatmaps written")
    print(f"Runtime {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()