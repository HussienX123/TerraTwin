"""Build web-ready JSON files in ./terra_twin_web/public/data/ from Phase 1/2/2b/2c outputs.
Reads terra_twin_data/ outputs only; never modifies Phase 1/2/2b/2c files and never reads scores_025.csv.
Usage: python scripts/build_data.py
"""
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

WEB_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = WEB_ROOT.parent
DATA_DIR = PROJECT_ROOT / "terra_twin_data"
PHASE2_DIR = DATA_DIR / "phase2"
PHASE2C_DIR = DATA_DIR / "phase2c"
OUT_DIR = WEB_ROOT / "public" / "data"


def clean_num(val, digits=3):
    if val is None or (isinstance(val, float) and np.isnan(val)) or pd.isna(val):
        return None
    return round(float(val), digits)


def percentile_weak(series):
    """Weak percentile rank (0..100) matching scipy.stats.percentileofscore(..., kind='weak')."""
    vals = series.dropna().values
    n = len(vals)
    if n == 0:
        return pd.Series(np.nan, index=series.index)
    sorted_vals = np.sort(vals)
    out = pd.Series(np.nan, index=series.index, dtype=float)
    valid_mask = series.notna()
    # searchsorted(..., side='right') counts <= v, matching percentileofscore kind='weak'
    counts = np.searchsorted(sorted_vals, series[valid_mask].values, side="right")
    out.loc[valid_mask] = 100.0 * counts / n
    return out


def build_cells(cfg):
    scores = pd.read_csv(PHASE2_DIR / "scores.csv")
    grid = pd.read_csv(DATA_DIR / "mena_grid.csv")
    merged = scores.merge(
        grid[["id", "mean_slope_deg", "p90_slope_deg", "roughness", "elev_mean_m", "elev_range_m", "t_range_c", "precip_mm_yr"]],
        on="id",
        how="left",
    )

    score_cols = ["terrain_score", "environment_score", "mobility_score", "overall_score"]
    land_mask = ~merged["is_water"].astype(bool)
    for col in score_cols:
        pct_col = col.replace("_score", "_pct")
        merged[pct_col] = np.nan
        merged.loc[land_mask, pct_col] = percentile_weak(merged.loc[land_mask, col])

    cells = []
    for _, r in merged.iterrows():
        is_water = bool(r["is_water"])
        rec = {
            "id": str(r["id"]),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "is_water": is_water,
            "data_completeness": clean_num(r["data_completeness"], 3),
            "low_completeness_flag": bool(r["low_completeness_flag"]),
        }
        if is_water:
            for k in ["terrain_score", "environment_score", "mobility_score", "overall_score",
                      "terrain_pct", "environment_pct", "mobility_pct", "overall_pct"]:
                rec[k] = None
            rec["environment_mode"] = None
        else:
            rec["terrain_score"] = clean_num(r["terrain_score"], 3)
            rec["environment_score"] = clean_num(r["environment_score"], 3)
            rec["mobility_score"] = clean_num(r["mobility_score"], 3)
            rec["overall_score"] = clean_num(r["overall_score"], 3)
            rec["terrain_pct"] = clean_num(r["terrain_pct"], 1)
            rec["environment_pct"] = clean_num(r["environment_pct"], 1)
            rec["mobility_pct"] = clean_num(r["mobility_pct"], 1)
            rec["overall_pct"] = clean_num(r["overall_pct"], 1)
            rec["environment_mode"] = str(r["environment_mode"]) if pd.notna(r["environment_mode"]) else None
        cells.append(rec)

    unflagged_below_sea = int(((~merged["is_water"].astype(bool)) & (merged["elev_mean_m"] < 0)).sum())
    water_count = int(merged["is_water"].astype(bool).sum())

    payload = {
        "grid_deg": 1.0,
        "total_cells": len(cells),
        "water_cells": water_count,
        "land_cells": len(cells) - water_count,
        "default_weights": cfg["weights"],
        "min_completeness": float(cfg["quality"]["min_completeness"]),
        "cells": cells,
    }
    return payload, water_count, unflagged_below_sea


def parse_markdown_table(lines):
    rows = []
    for line in lines:
        s = line.strip()
        if not s.startswith("|"):
            continue
        parts = [p.strip() for p in s.strip("|").split("|")]
        if all(set(p) <= {"-", ":"} and len(p) > 0 for p in parts):
            continue
        rows.append(parts)
    if len(rows) < 2:
        return []
    header = rows[0]
    return [dict(zip(header, row)) for row in rows[1:]]


