// src/config/features.js
// Feature flags for TerraTwin Phase 4 / 3D features.
// Setting any flag to false cleanly hides its entry points
// and falls back to the stable 2D Leaflet map.

export const FEATURES = {
  globe: true,    // 3D globe view (falls back to 2D Leaflet map when false)
  terrain: true,  // 3D terrain patch pop-out and inspection (hidden when false)
  vr: true,       // WebXR immersive VR session support (hidden when false)
  drive: true,    // Rover drive simulation mode (hidden when false)
};

export default FEATURES;
