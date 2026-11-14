"""TerraTwin Phase 2c: 0.25-degree resolution test (terrain similarity only).
Reuses cached Terrarium tiles and cached Jezero MOLA crop; does NOT download or edit Phase 1/2 files.
Run: python run_phase2c.py
"""
import json
import math
import sys
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import yaml
from PIL import Image
from scipy.stats import percentileofscore

HERE = Path(__file__).resolve().parent
DATA_ROOT = HERE.parent
sys.path.insert(0, str(DATA_ROOT))
sys.path.insert(0, str(DATA_ROOT / "phase2"))

import build_tables as bt
import run_phase2 as p2

CFG_FINE = yaml.safe_load((HERE / "config_fine.yaml").read_text(encoding="utf-8"))
CELL_DEG_FINE = float(CFG_FINE["CELL_DEG_FINE"])
CFG2 = yaml.safe_load((HERE / CFG_FINE["PHASE2_CONFIG"]).read_text(encoding="utf-8"))


# ------------------------------------------------------------------ cache check
def check_cache():
    x0f, y1f = bt.tile_xy(bt.LAT_MIN, bt.LON_MIN)
    x1f, y0f = bt.tile_xy(bt.LAT_MAX, bt.LON_MAX)
    xs = range(int(x0f), int(x1f) + 1)
    ys = range(int(y0f), int(y1f) + 1)
    missing = [f"{bt.ZOOM}_{x}_{y}.png" for y in ys for x in xs
               if not (bt.TILE_DIR / f"{bt.ZOOM}_{x}_{y}.png").exists()]
    if missing or not bt.MARS_CACHE.exists():
        print(f"STOP: missing cache items (tiles missing={len(missing)}, mars_cache={bt.MARS_CACHE.exists()})")
        raise SystemExit(2)
    return xs, ys


# --------------------------------------------------------------- Earth 0.25 deg
def decode_tile_row(xs, y):
    row_elev = np.full((256, len(xs) * 256), np.nan, dtype=np.float32)
    for i, x in enumerate(xs):
        p = bt.TILE_DIR / f"{bt.ZOOM}_{x}_{y}.png"
        a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)
        row_elev[:, i * 256:(i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return row_elev


def earth_terrain_fine(xs, ys):
    n = 256 * 2 ** bt.ZOOM
    gx = xs[0] * 256 + np.arange(len(xs) * 256)
    lon_px = (gx + 0.5) / n * 360.0 - 180.0

    n_lat = int(round((bt.LAT_MAX - bt.LAT_MIN) / CELL_DEG_FINE))
    n_lon = int(round((bt.LON_MAX - bt.LON_MIN) / CELL_DEG_FINE))
    lats = np.round(bt.LAT_MIN + CELL_DEG_FINE * (np.arange(n_lat) + 0.5), 6)
    lons = np.round(bt.LON_MIN + CELL_DEG_FINE * (np.arange(n_lon) + 0.5), 6)
    half = CELL_DEG_FINE / 2.0

    c_slices = []
    for lon in lons:
        c_idx = np.where((lon_px >= lon - half) & (lon_px < lon + half))[0]
        c_slices.append(slice(c_idx[0], c_idx[-1] + 1) if c_idx.size else None)

    # Process one tile row at a time with 1-tile-row halo above/below -> peak RAM ~40 MB, exact gradient
    buf = {}
    pending = {}
    rows_by_lat = {}

    def flush_band(lat):
        chunks = pending.pop(lat)
        e_band = np.vstack([c[0] for c in chunks])
        s_band = np.vstack([c[1] for c in chunks])
        band_rows = []
        for lon, cs in zip(lons, c_slices):
            rec = dict(id=bt.cell_id(lat, lon), lat=float(lat), lon=float(lon))
            if cs is not None:
                rec.update(bt.aggregate_cell(s_band[:, cs], e_band[:, cs]))
            band_rows.append(rec)
        rows_by_lat[float(lat)] = band_rows

    for j, y in enumerate(ys):
        for k in range(max(0, j - 1), min(len(ys), j + 2)):
            if k not in buf:
                buf[k] = decode_tile_row(xs, ys[k])
        for k in list(buf.keys()):
            if k < j - 1:
                del buf[k]

        k_lo, k_hi = max(0, j - 1), min(len(ys) - 1, j + 1)
        elev_strip = np.vstack([buf[k] for k in range(k_lo, k_hi + 1)])
        gy_strip = ys[k_lo] * 256 + np.arange(elev_strip.shape[0])
        lat_strip = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * (gy_strip + 0.5) / n))))
        res_strip = 156543.03392 * np.cos(np.radians(lat_strip)) / 2 ** bt.ZOOM
        slope_strip = bt.slope_deg(elev_strip, res_strip[:, None], res_strip[:, None]).astype(np.float32)

        off = 0 if j == 0 else 256
        elev_j = elev_strip[off:off + 256]
        slope_j = slope_strip[off:off + 256]
        lat_j = lat_strip[off:off + 256]
        lat_min_j, lat_max_j = float(lat_j[-1]), float(lat_j[0])

        for lat in lats:
            lat_f = float(lat)
            if lat_f - half <= lat_max_j and lat_f + half > lat_min_j:
                r_idx = np.where((lat_j >= lat_f - half) & (lat_j < lat_f + half))[0]
                if r_idx.size:
                    pending.setdefault(lat_f, []).append((elev_j[r_idx], slope_j[r_idx]))
            if lat_f in pending and lat_min_j < lat_f - half:
                flush_band(lat_f)

    for lat_f in list(pending.keys()):
        flush_band(lat_f)

    all_rows = []
    for lat in lats:
        all_rows.extend(rows_by_lat[float(lat)])
    return pd.DataFrame(all_rows)


