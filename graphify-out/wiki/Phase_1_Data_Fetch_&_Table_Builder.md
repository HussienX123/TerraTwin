# Phase 1 Data Fetch & Table Builder

> 21 nodes · cohesion 0.16

## Key Concepts

- **build_tables.py** (31 connections) — `terra_twin_data/build_tables.py`
- **time** (11 connections)
- **main()** (8 connections) — `terra_twin_data/build_tables.py`
- **earth_climate()** (7 connections) — `terra_twin_data/build_tables.py`
- **fetch_power()** (6 connections) — `terra_twin_data/build_tables.py`
- **pathlib** (5 connections)
- **parse_power()** (5 connections) — `terra_twin_data/build_tables.py`
- **apply_targets()** (4 connections) — `terra_twin_data/build_tables.py`
- **fetch_tile()** (4 connections) — `terra_twin_data/build_tables.py`
- **requests** (3 connections)
- **power_path()** (3 connections) — `terra_twin_data/build_tables.py`
- **report()** (3 connections) — `terra_twin_data/build_tables.py`
- **pil** (2 connections)
- **finalize()** (2 connections) — `terra_twin_data/build_tables.py`
- **concurrent_futures** (1 connections)
- **io** (1 connections)
- **v()** (1 connections) — `terra_twin_data/build_tables.py`
- **TerraTwin Phase 1: build mena_grid.csv and mars_targets.csv (data tables only).…** (1 connections) — `terra_twin_data/build_tables.py`
- **Return dict of climate columns, or {} if unavailable.** (1 connections) — `terra_twin_data/build_tables.py`
- **Phase 1 Data Pipeline (AWS Terrarium + NASA POWER + MOLA)** (1 connections) — `terra_twin_data/README.md`
- **threading** (1 connections)

## Relationships

- [Terrain Slope & Grid Aggregation](Terrain_Slope_&_Grid_Aggregation.md) (24 shared connections)
- [Web Static JSON Builder](Web_Static_JSON_Builder.md) (6 shared connections)
- [Phase 2 Scoring & Validation Engine](Phase_2_Scoring_&_Validation_Engine.md) (3 shared connections)

## Source Files

- `terra_twin_data/README.md`
- `terra_twin_data/build_tables.py`

## Audit Trail

- EXTRACTED: 64 (96%)
- INFERRED: 3 (4%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*