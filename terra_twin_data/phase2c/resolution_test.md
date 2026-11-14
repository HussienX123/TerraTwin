# Phase 2c Resolution Test (0.25° vs 1°)

## 1. Pre-registered rules (written before running; unchanged after results)

- Cell size: 0.25° over lat 12 to 40, lon -10 to 60 (config variable CELL_DEG_FINE).
- Same slope method as Phase 1 (numpy.gradient on the stitched mosaic, ground size per pixel = 156543.03392 * cos(lat) / 2^8 meters), same aggregation (mean, p90, std of slope; elevation range).
- Jezero target at matching scale: split the cached Jezero MOLA crop into non-overlapping windows whose ground size is about 27.8 km x 27.8 km (about 60 px N-S and 63 px E-W; compute exact pixel counts from the crop's ground size and state them). Compute the four terrain features per window. The target vector is the MEAN of the window vectors. Also report the number of windows. If the crop yields fewer than 4 windows, STOP AND ASK.
- Water filter: apply the existing water_filter thresholds from phase2/config.yaml UNCHANGED. Print the flagged count. If any validation point's cell is flagged, STOP AND ASK.
- Validation points: the same 4 analogs and 2 controls from phase2/known_analogs.json, using the containing cell (floor).
- PRIMARY criterion: the test PASSES if at least 3 of the 4 analogs have a higher terrain percentile than BOTH negative controls. Report PASS or FAIL for this fine grid and for the Run 2 1° baseline (read it from phase2/scores.csv), under the same criterion.
- SECONDARY (labeled as secondary, because the analog coordinates are approximate): for each of the 6 points, also report the best terrain percentile within the 3x3 block of fine cells around its containing cell. Apply this identically to analogs and controls.

## 2. Jezero target (window scale vs old 1° box row)

- Cached Jezero crop: **154 × 192 px** (`463.09` m N–S × `439.41` m E–W per px).
- Matching ~27.8 km window size: **60 px N–S × 63 px E–W** (`27.79 × 27.68` km).
- Non-overlapping windows extracted: **6** (2 × 3 grid from top-left).

| Feature | Jezero window mean (n=6) | Old Jezero box (154 × 192 px) |
|---|---|---|
| `mean_slope_deg` | 3.193 | 3.432 |
| `p90_slope_deg` | 6.254 | 8.297 |
| `roughness` | 2.512 | 3.467 |
| `elev_range_m` | 1118.000 | 2654.000 |

## 3. Validation comparison: 1° (Run 2) vs 0.25° (primary) vs 0.25° 3×3 best (secondary)

- Grid: 31,360 total cells; water filter flagged **4,575** cells (rule A only = 108, rule B only = 4467, both = 0); **26,785** land cells scored.
- No validation point fell in a flagged water cell.

| Point | Group | 1° cell (Run 2) | 1° terrain pct | 0.25° cell | 0.25° terrain pct (primary) | 0.25° 3×3 best pct (secondary) |
|---|---|---|---|---|---|---|
| Dhofar, Oman | analog | `earth_+17.50_+54.50` | 78.4 | `earth_+17.12_+54.12` | 24.8 | 94.5 |
| Wadi Rum, Jordan | analog | `earth_+29.50_+35.50` | 21.5 | `earth_+29.62_+35.38` | 3.0 | 88.0 |
| Danakil Depression | analog | `earth_+14.50_+40.50` | 24.4 | `earth_+14.12_+40.38` | 71.1 | 93.2 |
| Western Desert inverted channels, Egypt | analog | `earth_+24.50_+27.50` | 68.4 | `earth_+24.12_+27.12` | 79.5 | 94.5 |
| Nile Delta | negative | `earth_+31.50_+31.50` | 77.0 | `earth_+31.12_+31.12` | 36.9 | 91.1 |
| Mesopotamian floodplain | negative | `earth_+32.50_+45.50` | 80.4 | `earth_+32.12_+45.12` | 47.3 | 76.6 |

## 4. Primary criterion PASS / FAIL

- Criterion: **PASS** if at least 3 of the 4 analogs exceed BOTH negative controls.
- **1° baseline (Run 2):** **FAIL** (0/4 analogs beat max negative control = 80.4).
- **0.25° fine grid (primary):** **FAIL** (2/4 analogs beat max negative control = 47.3).
- *(Secondary 3×3 best reference only: PASS, 3/4 analogs beat max negative control = 91.1.)*

## 5. Conclusion

The resolution hypothesis was not supported by this test: both the 1° baseline (FAIL, 0/4 analogs above both controls) and the 0.25° fine grid (FAIL, 2/4 analogs above both controls) failed the pre-registered criterion. Shrinking the cell size and scaling Jezero to 6 matching ~27.8 km windows lowered Jezero's target elevation range from 2654 m to 1118 m, yet the flat Nile Delta and Mesopotamian floodplain controls still scored in the 37th–47th percentile range. Under the secondary 3×3-best check, the count was PASS (3/4), pointing to sensitivity to approximate coordinates rather than a primary pass. Terrain similarity on slope summary statistics and elevation range alone does not separate these analogs from flat floodplains at either 1° or 0.25°.

## 6. Limitations

- Sample size is tiny (`n=6`: 4 positives, 2 negative controls).
- Analog and control coordinates in `phase2/known_analogs.json` are approximate and unverified; floor lookup can miss adjacent landforms.
- Earth terrain comes from AWS Terrarium z8 (~470–600 m/px depending on latitude) vs Mars MOLA (463 m/px N–S, 439 m/px E–W).
- Jezero Crater is a single Mars target.
- Environment (climate) was not re-tested because NASA POWER is ~0.5° and cannot be meaningfully refined to 0.25°.
