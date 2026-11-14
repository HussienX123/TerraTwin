import * as T from 'three';
import {canvasTheme} from '../components/canvasTheme';
export function attachCockpit(globe,game,exit){
 const theme=canvasTheme();
 const renderer=globe.renderer(),xr=renderer.xr,cam=globe.camera();
 const rig=new T.Group(),canvas=document.createElement('canvas');canvas.width=640;canvas.height=384;
 const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const display=new T.Mesh(new T.PlaneGeometry(.72,.432),new T.MeshBasicMaterial({map:tex}));display.position.set(0,1.23,-.88);rig.add(display);
 const dash=new T.Mesh(new T.BoxGeometry(1.8,.18,.55),new T.MeshLambertMaterial({color:0x374347}));dash.position.set(0,.94,-.76);rig.add(dash);
 const shade=new T.Mesh(new T.RingGeometry(.38,1.8,32),new T.MeshBasicMaterial({color:0x182324,transparent:true,opacity:.32,depthWrite:false}));shade.position.set(0,1.6,-.52);rig.add(shade);game.vignette=true;
 const ray=new T.Raycaster(),hits=[],rot=new T.Matrix4(),controllers=[];
 let lastDraw=0,active=false;const ratio=renderer.getPixelRatio();
 function select(c){
   if(!active||game.phase==='running')return;
   ray.ray.origin.setFromMatrixPosition(c.matrixWorld);rot.extractRotation(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(rot);
   hits.length=0;ray.intersectObject(display,false,hits);if(!hits.length)return;
   const y=1-hits[0].uv.y;
   if(y>.78){xr.getSession()?.end().then(exit);return}
   if(y>.56){game.vignette=!game.vignette;return}
   if(y>.31){if(game.phase==='results')game.restart();game.phase='running'}
 }
 for(let i=0;i<2;i++){const c=xr.getController(i),fn=()=>select(c);c.addEventListener('selectstart',fn);controllers.push({c,fn})}
 function restore(){
   if(!active)return;active=false;
   globe.scene().attach(cam);for(const {c} of controllers)globe.scene().attach(c);
   globe.scene().remove(rig);renderer.setPixelRatio(ratio);cam.scale.setScalar(1);
 }
 game.xrFrame=(session,time)=>{
   if(!session){restore();return}
   if(!active){active=true;globe.scene().add(rig);rig.add(cam);for(const {c} of controllers)rig.add(c);xr.setFoveation(1)}
   const p=game.p;rig.position.set(p.x,p.y+3,p.z);rig.rotation.y=p.yaw;
   cam.position.set(0,0,0);cam.quaternion.identity();
   shade.visible=game.vignette&&game.phase==='running'&&Math.abs(game.steering)>.15&&Math.abs(p.v)>1;
   if(time-lastDraw<180)return;lastDraw=time;
   ctx.fillStyle=theme.navy;ctx.fillRect(0,0,640,384);ctx.fillStyle=theme.label;ctx.font='bold 34px system-ui';ctx.fillText('Traverse   /   Rover cockpit',20,48);ctx.font='26px system-ui';
   ctx.fillText(Math.round(Math.abs(p.v)*3.6)+' km/h     Battery '+Math.ceil(game.stats.battery)+'%     Slope '+p.slope.toFixed(1)+'°',20,92);
   if(game.phase==='running'){ctx.fillText('Science stops   '+game.stats.stops+' / 5',20,162);ctx.fillText(p.alarm?(game.playMode==='explorer'?'Try from a steady spot':'Tilt alarm · Respawning'):'Press A to pause',20,222);ctx.font='18px system-ui';ctx.fillText('Arcade scale. Coarse terrain data plus synthetic detail.',20,345)}
   else{for(const [i,text] of [game.phase==='results'?'Drive score '+game.stats.score+' · Restart':'Start / Resume','Turn vignette   '+(game.vignette?'On':'Off'),'Exit to globe'].entries()){ctx.fillStyle=theme.raised;ctx.fillRect(12,120+i*85,616,76);ctx.fillStyle=theme.label;ctx.strokeStyle=theme.orange;ctx.strokeRect(12,120+i*85,616,76);ctx.fillText(text,30,168+i*85)}}
   tex.needsUpdate=true;
 };
 const previous=game.cleanup;game.cleanup=()=>{restore();previous();for(const {c,fn} of controllers)c.removeEventListener('selectstart',fn);for(const m of [dash,display,shade]){m.geometry.dispose();m.material.dispose()}tex.dispose()};
}
