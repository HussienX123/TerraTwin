"""Export central terrain windows from Phase 1 caches without network access."""
from pathlib import Path
import json, math
import numpy as np
import pandas as pd
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "terra_twin_web"
DATA = ROOT / "terra_twin_data"
OUT = WEB / "public/data/terrain"
SIZE, WINDOW = 129, 60000.0
SPACING = WINDOW / (SIZE - 1)
def sample(array, x, y):
    if x.min() < 0 or y.min() < 0 or x.max() > array.shape[1]-1 or y.max() > array.shape[0]-1:
        raise ValueError("cached crop does not cover the central 60 km window")
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xj, yj = np.minimum(xi+1,array.shape[1]-1), np.minimum(yi+1,array.shape[0]-1)
    dx, dy = x-xi, y-yi
    return array[yi,xi]*(1-dx)*(1-dy)+array[yi,xj]*dx*(1-dy)+array[yj,xi]*(1-dx)*dy+array[yj,xj]*dx*dy
def earth(lat, lon):
    z = 8
    pixel_m = 156543.03392 * math.cos(math.radians(lat)) / 2**z
    cx = (lon+180)/360*256*2**z
    cy = (1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*256*2**z
    offsets = np.linspace(-WINDOW/2,WINDOW/2,SIZE)/pixel_m
    x,y = np.meshgrid(cx+offsets,cy+offsets)
    left,top = math.floor(x.min()/256),math.floor(y.min()/256)
    right,bottom = math.floor(x.max()/256),math.floor(y.max()/256)
    mosaic = np.empty(((bottom-top+1)*256,(right-left+1)*256),dtype=float)
    for ty in range(top,bottom+1):
        for tx in range(left,right+1):
            path = DATA / f"cache/tiles/{z}_{tx}_{ty}.png"
            if not path.exists(): raise ValueError(f"missing cached tile {path.name}")
            rgb=np.asarray(Image.open(path).convert("RGB"),dtype=float)
            heights=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
            mosaic[(ty-top)*256:(ty-top+1)*256,(tx-left)*256:(tx-left+1)*256]=heights
    return sample(mosaic,x-left*256,y-top*256)
def mars(lat,lon):
    path=DATA/"cache/mars_jezero.npz"
    if not path.exists(): raise ValueError("missing cached Jezero crop")
    d=np.load(path)
    offsets=np.linspace(-WINDOW/2,WINDOW/2,SIZE)
    x,y=np.meshgrid(lon+np.degrees(offsets/(3389500*math.cos(math.radians(lat)))),lat-np.degrees(offsets/3389500))
    return sample(d["arr"],(3396190*np.radians(x)-float(d["c"]))/float(d["a"])-.5,(3396190*np.radians(y)-float(d["f"]))/float(d["e"])-.5)
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    cells=json.loads((WEB/"public/data/cells.json").read_text())["cells"]
    lookup={c["id"]:c for c in cells}
    candidates=json.loads((WEB/"public/data/candidates.json").read_text())
    metrics=pd.read_csv(DATA/"mena_grid.csv").set_index("id")
    target=pd.read_csv(DATA/"mars_targets.csv").iloc[0]
    sites=[dict(id="mars_jezero",type="mars",name="Jezero",lat=18.4,lon=77.75,cellId="mars_jezero",values=target.dropna().to_dict())]
    for cluster in candidates["clusters"]:
        valid=[lookup[i] for i in cluster["cell_ids"] if i in lookup]
        center=cluster["center"]
        cell=min(valid,key=lambda c:(c["lat"]-center["lat"])**2+((c["lon"]-center["lon"])*math.cos(math.radians(center["lat"])))**2)
        sites.append(dict(id=cell["id"],type="earth",name=f'Cluster {cluster["rank"]}',lat=cell["lat"],lon=cell["lon"],cellId=cell["id"]))
    for cell in candidates["disagreements"]:
        sites.append(dict(id=cell["id"],type="earth",name=f'Disagreement {cell["id"]}',lat=cell["lat"],lon=cell["lon"],cellId=cell["id"]))
    for site in sites:
        if site["type"]=="earth":
            site["values"]={**metrics.loc[site["cellId"]].dropna().to_dict(),**lookup[site["cellId"]]}
        try:
            heights=(mars if site["type"]=="mars" else earth)(site["lat"],site["lon"])
            if not np.isfinite(heights).all(): raise ValueError("missing elevation samples")
            low,high=float(heights.min()),float(heights.max())
            encoded=np.rint((heights-low)/max(high-low,1e-12)*65535).astype("<u2")
            filename=site["id"]+".bin"
            encoded.tofile(OUT/filename)
            site.update(file=filename,width=SIZE,height=SIZE,spacing_m=SPACING,min_m=low,max_m=high,source="MOLA cached Jezero crop" if site["type"]=="mars" else "Cached Terrarium z8",resolution_note="About 0.5 km; local slopes are understated.",status="available")
            print(f'{site["name"]}: min {low:.3f} m, max {high:.3f} m, relief {high-low:.3f} m, {encoded.nbytes} bytes')
        except (ValueError,FileNotFoundError) as error:
            site.update(status="n/a",reason=str(error))
            print(f'{site["name"]}: n/a ({error})')
    (OUT/"index.json").write_text(json.dumps(dict(sites=sites),indent=2,allow_nan=False))
    print(f"Earth and Mars use the same {SPACING} m spacing across 60 km.")
if __name__=="__main__": main()
