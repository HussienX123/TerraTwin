import React from 'react';
import {useSelection} from '../Selection';
import {EXAGGERATIONS,SLOPE_COLORS,SLOPE_BANDS} from './terrainData';
import {FEATURES} from '../config/features';
export const TEXTURE_LIMITATION = 'Textured 3D views are visualizations of coarse data (about 0.5 km); they are not rover-scale terrain models.';
export function textureCaption(site) {
  const source = site.texture_status === 'available'
    ? site.texture_source + ', ' + site.texture_date + ', ' + site.texture_resolution_m + ' m'
    : 'n/a; slope colors';
  return 'Texture: ' + source + '. Orbital imagery is shown for orientation only and is not used in any score. The 3D view shows the central 60 km window of the cell; heights are relative to each patch\'s lowest point; resolution is about '+(site.width===65?'0.9':'0.5')+' km.';
}
export default function GlobeTerrainControls({sites,cell}) {
 const state=useSelection();
 const site=sites.find(s=>s.id===state.selectedId);
 const mars=sites.find(s=>s.type==='mars');
 const hasImage=site?.texture_status==='available';
 const slopeMode=state.terrainMode==='slope'||!hasImage;
 function compare(checked){state.setCompareTerrain(checked);state.setTerrainStaged(false)}
 return <section className="panel-block globe-terrain-controls" aria-label="Terrain controls">
  <div className="terrain-control-title"><h3>{state.terrainFocused?'Terrain controls':'Terrain'}</h3>{site&&<p>{site.name} · {site.type==='mars'?'Mars':'Earth'}</p>}</div>
  {!site&&<p className="small-note">{cell?.is_water?'Water cells have no exported terrain.':'Select a land cell to view its terrain.'}</p>}
  {site&&<>
   {!state.terrainFocused&&FEATURES.terrain&&<button className="terrain-action" onClick={()=>{state.setTerrainVisible(true);state.setTerrainFocused(true)}}>View terrain in 3D</button>}
   <fieldset className="terrain-control-group"><legend>Appearance</legend><div className="segmented">
    <button disabled={!hasImage} aria-pressed={!slopeMode} className={!slopeMode?'active':''} onClick={()=>state.setTerrainMode('image')}>Image</button>
    <button aria-pressed={slopeMode} className={slopeMode?'active':''} onClick={()=>state.setTerrainMode('slope')}>Slope colors</button>
   </div>{!hasImage&&<p className="small-note">Satellite image unavailable for this cell. Showing slope colors.</p>}</fieldset>
   {slopeMode&&<div className="terrain-legend">{SLOPE_COLORS.map((color,i)=><span key={color}><i style={{background:color}}/>{SLOPE_BANDS[i]}</span>)}</div>}
   <fieldset className="terrain-control-group"><legend>Vertical exaggeration</legend><div className="segmented">{EXAGGERATIONS.map(n=><button key={n} aria-pressed={state.exaggeration===n} className={state.exaggeration===n?'active':''} onClick={()=>state.setExaggeration(n)}>{n}×</button>)}</div></fieldset>
   {site.type==='earth'&&<label className="terrain-compare"><input type="checkbox" checked={state.compareTerrain} onChange={e=>compare(e.target.checked)}/> Compare with Jezero</label>}
   {state.compareTerrain&&!state.terrainFocused&&site.type==='earth'&&<button onClick={()=>state.setTerrainStaged(!state.terrainStaged)}>{state.terrainStaged?'Return patches to globes':'Side by side'}</button>}
   {FEATURES.drive&&<button className="terrain-action" onClick={()=>state.setDrive(site.id)}>Drive here</button>}
   {!state.terrainFocused&&state.terrainVisible&&<button onClick={()=>state.setTerrainVisible(false)}>Hide terrain</button>}
   <details className="terrain-source-details"><summary>Source and limitations</summary><p className="small-note">{textureCaption(site)}</p>{state.compareTerrain&&site.type==='earth'&&mars&&<p className="small-note">Jezero — {textureCaption(mars)}</p>}<p className="small-note">{TEXTURE_LIMITATION}</p></details>
  </>}
  {FEATURES.vr&&<details className="terrain-source-details"><summary>Virtual reality</summary><button disabled={!state.xrSupported} onClick={()=>state.xrAction.current?.()}>{state.inXR?'Exit VR':state.xrSupported?'Enter VR':'VR unavailable'}</button>{!state.xrSupported&&<p className="small-note">VR needs a headset browser such as Meta Quest Browser, opened over HTTPS.</p>}</details>}
  {FEATURES.vr&&state.xrMessage&&<p role="status" className="small-note">{state.xrMessage}</p>}
 </section>;
}
