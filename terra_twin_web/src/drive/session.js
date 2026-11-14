import * as T from 'three';
import {createTracks} from './tracks';
import {surface,landscape} from './surface';
import {disposeRover,loadRover} from './roverAsset';
import {dynamics} from './rover';
export async function loadDrive(id,featured,signal){
  async function get(url){const r=await fetch('/data/'+url,{signal});if(!r.ok)throw Error('Terrain could not be loaded.');return r}
  const [index,config]=await Promise.all(['drive_index.json','drive_config.json'].map(async url=>(await get(url)).json()));
  const site=index[id];if(!site?.file)throw Error(site?.reason||'No driving terrain is available for this cell.');
  if(!featured&&site.file.startsWith('terrain/'))featured=(await (await get('terrain/index.json')).json()).sites.find(s=>s.id===id);
  const raw=new Uint16Array(await (await get(site.file)).arrayBuffer());
  if(raw.length!==site.width**2)throw Error('Incomplete heightfield.');
  let image=null;

  let values=featured?.values;
  if(!values){const lines=(await (await get('drive_metrics.csv')).text()).trim().split(/\r?\n/),head=lines[0].split(',');const row=lines.slice(1).find(line=>line.split(',')[0]===id)?.split(',');values=row?Object.fromEntries(head.map((key,i)=>[key,row[i]===''?null:Number.isFinite(Number(row[i]))?Number(row[i]):row[i]])):{};}
  const rover=await loadRover(signal);
  return {site,config,ground:surface(site,raw),image,rover,values};
}
export function startDrive(globe,world,data,notify){
  const {ground,image,site,config}=data,scene=globe.scene(),cam=globe.camera(),ctl=globe.controls(),renderer=globe.renderer();
  const group=new T.Group(),saved={position:cam.position.clone(),rotation:cam.quaternion.clone(),near:cam.near,far:cam.far,bg:scene.background,fog:scene.fog,enabled:ctl.enabled};
  const sky=new T.Color(site.id==='mars_jezero'?0xe1c5a5:0xc8deeb);
  scene.background=sky;scene.fog=new T.Fog(sky,550,1370);world.table.visible=false;world.terrainCamera?.setActive(false);ctl.enabled=false;
  scene.add(group);cam.near=.15;cam.far=4500;cam.updateProjectionMatrix();
  const land=landscape(group,ground,site,image),rover=data.rover;group.add(rover);
  const tracks=createTracks(group,ground);
  const physics=dynamics(ground,config.limit),p=physics.p,keys=new Set(),target=new T.Vector3(),eye=new T.Vector3(),cameraForward=new T.Vector3(),cameraRight=new T.Vector3(),toWaypoint=new T.Vector3();
  const game={values:data.values,p,config,site,image,ground,phase:'start',camera:0,mars:site.id==='mars_jezero',stickX:0,stickY:0,brake:false,physics,group,tracks,
    pause(){clearInput();p.v=0;if(game.phase==='running')game.phase='paused';else if(game.phase==='paused')game.phase='running';notify()},
    cameraNext(){game.camera=(game.camera+1)%3;notify()},
    exaggerate(value){tracks.clear();ground.exaggeration=value;land.update(p.x,p.z,true);p.y=ground.height(p.x,p.z);p.vy=0;p.v=0;notify()},
    detail(){tracks.clear();ground.detail=!ground.detail;land.update(p.x,p.z,true);notify()}};
  function clearInput(){keys.clear();game.stickX=game.stickY=0;game.brake=false}
  function key(e,down){if(!down){keys.delete(e.code);return}if(e.target?.matches?.('input,select,textarea'))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&game.phase==='running')e.preventDefault();
    if(down&&!e.repeat){game.keyInput?.(e);if(e.code==='Escape')game.onEscape?.();if(e.code==='KeyC')game.cameraNext();if(e.code==='KeyR')physics.reset()}
    if(down)keys.add(e.code);else keys.delete(e.code);
  }
  const kd=e=>key(e,true),ku=e=>key(e,false),blur=()=>{clearInput();p.v=0;if(game.phase==='running')game.pause()};
  window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);window.addEventListener('blur',blur);
  let then=0,acc=0,lastHUD=0;
  const dead=x=>Number.isFinite(x)&&Math.abs(x)>.18?x:0;
  function frame(time){
    const dt=then?Math.min(.1,(time-then)/1000):0;then=time;
    const pad=renderer.xr.isPresenting?null:Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.mapping==='standard');
    let throttle=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+game.stickY-dead(pad?.axes[1]);
    let steer=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+game.stickX+dead(pad?.axes[0]);
    let brake=keys.has('Space')||game.brake||pad?.buttons[7]?.pressed;
    const session=renderer.xr.getSession();if(session)for(const src of session.inputSources){const g=src.gamepad;if(!g)continue;if(src.handedness==='left'){steer=dead(g.axes[2]);throttle=-dead(g.axes[3])}else{brake=g.buttons[0]?.pressed;const pressed=g.buttons[4]?.pressed;if(pressed&&!game.aDown)game.pause();game.aDown=pressed}}
    if(game.phase!=='running'){clearInput();p.v=0;acc=0}
    game.steering=steer;
    if(game.phase==='running'){acc+=dt;while(acc>=1/60&&game.phase==='running'){physics.step(1/60,T.MathUtils.clamp(throttle,-1,1),T.MathUtils.clamp(steer,-1,1),brake||(game.assist&&p.slope>config.limit*.85),game.mars);game.inputTick?.(throttle,steer,brake);tracks.update(p);game.missionStep?.(1/60,throttle);acc-=1/60}}
    land.update(p.x,p.z);rover.position.set(p.x,p.y,p.z);rover.rotation.set(p.pitch,p.yaw,p.roll,'YXZ');
    const s=Math.sin(p.yaw),c=Math.cos(p.yaw),mode=session?1:game.camera;
    rover.visible=mode!==1;
    eye.set(p.x+s*(mode===0?21:0),p.y+(mode===0?10:mode===1?4.4:94),p.z+c*(mode===0?21:0));
    target.set(p.x-s*12,p.y+(mode===1?4.4:2),p.z-c*12);cam.position.copy(eye);cam.up.set(0,1,0);cam.lookAt(target);
    // Derive the HUD arrow from the actual camera, including top-down and XR views.
    const waypoint=game.points?.[game.stats?.stops];
    if(waypoint){
      cam.updateMatrixWorld();
      const viewCamera=session?renderer.xr.getCamera():cam;
      cameraRight.setFromMatrixColumn(viewCamera.matrixWorld,0);cameraRight.y=0;cameraRight.normalize();
      cameraForward.set(cameraRight.z,0,-cameraRight.x).normalize();
      toWaypoint.set(waypoint[0]-p.x,0,waypoint[1]-p.z);
      game.waypointAngle=Math.atan2(toWaypoint.dot(cameraRight),toWaypoint.dot(cameraForward))*180/Math.PI;
    }
    game.xrFrame?.(session,time);renderer.render(scene,cam);
    if(time-lastHUD>100){notify();lastHUD=time}
  }
  function dispose(){window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blur',blur);game.cleanup?.();tracks.dispose();land.dispose();disposeRover(rover);image?.dispose();image?.image.close?.();scene.remove(group);world.table.visible=true;scene.background=saved.bg;scene.fog=saved.fog;cam.position.copy(saved.position);cam.quaternion.copy(saved.rotation);cam.near=saved.near;cam.far=saved.far;cam.updateProjectionMatrix();ctl.enabled=saved.enabled;}
  return Object.assign(game,{frame,dispose});
}
