import * as THREE from 'three';
import {createTerrain, loadHeights} from './terrainData';
export const PATCH_WIDTH = 28;
export const HORIZONTAL_MAGNIFICATION = (6371000 * 2 * .14) / 60000;
export function surfacePosition(lat, lon, radius) {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(p) * Math.sin(l) * radius, Math.sin(p) * radius, Math.cos(p) * Math.cos(l) * radius);
}
export function tangentRotation(lat, lon) {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon);
  const east = new THREE.Vector3(Math.cos(l), 0, -Math.sin(l));
  const up = surfacePosition(lat, lon, 1);
  const south = new THREE.Vector3(Math.sin(p) * Math.sin(l), -Math.cos(p), Math.sin(p) * Math.cos(l));
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, up, south));
}
function makeSkirt(mesh, exaggeration, n) {
  const position = mesh.geometry.attributes.position;
  const border = [];
  for (let i = 0; i < n; i++) border.push(i);
  for (let i = 1; i < n; i++) border.push(i * n + n - 1);
  for (let i = n - 2; i >= 0; i--) border.push((n - 1) * n + i);
  for (let i = n - 2; i > 0; i--) border.push(i * n);
  const vertices = [], indices = [];
  border.forEach(i => {
    const x = position.getX(i), z = position.getZ(i);
    vertices.push(x, -.006, z, x, position.getY(i) * exaggeration, z);
  });
  for (let i = 0; i < border.length; i++) {
    const a = i * 2, b = ((i + 1) % border.length) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: '#D2D2D7', side: THREE.DoubleSide}));
}
export async function createPatch(site, settings, signal) {
  const heights = await loadHeights(site, signal);
  if (signal.aborted) return null;
  const mesh = createTerrain(site, heights);
  const group = new THREE.Group();
  const block = new THREE.Group();
  group.add(block); block.scale.setScalar(PATCH_WIDTH / .5);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=128;
  const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#1D1D1F';ctx.font='bold 34px system-ui';ctx.fillText(site.name+' / '+(site.type==='mars'?'Mars':'Earth'),16,77);
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,toneMapped:false}));label.position.set(0,2,18);label.scale.set(35,4.4,1);label.visible=settings.inXR;group.add(label);
  const outlineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.25, -.006, -.25), new THREE.Vector3(.25, -.006, -.25),
    new THREE.Vector3(.25, -.006, .25), new THREE.Vector3(-.25, -.006, .25), new THREE.Vector3(-.25, -.006, -.25),
  ]);
  block.add(new THREE.Line(outlineGeometry, new THREE.LineBasicMaterial({color: '#6E6E73'})));
  block.add(mesh);
  const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({color: '#6E6E73'}));
  let skirt, texture = null, textureFile = '', version = 0, disposed = false;
  function updateGeometry(exaggeration) {
    mesh.scale.y = exaggeration;
    if (skirt) {block.remove(skirt); skirt.geometry.dispose(); skirt.material.dispose();}
    skirt = makeSkirt(mesh, exaggeration, site.width); block.add(skirt);
  }
  async function updateMaterial(image, inXR) {
    label.visible=inXR;
    const file = image && site.texture_status === 'available' ? (inXR ? site.texture_file_xr : site.texture_file) : '';
    if (file === textureFile) return;
    textureFile = file;
    const token = ++version;
    let next = null;
    if (file) {
      try {
        next = await new THREE.TextureLoader().loadAsync('/data/terrain/' + file);
        next.colorSpace = THREE.SRGBColorSpace; next.anisotropy = 4;
        const w=next.image.width,h=next.image.height;
        next.offset.set(.5/w,.5/h);next.repeat.set((w-1)/w,(h-1)/h);
        next.generateMipmaps = true; next.minFilter = THREE.LinearMipmapLinearFilter;
      } catch {next = null;}
    }
    if (disposed || token !== version) {next?.dispose(); return;}
    texture?.dispose(); texture = next;
    mesh.material.map = next;
    mesh.material.vertexColors = !next;
    mesh.material.color.set('#FFFFFF'); mesh.material.needsUpdate = true;
  }
  updateGeometry(settings.exaggeration);
  await updateMaterial(settings.image, settings.inXR);
  if (signal.aborted) {
    group.traverse(o => {o.geometry?.dispose(); if (o.material) o.material.dispose();});
    texture?.dispose();labelTexture.dispose(); leader.geometry.dispose(); leader.material.dispose(); return null;
  }
  return {site, group, leader, mesh, updateGeometry, updateMaterial, dispose() {
    disposed = true; version++;
    group.traverse(o => {o.geometry?.dispose(); o.material?.dispose();});
    texture?.dispose();labelTexture.dispose(); leader.geometry.dispose(); leader.material.dispose();
  }};
}
export function placePatch(patch, center, radius, staged, camera, index) {
  const normal = surfacePosition(patch.site.lat, patch.site.lon, 1);
  const anchor = normal.clone().multiplyScalar(radius).add(center);
  if (staged) {
    const forward = camera.position.clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    patch.group.position.copy(forward.multiplyScalar(135)).addScaledVector(right, index ? 18 : -18).add(new THREE.Vector3(20, 0, 0));
    patch.group.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  } else {
    patch.group.position.copy(normal.clone().multiplyScalar(radius + 6).add(center));
    patch.group.quaternion.copy(tangentRotation(patch.site.lat, patch.site.lon));
  }
  patch.leader.geometry.setFromPoints([anchor, patch.group.position]);
}
