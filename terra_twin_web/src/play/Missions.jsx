import React from 'react';
import {usePlay,privacy} from './PlayState';
import ModeSwitch from './ModeSwitch';
import {Stars,Symbol} from './PlayIcons';
import {Fact} from './StoryCard';
import {chapters,badges,premise} from '../content/story';
export default function Missions(){
 const play=usePlay(),runs=play.saved.runs,finished=runs.filter(r=>r.stops===5),mode=play.saved.prefs.mode;
 const earned={first:finished.some(r=>r.chapter===1),steady:finished.some(r=>r.alarms===0),eyes:finished.some(r=>r.correct>=4),worlds:finished.some(r=>r.site==='mars_jezero')&&finished.some(r=>r.site.startsWith('earth_'))};
 return <><h1>Missions</h1><ModeSwitch/><p>{mode==='explorer'?'Take your time. Explore with help and large text.':'Drive with numbers, a timer and simulation results.'}</p><small>Story (fictional)</small><p>{premise}</p><div className="play-list">{chapters.map(chapter=><article key={chapter.id}><h2>{chapter.title}</h2><p>{chapter.goal}</p><Stars count={Math.max(0,...finished.filter(r=>r.chapter===chapter.id&&r.mode===mode&&(chapter.id!==3||(finished.some(x=>x.chapter===3&&x.mode===mode&&x.site==='mars_jezero')&&finished.some(x=>x.chapter===3&&x.mode===mode&&x.site.startsWith('earth_'))))).map(r=>r.stars))}/><button className="play-primary" onClick={()=>play.begin(chapter.id)}>Play {chapter.title.toLowerCase()}</button></article>)}</div><h2>Badges</h2><div className="play-badges">{badges.map(([id,name,line])=><article key={id}><h3><Symbol type="badge"/>{name}</h3><p>{line}</p><strong>{earned[id]?'Earned':'Ready to try'}</strong></article>)}</div><h2>Why the Middle East and North Africa?</h2><Fact id="F6" mode={mode}/><nav>{play.flags.journal&&<button onClick={()=>play.setScreen('journal')}>Journal</button>}<button onClick={()=>play.setScreen('classroom')}>Classroom guide</button><button onClick={()=>play.setScreen('uses')}>Possible uses</button></nav><p className="play-privacy">{privacy}</p></>
}
