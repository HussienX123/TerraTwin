import {createSelectionOutline} from './SelectionOutline';
import {createTerrainCamera} from './TerrainCamera';
import {mergeCountryGeometry} from './GlobeCountryGeometry';
import * as THREE from 'three';
import {createPatch, placePatch, surfacePosition} from './GlobeTerrainPatch';
import {createDataTiles, createSceneMarkers} from './GlobeDataTiles';
export function createGlobeTerrainWorld(globe, latest, shared) {
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const scene = globe.scene();
  const terrainCamera=createTerrainCamera(globe);
  const earth = scene.children.find(child => child.children.length > 0 && !child.isCamera && !child.isLight);
  if (!earth) throw new Error('The Earth scene group could not be located.');
  const table = new THREE.Group();
  scene.add(table); table.add(earth);
  const mars = new THREE.Mesh(new THREE.SphereGeometry(53.2, 64, 48), new THREE.MeshBasicMaterial({color: '#D9C4B3'}));
  table.add(mars); mars.visible = false;
  const jezeroMarker = new THREE.Mesh(new THREE.CircleGeometry(1, 12), new THREE.MeshBasicMaterial({color: '#1D1D1F', side: THREE.DoubleSide}));
  jezeroMarker.position.copy(surfacePosition(18.4, 77.75, 53.6));
  jezeroMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), jezeroMarker.position.clone().normalize());
  jezeroMarker.userData.mars = true;
  mars.add(jezeroMarker);
  let globeSphere;
  earth.traverse(child=>{if(child.isMesh && child.visible && child.geometry?.type === 'SphereGeometry' && child.geometry.parameters.radius === 100)globeSphere=child});
  if (globeSphere) {globeSphere.geometry.dispose(); globeSphere.geometry = new THREE.SphereGeometry(100, 64, 48);}
  const countries = mergeCountryGeometry(earth);
  const tiles = createDataTiles(latest.current.cells, latest.current.color);
  earth.add(tiles.mesh);
  const coveragePoints=[];
  for(let lon=-10;lon<=60;lon++)coveragePoints.push(surfacePosition(12,lon,102.8));
  for(let lat=13;lat<=40;lat++)coveragePoints.push(surfacePosition(lat,60,102.8));
  for(let lon=59;lon>=-10;lon--)coveragePoints.push(surfacePosition(40,lon,102.8));
  for(let lat=39;lat>=12;lat--)coveragePoints.push(surfacePosition(lat,-10,102.8));
  const coverage=new THREE.Line(new THREE.BufferGeometry().setFromPoints(coveragePoints),new THREE.LineBasicMaterial({color:'#1D1D1F'}));earth.add(coverage);
  let markers = createSceneMarkers(latest.current.markers), patches = [], generation = 0, abort = null;
  earth.add(markers.group);
  const ray = new THREE.Raycaster(), hits = [], pointer = new THREE.Vector2(), scratch = new THREE.Vector3();
  let animationStart = 0, currentVisible = false, hoveredId = null;
  let slideStart = 0, earthFrom = 0, earthTarget = 0, marsFrom = 140;
  const selectionLine = createSelectionOutline();
  earth.add(selectionLine);
  function disposePatches() {
    for (const patch of patches) {table.remove(patch.group, patch.leader); patch.dispose();}
    patches = [];
  }
  async function load() {
    const state = shared.current, sites = latest.current.terrainSites;
    const earthSite = sites.find(s => s.id === (state.selectedId === 'mars_jezero' ? state.lastEarthId : state.selectedId) && s.type === 'earth') || (state.selectedId === 'mars_jezero' ? sites.find(s=>s.type==='earth') : null);
    const marsSite = sites.find(s => s.type === 'mars');
    const token = ++generation;
    abort?.abort(); abort = new AbortController();
    disposePatches();slideStart=0;earth.visible=true;
    terrainCamera.setActive(state.terrainFocused&&!state.inXR&&state.terrainVisible);
    currentVisible = state.terrainVisible;
    const wasComparing = mars.visible;
    earthFrom = earth.position.x;
    marsFrom = wasComparing ? mars.position.x : 230;
    mars.visible = state.compareTerrain && state.terrainVisible;
    earthTarget = mars.visible ? -85 : 0;
    earth.position.x = earthTarget;
    mars.position.set(140, 0, 0);
    if (!currentVisible || (!earthSite && state.selectedId !== 'mars_jezero')) {state.setTerrainStatus('');return;}
    state.setTerrainStatus('Loading terrain…');
    const requested = [earthSite, mars.visible ? marsSite : null].filter(Boolean);
    const loaded = [];
    try {
      for (const site of requested) {
        const patch = await createPatch(site, {exaggeration: shared.current.exaggeration, image: shared.current.terrainMode === 'image', inXR: shared.current.inXR}, abort.signal);
        if (patch) loaded.push(patch);
        if (token !== generation) {loaded.forEach(p => p.dispose()); return;}
      }
      shared.current.setTerrainStatus('');patches = loaded;
      for (const patch of patches) {patch.updateGeometry(shared.current.exaggeration);patch.updateMaterial(shared.current.terrainMode === "image",shared.current.inXR);table.add(patch.group, patch.leader);}
      animationStart = performance.now();
      if (!shared.current.inXR) frameCamera();
      position();
      if (mars.visible && !wasComparing && !state.terrainFocused) {
        slideStart = performance.now();
        earth.position.x = earthFrom; mars.position.x = marsFrom;
        patches.forEach(p => {const delta=p.site.type === "mars" ? marsFrom-140 : earthFrom-earthTarget;p.group.position.x+=delta;const a=p.leader.geometry.attributes.position;a.setX(0,a.getX(0)+delta);a.setX(1,a.getX(1)+delta);a.needsUpdate=true});
      }
    } catch (error) {loaded.forEach(p=>p.dispose());if (token === generation) shared.current.setTerrainStatus('Terrain could not load. ' + error.message);}
  }
  function position() {
    if(shared.current.terrainFocused&&!shared.current.inXR){
      earth.visible=false;mars.visible=false;
      patches.forEach((patch,i)=>{patch.group.position.set(patches.length>1?(i===0?-18:18):0,0,0);patch.group.quaternion.identity();patch.leader.visible=false});return;
    }
    earth.visible=true;patches.forEach(p=>p.leader.visible=true);
    table.updateMatrixWorld(true);
    const localCamera = new THREE.Object3D();
    const renderCamera = globe.renderer().xr.isPresenting ? globe.renderer().xr.getCamera() : globe.camera();
    const transform = new THREE.Matrix4().copy(table.matrixWorld).invert().multiply(renderCamera.matrixWorld);
    transform.decompose(localCamera.position,localCamera.quaternion,localCamera.scale);
    patches.forEach((patch, i) => placePatch(patch, patch.site.type === 'mars' ? mars.position : earth.position,
      patch.site.type === 'mars' ? 53.2 : 100, shared.current.terrainStaged, localCamera, i));
  }
  function frameCamera(aspect = globe.camera().aspect) {
    const state = shared.current;
    if(state.terrainFocused&&!state.inXR){
      terrainCamera.reset(aspect,patches.length);return;
    }
    globe.controls().minDistance=101;globe.controls().maxDistance=10000;
    const site = patches.find(p => p.site.type === 'earth')?.site || patches[0]?.site;
    if (!site) return;
    const target = mars.visible ? new THREE.Vector3(20, 0, 0) : earth.position.clone();
    const direction = surfacePosition(Math.min(75, site.lat + 12), site.lon - 14, 1);
    const distance = (mars.visible ? 560 : 340) * Math.max(1,(mars.visible ? 1 : .75)/aspect);
    const camera = globe.camera(), controls = globe.controls();
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.target.copy(target); controls.update();
  }
  function rayPick(origin, direction) {
    table.updateMatrixWorld(true);
    ray.set(origin, direction);
    hits.length = 0;
    selectionLine.visible = false;
    ray.intersectObjects(mars.visible ? [earth, mars] : [earth], true, hits);
    selectionLine.visible = !!latest.current.selected;
    if (!hits.length) return false;
    const hit = hits[0];
    if (hit.object.userData.mars || hit.object === mars) {shared.current.openTerrain('mars_jezero'); return true;}
    const marker = hit.object.userData.marker;
    const cell = hit.instanceId != null ? latest.current.cells[hit.instanceId] : null;
    if (marker) {if(marker.terrainSiteId)shared.current.openTerrain(marker.terrainSiteId);else latest.current.pick(marker.lat, marker.lon); return true;}
    if (cell) {latest.current.pick(cell.lat, cell.lon); return true;}
    scratch.copy(hit.point); table.worldToLocal(scratch); scratch.sub(earth.position).normalize();
    latest.current.pick(Math.asin(scratch.y) * 180 / Math.PI, Math.atan2(scratch.x, scratch.z) * 180 / Math.PI);
    return true;
  }
  function desktopPick(event, canvas) {
    if(shared.current.terrainFocused)return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    ray.setFromCamera(pointer, globe.camera());
    if (!rayPick(ray.ray.origin, ray.ray.direction)) {
      const inverse = new THREE.Matrix4().copy(table.matrixWorld).invert();
      scratch.copy(ray.ray.origin).applyMatrix4(inverse);
      const sphere = new THREE.Sphere(earth.position, 100);
      const localRay = ray.ray.clone().applyMatrix4(inverse);
      const point = localRay.intersectSphere(sphere, scratch);
      if (point) {point.sub(earth.position).normalize(); latest.current.pick(Math.asin(point.y) * 180 / Math.PI, Math.atan2(point.x, point.z) * 180 / Math.PI);}
    }
  }
  function highlight(cell) {
    selectionLine.visible = !!cell;
    if (!cell) return;
    const points = [[-.5,-.5],[-.5,.5],[.5,.5],[.5,-.5]].map(([a,b]) => surfacePosition(cell.lat+a,cell.lon+b,102.8));
    selectionLine.update(points);
  }
  function desktopHover(event, canvas) {
    if(shared.current.terrainFocused)return null;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    ray.setFromCamera(pointer,globe.camera()); hits.length=0;
    ray.intersectObject(earth,true,hits);
    const first = hits.find(hit => hit.object.isMesh);
    const cell = first?.instanceId != null ? latest.current.cells[first.instanceId] : null;
    if (cell?.id !== hoveredId) {
      hoveredId=cell?.id; latest.current.hover(cell);
      highlight(cell || latest.current.selected);
    }
    return cell;
  }
  return {terrainCamera,table, earth, mars, tiles, rayPick, desktopPick, desktopHover, highlight, load, position, frameCamera,
    get patches() {return patches;},
    recolor() {tiles.recolor(latest.current.color);},
    updateMarkers() {earth.remove(markers.group); markers.dispose(); markers = createSceneMarkers(latest.current.markers); earth.add(markers.group);},
    updateMaterial() {patches.forEach(p => p.updateMaterial(shared.current.terrainMode === 'image', shared.current.inXR));},
    exaggerate() {patches.forEach(p => p.updateGeometry(shared.current.exaggeration));},
    frame(time) {
      terrainCamera.setActive(shared.current.terrainFocused&&!shared.current.inXR&&!shared.current.driveId&&shared.current.terrainVisible);terrainCamera.update();
      if (slideStart) {
        const t=reducedMotion.matches?1:Math.min(1,(time-slideStart)/400);
        const nextEarth=earthFrom+(earthTarget-earthFrom)*t,nextMars=marsFrom+(140-marsFrom)*t;
        const de=nextEarth-earth.position.x,dm=nextMars-mars.position.x;
        earth.position.x=nextEarth;mars.position.x=nextMars;
        for(const p of patches){const d=p.site.type==="mars"?dm:de;const a=p.leader.geometry.attributes.position;a.setX(0,a.getX(0)+d);if(!shared.current.terrainStaged){p.group.position.x+=d;a.setX(1,a.getX(1)+d)}a.needsUpdate=true}
        if(t===1)slideStart=0;
      }
      if (!patches.length || !animationStart) return;
      const progress = reducedMotion.matches ? 1 : Math.min(1, (time - animationStart) / 400);
      for (const patch of patches) patch.group.scale.setScalar(.01 + .99 * progress);
      if (progress === 1) animationStart = 0;
    },
    dispose() {
      terrainCamera.dispose();generation++; abort?.abort(); disposePatches();
      coverage.geometry.dispose();coverage.material.dispose();
      selectionLine.dispose();
      countries.dispose(); tiles.dispose(); markers.dispose();
      mars.geometry.dispose(); mars.material.dispose(); jezeroMarker.geometry.dispose(); jezeroMarker.material.dispose();
      scene.remove(table); table.remove(earth); scene.add(earth);
    },
  };
}
