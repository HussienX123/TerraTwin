"""Build drive-only assets using local Phase 1 tiles. No network access."""
import csv
import json
import math
import re
from pathlib import Path
import numpy as np
import build_terrain as terrain

base = terrain.WEB / "public/data"
out = base / "drive"
out.mkdir(exist_ok=True)
config = (terrain.DATA / "phase2/config.yaml").read_text()
line = re.search(r"^ +slope_limit_deg: +([\d.]+)(.*)$", config, re.M)
limit = float(line[1])
(base / "drive_config.json").write_text(json.dumps(dict(limit=limit, placeholder="needs a cited source" in line[2])))
featured = {s["id"]: s for s in json.loads((base / "terrain/index.json").read_text())["sites"]}
with (terrain.DATA / "mena_grid.csv").open() as stream:
    metrics = {r["id"]: r for r in csv.DictReader(stream)}
entries = {}
for s in featured.values():
    entries[s["id"]] = dict(file="terrain/"+s["file"], width=s["width"], min_m=s["min_m"], max_m=s["max_m"], spacing_m=s["spacing_m"], roughness=s["values"].get("roughness"), source=s["source"])
terrain.SIZE = 65
for c in json.loads((base / "cells.json").read_text())["cells"]:
    key = c["id"]
    if c["is_water"] or key in entries:
        continue
    try:
        # Include the neighboring pixel at tile seams for bilinear interpolation.
        z = 8
        lat, lon = c["lat"], c["lon"]
        scale = 156543.03392 * math.cos(math.radians(lat)) / 256
        offsets = np.linspace(-30000, 30000, 65) / scale
        x,y = np.meshgrid((lon+180)/360*65536+offsets,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)*32768+offsets)
        left, top = math.floor(x.min()/256), math.floor(y.min()/256)
        right, bottom = math.ceil(x.max())//256, math.ceil(y.max())//256
        mosaic = np.empty(((bottom-top+1)*256,(right-left+1)*256))
        for ty in range(top,bottom+1):
            for tx in range(left,right+1):
                with terrain.Image.open(terrain.DATA/f"cache/tiles/8_{tx}_{ty}.png") as tile:
                    rgb=np.asarray(tile.convert("RGB"),dtype=float)
                mosaic[(ty-top)*256:(ty-top+1)*256,(tx-left)*256:(tx-left+1)*256]=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
        h=terrain.sample(mosaic,x-left*256,y-top*256)
        if not np.isfinite(h).all():
            raise ValueError("Missing elevation")
        low, high = float(h.min()), float(h.max())
        np.rint((h-low)/max(high-low,1e-12)*65535).astype("<u2").tofile(out / (key+".bin"))
        rough = float(metrics[key]["roughness"] or "nan")
        entries[key] = dict(file="drive/"+key+".bin", width=65, min_m=low, max_m=high, spacing_m=937.5, roughness=rough if math.isfinite(rough) else None, source="Cached Terrarium z8")
    except (OSError, ValueError) as error:
        entries[key] = dict(status="n/a", reason=str(error))
        print(key, error)
for key, row in entries.items():
    row["id"] = key
(base / "drive_index.json").write_text(json.dumps(entries, allow_nan=False, separators=(",",":")))
print(len(entries), "sites indexed")
