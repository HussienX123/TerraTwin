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


def compute_scores(earth, mars, targets):
    df = earth.copy()
    tf = CFG["terrain"]["features"]
    df["terrain_score"] = mahalanobis_similarity(df, mars.iloc[0], tf)

    ef = CFG["environment"]["features"]
    tgt = {f: targets.get(f) for f in ef}
    if all(v is not None for v in tgt.values()):
        df["environment_score"] = mahalanobis_similarity(df, tgt, ef)
        df["environment_mode"] = "full"
    else:  # aridity only: lower precip = higher score
        df["environment_score"] = 100 * (1 - rank_pct(df["precip_mm_yr"]))
        df["environment_mode"] = "partial"   # Mars targets null in targets.json

    lim = float(CFG["mobility"]["slope_limit_deg"])
    sf = CFG["mobility"]["slope_feature"]
    df["mobility_score"] = np.clip(1 - df[sf] / lim, 0, 1) * 100

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
         "- Terrain score is *terrain similarity*, not geology. No land mask exists, so sea cells (Caspian, Gulf, Red Sea, Mediterranean) are scored like land.", "",
         "## Rank table (percentile rank among all Earth cells, 100 = best)", ""]
    cols = ["name", "group", "cell"] + [c for s in SCORES for c in (s, s + "_pct")]
    t = tab[cols].copy()
    L.append("| " + " | ".join(["Point", "Group", "Cell"] + [x for s in SCORES for x in (s.replace("_score", ""), s.replace("_score", "") + " pct")]) + " |")
    L.append("|" + "---|" * len(cols))
    for _, r in t.iterrows():
        L.append("| " + " | ".join([str(r["name"]), r["group"], str(r["cell"])] + [f"{r[c]:.1f}" for c in cols[3:]]) + " |")
    L += ["", "## ROC-AUC (4 analogs vs 2 negative controls)", "", "| Score | AUC |", "|---|---|"]
    L += [f"| {s} | {auc[s]:.2f} |" for s in SCORES]
    L += ["", "> **n is tiny (4 positives, 2 negatives = 8 pairs).** AUC moves in steps of 0.125 and is not statistically meaningful; treat as a sanity check only.", ""]
    an = tab[tab.group == "analog"]
    L += ["## Honest reading", ""]
    for s in SCORES:
        m = an[s + "_pct"].mean()
        verdict = "rank well (above median)" if m > 60 else ("rank poorly (below median)" if m < 40 else "rank near the median")
        L.append(f"- {s}: mean analog percentile {m:.1f}, AUC {auc[s]:.2f} -> analogs {verdict}.")
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
    elig = df[(~df["low_completeness_flag"]) & df["overall_score"].notna()].copy()
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
    sd = df[feats].std(ddof=0)
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
        im = ax.imshow(grid, origin="lower", cmap="viridis", vmin=0, vmax=100,
                       extent=[lons[0] - step / 2, lons[-1] + step / 2, lats[0] - step / 2, lats[-1] + step / 2], aspect="auto")
        fig.colorbar(im, label=s)
        ax.set_title(f"{s} (sanity check only)")
        ax.set_xlabel("lon"); ax.set_ylabel("lat")
        fig.tight_layout()
        fig.savefig(HERE / f"{s}.png", dpi=CFG["heatmaps"]["dpi"])
        plt.close(fig)


def main():
    t0 = time.time()
    earth = pd.read_csv(P["earth_csv"])
    mars = pd.read_csv(P["mars_csv"])
    targets = json.loads(P["targets_json"].read_text())
    analogs = json.loads(P["known_analogs"].read_text())

    df = compute_scores(earth, mars, targets)
    out_cols = ["id", "lat", "lon"] + SCORES + ["environment_mode", "data_completeness", "low_completeness_flag"]
    df[out_cols].round(3).to_csv(P["scores_csv"], index=False)
    print(f"✅ scores.csv written ({len(df)} cells, {int(df.low_completeness_flag.sum())} flagged low completeness)")

    tab, auc = validation(df, analogs)
    write_report(tab, auc, df, df["environment_mode"].iloc[0])
    print("✅ validation_report.md written")
    pd.set_option("display.width", 220, "display.max_columns", 20)
    print(tab[["name", "group", "cell"] + [s + "_pct" for s in SCORES]].round(1).to_string(index=False))
    print("AUC:", {k: round(v, 2) for k, v in auc.items()})

    res = candidates(df, mars, analogs)
    P["candidates_json"].write_text(json.dumps(res, indent=2))
    print(f"✅ candidates.json written ({len(res['clusters'])} clusters, {len(res['disagreements'])} disagreement cells)")

    heatmaps(df)
    print("✅ heatmaps written")
    print(f"Runtime {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
