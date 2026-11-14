import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export function createTerrainCamera(globe){
 const camera=globe.camera(),globeControls=globe.controls();
 const orbit=new OrbitControls(camera,globe.renderer().domElement);
 orbit.enabled=false;orbit.enableDamping=true;orbit.dampingFactor=.12;
 orbit.minDistance=8;orbit.maxDistance=250;orbit.maxPolarAngle=Math.PI*.48;
 orbit.zoomSpeed=.85;orbit.rotateSpeed=.65;orbit.enablePan=false;orbit.zoomToCursor=false;
 let active=false;
 function setActive(next){
  if(next===active)return;active=next;orbit.enabled=next;globeControls.enabled=!next;
  if(!next){if(camera.position.length()<101)camera.position.setLength(340);globeControls.rotateSpeed=.3;globeControls.zoomSpeed=.5}
 }
 function reset(aspect,count){
  setActive(true);const distance=(count>1?82:43)*Math.max(1,.9/aspect);
  camera.position.set(0,distance*.72,distance*.82);camera.up.set(0,1,0);
  camera.near=.05;camera.updateProjectionMatrix();orbit.target.set(0,0,0);orbit.update();
 }
 function zoom(factor){camera.position.sub(orbit.target).multiplyScalar(factor).add(orbit.target);orbit.update()}
 return {orbit,setActive,reset,zoom,update(){if(active)orbit.update()},dispose(){orbit.dispose()}};
}
