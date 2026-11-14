import * as T from 'three';
import {seedOf} from './surface';
const offsets=[[0,-180],[145,-315],[310,-245],[280,-65],[90,5]];
export const runs=new Map();
export function route(game){
 const h=game.ground.coarse, limit=game.config.limit, seed=seedOf(game.site.id);
 function steep(x,z){const d=50;return Math.atan(Math.hypot(h(x+d,z)-h(x-d,z),h(x,z+d)-h(x,z-d))/(2*d))*180/Math.PI>limit}
 let best=6,start=[0,0];
 for(let r=0;r<=300&&best;r+=25)for(let k=0;k<(r?16:1);k++){
   const a=(seed%360)*Math.PI/180+k*Math.PI/8,x=r*Math.cos(a),z=r*Math.sin(a);
   const count=offsets.reduce((n,[dx,dz])=>n+Number(steep(x+dx,z+dz)),0);
   if(count<best){best=count;start=[x,z]}
 }
 return {start,points:offsets.map(([x,z])=>[x+start[0],z+start[1]])};
}
export function attachMission(game){
 const {start,points}=route(game),p=game.p;
 const material=new T.MeshBasicMaterial({color:0xFF6A00}),ring=new T.Mesh(new T.TorusGeometry(13,.65,8,48),material);
 ring.rotation.x=-Math.PI/2;game.group.add(ring);
 const flag=new T.Mesh(new T.ConeGeometry(3,8,4),material);game.group.add(flag);
 game.points=points;
 function marker(){const q=points[game.stats.stops];ring.visible=flag.visible=!!q;if(q){ring.position.set(q[0],game.ground.height(...q)+.9,q[1]);flag.position.copy(ring.position);flag.position.y+=6}}
 game.restart=()=>{game.tracks.clear();Object.assign(p,{x:start[0],z:start[1],y:game.ground.height(...start),v:0,vy:0,yaw:0,alarm:0,alarms:0});game.stats={time:0,distance:0,stops:0,hold:0,above:0,max:0,battery:100};game.phase='start';marker();if(import.meta.env.DEV && p.y<game.ground.height(p.x,p.z))console.warn('Drive start pose is below terrain')};
 game.restart();
 if(import.meta.env.DEV&&JSON.stringify(points)!==JSON.stringify(route(game).points))console.warn('Drive waypoint seed mismatch');
 game.missionStep=(dt,throttle)=>{
   const s=game.stats,q=points[s.stops];game.storyTick?.(dt);s.time+=dt;s.distance+=Math.abs(p.v)*dt;
   if(p.slope>game.config.limit)s.above+=dt;s.max=Math.max(s.max,p.slope);
   s.battery=Math.max(game.playMode==='explorer'?1:0,s.battery-dt*(.045+Math.min(1,Math.abs(throttle))*(.16+.018*p.slope)));
   if(q&&Math.hypot(p.x-q[0],p.z-q[1])<=(game.assist?30:16)&&Math.abs(p.v)<1&&!p.alarm)s.hold+=dt;else s.hold=0;
   if(s.hold>=2){s.stops++;s.hold=0;marker();game.onStop?.();if(game.phase==='story')return}
   if(s.stops===5||(s.battery===0&&game.playMode!=='explorer'))game.finish();
 };
 game.finish=()=>{
     const s=game.stats;
     game.phase='results';s.score=Math.max(0,200*s.stops-(game.playMode==='explorer'?0:50*p.alarms));s.alarms=p.alarms;
     runs.set(game.site.id,{...s});s.best=s.score;
     try{const key='terra-drive-best:'+game.site.id;s.best=Math.max(Number(localStorage.getItem(key))||0,s.score);localStorage.setItem(key,String(s.best))}catch{}
     game.onFinish?.();
 };
 game.cleanup=()=>{ring.geometry.dispose();flag.geometry.dispose();material.dispose()};
}
