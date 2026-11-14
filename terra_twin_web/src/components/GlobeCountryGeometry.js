import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function mergeCountryGeometry(earth) {
  earth.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(earth.matrixWorld).invert();
  const countries = [], faces = [], borders = [];
  earth.traverse(object => {if (object.__globeObjType === 'polygon') countries.push(object);});
  for (const country of countries) {
    for (const object of country.children) {
      if (!object.geometry?.attributes.position) continue;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      for (const name of Object.keys(geometry.attributes)) if (name !== 'position') geometry.deleteAttribute(name);
      geometry.clearGroups();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      (object.isMesh ? faces : borders).push(geometry);
    }
  }
  const originals = countries.map(object => ({object, parent: object.parent}));
  originals.forEach(({object, parent}) => parent.remove(object));
  const objects = [];
  if (faces.length) objects.push(new THREE.Mesh(mergeGeometries(faces), new THREE.MeshBasicMaterial({color: '#DFDFC9', side: THREE.DoubleSide, toneMapped: false})));
  if (borders.length) objects.push(new THREE.LineSegments(mergeGeometries(borders), new THREE.LineBasicMaterial({color: '#909A8B'})));
  faces.concat(borders).forEach(g => g.dispose());
  objects.forEach(o => earth.add(o));
  return {dispose() {
    objects.forEach(o => {earth.remove(o); o.geometry.dispose(); o.material.dispose();});
    originals.forEach(({object, parent}) => parent.add(object));
  }};
}
