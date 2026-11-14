import React,{useEffect,useRef} from 'react';
import {usePlay} from './PlayState';
import Brand from '../components/Brand';
import Missions from './Missions';
import Journal from './Journal';
import {Classroom,Uses} from './TeachingPages';
import './play.css';
export default function PlayScreen(){const play=usePlay(),ref=useRef(null);
 useEffect(()=>{if(!play.screen)return;const old=document.activeElement;ref.current?.focus();function key(e){if(e.key==='Escape')play.setScreen(null);if(e.key==='Tab'){const all=[...ref.current.querySelectorAll('button,select,a[href]')].filter(el=>!el.disabled);const first=all[0],last=all.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);old?.focus()}},[play.screen]);
 if(!play.screen)return null;
 return <section className={'play-screen play-size-'+play.saved.prefs.size} role="dialog" aria-modal="true" aria-label={play.screen} tabIndex={-1} ref={ref}><div className="play-page"><header className="navy-surface"><Brand/><strong>Play</strong><button onClick={()=>play.setScreen(null)}>Close</button></header>{play.screen==='missions'?<Missions/>:play.screen==='journal'?<Journal/>:play.screen==='classroom'?<Classroom/>:<Uses/>}</div></section>
}
