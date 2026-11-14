# Phase 2 validation report

- Earth cells scored: 1960; environment mode: **partial** (Mars precip / t_range are null in targets.json, so the environment score is aridity-only: lower precip = higher score)
- Mobility slope limit: 15 deg (**needs a cited source**).
- Weights (terrain/environment/mobility): 0.4/0.3/0.3. Not tuned.
- All known-analog and control coordinates are **approximate, verify**; each point is mapped to its containing 1-degree cell (floor of lat/lon), so points lying on a cell corner are sensitive to that choice.
- Terrain score is *terrain similarity*, not geology. No land mask exists, so sea cells (Caspian, Gulf, Red Sea, Mediterranean) are scored like land.

## Rank table (percentile rank among all Earth cells, 100 = best)

| Point | Group | Cell | terrain | terrain pct | environment | environment pct | mobility | mobility pct | overall | overall pct |
|---|---|---|---|---|---|---|---|---|---|---|
| Dhofar, Oman | analog | earth_+17.50_+54.50 | 25.4 | 25.5 | 43.0 | 43.1 | 60.9 | 23.5 | 41.4 | 18.4 |
| Wadi Rum, Jordan | analog | earth_+29.50_+35.50 | 65.4 | 65.5 | 67.8 | 67.9 | 26.7 | 10.4 | 54.5 | 36.3 |
| Danakil Depression | analog | earth_+14.50_+40.50 | 25.3 | 25.3 | 31.6 | 31.7 | 58.4 | 22.1 | 37.1 | 14.4 |
| Western Desert inverted channels, Egypt | analog | earth_+24.50_+27.50 | 64.5 | 64.5 | 97.3 | 97.3 | 92.0 | 63.3 | 82.6 | 96.2 |
| Nile Delta | negative | earth_+31.50_+31.50 | 50.8 | 50.8 | 47.2 | 47.2 | 98.1 | 96.5 | 63.9 | 56.0 |
| Mesopotamian floodplain | negative | earth_+32.50_+45.50 | 50.6 | 50.7 | 32.5 | 32.6 | 98.9 | 99.1 | 59.7 | 46.7 |

## ROC-AUC (4 analogs vs 2 negative controls)

| Score | AUC |
|---|---|
| terrain_score | 0.50 |
| environment_score | 0.62 |
| mobility_score | 0.00 |
| overall_score | 0.25 |

> **n is tiny (4 positives, 2 negatives = 8 pairs).** AUC moves in steps of 0.125 and is not statistically meaningful; treat as a sanity check only.

## Honest reading

- terrain_score: mean analog percentile 45.2, AUC 0.50 -> analogs rank near the median.
- environment_score: mean analog percentile 60.0, AUC 0.62 -> analogs rank near the median.
- mobility_score: mean analog percentile 29.8, AUC 0.00 -> analogs rank poorly (below median).
- overall_score: mean analog percentile 41.3, AUC 0.25 -> analogs rank near the median.

No weights or features were adjusted after seeing these results.