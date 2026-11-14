import React from 'react';
import {usePlay} from '../play/PlayState';
import {EXTERNAL_LINKS} from '../content/links';
import Icon from '../icons';
import Brand from './Brand';
import {navigate} from '../navigation';
const tabs=[['map','Explore','map'],['play','Play','compass'],['candidates','Candidates','candidates'],['evidence','Evidence','data']];
export default function Navbar({page,onInfo}){const play=usePlay();return <aside className="navigation navy-surface"><a className="brand" href="/" onClick={e=>{e.preventDefault();play.setScreen(null);navigate('map')}}><Brand/></a><div className="brand-slots"><button aria-label="Start here: 60-second guide" title="Start here: 60-second site guide" onClick={onInfo}><Icon name="info"/><span>Start here</span></button>{EXTERNAL_LINKS.vrUrl&&<a href={EXTERNAL_LINKS.vrUrl}>VR</a>}{EXTERNAL_LINKS.videoUrl&&<a href={EXTERNAL_LINKS.videoUrl}>Video</a>}</div><nav aria-label="Primary navigation">{tabs.map(([id,label,icon])=><a href={id==='map'?'/':'/'+id} key={id} aria-current={page===id?'page':undefined} onClick={e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();play.setScreen(null);navigate(id)}}><Icon name={icon}/><span>{label}</span></a>)}</nav><p className="nav-note">Jezero Crater / MENA<br/>Screening hypotheses,<br/>not discoveries.</p></aside>}
