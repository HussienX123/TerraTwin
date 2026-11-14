import React,{useEffect,useReducer,useState,useRef} from 'react';
import {useSelection} from '../Selection';
import {loadDrive,startDrive} from './session';
import {disposeRover} from './roverAsset';
import {attachCockpit} from './cockpit';
import {attachMission} from './mission';
import {MissionHUD,Results} from './MissionHUD';
import {usePlay} from '../play/PlayState';
import {attachStory} from '../play/storyRuntime';
import {attachGuidance} from '../play/guidance';
import StoryCard from '../play/StoryCard';
import Tutorial from '../play/Tutorial';
import Settings from '../play/Settings';
import ModeSwitch from '../play/ModeSwitch';
import SiteData from './SiteData';
import './drive.css';
import '../play/play.css';
export default function DriveOverlay({runtime,id,featured,cell}){
 const state=useSelection(),play=usePlay(),[,notify]=useReducer(n=>n+1,0),[error,setError]=useState(''),[game,setGame]=useState(null),[sheet,setSheet]=useState(null);
 const prefs=play.saved.prefs,sheetRef=useRef(sheet);sheetRef.current=sheet;
 useEffect(()=>{const abort=new AbortController();let active;
  async function enter(){setGame(null);try{
    const data=await loadDrive(id,featured,abort.signal);
    while(!runtime.current&&!abort.signal.aborted)await new Promise(r=>setTimeout(r,30));
    if(abort.signal.aborted){disposeRover(data.rover);return}
    const rt=runtime.current;active=startDrive(rt.globe,rt.world,data,notify);attachMission(active);
    attachStory(active,play.request?.site===id?play.request.chapter:0,play);
    attachCockpit(rt.globe,active,()=>state.setDrive(null));attachGuidance(active);rt.drive=active;
    active.onEscape=()=>{if(sheetRef.current){setSheet(null);return}if(active.phase==='story')return;if(['paused','results','start'].includes(active.phase)){play.setRequest(null);state.setDrive(null)}else active.pause()};setGame(active);
  }catch(e){if(!abort.signal.aborted)setError(e.message)}}
  enter();return()=>{abort.abort();if(runtime.current)runtime.current.drive=null;active?.dispose()}
 },[id,play.request?.token]);
 useEffect(()=>{if(!game)return;game.playMode=prefs.mode;game.assist=prefs.assist;game.reduceMotion=prefs.reduce||matchMedia('(prefers-reduced-motion: reduce)').matches},[game,prefs]);
 const exit=()=>{play.setRequest(null);state.setDrive(null)};
 function open(name){if(game.phase==='running')game.pause();setSheet(name)}
 if(!game)return <div className="drive-screen"><div className="drive-card" role="status">{error||'Loading driving terrain…'}<button onClick={exit}>Exit to globe</button></div></div>;
 const p=game.p,explorer=prefs.mode==='explorer',limit=game.config.limit+'°';
 function stick(e){if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const b=e.currentTarget.getBoundingClientRect();game.stickX=Math.max(-1,Math.min(1,(e.clientX-b.left-b.width/2)/(b.width/2)));game.stickY=Math.max(-1,Math.min(1,(b.top+b.height/2-e.clientY)/(b.height/2)))}
 return <div className={'drive-screen play-size-'+prefs.size+(game.reduceMotion?' play-reduce':'')}><div className="drive-top"><span>Relief {game.ground.exaggeration}×</span><b>{game.chapter?'Chapter '+game.chapter:'Free drive'}</b><button onClick={()=>open('settings')}>Settings</button><button onClick={()=>open('data')}>Site data</button>{!explorer&&<span>{Math.round(Math.abs(p.v)*3.6)} km/h · {p.slope.toFixed(1)}°</span>}<button onClick={()=>game.pause()}>Pause</button></div>
 {sheet==='settings'&&<Settings game={game} onClose={()=>setSheet(null)}/>}
 {sheet==='data'&&<div className="drive-card"><button onClick={()=>setSheet(null)}>Close site data</button><SiteData values={game.values} cell={cell||featured?.values}/></div>}
 {!sheet&&game.phase==='story'&&<StoryCard game={game} notify={notify}/>}
 {!sheet&&game.phase==='running'&&<><MissionHUD game={game} limit={limit}/><Tutorial game={game} notify={notify}/></>}
 {!sheet&&game.phase==='results'&&<Results game={game} other={id==='mars_jezero'?state.lastEarthId:'mars_jezero'} onSwitch={site=>play.begin(game.chapter,site)} exit={exit}/>}
 {!sheet&&['start','paused'].includes(game.phase)&&<div className="drive-card"><small>Story (fictional)</small><h2>{featured?.name||id}</h2><ModeSwitch/><p>{explorer?'Follow the arrow. Stop inside each ring. Take your time.':'Complete five stops. Pause for two seconds inside each ring.'}</p><button className="drive-primary" onClick={()=>{if(game.phase==='start')game.startStory();else game.phase='running';notify()}}>{game.phase==='start'?'Start driving':'Resume'}</button><button onClick={()=>{game.restart();notify()}}>Restart this run</button><button onClick={()=>game.cameraNext()}>Camera · {['Chase','Cockpit','Top-down'][game.camera]}</button><button onClick={()=>setSheet('settings')}>Settings</button>{play.flags.missions&&<button onClick={()=>play.setScreen('missions')}>Missions</button>}{play.flags.journal&&<button onClick={()=>play.setScreen('journal')}>Journal</button>}{!explorer&&<p>Nominal slope threshold {limit}.</p>}<button onClick={exit}>Exit to globe</button></div>}
 {game.phase==='running'&&!sheet&&<div className="drive-touch"><button aria-label="Driving joystick" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);stick(e)}} onPointerMove={stick} onPointerUp={()=>{game.stickX=game.stickY=0}} onPointerCancel={()=>{game.stickX=game.stickY=0}} onLostPointerCapture={()=>{game.stickX=game.stickY=0}}><span aria-hidden="true">+</span></button><button onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.brake=true}} onLostPointerCapture={()=>game.brake=false}>Brake</button></div>}
 <footer>Arcade scale. Coarse terrain data plus synthetic detail.</footer></div>
}
