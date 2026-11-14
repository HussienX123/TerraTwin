# Graph Report - TerraTwin  (2026-11-14)

## Corpus Check
- 125 files · ~42,275 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1669 file(s) not represented in the graph (top: .bin 1651, .csv 6, .css 5)
- WARNING: 1669 of 1826 files seen (91%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 692 nodes · 1559 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `20c7e0fe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MapPage.jsx
- build_tables.py
- run1_before_mask/config.yaml
- phase2/config.yaml
- react
- package.json
- build_textures.py
- draco_wasm_wrapper.js
- candidates
- paths
- createGlobeTerrainWorld
- rover.js
- TerraTwin — Martian Phoenix
- createGlobeXR
- A
- water_filter
- disagreements
- weights
- graphify
- Water Filter Rule A & Rule B (310/1960 flagged)
- heatmaps
- mobility
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- App.jsx
- phase2/run_phase2.py
- run1_before_mask/run_phase2.py
- pandas
- run_phase2c.py
- numpy

## God Nodes (most connected - your core abstractions)
1. `react` - 49 edges
2. `MapPage()` - 28 edges
3. `usePlay()` - 25 edges
4. `three` - 24 edges
5. `fmt()` - 22 edges
6. `DriveOverlay()` - 20 edges
7. `Icon()` - 20 edges
8. `w()` - 20 edges
9. `createGlobeTerrainWorld()` - 19 edges
10. `l()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Water Filter Rule A & Rule B (310/1960 flagged)` --references--> `flag_water()`  [EXTRACTED]
  terra_twin_data/phase2/validation_report.md → terra_twin_data/phase2/run_phase2.py
- `reset()` --indirect_call--> `p()`  [INFERRED]
  terra_twin_web/src/drive/rover.js → terra_twin_web/public/models/draco/draco_wasm_wrapper.js
- `draw()` --calls--> `textureCaption()`  [EXTRACTED]
  terra_twin_web/src/components/GlobeXRPanel.js → terra_twin_web/src/components/GlobeTerrainControls.jsx
- `App()` --calls--> `MapPage()`  [EXTRACTED]
  terra_twin_web/src/App.jsx → terra_twin_web/src/components/MapPage.jsx
- `DataLimitsPage()` --calls--> `LandscapeIllustration()`  [EXTRACTED]
  terra_twin_web/src/components/DataLimitsPage.jsx → terra_twin_web/src/components/LandscapeIllustration.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **TerraTwin End-to-End Screening Pipeline (Phase 1 -> Phase 2 -> Phase 2c -> Web)** — terra_twin_data_build_tables, terra_twin_data_phase2_run_phase2, terra_twin_data_phase2c_run_phase2c, terra_twin_web_scripts_build_data, terra_twin_web_src_app [EXTRACTED 1.00]

## Communities (32 total, 7 thin omitted)

### Community 0 - "MapPage.jsx"
Cohesion: 0.05
Nodes (64): Top 3 MENA Candidate Clusters (Screening Hypotheses), Run 2 Disagreement Cells (Terrain vs Mobility), Exploratory Validation Negative Result (n=6, AUC 0.00-0.62), Phase 2c Resolution Test (0.25° vs 1°, 6 Jezero 27.8 km Windows), Phase 3/4 Static Web Architecture (Vite + React + Leaflet), buildClusterSummarySentence(), CandidatesPage(), disagreementSentence() (+56 more)

### Community 1 - "build_tables.py"
Cohesion: 0.15
Nodes (18): aggregate_cell(), apply_targets(), cell_centers(), cell_id(), earth_climate(), earth_terrain(), fetch_power(), fetch_tile() (+10 more)

### Community 2 - "run1_before_mask/config.yaml"
Cohesion: 0.05
Nodes (40): candidates, comparison_features, dbscan, exclusion_radius_km, n_closest, n_clusters, n_different, top_fraction (+32 more)

### Community 3 - "phase2/config.yaml"
Cohesion: 0.22
Nodes (8): environment, features, quality, min_completeness, terrain, features, validation, grid_lookup

### Community 4 - "react"
Cohesion: 0.05
Nodes (56): react, Paste-Ready Data Citations (Terrarium, POWER, MOLA Smith et al. 2001), DataLimitsPage(), EvidencePage(), CopyIcon(), facts, playFlags, badges (+48 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (34): globe.gl, leaflet, react-dom, topojson-client, vite, @vitejs/plugin-react, world-atlas, Web App HTML Entrypoint (index.html) (+26 more)

### Community 6 - "build_textures.py"
Cohesion: 0.15
Nodes (11): capabilities(), check(), download(), grid(), layer_info(), main(), SafeRedirect, sample_image() (+3 more)

### Community 7 - "draco_wasm_wrapper.js"
Cohesion: 0.10
Nodes (27): B(), C(), D(), E(), f(), e(), G(), H() (+19 more)

### Community 8 - "candidates"
Cohesion: 0.20
Nodes (10): candidates, comparison_features, dbscan, exclusion_radius_km, n_closest, n_clusters, n_different, top_fraction (+2 more)

### Community 9 - "paths"
Cohesion: 0.20
Nodes (10): paths, candidates_json, changes_md, earth_csv, known_analogs, mars_csv, report_md, run1_dir (+2 more)

### Community 11 - "createGlobeTerrainWorld"
Cohesion: 0.07
Nodes (46): three, mergeCountryGeometry(), createDataTiles(), createSceneMarkers(), createPatch(), updateGeometry(), makeSkirt(), PATCH_WIDTH (+38 more)

### Community 12 - "rover.js"
Cohesion: 0.33
Nodes (5): dynamics(), reset(), step(), roverModel(), wheels

### Community 13 - "TerraTwin — Martian Phoenix"
Cohesion: 0.05
Nodes (33): 1. Fast Production Build (Static `dist/`), 2. Docker Deployment (Multi-Stage Build + Nginx), 3. WebXR / Meta Quest HTTPS Requirement, 4. Static Hosting Providers, Build and Run Docker Container, Docker Features, GitHub Pages, Local HTTPS for Quest Headset Testing (+25 more)

### Community 14 - "createGlobeXR"
Cohesion: 0.22
Nodes (9): canvasTheme(), HORIZONTAL_MAGNIFICATION, createGlobeXR(), enter(), frame(), hitPanel(), restore(), createGlobeXRPanel() (+1 more)

### Community 16 - "water_filter"
Cohesion: 0.33
Nodes (6): water_filter, enabled, water_deep_elev_m, water_max_elev_m, water_max_p90_slope_deg, water_max_range_m

### Community 17 - "disagreements"
Cohesion: 0.50
Nodes (4): disagreements, high_pct, low_pct, max_cells

### Community 18 - "weights"
Cohesion: 0.50
Nodes (4): weights, environment, mobility, terrain

### Community 21 - "heatmaps"
Cohesion: 0.67
Nodes (3): heatmaps, dpi, scores

### Community 22 - "mobility"
Cohesion: 0.67
Nodes (3): mobility, slope_feature, slope_limit_deg

### Community 26 - "App.jsx"
Cohesion: 0.14
Nodes (18): App(), CandidatesPage, DATA_FILES, EvidencePage, NotFoundPage, PlayPage, PlayScreen, Brand() (+10 more)

### Community 27 - "phase2/run_phase2.py"
Cohesion: 0.17
Nodes (16): candidate_cells_summary(), candidates(), cell_row(), compute_scores(), f(), flag_water(), haversine_km(), mahalanobis_similarity() (+8 more)

### Community 28 - "run1_before_mask/run_phase2.py"
Cohesion: 0.15
Nodes (12): candidates(), cell_row(), compute_scores(), f(), haversine_km(), heatmaps(), mahalanobis_similarity(), main() (+4 more)

### Community 29 - "pandas"
Cohesion: 0.30
Nodes (9): build_cells(), build_resolution_test(), build_sources(), build_validation(), clean_num(), extract_section(), main(), parse_markdown_table() (+1 more)

### Community 30 - "run_phase2c.py"
Cohesion: 0.25
Nodes (10): check_cache(), decode_tile_row(), earth_terrain_fine(), evaluate_criterion(), fine_cell_center(), jezero_window_target(), lookup_fine(), main() (+2 more)

### Community 31 - "numpy"
Cohesion: 0.35
Nodes (4): earth(), main(), mars(), sample()

## Knowledge Gaps
- **7 isolated node(s):** `python`, `Top 3 MENA Candidate Clusters (Screening Hypotheses)`, `Run 2 Disagreement Cells (Terrain vs Mobility)`, `Exploratory Validation Negative Result (n=6, AUC 0.00-0.62)`, `Phase 1 Data Pipeline (AWS Terrarium + NASA POWER + MOLA)` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 199 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compute_scores()` connect `phase2/run_phase2.py` to `MapPage.jsx`, `numpy`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **What connects `python`, `Top 3 MENA Candidate Clusters (Screening Hypotheses)`, `Run 2 Disagreement Cells (Terrain vs Mobility)` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MapPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053975363941769314 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `MapPage.jsx`, `App.jsx`, `createGlobeTerrainWorld`, `package.json`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Should `build_tables.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._
- **Why does `startDrive()` connect `react` to `rover.js`, `draco_wasm_wrapper.js`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Should `run1_before_mask/config.yaml` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._