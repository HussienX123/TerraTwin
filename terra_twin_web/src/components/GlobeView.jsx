import React, {useEffect, useRef} from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import {feature} from 'topojson-client';
import atlas from 'world-atlas/countries-110m.json';
import {useSelection} from '../Selection';
import {createGlobeTerrainWorld} from './GlobeTerrainWorld';
import {createGlobeXR} from './GlobeXR';
import {HORIZONTAL_MAGNIFICATION} from './GlobeTerrainPatch';
import {textureCaption} from './GlobeTerrainControls';
import {FEATURES} from '../config/features';
const DriveOverlay = React.lazy(() => import('../drive/DriveOverlay'));
const countries = feature(atlas, atlas.objects.countries).features;
export default function GlobeView(props) {
  const host = useRef(null), runtime = useRef(null), latest = useRef(props), tooltip = useRef(null);
  const sharedState = useSelection(), shared = useRef(sharedState), labels = useRef([]);
  latest.current = props; shared.current = sharedState;
  useEffect(() => {
    const node = host.current;
    let globe, world, xr, observer, canvas, sun;
    let startX = 0, startY = 0, dragged = false, cancelled = false;
    const lost = event => {event.preventDefault(); latest.current.fail();};
    const pointerDown = event => {startX = event.clientX; startY = event.clientY; dragged = false;};
    const pointerMove = event => {
      if (Math.hypot(event.clientX-startX,event.clientY-startY)>6) dragged=true;
      if (shared.current.driveId || !world || event.buttons) return;
      const cell=world.desktopHover(event,canvas);
      if (tooltip.current) {
        tooltip.current.style.display=cell?'block':'none';
        tooltip.current.textContent=cell?latest.current.label(cell).replaceAll('<br>',' / '):'';
        tooltip.current.style.left=(event.clientX-node.getBoundingClientRect().left+12)+'px';
        tooltip.current.style.top=(event.clientY-node.getBoundingClientRect().top+12)+'px';
      }
    };
    const pointerUp = event => {if (!shared.current.driveId && !dragged && !globe.renderer().xr.isPresenting) world.desktopPick(event, canvas);};
    const initialize = async () => {try {
      globe = new Globe(node, {animateIn: false});
      const land = new THREE.MeshBasicMaterial({color: '#DFDFC9', toneMapped: false});
      globe.width(node.clientWidth).height(node.clientHeight).backgroundColor('#FFFFFF').showAtmosphere(false)
        .globeMaterial(new THREE.MeshBasicMaterial({color: '#91C4DA', toneMapped: false}))
        .polygonsData(countries).polygonGeoJsonGeometry(d => d.geometry).polygonCapCurvatureResolution(2).polygonAltitude(.02)
        .polygonCapMaterial(() => land).polygonSideMaterial(() => land).polygonStrokeColor(() => '#909A8B')
        .polygonsTransitionDuration(0).tilesData([]).htmlElementsData([])
        .onGlobeClick(null).onPolygonClick(null);
      globe.pointOfView({lat: 26, lng: 25, altitude: 1.7}, 0);
      await new Promise(resolve => setTimeout(resolve, 60));
      if (cancelled) return;
      globe.pauseAnimation();
      const renderer = globe.renderer();
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = false;
      globe.scene().children.filter(object => object.isLight).forEach(light => globe.scene().remove(light));
      const ambient = new THREE.AmbientLight('#FFFFFF', .65);
      sun = new THREE.DirectionalLight('#FFFFFF', 1.1); sun.position.set(-200, 300, 400);
      globe.scene().add(ambient, sun);
      world = createGlobeTerrainWorld(globe, latest, shared);
      world.sites = latest.current.terrainSites;
      if (FEATURES.vr) xr = createGlobeXR(globe, world, shared);
      runtime.current = {globe, world, xr};
      world.load();
      world.highlight(latest.current.selected);
      canvas = renderer.domElement;
      canvas.setAttribute('aria-label', 'Earth screening globe with registered terrain blocks. Use Jump to and Terrain controls to select sites with a keyboard.');
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('pointerdown', pointerDown);
      canvas.addEventListener('pointermove', pointerMove);
      canvas.addEventListener('pointerup', pointerUp);
      const projected = new THREE.Vector3();
      renderer.setAnimationLoop(time => {
        if (document.hidden && !renderer.xr.isPresenting) return;
        if(renderer.xr.isPresenting && renderer.xr.getSession()?.visibilityState === 'hidden')return;
        if(runtime.current?.drive){runtime.current.drive.frame(time);return}
        if (!renderer.xr.isPresenting && !shared.current.terrainFocused) globe.controls().update();
        world.frame(time); xr?.frame(time);
        renderer.render(globe.scene(), globe.camera());
        for (let i = 0; i < labels.current.length; i++) {
          const label = labels.current[i], patch = world.patches[i];
          if (!label || !patch) {if (label) label.style.display = 'none'; continue;}
          if(renderer.xr.isPresenting){label.style.display='none';continue;}
          projected.copy(patch.group.position).applyMatrix4(world.table.matrixWorld).project(globe.camera());
          label.style.display = renderer.xr.isPresenting || projected.z > 1 ? 'none' : 'block';
          let left=(projected.x+1)/2*node.clientWidth;
          left-=world.patches.length>1?(i===0?label.offsetWidth:0):label.offsetWidth/2;
          label.style.transform='none';
          label.style.left=Math.max(8,Math.min(node.clientWidth-label.offsetWidth-8,left))+'px';
          label.style.top = ((1 - projected.y) / 2 * node.clientHeight + 30) + 'px';
        }
      });
      observer = new ResizeObserver(() => {
        if (renderer.xr.isPresenting) return;
        globe.width(node.clientWidth).height(node.clientHeight);
        if(!shared.current.driveId && shared.current.terrainVisible){world.frameCamera(node.clientWidth/Math.max(1,node.clientHeight));world.position();}
      });
      observer.observe(node);
    } catch (error) {console.error(error); latest.current.fail();}};
    initialize();
    return () => {
      cancelled = true;
      runtime.current = null;
      observer?.disconnect();
      canvas?.removeEventListener('webglcontextlost', lost);
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointermove', pointerMove);
      canvas?.removeEventListener('pointerup', pointerUp);
      globe?.renderer().setAnimationLoop(null);
      xr?.dispose(); world?.dispose();
      globe?.pauseAnimation();
      const renderer = globe?.renderer();
      globe?._destructor(); renderer?.dispose(); renderer?.forceContextLoss();
      node.replaceChildren();
    };
  }, []);
  useEffect(() => {runtime.current?.world.recolor();}, [props.color]);
  useEffect(() => {runtime.current?.world.highlight(props.selected);}, [props.selected]);
  useEffect(() => {runtime.current?.world.updateMarkers();}, [props.markers]);
  useEffect(() => {
    const state = runtime.current;
    if (!state) return;
    state.world.sites = props.terrainSites;
    state.world.load();
  }, [props.terrainSites, sharedState.selectedId, sharedState.lastEarthId, sharedState.terrainVisible, sharedState.compareTerrain,sharedState.terrainFocused]);
  useEffect(() => {runtime.current?.world.exaggerate();}, [sharedState.exaggeration]);
  useEffect(() => {runtime.current?.world.updateMaterial();}, [sharedState.terrainMode, sharedState.inXR]);
  useEffect(() => {runtime.current?.world.position();}, [sharedState.terrainStaged]);
  useEffect(() => {
    const state = runtime.current;
    if (!state || shared.current.inXR || shared.current.terrainVisible) return;
    state.globe.pointOfView(props.selected ? {lat: props.selected.lat, lng: props.selected.lon, altitude: .85} : {lat: 26, lng: 25, altitude: 1.7}, 0);
  }, [props.selected, props.recenter]);
  const site = props.terrainSites.find(s => s.id === (sharedState.selectedId === 'mars_jezero' ? sharedState.lastEarthId : sharedState.selectedId) && s.type === 'earth');
  const mars = props.terrainSites.find(s => s.type === 'mars');
  const shownSites = sharedState.terrainVisible ? [site, sharedState.compareTerrain ? mars : null].filter(Boolean) : [];
  return <div className={"globe-terrain-view"+(sharedState.terrainFocused?" terrain-focused":"")}>
    {FEATURES.terrain && sharedState.terrainFocused&&<div className="terrain-focus-toolbar"><strong>Terrain 3D</strong><button aria-label="Zoom in on terrain" onClick={()=>runtime.current?.world.terrainCamera.zoom(.8)}>+</button><button aria-label="Zoom out from terrain" onClick={()=>runtime.current?.world.terrainCamera.zoom(1.25)}>−</button><button onClick={()=>runtime.current?.world.frameCamera()}>Reset view</button><button onClick={()=>sharedState.setTerrainFocused(false)}>Return to globe</button></div>}
    {FEATURES.terrain && sharedState.terrainStatus&&!sharedState.driveId&&<p className="terrain-load-status" role="status">{sharedState.terrainStatus}</p>}
    <div ref={host} className="globe-surface"/>{FEATURES.terrain && sharedState.terrainFocused&&<p className="terrain-camera-help">Drag to orbit · Scroll or pinch to zoom</p>}<div ref={tooltip} className="globe-cell-tooltip" role="status"/>
    {FEATURES.drive && sharedState.driveId && <React.Suspense fallback={<div className="drive-screen"><div className="drive-card" role="status">Loading driving terrain…</div></div>}><DriveOverlay key={sharedState.driveId} id={sharedState.driveId} runtime={runtime} featured={props.terrainSites.find(s=>s.id===sharedState.driveId)} cell={props.selected}/></React.Suspense>}
    {FEATURES.terrain && shownSites.length > 0 && <div className="globe-terrain-badges"><span className="badge">Magnified about {HORIZONTAL_MAGNIFICATION.toFixed(1)} x (horizontal)</span><span className="badge">Vertical exaggeration {sharedState.exaggeration}x</span></div>}
    {FEATURES.terrain && shownSites.map((s, i) => <div key={s.id} className="patch-label" ref={element => {labels.current[i] = element;}}>
      <strong>{s.name} / {s.type === 'mars' ? 'Mars' : 'Earth'}</strong>
      <details><summary>Texture details</summary><p>{textureCaption(s)}</p></details>
    </div>)}
  </div>;
}
