"""TerraTwin Phase 1: build mena_grid.csv and mars_targets.csv (data tables only).

Usage:  python build_tables.py            # run everything (resumable, cache-backed)
Requires: pandas, numpy, Pillow, requests, rasterio
"""
import io
import json
import math
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from PIL import Image

# ----------------------------- CONFIG ---------------------------------------
CELL_DEG = 1.0                      # grid size in degrees (config variable)
LAT_MIN, LAT_MAX = 12.0, 40.0
LON_MIN, LON_MAX = -10.0, 60.0
ZOOM = 8
TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR"
POWER_WORKERS = 3                   # concurrent POWER requests
POWER_MIN_INTERVAL = 0.25           # global throttle: seconds between request starts
MOLA_URL = ("/vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/"
            "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")  # via https://planetarymaps.usgs.gov/mosaic/...
JEZERO = dict(lon_min=77.0, lon_max=78.5, lat_min=17.8, lat_max=19.0)
MARS_RADIUS_M = 3396190.0           # MOLA reference radius

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
TILE_DIR = CACHE / "tiles"
POWER_DIR = CACHE / "power"
MARS_CACHE = CACHE / "mars_jezero.npz"
TARGETS_JSON = ROOT / "targets.json"

COLUMNS = ["id", "body", "lat", "lon", "mean_slope_deg", "p90_slope_deg", "roughness",
           "elev_mean_m", "elev_range_m", "t_mean_c", "t_max_c", "t_min_c", "t_range_c",
           "precip_mm_yr", "data_completeness"]
DATA_FIELDS = COLUMNS[4:14]         # fields counted for data_completeness
MONTH_DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


# ----------------------------- helpers --------------------------------------
def cell_centers():
    n_lat = int(round((LAT_MAX - LAT_MIN) / CELL_DEG))
    n_lon = int(round((LON_MAX - LON_MIN) / CELL_DEG))
    lats = LAT_MIN + CELL_DEG * (np.arange(n_lat) + 0.5)
    lons = LON_MIN + CELL_DEG * (np.arange(n_lon) + 0.5)
    return np.round(lats, 6), np.round(lons, 6)


def cell_id(lat, lon):
    return f"earth_{lat:+.2f}_{lon:+.2f}"


def aggregate_cell(slope, elev):
    """slope, elev: 2D arrays for one cell -> dict of terrain stats."""
    s = slope[np.isfinite(slope)]
    e = elev[np.isfinite(elev)]
    out = dict(mean_slope_deg=np.nan, p90_slope_deg=np.nan, roughness=np.nan,
               elev_mean_m=np.nan, elev_range_m=np.nan)
    if s.size:
        out.update(mean_slope_deg=float(s.mean()), p90_slope_deg=float(np.percentile(s, 90)),
                   roughness=float(s.std()))
    if e.size:
        out.update(elev_mean_m=float(e.mean()), elev_range_m=float(e.max() - e.min()))
    return out


def slope_deg(z, dx, dy):
    """z: 2D elevation (m). dx, dy: ground size per pixel in m (scalar or per-row column vector)."""
    gy, gx = np.gradient(z)
    return np.degrees(np.arctan(np.hypot(gx / dx, gy / dy)))


# ----------------------------- Earth terrain --------------------------------
def tile_xy(lat, lon, z=ZOOM):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch_tile(args):
    x, y = args
    path = TILE_DIR / f"{ZOOM}_{x}_{y}.png"
    if path.exists():
        return
    url = TILE_URL.format(z=ZOOM, x=x, y=y)
    for attempt in range(5):
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 200:
                tmp = path.with_suffix(".tmp")
                tmp.write_bytes(r.content)
                tmp.replace(path)
                return
            if r.status_code == 404:
                return
        except requests.RequestException:
            pass
        time.sleep(2 ** attempt)
    raise RuntimeError(f"failed tile {url}")