def extract_section(md_text, heading):
    pattern = rf"^({re.escape(heading)}[^\n]*\n[\s\S]*?)(?=\n## |\Z)"
    m = re.search(pattern, md_text, flags=re.MULTILINE)
    return m.group(1).strip() if m else ""


def build_validation():
    report_text = (PHASE2_DIR / "validation_report.md").read_text(encoding="utf-8")
    lines = report_text.splitlines()

    # Parse Run 2 rank table
    rank_sec = extract_section(report_text, "## Rank table")
    rank_rows_raw = parse_markdown_table(rank_sec.splitlines())
    rank_table = []
    for row in rank_rows_raw:
        rank_table.append({
            "name": row["Point"],
            "group": row["Group"],
            "cell": row["Cell"],
            "terrain_score": float(row["terrain"]),
            "terrain_pct": float(row["terrain pct"]),
            "environment_score": float(row["environment"]),
            "environment_pct": float(row["environment pct"]),
            "mobility_score": float(row["mobility"]),
            "mobility_pct": float(row["mobility pct"]),
            "overall_score": float(row["overall"]),
            "overall_pct": float(row["overall pct"]),
        })

    # Parse Run 1 vs Run 2 section
    r12_sec = extract_section(report_text, "## Run 1 vs Run 2")
    r12_tables = []
    cur = []
    for line in r12_sec.splitlines():
        if line.strip().startswith("|"):
            cur.append(line)
        elif cur:
            r12_tables.append(parse_markdown_table(cur))
            cur = []
    if cur:
        r12_tables.append(parse_markdown_table(cur))

    # Build Run 1 vs Run 2 rank rows by parsing table lines directly (R1/R2 column names repeat "R2")
    r12_rank_rows = []
    for line in r12_sec.splitlines():
        s = line.strip()
        if not s.startswith("|") or s.startswith("| Point") or s.startswith("|---"):
            continue
        parts = [p.strip() for p in s.strip("|").split("|")]
        if len(parts) == 10:
            r12_rank_rows.append({
                "name": parts[0],
                "group": parts[1],
                "terrain_r1": float(parts[2]),
                "terrain_r2": float(parts[3]),
                "environment_r1": float(parts[4]),
                "environment_r2": float(parts[5]),
                "mobility_r1": float(parts[6]),
                "mobility_r2": float(parts[7]),
                "overall_r1": float(parts[8]),
                "overall_r2": float(parts[9]),
            })

    auc_rows = []
    if len(r12_tables) >= 2:
        for row in r12_tables[1]:
            auc_rows.append({
                "score": row["Score"],
                "auc_run1": row["AUC Run 1"],
                "auc_run2": row["AUC Run 2"],
            })

    return {
        "negative_result_statement": "Terrain similarity did not separate known analogs from negative controls (exploratory, n=6).",
        "rank_table": rank_table,
        "run1_vs_run2_ranks": r12_rank_rows,
        "auc_table": auc_rows,
        "report_markdown": report_text,
    }