# --------------------------------------------------------------- Jezero windows
def jezero_window_target(feats):
    d = np.load(bt.MARS_CACHE)
    z, a, e, c, f = d["arr"], float(d["a"]), float(d["e"]), float(d["c"]), float(d["f"])
    h, w = z.shape
    R = bt.MARS_RADIUS_M
    y_m = f + e * (np.arange(h) + 0.5)
    x_m = c + a * (np.arange(w) + 0.5)
    lat_px = np.degrees(y_m / R)
    lon_px = np.degrees(x_m / R)
    dy = abs(e)
    dx = abs(a) * np.cos(np.radians(lat_px))[:, None]
    slope = bt.slope_deg(z, dx, dy)

    sel_r = (lat_px >= bt.JEZERO["lat_min"]) & (lat_px <= bt.JEZERO["lat_max"])
    sel_c = (lon_px >= bt.JEZERO["lon_min"]) & (lon_px <= bt.JEZERO["lon_max"])
    z_crop = z[np.ix_(sel_r, sel_c)]
    s_crop = slope[np.ix_(sel_r, sel_c)]
    H, W = z_crop.shape

    dy_m = float(dy)
    dx_m = float(np.mean(dx[sel_r]))
    tgt_m = float(CFG_FINE["TARGET_WINDOW_KM"]) * 1000.0
    win_h = int(round(tgt_m / dy_m))
    win_w = int(round(tgt_m / dx_m))

    win_rows = []
    for r0 in range(0, H - win_h + 1, win_h):
        for c0 in range(0, W - win_w + 1, win_w):
            win_rows.append(bt.aggregate_cell(s_crop[r0:r0 + win_h, c0:c0 + win_w],
                                              z_crop[r0:r0 + win_h, c0:c0 + win_w]))
    n_win = len(win_rows)
    if n_win < int(CFG_FINE["MIN_JEZERO_WINDOWS"]):
        print(f"STOP: Jezero crop yielded only {n_win} windows (< {CFG_FINE['MIN_JEZERO_WINDOWS']})")
        raise SystemExit(2)

    wdf = pd.DataFrame(win_rows)
    target = wdf[feats].mean().to_dict()
    meta = dict(crop_h=H, crop_w=W, dy_m=dy_m, dx_m=dx_m, win_h=win_h, win_w=win_w,
                win_km_ns=win_h * dy_m / 1000.0, win_km_ew=win_w * dx_m / 1000.0, n_windows=n_win)
    return target, meta


# ----------------------------------------------------------------- validation
def fine_cell_center(lat, lon, step=CELL_DEG_FINE):
    c_lat = bt.LAT_MIN + (math.floor((lat - bt.LAT_MIN) / step) + 0.5) * step
    c_lon = bt.LON_MIN + (math.floor((lon - bt.LON_MIN) / step) + 0.5) * step
    return round(c_lat, 6), round(c_lon, 6)


