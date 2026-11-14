import {loadTerrainCatalog} from './terrainCatalog';
import {introSeen,markIntro} from '../play/storage';
import GlobeTerrainControls from './GlobeTerrainControls';
import {useSelection} from '../Selection';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import MapControls,{LAYER_DEFS,MARKER_META} from './MapControls';
import CellDetailPanel from './CellDetailPanel';
import MapLegend from './MapLegend';
import InspectorSheet from './InspectorSheet';
import InfoSheet from './InfoSheet';
import Icon from '../icons';
import {DEFAULT_WEIGHTS,buildSortedOverall,computeOverall,fmt,normalizeWeights,weakPercentile} from '../utils/scoring';
import {quantileBins,binColor} from '../utils/mapPresentation';
import {FEATURES} from '../config/features';
const GlobeView=React.lazy(()=>import('./GlobeView'));
const markerShapes=["<circle cx=\"12\" cy=\"12\" r=\"8\"/>","<path d=\"m12 2 10 10-10 10L2 12Z\"/>","<path d=\"m12 2 10 19H2Z\"/>","<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" fill=\"white\" stroke=\"currentColor\" stroke-width=\"3\"/>"];
function valueFor(cell,layer,weights){if(layer==='data_completeness')return cell.data_completeness==null?null:cell.data_completeness*100;if(cell.is_water)return null;return layer==='overall_score'?computeOverall(cell,weights):cell[layer]}
export default function MapPage({cellsData,candidates,analogs,validation}){
 const shared=useSelection();
 const {layer,setLayer,rawWeights,setRawWeights,selectedId,setSelectedId,view,setView,setTerrainVisible}=shared;
 const [terrainIndex,setTerrainIndex]=useState(null);
 useEffect(()=>{const controller=new AbortController();loadTerrainCatalog().then(index=>{if(!controller.signal.aborted)setTerrainIndex(index)}).catch(()=>{});return()=>controller.abort()},[]);
 useEffect(()=>{if(shared.terrainFocused)setShowInfo(false)},[shared.terrainFocused]);
 const [showInfo,setShowInfo]=useState(()=>!shared.driveId && !shared.terrainFocused && !introSeen()),[tab,setTab]=useState(selectedId?'cell':'layers'),[detent,setDetent]=useState('peek'),[dismissed,setDismissed]=useState(false);
 const [showMarkers,setShowMarkers]=useState({clusters:true,disagreements:true,analogs:true,negatives:true});
 const weights=useMemo(()=>normalizeWeights(rawWeights),[rawWeights]),cells=cellsData.cells;
 const bins=useMemo(()=>quantileBins(cells.filter(c=>!c.is_water&&(!c.low_completeness_flag||layer==='data_completeness')).map(c=>valueFor(c,layer,weights))),[cells,layer,weights]);
 const container=useRef(null),mapRef=useRef(null),rects=useRef([]),groups=useRef({}),current=useRef({layer,weights,bins});
 current.current={layer,weights,bins};
 const select=useCallback(id=>{setSelectedId(id);setTerrainVisible(true);setTab('cell');setDetent('medium');setDismissed(false)},[]);
 const closeInfo=useCallback(()=>{setShowInfo(false);markIntro()},[]);
 const selected=cells.find(c=>c.id===selectedId)||null;
 const overall=selected?computeOverall(selected,weights):null;
 const pct=useMemo(()=>selected&&overall!=null?weakPercentile(buildSortedOverall(cells,weights),overall):null,[cells,selected,overall,weights]);
 function fill(cell,active){if(cell.is_water)return '#e5e5ea';if(cell.low_completeness_flag&&active.layer!=='data_completeness')return 'url(#low-data-hatch)';return binColor(valueFor(cell,active.layer,active.weights),active.bins)}
 useEffect(()=>{
  const map=L.map(container.current,{center:[26,25],zoom:4,minZoom:3,maxZoom:10,zoomAnimation:false,fadeAnimation:false});mapRef.current=map;
  const tiles=L.tileLayer(import.meta.env.VITE_CARTO_API_KEY ? 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+encodeURIComponent(import.meta.env.VITE_CARTO_API_KEY) : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap contributors © CARTO',maxZoom:19});let fallback=false;
  tiles.on('tileerror',()=>{if(fallback)return;fallback=true;map.removeLayer(tiles);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map)});tiles.addTo(map);
  const renderer=L.svg({padding:.5});renderer.addTo(map);
  const svg=container.current.querySelector('.leaflet-overlay-pane svg');const ns='http://www.w3.org/2000/svg';const defs=document.createElementNS(ns,'defs');defs.innerHTML='<pattern id="low-data-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#aeaeb2"/><path d="M-2 2 2-2M0 8 8 0M6 10 10 6" stroke="#fff" stroke-width="2"/></pattern>';svg.prepend(defs);
  const half=(cellsData.grid_deg||1)/2;
  rects.current=cells.map((cell,index)=>{
   const rect=L.rectangle([[cell.lat-half,cell.lon-half],[cell.lat+half,cell.lon+half]],{renderer,weight:.5,color:'#6e6e73',opacity:.35,fillOpacity:.72,fillColor:fill(cell,current.current)}).addTo(map);
   rect.on('click',()=>select(cell.id));rect.on('mouseover',()=>rect.setStyle({weight:2,opacity:1}));rect.on('mouseout',()=>rect.setStyle({weight:rect.getElement()?.getAttribute('aria-pressed')==='true'?2:.5,opacity:rect.getElement()?.getAttribute('aria-pressed')==='true'?1:.35}));
   const el=rect.getElement();el.setAttribute('tabindex',index===0?'0':'-1');el.setAttribute('role','button');el.setAttribute('aria-label',cell.id+', '+cell.lat+' degrees latitude, '+cell.lon+' degrees longitude. Select to inspect scores.');
   el.addEventListener('focus',()=>rect.setStyle({color:'#05061A',weight:2,opacity:1}));
   el.addEventListener('blur',()=>rect.setStyle({color:el.getAttribute('aria-pressed')==='true'?'#05061A':'#6e6e73',weight:el.getAttribute('aria-pressed')==='true'?2:.5}));
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(cell.id)}if(e.key.startsWith('Arrow')){e.preventDefault();e.stopPropagation();const target=e.key==='ArrowRight'?[cell.lat,cell.lon+1]:e.key==='ArrowLeft'?[cell.lat,cell.lon-1]:e.key==='ArrowUp'?[cell.lat+1,cell.lon]:[cell.lat-1,cell.lon];const next=rects.current.find(x=>x.cell.lat===target[0]&&x.cell.lon===target[1]);if(next){el.setAttribute('tabindex','-1');next.rect.getElement().setAttribute('tabindex','0');next.rect.getElement().focus();map.panInside([next.cell.lat,next.cell.lon],{animate:false})}}});
   return {cell,rect};
  });
  groups.current=Object.fromEntries(MARKER_META.map(m=>[m.key,L.layerGroup().addTo(map)]));
  function marker(key,lat,lon,label){L.marker([lat,lon],{icon:L.divIcon({className:'map-marker',html:'<svg viewBox="0 0 24 24" width="18" height="18">'+markerShapes[MARKER_META.findIndex(m=>m.key===key)]+'</svg>',iconSize:[24,24]}),title:label,alt:label}).bindTooltip(label).addTo(groups.current[key])}
  (candidates.clusters||[]).forEach(c=>marker('clusters',c.center.lat,c.center.lon,'Cluster #'+c.rank+' ('+c.n_cells+' cells, overall (exploratory): '+fmt(c.mean_scores?.overall_score)+')'));
  (candidates.disagreements||[]).forEach(d=>marker('disagreements',d.lat,d.lon,'Disagreement '+d.id+': terrain '+fmt(d.terrain_score)+', mobility '+fmt(d.mobility_score)));
  (analogs.analogs||[]).forEach(a=>marker('analogs',a.lat,a.lon,'Known analog: '+a.name+' ('+a.status+')'));
  (analogs.negative_controls||[]).forEach(a=>marker('negatives',a.lat,a.lon,'Negative control: '+a.name+' ('+a.status+')'));
  const tileWarning = import.meta.env.DEV && setTimeout(() => {
    if (!container.current?.clientHeight) console.warn('TerraTwin map container has zero height.');
    if (!container.current?.querySelector('.leaflet-tile-loaded')) console.warn('TerraTwin map has no loaded basemap tiles. Check the tile requests.');
  }, 6000);
  const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(container.current);
  return()=>{clearTimeout(tileWarning);resize.disconnect();map.remove();mapRef.current=null;rects.current=[]};
 },[cells,cellsData.grid_deg,candidates,analogs,select]);
 useEffect(()=>{const start=performance.now();rects.current.forEach(({cell,rect})=>{const selected=cell.id===selectedId;rect.setStyle({fillColor:fill(cell,{layer,weights,bins}),color:selected?'#05061A':'#6e6e73',weight:selected?2:.5,opacity:selected?1:.35});rect.getElement()?.setAttribute('aria-pressed',String(selected))});if(selectedId)rects.current.find(x=>x.cell.id===selectedId)?.rect.bringToFront();window.__terraTwinPaintMs=performance.now()-start},[layer,weights,bins,selectedId]);
 useEffect(()=>{Object.entries(groups.current).forEach(([key,group])=>{if(showMarkers[key])group.addTo(mapRef.current);else mapRef.current?.removeLayer(group)})},[showMarkers]);

 const [message,setMessage]=useState('');
 const [jumpOpen,setJumpOpen]=useState(false);
 const jumpTrigger=useRef(null),jumpList=useRef(null);
 useEffect(()=>{if(jumpOpen)jumpList.current?.querySelector('button')?.focus()},[jumpOpen]);
 function closeJump(){setJumpOpen(false);jumpTrigger.current?.focus()}
 const [recenter,setRecenter]=useState(0);
 const [hovered,setHovered]=useState(null);
 const cellIndex=useMemo(()=>new Map(cells.map(c=>[[c.lat,c.lon].join(','),c])),[cells]);
 function pick(lat,lon){
   const cell=cellIndex.get([Math.floor(lat)+.5,Math.floor(lon)+.5].join(','));
   if(cell){select(cell.id);setMessage('');mapRef.current?.panTo([cell.lat,cell.lon],{animate:false})}
   else setMessage('No data here yet. This project covers the Middle East and North Africa.');
 }
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),6500);return()=>clearTimeout(timer)},[message]);
 const globeColor=useCallback(cell=>{
   const result=fill(cell,{layer,weights,bins});
   return result.startsWith('url')?'#aeaeb2':result;
 },[layer,weights,bins]);
 const ranked=useMemo(()=>cells.filter(c=>!c.is_water).map(c=>valueFor(c,layer,weights)).filter(Number.isFinite).sort((a,b)=>a-b),[cells,layer,weights]);
 const markers=useMemo(()=>{
   const symbols=markerShapes;
   return [candidates.clusters.map(c=>({...c.center,label:'Cluster '+c.rank,terrainSiteId:terrainIndex?.sites.find(s=>s.name==='Cluster '+c.rank)?.id})),candidates.disagreements.map(c=>({...c,label:c.id})),analogs.analogs.map(c=>({...c,label:c.name})),analogs.negative_controls.map(c=>({...c,label:c.name}))].flatMap((group,i)=>group.map(m=>({...m,key:MARKER_META[i].key,svg:'<svg viewBox="0 0 24 24" width="18" height="18">'+symbols[i]+'</svg>'})));
 },[candidates,analogs,terrainIndex]);
 const visibleMarkers=useMemo(()=>markers.filter(m=>showMarkers[m.key]),[markers,showMarkers]);
 useEffect(()=>{if(view==='map'){mapRef.current?.invalidateSize();if(selected)mapRef.current?.panTo([selected.lat,selected.lon],{animate:false})}},[view,selected,detent]);
 return <section className="map-workspace" aria-label="Earth analog screening map"><div className="map-stage"><div className="map-toolbar">{FEATURES.globe && <div className="view-buttons">{['globe','map'].map(v=><button key={v} aria-pressed={v===view} onClick={()=>setView(v)}>{v==='globe'?'Globe':'Map'}</button>)}</div>}<div className="map-toolbar-actions"><button ref={jumpTrigger} aria-expanded={jumpOpen} onClick={()=>setJumpOpen(!jumpOpen)}>Jump to</button><button aria-label="Recenter on MENA" title="Recenter on MENA" onClick={()=>{setSelectedId(null);setRecenter(r=>r+1);mapRef.current?.setView([26,25],4,{animate:false})}}><Icon name="compass"/></button><button aria-label="About this map" onClick={()=>setShowInfo(true)}><Icon name="info" size={20}/><span>About this map</span></button><button className="map-controls-open" aria-label="Open map inspector" onClick={()=>{setDismissed(false);setDetent('medium')}}><Icon name="sliders" size={20}/></button></div></div>{jumpOpen&&<div ref={jumpList} className="jump-list" onKeyDown={e=>{if(e.key==='Escape')closeJump()}}>{markers.map(m=><button key={m.key+m.label} onClick={()=>{if(m.terrainSiteId && FEATURES.globe && FEATURES.terrain){select(m.terrainSiteId);setView('globe')}else pick(m.lat,m.lon);closeJump()}}>{m.label}</button>)}</div>}{FEATURES.globe && view==='globe'&&<React.Suspense fallback={<p role="status">Loading globe</p>}><GlobeView terrainSites={terrainIndex?.sites || []} cells={cells} color={globeColor} selected={selected} recenter={recenter} markers={visibleMarkers} pick={pick} hovered={hovered} hover={setHovered} label={c=>{const value=valueFor(c,layer,weights);return c.id+'<br>'+LAYER_DEFS.find(l=>l.id===layer).short+': '+fmt(value)+'<br>Percentile: '+fmt(weakPercentile(ranked,value))}} fail={()=>{setMessage('WebGL is unavailable. Showing the 2D map.');setView('map')}}/></React.Suspense>}{message&&<p className="map-message" role="status">{message}</p>}{FEATURES.globe && view==='globe'&&<small className="globe-note">Colors show 1° screening cells; the globe is a view of the same data as the map.</small>}<div style={{display:(view==='map'||!FEATURES.globe)?'block':'none'}} ref={container} className="leaflet-box" aria-label="MENA cell map. Use arrow keys to move between focused cells and Enter to select."/>{FEATURES.globe && FEATURES.vr && view==='globe' && <div className="globe-vr-entry"><button disabled={!shared.xrSupported} onClick={()=>shared.xrAction.current?.()}>{shared.inXR?'Exit VR':shared.xrSupported?'Enter VR':'VR unavailable'}</button>{!shared.xrSupported && <p className="small-note">VR needs a headset browser such as Meta Quest Browser, opened over HTTPS.</p>}{shared.xrMessage && <p role="status" className="small-note">{shared.xrMessage}</p>}</div>}<MapLegend bins={bins} label={LAYER_DEFS.find(l=>l.id===layer)?.short} detent={detent} dismissed={dismissed}/></div><InspectorSheet detent={detent} onDetent={setDetent} dismissed={dismissed} onDismiss={()=>setDismissed(true)} tab={tab} onTab={setTab}>{FEATURES.globe && FEATURES.terrain && view==='globe' && terrainIndex && <GlobeTerrainControls cell={selected} sites={terrainIndex.sites}/>}{tab==='layers'?<MapControls layer={layer} onLayerChange={setLayer} rawWeights={rawWeights} weights={weights} onWeightChange={(key,v)=>setRawWeights(p=>({...p,[key]:v}))} onResetWeights={()=>setRawWeights(DEFAULT_WEIGHTS)} showMarkers={showMarkers} onToggleMarker={k=>setShowMarkers(p=>({...p,[k]:!p[k]}))}/>:<><label className="cell-search">Choose a cell<select value={selectedId||''} onChange={e=>{if(e.target.value){select(e.target.value);const c=cells.find(c=>c.id===e.target.value);mapRef.current?.panTo([c.lat,c.lon],{animate:false})}else setSelectedId(null)}}><option value="">Select coordinates</option>{cells.map(c=><option key={c.id} value={c.id}>{c.id}: {c.lat}°, {c.lon}°</option>)}</select></label><p className="small-note muted">A percentile is the percentage of land cells scoring at or below this cell.</p><CellDetailPanel cell={selected} overall={Object.keys(DEFAULT_WEIGHTS).every(key=>weights[key]===DEFAULT_WEIGHTS[key])?selected?.overall_score:overall==null?null:Number(overall.toFixed(3))} overallPct={pct} onClose={()=>setSelectedId(null)}/></>}</InspectorSheet>{showInfo&&<InfoSheet onClose={closeInfo} statement={validation?.negative_result_statement||'Terrain similarity did not separate known analogs from negative controls (exploratory, n=6).'}/>}</section>
}