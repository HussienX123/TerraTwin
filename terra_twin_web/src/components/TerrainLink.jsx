import React, {useEffect, useState} from 'react';
import {useSelection} from '../Selection';
import {loadTerrainCatalog} from './terrainCatalog';
import {FEATURES} from '../config/features';
export default function TerrainLink({siteId, clusterRank}) {
  if (!FEATURES.terrain) return null;
  const {openTerrain}=useSelection();
  const [site, setSite] = useState(null), [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    loadTerrainCatalog().then(index => {
      if (!active) return;
      setSite(index?.sites.find(s => clusterRank ? s.name === 'Cluster ' + clusterRank : s.cellId === siteId));
      setLoaded(true);
    }).catch(()=>{if(active)setLoaded(true)});
    return () => {active = false;};
  }, [siteId, clusterRank]);
  if (!site || site.status !== 'available') return <span className="small-note muted">{loaded ? 'Terrain 3D n/a for this cell.' : 'Checking terrain availability…'}</span>;
  return <a className="terrain-link" href={'/?view=globe&terrain=1&focus=terrain&site=' + encodeURIComponent(site.id)+'#map'} onClick={event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openTerrain(site.id)}}}>View terrain in 3D</a>;
}
