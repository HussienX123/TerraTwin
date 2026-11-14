# Graph Report - TerraTwin  (2026-11-14)

## Corpus Check
- 120 files · ~41,618 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2028 file(s) not represented in the graph (top: .bin 1651, .cache 360, .csv 6)
- WARNING: 2028 of 2213 files seen (92%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 642 nodes · 1514 edges · 26 communities (19 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- MapPage.jsx
- numpy
- run1_before_mask/config.yaml
- phase2/config.yaml
- react
- package.json
- build_textures.py
- draco_wasm_wrapper.js
- candidates
- paths
- createGlobeTerrainWorld
- three
- terrainData.js
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

## God Nodes (most connected - your core abstractions)
1. `react` - 47 edges
2. `MapPage()` - 29 edges
3. `usePlay()` - 25 edges
4. `three` - 24 edges
5. `fmt()` - 22 edges
6. `Icon()` - 21 edges
7. `w()` - 20 edges
8. `DriveOverlay()` - 20 edges
9. `l()` - 19 edges
10. `createGlobeTerrainWorld()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Water Filter Rule A & Rule B (310/1960 flagged)` --references--> `flag_water()`  [EXTRACTED]
  terra_twin_data/phase2/validation_report.md → terra_twin_data/phase2/run_phase2.py
- `reset()` --indirect_call--> `p()`  [INFERRED]
  terra_twin_web/src/drive/rover.js → terra_twin_web/public/models/draco/draco_wasm_wrapper.js
- `frame()` --indirect_call--> `p()`  [INFERRED]
  terra_twin_web/src/drive/session.js → terra_twin_web/public/models/draco/draco_wasm_wrapper.js
- `dispose()` --calls--> `disposeRover()`  [EXTRACTED]
  terra_twin_web/src/drive/session.js → terra_twin_web/src/drive/roverAsset.js
- `App()` --calls--> `CandidatesPage()`  [EXTRACTED]
  terra_twin_web/src/App.jsx → terra_twin_web/src/components/CandidatesPage.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **TerraTwin End-to-End Screening Pipeline (Phase 1 -> Phase 2 -> Phase 2c -> Web)** — terra_twin_data_build_tables, terra_twin_data_phase2_run_phase2, terra_twin_data_phase2c_run_phase2c, terra_twin_web_scripts_build_data, terra_twin_web_src_app [EXTRACTED 1.00]

## Communities (26 total, 7 thin omitted)

### Community 0 - "MapPage.jsx"
Cohesion: 0.06
Nodes (62): Top 3 MENA Candidate Clusters (Screening Hypotheses), Run 2 Disagreement Cells (Terrain vs Mobility), Exploratory Validation Negative Result (n=6, AUC 0.00-0.62), Phase 2c Resolution Test (0.25° vs 1°, 6 Jezero 27.8 km Windows), Phase 3/4 Static Web Architecture (Vite + React + Leaflet), buildClusterSummarySentence(), CandidatesPage(), disagreementSentence() (+54 more)

### Community 1 - "numpy"
Cohesion: 0.05
Nodes (69): aggregate_cell(), apply_targets(), cell_centers(), cell_id(), earth_climate(), earth_terrain(), fetch_power(), fetch_tile() (+61 more)

### Community 2 - "run1_before_mask/config.yaml"
Cohesion: 0.05
Nodes (40): candidates, comparison_features, dbscan, exclusion_radius_km, n_closest, n_clusters, n_different, top_fraction (+32 more)

### Community 3 - "phase2/config.yaml"
Cohesion: 0.22
Nodes (8): environment, features, quality, min_completeness, terrain, features, validation, grid_lookup

### Community 4 - "react"
Cohesion: 0.06
Nodes (57): react, Paste-Ready Data Citations (Terrarium, POWER, MOLA Smith et al. 2001), App(), DATA_FILES, Brand(), DataLimitsPage(), EvidencePage(), CopyIcon() (+49 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (34): globe.gl, leaflet, react-dom, topojson-client, vite, @vitejs/plugin-react, world-atlas, Web App HTML Entrypoint (index.html) (+26 more)

### Community 6 - "build_textures.py"
Cohesion: 0.16
Nodes (11): capabilities(), check(), download(), grid(), layer_info(), main(), SafeRedirect, sample_image() (+3 more)

### Community 7 - "draco_wasm_wrapper.js"
Cohesion: 0.10
Nodes (25): B(), C(), D(), E(), f(), e(), G(), H() (+17 more)

### Community 8 - "candidates"
Cohesion: 0.20
Nodes (10): candidates, comparison_features, dbscan, exclusion_radius_km, n_closest, n_clusters, n_different, top_fraction (+2 more)

### Community 9 - "paths"
Cohesion: 0.20
Nodes (10): paths, candidates_json, changes_md, earth_csv, known_analogs, mars_csv, report_md, run1_dir (+2 more)

### Community 11 - "createGlobeTerrainWorld"
Cohesion: 0.13
Nodes (25): mergeCountryGeometry(), createDataTiles(), createSceneMarkers(), createPatch(), updateGeometry(), HORIZONTAL_MAGNIFICATION, makeSkirt(), PATCH_WIDTH (+17 more)

### Community 12 - "three"
Cohesion: 0.11
Nodes (18): three, dynamics(), reset(), step(), roverModel(), wheels, loadRover(), roverLOD() (+10 more)

### Community 13 - "terrainData.js"
Cohesion: 0.12
Nodes (21): CAPTION, createTerrain(), EXAGGERATIONS, LIMITATION, SLOPE_BANDS, SLOPE_COLORS, fields, TerrainInspector() (+13 more)

### Community 14 - "createGlobeXR"
Cohesion: 0.19
Nodes (10): canvasTheme(), textureCaption(), createGlobeXR(), enter(), frame(), hitPanel(), restore(), createGlobeXRPanel() (+2 more)

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

## Knowledge Gaps
- **7 isolated node(s):** `python`, `Top 3 MENA Candidate Clusters (Screening Hypotheses)`, `Run 2 Disagreement Cells (Terrain vs Mobility)`, `Exploratory Validation Negative Result (n=6, AUC 0.00-0.62)`, `Paste-Ready Data Citations (Terrarium, POWER, MOLA Smith et al. 2001)` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compute_scores()` connect `numpy` to `MapPage.jsx`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **What connects `python`, `Top 3 MENA Candidate Clusters (Screening Hypotheses)`, `Run 2 Disagreement Cells (Terrain vs Mobility)` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MapPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05516596540439458 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `MapPage.jsx`, `terrainData.js`, `package.json`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **Should `numpy` be split into smaller, more focused modules?**
  _Cohesion score 0.05083655083655084 - nodes in this community are weakly interconnected._
- **Why does `startDrive()` connect `three` to `react`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Should `run1_before_mask/config.yaml` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._