def lookup_fine(df_idx, lat, lon):
    c_lat, c_lon = fine_cell_center(lat, lon)
    return df_idx.loc[(c_lat, c_lon)] if (c_lat, c_lon) in df_idx.index else None


def evaluate_criterion(rows, col):
    an = [r[col] for r in rows if r["group"] == "analog"]
    ng = [r[col] for r in rows if r["group"] == "negative"]
    max_neg = max(ng)
    n_beat = sum(1 for x in an if x > max_neg)
    return ("PASS" if n_beat >= 3 else "FAIL"), n_beat, max_neg


def write_heatmap(df):
    lats, lons = np.sort(df["lat"].unique()), np.sort(df["lon"].unique())
    step = CELL_DEG_FINE
    grid = df.pivot(index="lat", columns="lon", values="terrain_score").reindex(index=lats, columns=lons).values
    fig, ax = plt.subplots(figsize=(10, 4.6))
    cmap = plt.get_cmap("viridis").copy()
    cmap.set_bad("lightgrey")
    im = ax.imshow(np.ma.masked_invalid(grid), origin="lower", cmap=cmap, vmin=0, vmax=100,
                   extent=[lons[0] - step / 2, lons[-1] + step / 2, lats[0] - step / 2, lats[-1] + step / 2],
                   aspect="auto")
    fig.colorbar(im, label="terrain_score")
    ax.set_title("terrain_score at 0.25 deg (sanity check only; grey = likely water)")
    ax.set_xlabel("lon")
    ax.set_ylabel("lat")
    fig.tight_layout()
    fig.savefig(HERE / CFG_FINE["OUT_HEATMAP"], dpi=int(CFG_FINE["HEATMAP_DPI"]))
    plt.close(fig)


