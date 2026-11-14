import * as THREE from 'three';
import {createGlobeXRPanel} from './GlobeXRPanel';
export function createGlobeXR(globe, world, shared) {
  const renderer = globe.renderer(), scene = globe.scene(), camera = globe.camera(), controls = globe.controls();
  renderer.xr.enabled = true; renderer.xr.setFoveation(1);
  const panel = createGlobeXRPanel(); scene.add(panel.mesh); panel.mesh.visible = false;
  let session = null, lastState = null, lastHover = null, previousTime = 0, stageRefresh = 0;
  const controllers = [], hits = [], raycaster = new THREE.Raycaster(), rotation = new THREE.Matrix4();
  const savedPosition = new THREE.Vector3(), savedTarget = new THREE.Vector3();
  function hitPanel(controller) {
    rotation.extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    hits.length = 0; raycaster.intersectObject(panel.mesh, false, hits);
    return hits.length ? panel.hit(hits[0].uv) : null;
  }
  function action(id) {
    const state = shared.current;
    const sites = world.sites || [];
    const available = sites.filter(s => s.type === 'earth');
    if (id === 'previous' || id === 'next') {
      const i = available.findIndex(s => s.id === state.selectedId);
      state.openTerrain(available[(i + (id === 'next' ? 1 : -1) + available.length) % available.length]?.id);
    } else if (id === 'image') state.setTerrainMode(state.terrainMode === 'image' ? 'slope' : 'image');
    else if (id === 'compare') {state.setCompareTerrain(!state.compareTerrain);if(state.compareTerrain)state.setTerrainStaged(false);}
    else if (id === 'stage') state.setTerrainStaged(!state.terrainStaged);
    else if (id === 'hide') state.setTerrainVisible(!state.terrainVisible);
    else if (id === 'exit') session?.end();
    else if (id) state.setExaggeration(Number(id));
  }
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -2)]), new THREE.LineBasicMaterial({color: '#0066CC'}));
    controller.add(laser); scene.add(controller);
    const select = () => {
      if(shared.current.driveId)return;
      const id = hitPanel(controller);
      if (id) action(id); else world.rayPick(raycaster.ray.origin, raycaster.ray.direction);
    };
    controller.addEventListener('selectstart', select);
    controllers.push({controller, laser, select});
  }
  function restore() {
    session = null; renderer.setPixelRatio(Math.min(2,devicePixelRatio));
    world.table.position.set(0, 0, 0); world.table.scale.setScalar(1); world.table.rotation.set(0, 0, 0);
    panel.mesh.visible = false;
    camera.position.copy(savedPosition); controls.target.copy(savedTarget); controls.enabled = true; controls.update();
    world.position();
    shared.current.setInXR(false);
  }
  async function enter() {
    if (session) return session.end();
    savedPosition.copy(camera.position); savedTarget.copy(controls.target);
    try {
      if(shared.current.driveId)renderer.setPixelRatio(Math.min(1.5,devicePixelRatio));
      session = await navigator.xr.requestSession('immersive-vr', {optionalFeatures: ['local-floor']});
      let reference;
      try {reference = await session.requestReferenceSpace('local-floor');}
      catch {reference = (await session.requestReferenceSpace('local')).getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: -1.6, z: 0}));}
      renderer.xr.setReferenceSpaceType('local'); await renderer.xr.setSession(session); renderer.xr.setReferenceSpace(reference);
      if (session.supportedFrameRates?.includes(72)) await session.updateTargetFrameRate(72).catch(() => {});
      renderer.xr.setFoveation(1);
      session.addEventListener('end', restore, {once: true});
      controls.enabled = false; camera.position.set(0, 0, 0);
      world.table.scale.setScalar(.002); world.table.position.set(0, .9, -.8);
      // MENA faces the user on entry. Keep the globe and patches in one transform.
      world.table.rotation.set(THREE.MathUtils.degToRad(26), THREE.MathUtils.degToRad(-25), 0, 'YXZ');
      panel.mesh.visible = !shared.current.driveId;
      shared.current.setInXR(true); shared.current.setXRMessage('');
    } catch {
      await session?.end().catch(() => {}); restore();
      shared.current.setXRMessage('VR could not start. Check headset permissions and HTTPS, then try Enter VR again.');
    }
  }
  shared.current.xrAction.current = enter;
  let alive = true;
  navigator.xr?.isSessionSupported('immersive-vr').then(ok => {if (alive) shared.current.setXRSupported(ok);}).catch(() => {});
  function frame(time) {
    if (!session) return;
    const dt = Math.min((time - previousTime) / 1000 || 0, .05); previousTime = time;
    let hover = null;
    for (const {controller, laser} of controllers) {
      const id = hitPanel(controller); if (id) hover = id;
      laser.material.color.set(id ? '#1D1D1F' : '#0066CC');
    }
    for (const source of session.inputSources) {
      const axes = source.gamepad?.axes; if (!axes) continue;
      const x = axes[2] ?? axes[0] ?? 0, y = axes[3] ?? axes[1] ?? 0;
      if (source.handedness === 'left' && Math.abs(x) > .15) world.table.rotation.y -= x * dt;
      if (source.handedness === 'right' && Math.abs(y) > .15) {
        const scale = THREE.MathUtils.clamp(world.table.scale.x - y * dt * .002, .001, .004);
        world.table.scale.setScalar(scale);
      }
    }
    if (shared.current !== lastState || hover !== lastHover) {
      lastState = shared.current; lastHover = hover;
      if(lastState.terrainStaged)stageRefresh=2;
      panel.draw(lastState, world.sites?.find(s => s.id === lastState.selectedId), hover);
    }
    if(stageRefresh>0){world.position();stageRefresh--;}
  }
  return {frame, dispose() {
    alive = false; shared.current.xrAction.current = null; shared.current.setInXR(false); shared.current.setXRSupported(false);
    session?.removeEventListener('end', restore); session?.end().catch(() => {});
    for (const {controller, laser, select} of controllers) {
      controller.removeEventListener('selectstart', select);
      laser.geometry.dispose(); laser.material.dispose(); scene.remove(controller);
    }
    scene.remove(panel.mesh); panel.dispose();
  }};
}
