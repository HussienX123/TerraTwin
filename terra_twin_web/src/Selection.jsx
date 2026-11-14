import React, {createContext, useContext, useState, useRef, useEffect} from 'react';
import {DEFAULT_WEIGHTS} from './utils/scoring';
import {FEATURES} from './config/features';
const Selection = createContext(null);
export const useSelection = () => useContext(Selection);
export function SelectionProvider({children}) {
  const initial = new URL(location.href);
  const [selectedId, setSelectedId] = useState(() => initial.searchParams.get('site')?.replaceAll(' ', '+') || null);
  const [lastEarthId,setLastEarthId]=useState(null);
  useEffect(()=>{if(selectedId?.startsWith('earth_'))setLastEarthId(selectedId);const url=new URL(location.href);if(selectedId)url.searchParams.set('site',selectedId);else url.searchParams.delete('site');history.replaceState(null,'',url)},[selectedId]);
  const [layer, setLayer] = useState('overall_score');
  const [rawWeights, setRawWeights] = useState(DEFAULT_WEIGHTS);
  const [view, updateView] = useState(() => (!FEATURES.globe || initial.searchParams.get('view') === 'map') ? 'map' : 'globe');
  const [driveId,updateDrive]=useState(FEATURES.drive && initial.searchParams.get('view')==='drive'?selectedId:null);
  function setDrive(id){
    if(!FEATURES.drive){updateDrive(null);return}
    updateDrive(id);updateView(FEATURES.globe ? 'globe' : 'map');if(id)setSelectedId(id);const url=new URL(location.href);url.searchParams.set('view',id?'drive':(FEATURES.globe?'globe':'map'));if(id)url.searchParams.set('site',id);history.replaceState(null,'',url)
  }
  const [terrainVisible, updateTerrainVisible] = useState(FEATURES.terrain && initial.searchParams.get('terrain') === '1');
  const [terrainStatus,setTerrainStatus]=useState('');
  const [terrainMode, setTerrainMode] = useState('image');
  const [exaggeration, setExaggeration] = useState(5);
  const [compareTerrain, setCompareTerrain] = useState(initial.searchParams.get('site') === 'mars_jezero');
  const [terrainFocused,updateTerrainFocused]=useState(FEATURES.terrain && initial.searchParams.get('focus')==='terrain');
  function setTerrainFocused(value){if(!FEATURES.terrain)return;updateTerrainFocused(value);const url=new URL(location.href);if(value)url.searchParams.set('focus','terrain');else url.searchParams.delete('focus');history.replaceState(null,'',url)}
  const [terrainStaged, setTerrainStaged] = useState(false);
  const [xrSupported, setXRSupportedState] = useState(false), [inXR, setInXR] = useState(false), [xrMessage, setXRMessage] = useState('');
  const setXRSupported = (val) => setXRSupportedState(FEATURES.vr ? val : false);
  const xrAction = useRef(null);
  const [xrRequest, setXRRequest] = useState(0);
  function setView(next) {
    if(!FEATURES.globe && next === 'globe') next = 'map';
    updateTerrainFocused(false);updateDrive(null); updateView(next);
    const url = new URL(location.href); url.searchParams.set('view', next);url.searchParams.delete('focus');
    history.replaceState(null, '', url);
  }
  function setTerrainVisible(next) {
    if(!FEATURES.terrain){updateTerrainVisible(false);return}
    updateTerrainVisible(next);
    const url = new URL(location.href);
    if (next) url.searchParams.set('terrain', '1'); else url.searchParams.delete('terrain');
    history.replaceState(null, '', url);
  }
  function openTerrain(id) {
    if(!FEATURES.terrain || !FEATURES.globe) {
      setSelectedId(id);
      setView('map');
      return;
    }
    updateTerrainFocused(true);updateDrive(null);setSelectedId(id); updateView('globe'); updateTerrainVisible(true);setTerrainStaged(false);
    if (id === 'mars_jezero') setCompareTerrain(true);
    const url = new URL(location.href);
    url.pathname = '/'; url.hash = 'map';url.searchParams.set('focus','terrain');
    url.searchParams.set('view', 'globe'); url.searchParams.set('site', id); url.searchParams.set('terrain', '1');
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  return <Selection.Provider value={{
    driveId: FEATURES.drive ? driveId : null,setDrive,selectedId, setSelectedId, lastEarthId, layer, setLayer, rawWeights, setRawWeights, view: FEATURES.globe ? view : 'map', setView,
    terrainStatus,setTerrainStatus,terrainFocused: FEATURES.terrain ? terrainFocused : false,setTerrainFocused,terrainVisible: FEATURES.terrain ? terrainVisible : false, setTerrainVisible, terrainMode, setTerrainMode, exaggeration, setExaggeration,
    compareTerrain, setCompareTerrain, terrainStaged, setTerrainStaged, openTerrain,
    xrAction: FEATURES.vr ? xrAction : {current: null}, xrSupported: FEATURES.vr ? xrSupported : false, setXRSupported, inXR: FEATURES.vr ? inXR : false, setInXR, xrMessage, setXRMessage, xrRequest, setXRRequest,
  }}>{children}</Selection.Provider>;
}
