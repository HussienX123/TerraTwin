import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createTerrain, loadHeights} from './terrainData';
import {createTerrainXR} from './TerrainXR';
export default function TerrainScene(props) {
  const host = useRef(null), runtime = useRef(null), latest = useRef(props);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [vrError, setVRError] = useState('');
  const [supported, setSupported] = useState(false), [inVR, setInVR] = useState(false);
  latest.current = props;
  useEffect(() => {
    let alive = true;
    navigator.xr?.isSessionSupported('immersive-vr').then(ok => {if (alive) setSupported(ok);}).catch(() => {});
    return () => {alive = false;};
  }, []);
  useEffect(() => {
    const node = host.current;
    let renderer, controls, xr, observer;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F5F5F7');
    const camera = new THREE.PerspectiveCamera(42, 1, .01, 20);
    camera.position.set(0, .8, 1.05);
    const table = new THREE.Group();
    scene.add(table);
    scene.add(new THREE.HemisphereLight('#ffffff', '#9891ad', .45));
    const sun = new THREE.DirectionalLight('#ffffff', .65);
    sun.position.set(-1, 2, 1); scene.add(sun);
    try {
      renderer = new THREE.WebGLRenderer({antialias: true});
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.xr.enabled = true;
      node.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label', 'Two central 60 km terrain windows. Earth on the left, Jezero on the right.');
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, .03, 0); controls.minDistance = .35; controls.maxDistance = 4;
      controls.maxPolarAngle = Math.PI * .49; controls.update();
      xr = createTerrainXR(renderer, scene, camera, table, controls, latest, setInVR);
      runtime.current = {renderer, scene, camera, controls, table, xr, meshes: [], cache: new Map()};
      observer = new ResizeObserver(() => {
        if (renderer.xr.isPresenting) return;
        const w = node.clientWidth, h = node.clientHeight;
        renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(Math.max(1.7, 1.65 / camera.aspect));
        camera.position.copy(controls.target).add(offset); controls.update();
      });
      observer.observe(node);
      renderer.setAnimationLoop(time => {
        if (document.hidden && !renderer.xr.isPresenting) return;
        xr.frame(time);
        renderer.render(scene, camera);
      });
    } catch {
      setError('The terrain renderer could not start. Try a browser with WebGL enabled.');
    }
    const visibility = () => {if (!document.hidden) controls?.update();};
    document.addEventListener('visibilitychange', visibility);
    return () => {
      runtime.current = null;
      observer?.disconnect(); document.removeEventListener('visibilitychange', visibility);
      renderer?.setAnimationLoop(null); xr?.dispose(); controls?.dispose();
      table.children.forEach(mesh => {mesh.geometry.dispose(); mesh.material.dispose();});
      renderer?.dispose(); renderer?.forceContextLoss(); node.replaceChildren();
    };
  }, []);
  useEffect(() => {
    const state = runtime.current;
    if (!state) return;
    const abort = new AbortController();
    setLoading(true); setError('');
    const sites = [props.earth, props.mars];
    Promise.all(sites.map(async site => {
      if (site.status !== 'available') return null;
      if (!state.cache.has(site.id)) state.cache.set(site.id, await loadHeights(site, abort.signal));
      return state.cache.get(site.id);
    })).then(heights => {
      if (abort.signal.aborted) return;
      const meshes = heights.map((values, i) => values ? createTerrain(sites[i], values) : null);
      state.meshes.forEach(mesh => {state.table.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose();});
      state.meshes = meshes.filter(Boolean);
      meshes.forEach((mesh, i) => {
        if (!mesh) return;
        mesh.position.x = i === 0 ? -.275 : .275;
        mesh.scale.y = latest.current.exaggeration;
        mesh.material.vertexColors = latest.current.colors;
        state.table.add(mesh);
      });
      setLoading(false);
    }).catch(err => {if (!abort.signal.aborted) {setError(err.message); setLoading(false);}});
    return () => abort.abort();
  }, [props.earth, props.mars]);
  useEffect(() => {
    runtime.current?.meshes.forEach(mesh => {
      mesh.scale.y = props.exaggeration;
      mesh.material.vertexColors = props.colors; mesh.material.needsUpdate = true;
      mesh.material.color.set(props.colors ? '#FFFFFF' : '#CBC9E2');
    });
  }, [props.exaggeration, props.colors]);
  function move(action) {
    const state = runtime.current;
    if (!state || state.renderer.xr.isPresenting) return;
    const offset = state.camera.position.clone().sub(state.controls.target);
    if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -.15 : .15);
    else if (action === 'in' || action === 'out') offset.multiplyScalar(action === 'in' ? .85 : 1.15);
    else {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + (action === 'up' ? -.12 : .12), .1, Math.PI / 2 - .02);
      offset.setFromSpherical(spherical);
    }
    state.camera.position.copy(state.controls.target).add(offset); state.controls.update();
  }
  function key(event) {
    const actions = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'in', '=': 'in', '-': 'out'};
    if (actions[event.key]) {event.preventDefault(); move(actions[event.key]);}
    const index = ['1', '2', '3', '4'].indexOf(event.key);
    if (index >= 0) props.onExaggeration([1, 2, 5, 10][index]);
  }
  return <section className="terrain-stage" onKeyDown={key} tabIndex={0} aria-label="Terrain controls. Arrow keys rotate. Plus and minus zoom. Keys 1 to 4 set exaggeration.">
    <div ref={host} className="terrain-canvas"/>
    <div className="terrain-scene-labels"><span>{props.earth.name}</span><span>Jezero</span></div>
    <span className="badge terrain-exaggeration">Vertical exaggeration {props.exaggeration}x</span>
    {loading && <p className="terrain-status" role="status">Loading terrain</p>}
    {error && <p className="terrain-status" role="alert">{error}</p>}
    <div className="terrain-orbit-controls">
      {[['left', 'Rotate left'], ['right', 'Rotate right'], ['up', 'Tilt up'], ['down', 'Tilt down'], ['in', 'Zoom in'], ['out', 'Zoom out']].map(([action, label]) => <button key={action} onClick={() => move(action)}>{label}</button>)}
    </div>
    <div className="terrain-vr-control">
      <button disabled={!supported || loading || !!error} onClick={async () => {
        setVRError('');
        try {if (inVR) await runtime.current?.renderer.xr.getSession()?.end(); else await runtime.current?.xr.enter();}
        catch (err) {setVRError(err.message);}
      }}>{supported ? inVR ? 'Exit VR' : 'Enter VR' : 'VR unavailable'}</button>
      {vrError && <p role="alert" className="small-note">{vrError}</p>}
      {!supported && <p className="small-note">VR needs a headset browser such as Meta Quest Browser, opened over HTTPS.</p>}
    </div>
  </section>;
}
