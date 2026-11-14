import React, {lazy, Suspense, useEffect, useState} from 'react';
import {useSelection} from '../Selection';
import TerrainInspector from './TerrainInspector';
import {EXAGGERATIONS} from './terrainData';
const TerrainScene = lazy(() => import('./TerrainScene'));
export default function TerrainPage() {
  const {selectedId, setSelectedId} = useSelection();
  const [index, setIndex] = useState(null), [error, setError] = useState('');
  const [siteId, setSiteId] = useState(() => new URL(location.href).searchParams.get('site')?.replaceAll(' ', '+') || selectedId);
  const [exaggeration, setExaggeration] = useState(5), [colors, setColors] = useState(true), [info, setInfo] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/data/terrain/index.json', {signal: abort.signal}).then(r => {
      if (!r.ok) throw new Error('Could not load terrain sites. Build the terrain data, then reload.');
      return r.json();
    }).then(setIndex).catch(err => {if (!abort.signal.aborted) setError(err.message);});
    return () => abort.abort();
  }, []);
  if (error) return <p role="alert" className="error-box">{error}</p>;
  if (!index) return <p role="status" className="loading-box">Loading terrain</p>;
  const earthSites = index.sites.filter(site => site.type === 'earth');
  const earth = earthSites.find(site => site.id === siteId) || earthSites[0];
  const mars = index.sites.find(site => site.type === 'mars');
  if (!earth || !mars) return <p className="error-box">Terrain comparison is unavailable. Rebuild the terrain exports.</p>;
  function choose(id) {
    setSiteId(id); setSelectedId(id);
    const url = new URL(location.href); url.searchParams.set('site', id); history.replaceState(null, '', url);
  }
  function step(delta) {
    const i = earthSites.findIndex(site => site.id === earth.id);
    choose(earthSites[(i + delta + earthSites.length) % earthSites.length].id);
  }
  return <div className="terrain-page">
    <header className="terrain-header"><div><h1>Terrain 3D</h1><p className="muted">Earth and Jezero at the same horizontal scale</p></div><a href="/#candidates">Back to Candidates</a></header>
    <div className="terrain-layout">
      <div><Suspense fallback={<p role="status">Loading terrain</p>}><TerrainScene earth={earth} mars={mars} exaggeration={exaggeration} colors={colors} info={info}
        onExaggeration={setExaggeration} onColors={setColors} onInfo={setInfo} onStep={step}/></Suspense>
        <p className="small-note terrain-keyboard">Drag to orbit. Scroll or pinch to zoom. Arrow keys rotate. +/− zoom. 1/2/3/4 set exaggeration.</p>
      </div>
      <aside className="terrain-settings">
        <h2>Compare terrain</h2>
        <label className="cell-search">Earth site<select value={earth.id} onChange={event => choose(event.target.value)}>{earthSites.map(site => <option key={site.id} value={site.id}>{site.name}{site.status !== 'available' ? ' (n/a)' : ''}</option>)}</select></label>
        {siteId && siteId !== 'mars_jezero' && !earthSites.some(site => site.id === siteId) && <p className="small-note" role="status">This cell has no terrain export. Showing {earth.name}.</p>}
        <h3>Vertical exaggeration</h3><div className="segmented">{EXAGGERATIONS.map(n => <button key={n} className={exaggeration === n ? 'active' : ''} aria-pressed={exaggeration === n} onClick={() => setExaggeration(n)}>{n}x</button>)}</div>
        <label className="marker-toggle"><input type="checkbox" checked={colors} onChange={event => setColors(event.target.checked)}/>Show slope colors</label>
        <details open className="terrain-details"><summary>Site values and limits</summary><TerrainInspector earth={earth} mars={mars}/></details>
      </aside>
    </div>
  </div>;
}