def earth_terrain():
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    x0f, y1f = tile_xy(LAT_MIN, LON_MIN)
    x1f, y0f = tile_xy(LAT_MAX, LON_MAX)
    # tiles: include a 1-tile margin so edge cells get proper gradients
    xs = range(int(x0f) - 0, int(x1f) + 1)
    ys = range(int(y0f) - 0, int(y1f) + 1)
    todo = [(x, y) for y in ys for x in xs]
    print(f"[terrain] {len(todo)} tiles ({len(xs)} x {len(ys)}); downloading missing ones")
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(fetch_tile, todo))

    n = 256 * 2 ** ZOOM
    tw, th = len(xs), len(ys)
    elev = np.full((th * 256, tw * 256), np.nan, dtype=np.float32)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            p = TILE_DIR / f"{ZOOM}_{x}_{y}.png"
            if not p.exists():
                continue
            a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)
            elev[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

    # global pixel indices -> lat/lon of pixel centers
    gx = xs[0] * 256 + np.arange(elev.shape[1])
    gy = ys[0] * 256 + np.arange(elev.shape[0])
    lon_px = (gx + 0.5) / n * 360.0 - 180.0
    lat_px = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * (gy + 0.5) / n))))
    res = 156543.03392 * np.cos(np.radians(lat_px)) / 2 ** ZOOM      # m/pixel, x and y
    slope = slope_deg(elev, res[:, None], res[:, None]).astype(np.float32)

    lats, lons = cell_centers()
    half = CELL_DEG / 2
    rows = []
    for lat in lats:
        # lat_px decreases with row index
        r_idx = np.where((lat_px >= lat - half) & (lat_px < lat + half))[0]
        for lon in lons:
            c_idx = np.where((lon_px >= lon - half) & (lon_px < lon + half))[0]
            rec = dict(id=cell_id(lat, lon), body="earth", lat=float(lat), lon=float(lon))
            if r_idx.size and c_idx.size:
                sl = (slice(r_idx[0], r_idx[-1] + 1), slice(c_idx[0], c_idx[-1] + 1))
                rec.update(aggregate_cell(slope[sl], elev[sl]))
            rows.append(rec)
    return pd.DataFrame(rows)


# ----------------------------- Earth climate --------------------------------
_last_start = [0.0]
import threading
_lock = threading.Lock()


def power_path(lat, lon):
    return POWER_DIR / f"{lat:+.4f}_{lon:+.4f}.json"


def fetch_power(args):
    lat, lon = args
    path = power_path(lat, lon)
    if path.exists():
        return
    params = dict(parameters=POWER_PARAMS, community="AG", latitude=lat, longitude=lon, format="JSON")
    for attempt in range(6):
        with _lock:  # global throttle
            wait = POWER_MIN_INTERVAL - (time.time() - _last_start[0])
            if wait > 0:
                time.sleep(wait)
            _last_start[0] = time.time()
        try:
            r = requests.get(POWER_URL, params=params, timeout=90)
            if r.status_code == 200:
                tmp = path.with_suffix(".tmp")
                tmp.write_text(r.text)
                tmp.replace(path)
                return
            if r.status_code in (400, 404, 422):
                path.write_text(json.dumps({"error": r.status_code, "text": r.text[:300]}))
                return
        except requests.RequestException:
            pass
        time.sleep(2 ** attempt)
    print(f"[climate] gave up for {lat},{lon} (will retry on next run)")


def parse_power(path):
    """Return dict of climate columns, or {} if unavailable."""
    try:
        par = json.loads(path.read_text())["properties"]["parameter"]
    except Exception:
        return {}

    def v(x):
        return None if x is None or x <= -990 else x

    out = {}
    t_mean = v(par["T2M"].get("ANN"))
    t_max = v(par["T2M_MAX"].get("ANN"))
    t_min = v(par["T2M_MIN"].get("ANN"))
    p = [v(par["PRECTOTCORR"].get(m)) for m in MONTHS]
    out["t_mean_c"] = t_mean
    out["t_max_c"] = t_max
    out["t_min_c"] = t_min
    out["t_range_c"] = (t_max - t_min) if (t_max is not None and t_min is not None) else None
    if all(x is not None for x in p):   # mm/day monthly -> mm/yr
        out["precip_mm_yr"] = sum(x * d for x, d in zip(p, MONTH_DAYS))
    return out


def earth_climate(df):
    POWER_DIR.mkdir(parents=True, exist_ok=True)
    todo = [(r.lat, r.lon) for r in df.itertuples() if not power_path(r.lat, r.lon).exists()]
    print(f"[climate] {len(df) - len(todo)} cached, {len(todo)} to fetch")
    t0 = time.time()
    if todo:
        with ThreadPoolExecutor(POWER_WORKERS) as ex:
            for k, _ in enumerate(ex.map(fetch_power, todo), 1):
                if k % 100 == 0:
                    print(f"[climate] {k}/{len(todo)}  {time.time() - t0:.0f}s", flush=True)
    recs = [parse_power(power_path(r.lat, r.lon)) for r in df.itertuples()]
    clim = pd.DataFrame(recs, index=df.index).reindex(columns=["t_mean_c", "t_max_c", "t_min_c", "t_range_c", "precip_mm_yr"])
    for c in clim.columns:
        df[c] = pd.to_numeric(clim[c], errors="coerce")
    return df


