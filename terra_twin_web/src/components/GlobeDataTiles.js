import * as THREE from 'three';
import {surfacePosition} from './GlobeTerrainPatch';
export function createDataTiles(cells, colorFor) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({color: '#FFFFFF', toneMapped: false, side: THREE.DoubleSide});
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), color = new THREE.Color();
  const radians = THREE.MathUtils.degToRad(.94), radius = 102.5;
  cells.forEach((cell, i) => {
    const normal = surfacePosition(cell.lat, cell.lon, 1);
    const longitude = THREE.MathUtils.degToRad(cell.lon);
    const east = new THREE.Vector3(Math.cos(longitude), 0, -Math.sin(longitude));
    const north = new THREE.Vector3().crossVectors(normal, east).normalize();
    const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, north, normal));
    scale.set(radius * radians * Math.cos(THREE.MathUtils.degToRad(cell.lat)), radius * radians, 1);
    matrix.compose(normal.multiplyScalar(radius), rotation, scale);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color.set(colorFor(cell)));
  });
  mesh.userData.cells = cells;
  return {mesh, recolor(fn) {cells.forEach((cell, i) => mesh.setColorAt(i, color.set(fn(cell)))); mesh.instanceColor.needsUpdate = true;}, dispose() {geometry.dispose(); material.dispose(); mesh.dispose();}};
}
export function createSceneMarkers(markers) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({color: '#1D1D1F', side: THREE.DoubleSide});
  const geometries = {
    clusters: new THREE.CircleGeometry(1.2, 16),
    disagreements: new THREE.PlaneGeometry(2, 2),
    analogs: new THREE.CircleGeometry(1.6, 3),
    negatives: new THREE.RingGeometry(.9, 1.3, 4),
  };
  for (const marker of markers) {
    const mesh = new THREE.Mesh(geometries[marker.key], material);
    mesh.position.copy(surfacePosition(marker.lat, marker.lon, 103.2));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mesh.position.clone().normalize());
    if (marker.key === 'disagreements') mesh.rotateZ(Math.PI / 4);
    mesh.userData.marker = marker;
    group.add(mesh);
  }
  return {group, dispose() {Object.values(geometries).forEach(g => g.dispose()); material.dispose();}};
}