def update_report(target_win, meta, mars_old, rows, res_1, res_025, res_3x3, n_cells, n_water, rule_counts):
    report_path = HERE / CFG_FINE["OUT_REPORT"]
    existing = report_path.read_text(encoding="utf-8")
    marker = "\n## 2. Jezero target"
    if marker in existing:
        existing = existing[:existing.index(marker)].rstrip() + "\n"
    else:
        existing = existing.rstrip() + "\n"

    feats = CFG2["terrain"]["features"]
    p1, b1, m1 = res_1
    p25, b25, m25 = res_025
    p3, b3, m3 = res_3x3

    L = ["",
         "## 2. Jezero target (window scale vs old 1° box row)", "",
         f"- Cached Jezero crop: **{meta['crop_h']} × {meta['crop_w']} px** (`{meta['dy_m']:.2f}` m N–S × `{meta['dx_m']:.2f}` m E–W per px).",
         f"- Matching ~{CFG_FINE['TARGET_WINDOW_KM']} km window size: **{meta['win_h']} px N–S × {meta['win_w']} px E–W** (`{meta['win_km_ns']:.2f} × {meta['win_km_ew']:.2f}` km).",
         f"- Non-overlapping windows extracted: **{meta['n_windows']}** (2 × 3 grid from top-left).", "",
         "| Feature | Jezero window mean (n=6) | Old Jezero box (154 × 192 px) |",
         "|---|---|---|"]
    for ft in feats:
        L.append(f"| `{ft}` | {target_win[ft]:.3f} | {float(mars_old[ft]):.3f} |")

    L += ["",
          f"## 3. Validation comparison: 1° (Run 2) vs 0.25° (primary) vs 0.25° 3×3 best (secondary)", "",
          f"- Grid: {n_cells:,} total cells; water filter flagged **{n_water:,}** cells "
          f"(rule A only = {rule_counts['A']}, rule B only = {rule_counts['B']}, both = {rule_counts['A+B']}); "
          f"**{n_cells - n_water:,}** land cells scored.",
          "- No validation point fell in a flagged water cell.", "",
          "| Point | Group | 1° cell (Run 2) | 1° terrain pct | 0.25° cell | 0.25° terrain pct (primary) | 0.25° 3×3 best pct (secondary) |",
          "|---|---|---|---|---|---|---|"]
    for r in rows:
        L.append(f"| {r['name']} | {r['group']} | `{r['cell_1']}` | {r['pct_1']:.1f} | "
                 f"`{r['cell_025']}` | {r['pct_025']:.1f} | {r['pct_3x3']:.1f} |")

    L += ["",
          "## 4. Primary criterion PASS / FAIL", "",
          "- Criterion: **PASS** if at least 3 of the 4 analogs exceed BOTH negative controls.",
          f"- **1° baseline (Run 2):** **{p1}** ({b1}/4 analogs beat max negative control = {m1:.1f}).",
          f"- **0.25° fine grid (primary):** **{p25}** ({b25}/4 analogs beat max negative control = {m25:.1f}).",
          f"- *(Secondary 3×3 best reference only: {p3}, {b3}/4 analogs beat max negative control = {m3:.1f}.)*", "",
          "## 5. Conclusion", ""]

    if p25 == "FAIL":
        L.append(
            f"The resolution hypothesis was not supported by this test: both the 1° baseline ({p1}, {b1}/4 analogs above "
            f"both controls) and the 0.25° fine grid ({p25}, {b25}/4 analogs above both controls) failed the pre-registered criterion. "
            f"Shrinking the cell size and scaling Jezero to {meta['n_windows']} matching ~27.8 km windows lowered Jezero's target "
            f"elevation range from {float(mars_old['elev_range_m']):.0f} m to {target_win['elev_range_m']:.0f} m, yet the flat Nile Delta "
            f"and Mesopotamian floodplain controls still scored in the {min(r['pct_025'] for r in rows if r['group']=='negative'):.0f}th–"
            f"{max(r['pct_025'] for r in rows if r['group']=='negative'):.0f}th percentile range. Under the secondary 3×3-best check, "
            f"the count was {p3} ({b3}/4), pointing to sensitivity to approximate coordinates rather than a primary pass. Terrain similarity on slope summary statistics and elevation range alone does not separate "
            f"these analogs from flat floodplains at either 1° or 0.25°."
        )
    else:
        L.append(
            f"The resolution hypothesis was supported on this exploratory sample (n=6): the 0.25° fine grid achieved {p25} "
            f"({b25}/4 analogs beat both negative controls, max control {m25:.1f}), whereas the 1° Run 2 baseline was {p1} "
            f"({b1}/4, max control {m1:.1f}). Because n=6 with approximate coordinates, this is exploratory evidence only and nothing more."
        )

    L += ["",
          "## 6. Limitations", "",
          "- Sample size is tiny (`n=6`: 4 positives, 2 negative controls).",
          "- Analog and control coordinates in `phase2/known_analogs.json` are approximate and unverified; floor lookup can miss adjacent landforms.",
          "- Earth terrain comes from AWS Terrarium z8 (~470–600 m/px depending on latitude) vs Mars MOLA (463 m/px N–S, 439 m/px E–W).",
          "- Jezero Crater is a single Mars target.",
          "- Environment (climate) was not re-tested because NASA POWER is ~0.5° and cannot be meaningfully refined to 0.25°."]

    report_path.write_text(existing + "\n".join(L) + "\n", encoding="utf-8")


