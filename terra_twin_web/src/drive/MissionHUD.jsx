import React,{useRef,useEffect} from 'react';
import {Stars,Symbol} from '../play/PlayIcons';
import {usePlay} from '../play/PlayState';
import {runs} from './mission';
const fields=[
 ['Time',s=>s.time.toFixed(1)+' s'],['Distance',s=>Math.round(s.distance)+' m'],['Waypoints',s=>s.stops+' / 5'],
 ['Time above slope limit',s=>(100*s.above/Math.max(.01,s.time)).toFixed(1)+'%'],['Maximum slope',s=>s.max.toFixed(1)+'°'],
 ['Alarms',s=>s.alarms],['Energy used',s=>(100-s.battery).toFixed(1)+'%'],['Drive score',s=>s.score]
];
export function Results({game,other,onSwitch,exit}){
 const play=usePlay(),s=game.stats,b=runs.get(other),explorer=game.playMode==='explorer';
 return <div className="drive-card"><small>Traverse</small><h2>Simulation results</h2><Stars count={s.stars||0}/>{play.flags.journal&&<button onClick={()=>play.setScreen('journal')}>Read my journal</button>}{play.flags.missions&&<button onClick={()=>play.setScreen('missions')}>Missions</button>}<table><thead><tr><th>Measure</th><th>{game.site.id}</th>{b&&<th>{other}</th>}</tr></thead><tbody>{fields.filter(([k])=>!explorer||(k==='Time'&&game.chapter===3&&b)||!['Time','Drive score'].includes(k)).map(([k,fmt])=><tr key={k}><th>{k}</th><td>{fmt(s)}</td>{b&&<td>{fmt(b)}</td>}</tr>)}</tbody></table>{!explorer&&<p>Best Drive score here: {s.best}</p>}<p>Results come from a game simulation on coarse data plus synthetic detail. They do not measure real rover performance and are not part of any score on this site.</p>{other&&(game.chapter===3||!game.chapter)&&<button onClick={()=>onSwitch(other)}>Run {other==='mars_jezero'?'the same mission on Jezero':'it on '+other}</button>}<button onClick={exit}>Exit to globe</button></div>
}
export function MissionHUD({game,limit}){
 const ref=useRef(null),{p,stats:s}=game,explorer=game.playMode==='explorer';
 useEffect(()=>{const canvas=ref.current,ctx=canvas.getContext('2d'),scale=.23,cx=35-game.points[0][0]*scale,cy=100-game.points[0][1]*scale;
 ctx.fillStyle='#cfbf9e';ctx.fillRect(0,0,160,128);
 
 ctx.strokeStyle='white';ctx.beginPath();for(const [x,z] of game.points)ctx.lineTo(cx+x*scale,cy+z*scale);ctx.stroke();
 game.points.forEach(([x,z],i)=>{ctx.fillStyle=i<s.stops?'#205b46':i===s.stops?'#936015':'white';ctx.fillRect(cx+x*scale-3,cy+z*scale-3,7,7)});
 ctx.save();ctx.translate(cx+p.x*scale,cy+p.z*scale);ctx.rotate(-p.yaw);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(5,6);ctx.lineTo(-5,6);ctx.closePath();ctx.fillStyle='#073d31';ctx.fill();ctx.restore()});
 const q=game.points[s.stops],bearing=q?Math.round((Math.atan2(q[0]-p.x,p.z-q[1])*180/Math.PI+360)%360):0;
 return <aside className="drive-stats"><div className="play-direction" style={{transform:'rotate('+(game.waypointAngle??(bearing+p.yaw*180/Math.PI))+'deg)'}}><Symbol type="arrow" size={game.assist?42:28}/></div><canvas ref={ref} width="160" height="128" aria-label="Route mini-map"/><b>Stop {Math.min(5,s.stops+1)} / 5</b><span>{q?Math.round(Math.hypot(p.x-q[0],p.z-q[1]))+' m · '+bearing+'°':''}</span><span>{s.hold?(explorer?'Keep still in the ring':'Hold still · '+Math.ceil(2-s.hold)+' s'):'Stop inside the ring for 2 s'}</span><label>Battery {Math.ceil(s.battery)}% <progress max="100" value={s.battery}/></label>{!explorer&&<span>{Math.floor(s.time)} s · Heading {Math.round((-p.yaw*180/Math.PI%360+360)%360)}°</span>}<meter min="0" max={game.config.limit*2} high={game.config.limit} value={p.slope} aria-label="Local slope"/>{!explorer&&<small>Limit {limit}</small>}<span className="drive-sr" aria-live="polite">{s.stops} waypoints reached</span>{p.alarm>0&&<strong role="alert">{explorer?'Let’s try from a steady spot. Your stops are saved.':'Tilt alarm · Returning to safe ground'}</strong>}</aside>
}
