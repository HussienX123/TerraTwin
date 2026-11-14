# TerraTwin – Phase 1 data tables

Files: `mena_grid.csv` (1,960 rows), `mars_targets.csv` (1 row), `targets.json` (Mars climate, filled by hand), `build_tables.py`, `cache/` (tiles, POWER JSON, Mars crop).
Run: `python build_tables.py` (resumable; cached re-run ≈ 10 s). Grid size: `CELL_DEG` at top of the script.
After editing `targets.json`, re-run to propagate values into `mars_targets.csv`.

Columns (identical in both CSVs): id, body, lat, lon (cell center), mean_slope_deg, p90_slope_deg, roughness (std of slope in cell), elev_mean_m, elev_range_m, t_mean_c, t_max_c, t_min_c, t_range_c, precip_mm_yr, data_completeness (fraction of non-null among the 10 data fields from mean_slope_deg to precip_mm_yr).

## Data sources
| Data | Source | Resolution used |
|---|---|---|
| Earth elevation | AWS Terrain Tiles, Terrarium PNG, zoom 8: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (1,224 tiles). Height = R·256 + G + B/256 − 32768. | Ground size/pixel = 156543.03392·cos(lat)/2^8 ≈ 470 m (40°N) to 598 m (12°N) |
| Earth climate | NASA POWER Climatology API v2.10.1, `https://power.larc.nasa.gov/api/temporal/climatology/point`, community AG, parameters `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, one call per cell center | Native ≈ 0.5° (MERRA-2 / 0.5° grid), queried at 1° cell centers |
| Mars elevation | MOLA MEGDR global DEM mosaic, 463 m, USGS Astrogeology: `https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif` (redirects to `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif`). File is 2.1 GB, so only the Jezero window was read via HTTP range requests (no full download). | 463.09 m/px N–S, 439.4 m/px E–W (true ground, equirectangular scaled by cos 18.4°); crop 154×192 px |

## Method notes
- Slope = arctan(hypot(dz/dx, dz/dy)) via `numpy.gradient` on the stitched mosaic (so cell edges are not biased), then aggregated per cell: mean, 90th percentile, std (roughness); elevation mean and max−min.
- POWER fields: `t_mean_c` = T2M ANN; `t_max_c` = T2M_MAX ANN; `t_min_c` = T2M_MIN ANN; `t_range_c` = max − min; `precip_mm_yr` = Σ(PRECTOTCORR monthly mm/day × days in month).
- Jezero cell center is (18.4°N, 77.75°E), box lon 77.0–78.5, lat 17.8–19.0.

## Known limitations
- **POWER is coarse (~0.5°)**; neighbouring 1° cells are not independent climate samples.
- **POWER T2M_MAX / T2M_MIN climatology are extremes**, not mean daily max/min: the ANN value equals the hottest / coldest month value (verified on a test point). `t_range_c` is therefore an extreme-to-extreme range, and is inflated versus mean diurnal range. Use consistently, and enter Mars values with the same definition if possible.
- **Mars temperature and precipitation are entered manually** in `targets.json`; until then `mars_targets.csv` has `data_completeness` = 0.5.
- **Ocean/sea cells are included.** Terrarium contains bathymetry and sea surface, and POWER returns values over water, so Caspian Sea, Persian Gulf, Red Sea and Mediterranean cells appear as very flat (e.g. the five "flattest" cells are Caspian/Gulf). There is no land mask (none was requested); filter in later phases.
- Earth cells are ~1° (≈ 70–110 km wide) while the Jezero box is ~89 × 71 km, and Terrarium (≈ 470–600 m, varying with latitude) is only roughly comparable to MOLA (463 m).
- Terrarium mixes source DEMs (SRTM, ASTER, etc.); mean/p90 slope at ~500 m resolution understates local slope.

## Citations (paste-ready)
- Terrain tiles: "Terrain Tiles (Terrarium), Mapzen / Amazon Web Services Open Data Registry, `https://registry.opendata.aws/terrain-tiles/`. Includes data from SRTM, ASTER GDEM, GMTED2010, and others; see `https://github.com/tilezen/joerd/blob/master/docs/attribution.md`."
- Climate: "NASA Prediction Of Worldwide Energy Resources (POWER) Project, NASA Langley Research Center, `https://power.larc.nasa.gov/`, accessed November 2026 (Climatology API v2.10.1; MERRA-2 and CERES/GEOS-derived meteorology)."
- Mars: "Smith, D. E., et al. (2001), Mars Orbiter Laser Altimeter: Experiment summary after the first year of global mapping of Mars, J. Geophys. Res., 106(E10), 23689–23722. Mars MGS MOLA DEM 463 m/pix mosaic, USGS Astrogeology Science Center, `https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m`."