def main():
    t0 = time.time()
    xs, ys = check_cache()
    print(f"✅ cache verified ({len(xs) * len(ys)} tiles + mars_jezero.npz)")

    df = earth_terrain_fine(xs, ys)
    print(f"✅ 0.25° terrain aggregated ({len(df)} cells)")

    # Water filter using phase2/config.yaml UNCHANGED
    W = CFG2["water_filter"]
    a = ((df["elev_mean_m"] <= W["water_max_elev_m"]) & (df["elev_range_m"] <= W["water_max_range_m"])
         & (df["p90_slope_deg"] <= W["water_max_p90_slope_deg"]))
    b = df["elev_mean_m"] <= W["water_deep_elev_m"]
    df["is_water"] = (a | b).fillna(False)
    df["water_rule"] = np.where(a & b, "A+B", np.where(a, "A", np.where(b, "B", "")))
    n_water = int(df["is_water"].sum())
    rule_counts = {r: int((df["water_rule"] == r).sum()) for r in ("A", "B", "A+B")}
    print(f"✅ water filter applied: {n_water} / {len(df)} flagged (A={rule_counts['A']}, B={rule_counts['B']}, A+B={rule_counts['A+B']})")

    analogs = json.loads((HERE / CFG_FINE["KNOWN_ANALOGS"]).read_text(encoding="utf-8"))
    df_idx = df.set_index(["lat", "lon"])
    flagged_pts = []
    for key in ("analogs", "negative_controls"):
        for pt in analogs[key]:
            r = lookup_fine(df_idx, pt["lat"], pt["lon"])
            if r is None or bool(r["is_water"]):
                flagged_pts.append((pt["name"], fine_cell_center(pt["lat"], pt["lon"]), None if r is None else r["water_rule"]))
    if flagged_pts:
        print("STOP: validation point cell missing or flagged as water:", flagged_pts)
        raise SystemExit(2)
    print("✅ validation point check: 0 flagged as water")

    feats = CFG2["terrain"]["features"]
    target_win, meta = jezero_window_target(feats)
    print(f"✅ Jezero window target ({meta['n_windows']} windows of {meta['win_h']}x{meta['win_w']} px):",
          {k: round(v, 3) for k, v in target_win.items()})

    land = df[~df["is_water"]]
    df["terrain_score"] = np.nan
    df.loc[land.index, "terrain_score"] = p2.mahalanobis_similarity(land, target_win, feats)

    out_cols = ["id", "lat", "lon"] + feats + ["is_water", "terrain_score"]
    df[out_cols].round(3).to_csv(HERE / CFG_FINE["OUT_SCORES"], index=False)
    print(f"✅ {CFG_FINE['OUT_SCORES']} written ({len(df)} rows)")

    # Baseline 1 deg from phase2/scores.csv (land cells only)
    sc1 = pd.read_csv(HERE / CFG_FINE["PHASE2_SCORES"])
    valid1 = sc1[~sc1["is_water"].astype(bool)].dropna(subset=["terrain_score"])
    valid25 = df[~df["is_water"]].dropna(subset=["terrain_score"])
    df_idx = df.set_index(["lat", "lon"])

    rows = []
    for group, key in (("analog", "analogs"), ("negative", "negative_controls")):
        for pt in analogs[key]:
            r1 = p2.cell_row(sc1, pt["lat"], pt["lon"])
            pct1 = float(percentileofscore(valid1["terrain_score"], r1["terrain_score"], kind="weak"))

            c_lat, c_lon = fine_cell_center(pt["lat"], pt["lon"])
            r25 = df_idx.loc[(c_lat, c_lon)]
            pct25 = float(percentileofscore(valid25["terrain_score"], r25["terrain_score"], kind="weak"))

            nb_pcts = []
            for dlat in (-CELL_DEG_FINE, 0.0, CELL_DEG_FINE):
                for dlon in (-CELL_DEG_FINE, 0.0, CELL_DEG_FINE):
                    k = (round(c_lat + dlat, 6), round(c_lon + dlon, 6))
                    if k in df_idx.index and not bool(df_idx.loc[k, "is_water"]):
                        nb_pcts.append(float(percentileofscore(valid25["terrain_score"], df_idx.loc[k, "terrain_score"], kind="weak")))
            rows.append(dict(
                name=pt["name"], group=group,
                cell_1=r1["id"], pct_1=pct1,
                cell_025=r25["id"], pct_025=pct25,
                pct_3x3=max(nb_pcts),
            ))

    res_1 = evaluate_criterion(rows, "pct_1")
    res_025 = evaluate_criterion(rows, "pct_025")
    res_3x3 = evaluate_criterion(rows, "pct_3x3")

    mars_old = pd.read_csv(HERE / CFG_FINE["MARS_TARGETS_CSV"]).iloc[0]
    update_report(target_win, meta, mars_old, rows, res_1, res_025, res_3x3, len(df), n_water, rule_counts)
    print("✅ resolution_test.md updated")

    write_heatmap(df)
    print(f"✅ {CFG_FINE['OUT_HEATMAP']} written")

    print("\n--- SUMMARY ---")
    print(pd.DataFrame(rows)[["name", "group", "pct_1", "pct_025", "pct_3x3"]].round(1).to_string(index=False))
    print(f"1 deg: {res_1[0]} ({res_1[1]}/4 > {res_1[2]:.1f})")
    print(f"0.25 deg (primary): {res_025[0]} ({res_025[1]}/4 > {res_025[2]:.1f})")
    print(f"0.25 deg 3x3 (secondary): {res_3x3[0]} ({res_3x3[1]}/4 > {res_3x3[2]:.1f})")
    print(f"Runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
