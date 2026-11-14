# TerraTwin Web (Phase 3)

Static Vite + React + Leaflet demo displaying the Phase 1/2/2b/2c MENA analog screening outputs for Jezero Crater. No backend, no new scoring, no Phase 1–2 file edits.

## Rebuild static JSON data

Reads from `../terra_twin_data/` (`mena_grid.csv`, `targets.json`, `README.md`, `phase2/*`, `phase2c/resolution_test.md`) and writes web-ready JSON into `public/data/`. Does **not** use `scores_025.csv`.

```bash
cd terra_twin_web
python scripts/build_data.py
```

## Install and run locally

```bash
cd terra_twin_web
npm install
npm run dev
```

## Production build and preview

```bash
cd terra_twin_web
npm run build
npm run preview
```

## Team edits before submission
- Edit candidate cluster use-cases in `src/content/uses.js` (`CLUSTER_USES`).
- Fill the AI use disclosure block in `src/components/DataLimitsPage.jsx` (`[TEAM TO FILL: tools used and for what]`).

## Terrain 3D and Meta Quest

Build terrain exports from the existing Phase 1 cache with:

```powershell
python scripts/build_terrain.py
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Open `/terrain?site=<encoded-cell-id>`, or use View terrain in 3D on Candidates or an exported Map cell. The exporter reads local cached tiles and the Jezero NPZ crop. It performs no downloads. Missing coverage is listed as n/a.

For a Quest, place the preview behind an HTTPS reverse proxy on your computer or existing server. Use an HTTPS hostname with a certificate trusted by Quest Browser. Forward that hostname to port 4173 and open the HTTPS address on the headset, on the same network when using a local proxy. Plain HTTP to a LAN IP does not enable immersive WebXR. Existing hosting can serve the Vite dist directory over HTTPS instead. Keep the deployment at the domain root and configure SPA fallback to index.html for /terrain.

A reverse proxy location for an existing Nginx HTTPS virtual host can use:

```nginx
location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_set_header Host $host;
}
```

The HTTPS virtual host and trusted certificate must already be configured. No certificates or proxy packages are installed by this project.

In Meta Quest Browser, open a terrain comparison and choose Enter VR. Allow the headset session. Point either controller at the floating panel and press the trigger. The left thumbstick rotates the table. The right thumbstick scales it from 0.5x to 2x. Exit VR returns to the screen view.

Desktop controls include drag to orbit, wheel/pinch to zoom, arrow-key rotation, +/- zoom, and 1/2/3/4 for 1x/2x/5x/10x exaggeration. The purple slope classes are a display calculation on the resampled patch. The inspector copies existing source values.

The scene contains 65,536 terrain triangles. Actual Quest 2 frame rate, controller usability, and successful immersive session startup require a headset test. Automated browser checks cover the normal scene and unsupported/rejected XR states, not headset performance.

## Integrated globe terrain
The current terrain experience is on the globe page. Legacy /terrain URLs redirect to /?view=globe&terrain=1&site=...
Select an exported cell or its View terrain in 3D link. The Terrain group offers Image/Slope colors, exaggeration, comparison, Side by side/Return and Hide.
Run python scripts/build_textures.py to rebuild registered imagery from the two permitted NASA hosts. Downloads are cached under cache/textures. Runtime textures are bundled under public/data/terrain.
Earth uses the historical Landsat/WELD annual true-color composite dated 2000-12-01. CTX advertises a third-party tile host; its Trek-hosted path is unavailable, so Jezero uses the labelled MOLA color-shade fallback. The metadata records the layer, date and resolution.
Enter VR is now on the globe page. HTTPS requirements above still apply. Controller rays select globe cells and markers. Left thumbstick rotates the table, right thumbstick scales it. The floating panel controls materials, sites, exaggeration and comparison. XR uses the 1024-pixel texture variants.
Browser verification cannot establish Quest frame rate or controller comfort. Those require a real headset session.

## Drive mode

Run `npm run dev` or `npm run build` followed by `npm run preview`. Select a land cell on the globe and choose **Drive here**, or open `/?view=drive&site=mars_jezero`. Use HTTPS on Quest as described above. The drive uses the globe's existing renderer.

WASD or arrows control throttle and steering, Space brakes, C cycles chase/cockpit/top-down, R restores the last safe pose, and Escape pauses. Escape again exits to the globe. On touch screens use the left pad and brake. On a standard gamepad use the left stick and right trigger. In VR use the left stick, right trigger and A to open the ray-operated menu.

Run `python scripts/build_drive_data.py` to regenerate drive-only files from cached tiles. The seven featured heightfields are reused. Other land sites have 65 × 65 samples at 937.5 m spacing. Their colors come from elevation and hillshade. All driving windows are 60 km wide.

As an artistic choice, detail amplitude in metres is 3r/(1+r), where r is existing nonnegative roughness (zero if unavailable). Site-ID-seeded smooth value noise uses weights 0.55, 0.30 and 0.15 at wavelengths 150, 65 and 22 m. Data only removes these offsets. Rendering and six wheel contacts use the same bilinear base plus detail function. The rover is enlarged and speeds are exaggerated. Gravity and atmosphere appearance are simulation choices.

Five stops use identical east/south offsets (metres): (0,−180), (145,−315), (310,−245), (280,−65), (90,5). To preserve route length, translate the entire route and spawn together if a stop exceeds the coarse slope limit. Search 25 m radial steps through 300 m with 16 bearings rotated by the site seed. Take the first placement with the fewest steep stops. Stop within 16 m at less than 1 m/s for two seconds. Battery depletion or five stops ends a run. Drive score = max(0, 200 × stops − 50 × tilt alarms). An alarm stops the rover for two seconds and returns it to its last safe pose. Best Drive scores use browser storage. Comparison results last for the current page session. Simulation results do not contribute to any screening layer.

### Drive model and relief controls
The drive rover uses NASA/Jet Propulsion Laboratory's Mars 2020 Perseverance model, bundled under public/models. Source https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/ and NASA-3D-Resources on GitHub. The locally bundled Draco decoder comes from the installed three package. Small CAD details are reduced through 64-step vertex clustering per mesh. The model is hidden in cockpit views.
Drive relief defaults to 10× with 1×, 2×, 5×, 10× and 20× controls. Coarse heights are multiplied, while synthetic detail retains its original amplitude. Rendering and physics share the exaggerated height function. Simulation slopes and handling therefore change with this control.
Site data displays the original collected fields from mena_grid.csv, bundled as a read-only CSV copy, or the featured terrain index. These remain whole-cell or Jezero target-crop values.

Focused terrain uses its own OrbitControls because globe.gl derives zoom speed from altitude above its 100-unit sphere. A camera close to a terrain block at the origin has negative globe altitude. Globe controls are disabled in this view. Terrain zoom is bounded, globe cell picking is suspended, and Reset view restores the framing. On phones, the canvas and scrollable terrain controls occupy separate regions.

## Missions and story play
Play opens three unlocked fictional chapters. Explorer hides elapsed time and keeps battery above zero, uses assist by default, and makes tilt resets penalty-free. Scientist retains timed simulation results and Drive score penalties. Switch modes at any time in Settings. Story facts are authored in src/content/facts.js and all chapter text in src/content/story.js. No game imagery or external model is loaded; driving uses the original primitive rover and elevation colors.
Progress, tutorial acknowledgments and journal pages are stored locally under terra-play using guarded storage calls. No account, chat, analytics, advertising or personal information is part of game progress. Set missions, story or journal to false in src/content/playFlags.js to disable each feature.
Predictions use mean sampled slope over each driven leg. The first compares with the starting slope. There are five prediction opportunities in chapter 2, beginning before the first leg. Equal leg means are grouped with flatter. Wrong predictions have no penalty. Route offsets and seeded translation are unchanged.
Game stars award one for completing five stops. A second requires at least 80% of time under the slope limit in Scientist, or every stop without a reset in Explorer. A third requires no alarms and at least 25% battery. These are game rewards. Missions show First drive, Steady driver, Sharp eyes (four of five correct), and Both worlds. Chapter 3 reuses the same route on the chosen Earth cell and Jezero.
Classroom and Possible uses are available under Data. Journal printing uses one page per site/chapter; the classroom activity prints separately. Intended uses have not yet been tested with users. No child or adult usability study or successful headset story test has been performed.
