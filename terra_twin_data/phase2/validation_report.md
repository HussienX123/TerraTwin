# Phase 2 validation report

- Earth cells scored: 1960; environment mode: **partial** (Mars precip / t_range are null in targets.json, so the environment score is aridity-only: lower precip = higher score)
- Mobility slope limit: 15 deg (**needs a cited source**).
- Weights (terrain/environment/mobility): 0.4/0.3/0.3. Not tuned.
- All known-analog and control coordinates are **approximate, verify**; each point is mapped to its containing 1-degree cell (floor of lat/lon), so points lying on a cell corner are sensitive to that choice.
- Terrain score is *terrain similarity*, not geology. Cells flagged `is_water` (see config water_filter) are excluded from standardization, percentiles, candidates and disagreements.

## Rank table (percentile rank among land cells, 100 = best)

| Point | Group | Cell | terrain | terrain pct | environment | environment pct | mobility | mobility pct | overall | overall pct |
|---|---|---|---|---|---|---|---|---|---|---|
| Dhofar, Oman | analog | earth_+17.50_+54.50 | 78.4 | 78.4 | 35.4 | 35.4 | 60.9 | 21.5 | 60.2 | 48.6 |
| Wadi Rum, Jordan | analog | earth_+29.50_+35.50 | 21.5 | 21.5 | 62.8 | 62.8 | 26.7 | 11.0 | 35.4 | 12.8 |
| Danakil Depression | analog | earth_+14.50_+40.50 | 24.4 | 24.4 | 25.2 | 25.3 | 58.4 | 20.5 | 34.8 | 12.4 |
| Western Desert inverted channels, Egypt | analog | earth_+24.50_+27.50 | 68.3 | 68.4 | 96.8 | 96.8 | 92.0 | 57.6 | 84.0 | 95.0 |
| Nile Delta | negative | earth_+31.50_+31.50 | 77.0 | 77.0 | 39.7 | 39.7 | 98.1 | 96.2 | 72.1 | 75.2 |
| Mesopotamian floodplain | negative | earth_+32.50_+45.50 | 80.4 | 80.4 | 25.9 | 25.9 | 98.9 | 99.3 | 69.6 | 70.4 |

## ROC-AUC (4 analogs vs 2 negative controls; exploratory, n=6)

| Score | AUC |
|---|---|
| terrain_score | 0.12 (exploratory, n=6) |
| environment_score | 0.62 (exploratory, n=6) |
| mobility_score | 0.00 (exploratory, n=6) |
| overall_score | 0.25 (exploratory, n=6) |

> **n is tiny (4 positives, 2 negatives = 8 pairs).** AUC moves in steps of 0.125 and is not statistically meaningful; treat as a sanity check only.

## Honest reading

- terrain_score: mean analog percentile 48.2, AUC 0.12 (exploratory, n=6) -> analogs rank near the median.
- environment_score: mean analog percentile 55.1, AUC 0.62 (exploratory, n=6) -> analogs rank near the median.
- mobility_score: mean analog percentile 27.6, AUC 0.00 (exploratory, n=6) -> analogs rank poorly (below median).
- overall_score: mean analog percentile 42.2, AUC 0.25 (exploratory, n=6) -> analogs rank near the median.

No weights or features were adjusted after seeing these results.
## Run 1 vs Run 2

**Water filter (Run 2 only).** Cells flagged `likely water`: **310** of 1960.

- Rule A (flat water): elev_mean_m <= 0 AND elev_range_m <= 5 AND p90_slope_deg <= 0.05
- Rule B (deep water): elev_mean_m <= -200
- Cells flagged: rule A only = 6, rule B only = 304, both = 0 (A total = 6, B total = 304).
- No known analog or negative-control cell was flagged. Thresholds were not adjusted.

### Percentile ranks and AUC, before vs after (100 = best)

| Point | Group | Terrain R1 | R2 | Env R1 | R2 | Mobility R1 | R2 | Overall R1 | R2 |
|---|---|---|---|---|---|---|---|---|---|
| Dhofar, Oman | analog | 25.5 | 78.4 | 43.1 | 35.4 | 23.5 | 21.5 | 18.4 | 48.6 |
| Wadi Rum, Jordan | analog | 65.5 | 21.5 | 67.9 | 62.8 | 10.4 | 11.0 | 36.3 | 12.8 |
| Danakil Depression | analog | 25.3 | 24.4 | 31.7 | 25.3 | 22.1 | 20.5 | 14.4 | 12.4 |
| Western Desert inverted channels, Egypt | analog | 64.5 | 68.4 | 97.3 | 96.8 | 63.3 | 57.6 | 96.2 | 95.0 |
| Nile Delta | negative | 50.8 | 77.0 | 47.2 | 39.7 | 96.5 | 96.2 | 56.0 | 75.2 |
| Mesopotamian floodplain | negative | 50.7 | 80.4 | 32.6 | 25.9 | 99.1 | 99.3 | 46.7 | 70.4 |

| Score | AUC Run 1 | AUC Run 2 |
|---|---|---|
| terrain_score | 0.50 (exploratory, n=6) | 0.12 (exploratory, n=6) |
| environment_score | 0.62 (exploratory, n=6) | 0.62 (exploratory, n=6) |
| mobility_score | 0.00 (exploratory, n=6) | 0.00 (exploratory, n=6) |
| overall_score | 0.25 (exploratory, n=6) | 0.25 (exploratory, n=6) |

### Candidates

Run 2 top 3 clusters (center lat, lon; cells; mean overall):

1. (23.667, 33.0), 6 cells, overall 90.196
2. (20.0, 10.0), 2 cells, overall 88.354
3. (17.5, 50.0), 2 cells, overall 88.014

Run 1 top 3 for reference:

1. (24.875, 34.625), 16 cells, overall 86.377
2. (22.773, 21.136), 22 cells, overall 84.651
3. (17.5, 50.25), 4 cells, overall 84.392

### Disagreement cells

Run 2: earth_+29.50_+57.50 (terrain_high_mobility_low, terrain 98.908, mobility 2.194), earth_+28.50_+34.50 (terrain_high_mobility_low, terrain 95.088, mobility 0.0), earth_+12.50_+30.50 (mobility_high_terrain_low, terrain 1.88, mobility 96.154)
Run 1 (all Caspian Sea water cells): earth_+38.50_+50.50, earth_+37.50_+51.50, earth_+37.50_+52.50

### Summary

- Did any result change because of the water filter? **Yes (see tables above)** (Run 1 disagreements were all water cells, so they necessarily differ).
- Did anything else change? **No** (targets.json still null, slope limit still 15 - needs a cited source, analog/control coordinates unchanged, still approximate, verify).

### Notes and limitations

- Environment score mode: **partial** (Mars targets are null, so aridity-only).
- `t_range_c` is an extreme-to-extreme range (hottest-month max minus coldest-month min from NASA POWER), **not a diurnal range**. The Jezero value in targets.json uses the same definition (currently null).
- Coastal cells that mix land and water may not be flagged as water and can still carry sea-surface or bathymetry values.
- Known gap: 69 unflagged cells still have elev_mean_m < 0 (real depressions such as Danakil, Qattara and the Nile Delta, but also shallow Persian Gulf / southern Caspian cells whose Terrarium range exceeds the Rule A limit). Thresholds were deliberately not loosened; none of these cells appear in the candidates or disagreements (all have elev_mean_m > 100 m).
- Validation is exploratory with n=6 (4 positives, 2 negatives); weights, features and thresholds were not tuned to any rank.
