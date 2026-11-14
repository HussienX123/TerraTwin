import * as THREE from 'three';
import {createXRPanel} from './TerrainXRPanel';
export function createTerrainXR(renderer, scene, camera, table, controls, latest, onStatus) {
  renderer.xr.enabled = true;
  renderer.xr.setFoveation(1);
  const panel = createXRPanel();
  panel.mesh.visible = false;
  scene.add(panel.mesh);
  const raycaster = new THREE.Raycaster();
  const rotation = new THREE.Matrix4();
  const hits = [];
  const controllers = [];
  let session = null, hover = null, lastState = null, previousTime = 0;
  const savedPosition = new THREE.Vector3(), savedTarget = new THREE.Vector3();
  function action(id) {
    const state = latest.current;
    if (id === 'previous') state.onStep(-1);
    else if (id === 'next') state.onStep(1);
    else if (id === 'colors') state.onColors(!state.colors);
    else if (id === 'info') state.onInfo(!state.info);
    else if (id === 'exit') session?.end();
    else if (id) state.onExaggeration(Number(id));
  }
  function point(controller) {
    rotation.extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    hits.length = 0;
    raycaster.intersectObject(panel.mesh, false, hits);
    return hits.length ? panel.hit(hits[0].uv) : null;
  }
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -2)]);
    const laser = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: '#0066CC'}));
    controller.add(laser);
    const select = () => action(point(controller));
    controller.addEventListener('selectstart', select);
    scene.add(controller);
    controllers.push({controller, laser, select});
  }
  function restore() {
    session = null;
    panel.mesh.visible = false;
    table.position.set(0, 0, 0); table.rotation.set(0, 0, 0); table.scale.setScalar(1);
    camera.position.copy(savedPosition); controls.target.copy(savedTarget); controls.enabled = true;
    controls.update(); onStatus(false);
  }
  async function enter() {
    try {
      savedPosition.copy(camera.position); savedTarget.copy(controls.target);
      const xr = await navigator.xr.requestSession('immersive-vr', {optionalFeatures: ['local-floor']});
      session = xr;
      let reference;
      try { reference = await xr.requestReferenceSpace('local-floor'); }
      catch { reference = await xr.requestReferenceSpace('local'); reference = reference.getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: -1.6, z: 0})); }
      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(xr);
      renderer.xr.setReferenceSpace(reference);
      if (xr.supportedFrameRates?.includes(72)) await xr.updateTargetFrameRate(72).catch(() => {});
      renderer.xr.setFoveation(1);
      controls.enabled = false;
      camera.position.set(0, 0, 0);
      table.position.set(0, .9, -.75);
      panel.mesh.visible = true;
      xr.addEventListener('end', restore, {once: true});
      onStatus(true);
    } catch (error) {
      if (session) await session.end().catch(() => {});
      restore();
      throw new Error('VR could not start. Check headset permissions and HTTPS, then try Enter VR again.');
    }
  }
  function frame(time) {
    if (!session) return;
    const dt = Math.min((time - previousTime) / 1000 || 0, .05);
    previousTime = time;
    let nextHover = null;
    for (const item of controllers) {
      const id = point(item.controller);
      if (id) nextHover = id;
      item.laser.material.color.set(id ? '#1D1D1F' : '#0066CC');
    }
    for (const source of session.inputSources) {
      const axes = source.gamepad?.axes;
      if (!axes) continue;
      const x = axes[2] ?? axes[0] ?? 0, y = axes[3] ?? axes[1] ?? 0;
      if (source.handedness === 'left' && Math.abs(x) > .15) table.rotation.y -= x * dt;
      if (source.handedness === 'right' && Math.abs(y) > .15) table.scale.setScalar(THREE.MathUtils.clamp(table.scale.x - y * dt, .5, 2));
    }
    const state = latest.current;
    if (nextHover !== hover || state !== lastState) {
      hover = nextHover; lastState = state;
      panel.draw({name: state.earth.name, exaggeration: state.exaggeration, colors: state.colors, info: state.info}, hover);
    }
  }
  return {enter, frame, dispose() {
    session?.end().catch(() => {});
    panel.dispose(); scene.remove(panel.mesh);
    for (const {controller, laser, select} of controllers) {
      controller.removeEventListener('selectstart', select);
      laser.geometry.dispose(); laser.material.dispose(); scene.remove(controller);
    }
  }};
}
