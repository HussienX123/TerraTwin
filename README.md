# TerraTwin — Martian Phoenix

> **Screening Earth Terrestrial Analogues for Mars's Jezero Crater across the Middle East and North Africa (MENA)**  
> Developed for the NASA Space Apps Challenge.

TerraTwin is an open-source, client-side planetary analogue screening platform. It computes multi-criteria similarity metrics across 1,960 land cells (1° × 1° grid) in North Africa and the Arabian Peninsula to identify candidate field-test locations for robotic and human surface exploration.

---

## Key Features

- **Interactive 2D Screening Map:** Built on Leaflet with customizable layer weights (terrain geometry, climate aridity, operational suitability) and instant percentile ranking.
- **3D Globe & Terrain Block Inspection:** Three.js and globe.gl visualization with registered 60 km digital elevation model (DEM) patches and vertical relief exaggeration controls.
- **Side-by-Side Jezero Comparison:** Direct visual comparison of Earth analogue topography against Jezero Crater's MOLA topography.
- **Rover Drive Arcade Mode:** First-person and chase-camera driving simulation testing terrain traversal over resampled DEM surfaces.
- **WebXR Virtual Reality:** Immersive VR table-scale viewing on Meta Quest Browser over HTTPS.
- **Zero Login / Client-Only:** Completely static client-side architecture requiring no backend database, tracking scripts, or authentication.

---

## Quick Start & Local Development

### Prerequisites
- Node.js (v18 or v20+)
- Python 3.10+ (only required if rebuilding static data from raw tables)

### Run Web Application Locally

```bash
cd terra_twin_web
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Production Build

```bash
cd terra_twin_web
npm run build
npm run preview
```

---

## Hosting on a VPS (Virtual Private Server)

The app is packaged for easy VPS deployment via Docker or any static web server (Nginx / Caddy / Apache).

### Option A: Run with Docker & Nginx (Recommended for VPS)

```bash
cd terra_twin_web
docker build -t terratwin-web .
docker run -d --restart unless-stopped -p 80:80 --name terratwin terratwin-web
```

Open `http://<your-vps-ip>/` in your browser.

### Option B: Plain Static Hosting (Nginx / Apache / Caddy)

Copy the contents of `terra_twin_web/dist/` to your web server root (e.g. `/var/www/html/`):

```bash
# On your local machine:
cd terra_twin_web
npm run build
scp -r dist/* user@your-vps-ip:/var/www/html/
```

Configure your server with Single Page Application (SPA) fallback to `/index.html` (see `DEPLOY.md` for complete Nginx configuration snippets and HTTPS setup for WebXR).

---

## Scientific Methodology & Validation

- **Grid Resolution:** 1° × 1° spatial resolution across the MENA bounding box (12°N–40°N, 10°W–60°E).
- **Target Location:** Jezero Crater, Mars (18.38°N, 77.58°E).
- **Scoring Dimensions:**
  1. *Terrain Similarity:* Elevation relief range, mean elevation, and 90th-percentile slope.
  2. *Environment:* Annual precipitation and aridity index.
  3. *Operational Suitability:* Rover traversability based on maximum slope constraints.
- **Negative-Result Transparency:** In an exploratory validation check against 4 published analogue candidates and 2 negative controls (n=6), terrain geometry alone did not cleanly separate known analogues from control sites (ROC-AUC 0.50). Full analysis and tables are published openly in the **Evidence** section of the app.

---

## Credits & Data Sources

- **NASA POWER:** Surface solar irradiance, 2 m air temperature, and precipitation data.
- **NASA MOLA:** Mars Global Surveyor Mars Orbiter Laser Altimeter digital elevation model.
- **NASA Mars Trek:** Orbital surface imagery for Jezero Crater.
- **NASA GIBS:** Global Imagery Browse Services (Landsat/WELD surface imagery composites).
- **AWS Terrain Tiles:** Global digital elevation models derived from SRTM data.
- **CARTO & OpenStreetMap:** Voyager/Positron vector and raster basemaps.

*Note: No NASA logos, NASA-branded graphics, or photos of individuals are used.*

---

## Documentation Links

- [DEPLOY.md](DEPLOY.md) — Detailed deployment instructions, Nginx configuration, and HTTPS proxy setup.
- [SUBMISSION.md](SUBMISSION.md) — Space Apps hackathon submission draft and checklist.
- [RELEASE_CHECK.md](RELEASE_CHECK.md) — Release audit, text screening, and data parity verification.
