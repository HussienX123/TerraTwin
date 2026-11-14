let pending;
export function loadTerrainCatalog(){
 if(!pending)pending=Promise.all(['/data/terrain/index.json','/data/drive_index.json','/data/cells.json','/data/analogs.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Terrain catalog unavailable');return r.json()})).then(([featured,drive,cells,analogs])=>{
  const known=[...analogs.analogs,...analogs.negative_controls];
  const sites=[...featured.sites],ids=new Set(sites.map(s=>s.id));
  for(const cell of cells.cells){
   const cached=drive[cell.id];if(ids.has(cell.id)||cell.is_water||!cached?.file)continue;
   const place=known.find(p=>Math.floor(p.lat)+.5===cell.lat&&Math.floor(p.lon)+.5===cell.lon);
   sites.push({...cached,id:cell.id,cellId:cell.id,name:place?.name||cell.id,type:'earth',lat:cell.lat,lon:cell.lon,height:cached.width,status:'available',dataFile:cached.file,texture_status:'n/a',resolution_note:'About 0.9 km; local slopes are understated.'});
  }
  return {sites};
 }).catch(error=>{pending=null;throw error});
 return pending;
}