# ----------------------------- Mars terrain ---------------------------------
def mars_terrain():
    import rasterio
    from rasterio.windows import from_bounds

    R = MARS_RADIUS_M
    if not MARS_CACHE.exists():
        print("[mars] reading Jezero window from MOLA via HTTP range requests")
        with rasterio.open(MOLA_URL) as ds:
            print(f"[mars] CRS={ds.crs.to_string()[:40]}... res={ds.res} m/px dtype={ds.dtypes[0]} nodata={ds.nodata}")
            px, py = ds.res
            # Equirectangular, std parallel 0, central meridian 0: x = R*lon, y = R*lat (metres)
            x0, x1 = (R * math.radians(JEZERO[k]) for k in ("lon_min", "lon_max"))
            y0, y1 = (R * math.radians(JEZERO[k]) for k in ("lat_min", "lat_max"))
            win = from_bounds(x0 - 2 * px, y0 - 2 * py, x1 + 2 * px, y1 + 2 * py, ds.transform)
            win = win.round_offsets().round_lengths()   # 2 px pad for gradients
            arr = ds.read(1, window=win).astype("float64")
            if ds.nodata is not None:
                arr[arr == ds.nodata] = np.nan
            tr = ds.window_transform(win)
            np.savez(MARS_CACHE, arr=arr, a=tr.a, e=tr.e, c=tr.c, f=tr.f)
    d = np.load(MARS_CACHE)
    z, a, e, c, f = d["arr"], float(d["a"]), float(d["e"]), float(d["c"]), float(d["f"])
    h, w = z.shape
    y_m = f + e * (np.arange(h) + 0.5)
    x_m = c + a * (np.arange(w) + 0.5)
    lat_px = np.degrees(y_m / R)
    lon_px = np.degrees(x_m / R)
    dy = abs(e)                                              # metres per pixel (north-south)
    dx = abs(a) * np.cos(np.radians(lat_px))[:, None]        # true ground metres per pixel (east-west)
    slope = slope_deg(z, dx, dy)
    sel_r = (lat_px >= JEZERO["lat_min"]) & (lat_px <= JEZERO["lat_max"])
    sel_c = (lon_px >= JEZERO["lon_min"]) & (lon_px <= JEZERO["lon_max"])
    sl = np.ix_(sel_r, sel_c)
    rec = dict(id="mars_jezero", body="mars",
               lat=(JEZERO["lat_min"] + JEZERO["lat_max"]) / 2,
               lon=(JEZERO["lon_min"] + JEZERO["lon_max"]) / 2)
    rec.update(aggregate_cell(slope[sl], z[sl]))
    print(f"[mars] cropped {sel_r.sum()}x{sel_c.sum()} px; ground size {dy:.1f} m (N-S) x {float(dx.mean()):.1f} m (E-W) per px")
    return pd.DataFrame([rec])

def apply_targets(mars):
    if not TARGETS_JSON.exists():
        TARGETS_JSON.write_text(json.dumps(
            {"_note": "Fill by hand: Mars climate for Jezero. Units: deg C, mm/yr. null = unknown.",
             "t_mean_c": None, "t_max_c": None, "t_min_c": None, "t_range_c": None,
             "precip_mm_yr": None}, indent=2))
        print(f"[mars] created {TARGETS_JSON.name} with null placeholders")
    t = json.loads(TARGETS_JSON.read_text())
    for k in ["t_mean_c", "t_max_c", "t_min_c", "t_range_c", "precip_mm_yr"]:
        mars[k] = pd.to_numeric(pd.Series([t.get(k)]), errors="coerce").values
    if pd.isna(mars.loc[0, "t_range_c"]) and pd.notna(mars.loc[0, "t_max_c"]) and pd.notna(mars.loc[0, "t_min_c"]):
        mars.loc[0, "t_range_c"] = mars.loc[0, "t_max_c"] - mars.loc[0, "t_min_c"]
    return mars


# ----------------------------- output / report ------------------------------
def finalize(df):
    df = df.copy()
    df["data_completeness"] = df[DATA_FIELDS].notna().sum(axis=1) / len(DATA_FIELDS)
    return df[COLUMNS]


def report(earth, mars):
    pd.set_option("display.width", 250, "display.max_columns", 30)
    print("\n================ SANITY REPORT ================")
    print(f"mena_grid.csv rows: {len(earth)} | mars_targets.csv rows: {len(mars)}")
    print("\n% missing per column (earth | mars):")
    print(pd.DataFrame({"earth_%": earth.isna().mean() * 100, "mars_%": mars.isna().mean() * 100}).round(1))
    cols = ["id", "lat", "lon", "mean_slope_deg", "p90_slope_deg", "roughness", "elev_mean_m"]
    ok = earth.dropna(subset=["mean_slope_deg"])
    print("\n5 flattest Earth cells:")
    print(ok.nsmallest(5, "mean_slope_deg")[cols].round(3).to_string(index=False))
    print("\n5 steepest Earth cells:")
    print(ok.nlargest(5, "mean_slope_deg")[cols].round(3).to_string(index=False))
    print("\nJezero row:")
    print(mars.T.to_string(header=False))


def main():
    t0 = time.time()
    earth = earth_terrain()
    print("[terrain] done")
    earth = earth_climate(earth)
    print("[climate] done")
    mars = apply_targets(mars_terrain())
    earth, mars = finalize(earth), finalize(mars)
    earth.to_csv(ROOT / "mena_grid.csv", index=False)
    mars.to_csv(ROOT / "mars_targets.csv", index=False)
    report(earth, mars)
    print(f"\nTotal runtime: {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()

