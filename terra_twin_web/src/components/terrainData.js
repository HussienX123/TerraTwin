import * as THREE from 'three';
export const EXAGGERATIONS = [1, 2, 5, 10];
export const SLOPE_COLORS = ['#F2F0F7', '#CBC9E2', '#9E9AC8', '#756BB1', '#54278F'];
export const SLOPE_BANDS = ['0–5°', '5–10°', '10–15°', '15–30°', '30°+'];
export const CAPTION = "Values are for the whole 1° cell (Jezero: the target crop). The 3D view shows the central 60 km window. Heights are relative to each patch's lowest point. Resolution is about 0.5 km, so local slopes are understated.";
export const LIMITATION = "The 3D view is a visualization of coarse elevation data (about 0.5 km); it is not a rover-scale terrain model.";
export async function loadHeights(site, signal) {
  const response = await fetch(site.dataFile ? '/data/'+site.dataFile : '/data/terrain/' + site.file, {signal});
  if (!response.ok) throw new Error('Could not load ' + site.name + '. Try reloading the terrain view.');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== site.width * site.height * 2) throw new Error('The terrain file has an unexpected size. Rebuild the terrain data.');
  const view = new DataView(buffer);
  const heights = new Float32Array(site.width * site.height);
  const scale = (site.max_m - site.min_m) / 65535;
  for (let i = 0; i < heights.length; i++) heights[i] = view.getUint16(i * 2, true) * scale;
  return heights;
}
export function createTerrain(site, heights) {
  const geometry = new THREE.PlaneGeometry(.5, .5, site.width - 1, site.height - 1);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(heights.length * 3);
  const palette = SLOPE_COLORS.map(color => new THREE.Color(color));
  for (let row = 0; row < site.height; row++) {
    for (let col = 0; col < site.width; col++) {
      const i = row * site.width + col;
      const left = Math.max(0, col - 1), right = Math.min(site.width - 1, col + 1);
      const top = Math.max(0, row - 1), bottom = Math.min(site.height - 1, row + 1);
      const dx = (heights[row * site.width + right] - heights[row * site.width + left]) / ((right - left) * site.spacing_m);
      const dz = (heights[bottom * site.width + col] - heights[top * site.width + col]) / ((bottom - top) * site.spacing_m);
      const slope = Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI;
      const color = palette[slope < 5 ? 0 : slope < 10 ? 1 : slope < 15 ? 2 : slope < 30 ? 3 : 4];
      color.toArray(colors, i * 3);
      position.setY(i, heights[i] / 120000);
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({vertexColors: true, flatShading: true, side: THREE.DoubleSide});
  return new THREE.Mesh(geometry, material);
}
