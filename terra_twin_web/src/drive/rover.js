import * as T from 'three';
export const wheels=[[-2,-3],[2,-3],[-2,0],[2,0],[-2,3],[2,3]];
export function roverModel(){
  const group=new T.Group(),white=new T.MeshLambertMaterial({color:0xf3f1ea}),dark=new T.MeshLambertMaterial({color:0x263038}),accent=new T.MeshLambertMaterial({color:0xe98b39});
  function part(geo,mat,x,y,z){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);return m}
  part(new T.BoxGeometry(4,1.7,7),white,0,2.3,0);
  part(new T.BoxGeometry(3.7,.35,3),accent,0,3.3,1);
  part(new T.BoxGeometry(.35,2,.35),dark,0,3.8,-2);
  part(new T.BoxGeometry(1.4,.7,.8),white,0,4.9,-2);
  const tire=new T.CylinderGeometry(1,1,1.1,12);
  for(const [x,z] of wheels)part(tire,dark,x,1,z).rotation.z=Math.PI/2;
  return group;
}
export function dynamics(ground,limit){
  const p={x:0,z:0,y:ground.height(0,0),yaw:0,v:0,vy:0,pitch:0,roll:0,slope:0,alarm:0,alarms:0},safe={x:0,z:0,yaw:0};
  function reset(){Object.assign(p,safe,{v:0,vy:0,alarm:0,pitch:0,roll:0});p.y=ground.height(p.x,p.z)}
  function step(dt,throttle,steer,brake,mars){
    if(p.alarm>0){p.alarm-=dt;if(p.alarm<=0)reset();return}
    p.yaw-=steer*dt*Math.min(1,Math.abs(p.v)/6)*Math.sign(p.v)*1.15;
    const s=Math.sin(p.yaw),c=Math.cos(p.yaw);
    let mean=0,dx=0,dz=0;
    for(const [x,z] of wheels){
      const h=ground.height(p.x+x*c+z*s,p.z-x*s+z*c);
      mean+=h/6;dx+=x*h/24;dz+=z*h/36;
    }
    const headingSlope=Math.abs(Math.atan(dz)*180/Math.PI);
    p.slope=Math.atan(Math.hypot(dx,dz))*180/Math.PI;
    if(p.slope>limit*1.5){p.alarm=2;p.alarms++;p.v=0;return}
    if(p.slope<limit){safe.x=p.x;safe.z=p.z;safe.yaw=p.yaw}
    const cap=44*Math.min(1,(limit/Math.max(.01,headingSlope))**2);
    p.v=T.MathUtils.clamp(p.v+throttle*13*dt,-cap*.45,cap);
    // Releasing the accelerator stops the rover instead of leaving a long coast.
    if(Math.abs(throttle)<.01)p.v=0;
    const friction=(brake?36:1.5)*dt;p.v-=Math.sign(p.v)*Math.min(Math.abs(p.v),friction);
    p.x=T.MathUtils.clamp(p.x-s*p.v*dt,-29500,29500);p.z=T.MathUtils.clamp(p.z-c*p.v*dt,-29500,29500);
    p.vy+=((mars?-3.71:-9.81)+(p.y<=mean?Math.max(0,(mean-p.y)*100-p.vy*13):0))*dt;p.y+=p.vy*dt;
    p.pitch+=(-Math.atan(dz)-p.pitch)*.12;p.roll+=(Math.atan(dx)-p.roll)*.12;
  }
  return {p,step,reset};
}