def build_resolution_test():
    text = (PHASE2C_DIR / "resolution_test.md").read_text(encoding="utf-8")

    sec1 = extract_section(text, "## 1. Pre-registered rules")
    rules = [line[2:].strip() for line in sec1.splitlines() if line.strip().startswith("- ")]

    sec2 = extract_section(text, "## 2. Jezero target")
    jezero_rows = parse_markdown_table(sec2.splitlines())
    jezero_comparison = [
        {
            "feature": r["Feature"].strip("`"),
            "window_mean": float(r["Jezero window mean (n=6)"]),
            "old_box": float(r["Old Jezero box (154 × 192 px)"]),
        }
        for r in jezero_rows
    ]

    sec3 = extract_section(text, "## 3. Validation comparison")
    comp_rows = parse_markdown_table(sec3.splitlines())
    comparison_table = [
        {
            "name": r["Point"],
            "group": r["Group"],
            "cell_1": r["1° cell (Run 2)"].strip("`"),
            "pct_1": float(r["1° terrain pct"]),
            "cell_025": r["0.25° cell"].strip("`"),
            "pct_025": float(r["0.25° terrain pct (primary)"]),
            "pct_3x3": float(r["0.25° 3×3 best pct (secondary)"]),
        }
        for r in comp_rows
    ]

    sec4 = extract_section(text, "## 4. Primary criterion PASS / FAIL")
    sec5 = extract_section(text, "## 5. Conclusion")
    sec6 = extract_section(text, "## 6. Limitations")
    limitations = [line[2:].strip() for line in sec6.splitlines() if line.strip().startswith("- ")]

    return {
        "pre_registered_rules": rules,
        "jezero_window_meta": {
            "crop_px": "154 × 192 px (463.09 m N–S × 439.41 m E–W)",
            "window_px": "60 px N–S × 63 px E–W (27.79 × 27.68 km)",
            "n_windows": 6,
        },
        "jezero_comparison": jezero_comparison,
        "comparison_table": comparison_table,
        "primary_results": {
            "baseline_1deg": {"status": "FAIL", "detail": "0/4 analogs beat max negative control = 80.4"},
            "fine_025deg": {"status": "FAIL", "detail": "2/4 analogs beat max negative control = 47.3"},
            "secondary_3x3": {
                "status": "PASS",
                "detail": "3/4 analogs beat max negative control = 91.1",
                "caption": "lenient check; also raises the controls; not evidence of validity",
            },
        },
        "criterion_markdown": sec4,
        "conclusion_text": "\n".join(line for line in sec5.splitlines()[1:] if line.strip()),
        "limitations": limitations,
        "report_markdown": text,
    }


def build_sources(cfg, water_count, unflagged_below_sea):
    readme_text = (DATA_DIR / "README.md").read_text(encoding="utf-8")
    changes_lines = [
        line[2:].strip() if line.startswith("- ") else line.strip()
        for line in (PHASE2_DIR / "changes.md").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    targets = json.loads((DATA_DIR / "targets.json").read_text(encoding="utf-8"))

    sources_sec = extract_section(readme_text, "## Data sources")
    source_rows = parse_markdown_table(sources_sec.splitlines())

    citations_sec = extract_section(readme_text, "## Citations (paste-ready)")
    citations = [line[2:].strip() for line in citations_sec.splitlines() if line.strip().startswith("- ")]

    slope_cfg = cfg["mobility"]
    slope_citation = slope_cfg.get("citation")
    slope_label = (
        f"{slope_cfg['slope_limit_deg']}° ({slope_citation})"
        if slope_citation
        else f"{slope_cfg['slope_limit_deg']}°, needs a cited source"
    )

    return {
        "data_sources": source_rows,
        "citations": citations,
        "targets_status": {k: v for k, v in targets.items() if k != "_note"},
        "mars_climate_missing": all(targets.get(k) is None for k in ["t_mean_c", "t_max_c", "t_min_c", "t_range_c", "precip_mm_yr"]),
        "slope_limit_display": slope_label,
        "water_filter": cfg["water_filter"],
        "water_cells_flagged": water_count,
        "unflagged_below_sea_level_cells": unflagged_below_sea,
        "min_completeness": cfg["quality"]["min_completeness"],
        "changelog": changes_lines,
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cfg = yaml.safe_load((PHASE2_DIR / "config.yaml").read_text(encoding="utf-8"))

    cells_payload, water_count, unflagged_below_sea = build_cells(cfg)
    (OUT_DIR / "cells.json").write_text(json.dumps(cells_payload), encoding="utf-8")

    candidates = json.loads((PHASE2_DIR / "candidates.json").read_text(encoding="utf-8"))
    (OUT_DIR / "candidates.json").write_text(json.dumps(candidates, indent=2), encoding="utf-8")

    analogs = json.loads((PHASE2_DIR / "known_analogs.json").read_text(encoding="utf-8"))
    (OUT_DIR / "analogs.json").write_text(json.dumps(analogs, indent=2), encoding="utf-8")

    validation = build_validation()
    (OUT_DIR / "validation.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")

    resolution = build_resolution_test()
    (OUT_DIR / "resolution_test.json").write_text(json.dumps(resolution, indent=2), encoding="utf-8")

    sources = build_sources(cfg, water_count, unflagged_below_sea)
    (OUT_DIR / "sources.json").write_text(json.dumps(sources, indent=2), encoding="utf-8")

    print(
        f"✅ build_data.py complete: {cells_payload['total_cells']} cells "
        f"({cells_payload['land_cells']} land, {water_count} water, "
        f"{unflagged_below_sea} unflagged elev_mean_m < 0)"
    )


if __name__ == "__main__":
    main()
