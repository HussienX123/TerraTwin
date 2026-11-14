import * as T from 'three';
export function createTracks(parent,ground){
 const capacity=6000,positions=new Float32Array(capacity*36);
 const geometry=new T.BufferGeometry();
 const attribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('position',attribute);geometry.setDrawRange(0,0);
 const material=new T.MeshBasicMaterial({color:0x3a3025,transparent:true,opacity:.58,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;parent.add(mesh);
 const previous=new Float64Array(8),current=new Float64Array(8);
 let connected=false,lastX=0,lastZ=0,cursor=0,count=0;
 function clear(){connected=false;cursor=0;count=0;geometry.setDrawRange(0,0)}
 function vertex(offset,x,z){positions[offset]=x;positions[offset+1]=ground.height(x,z)+.12;positions[offset+2]=z}
 function update(p){
  if(p.alarm>0||Math.abs(p.y-ground.height(p.x,p.z))>1.2){connected=false;return}
  const distance=Math.hypot(p.x-lastX,p.z-lastZ);
  if(connected&&distance<.6)return;
  if(distance>8)connected=false;
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  for(let side=0;side<2;side++)for(let edge=0;edge<2;edge++){
   const x=(side===0?-1:1)*2+(edge===0?-.3:.3),k=side*4+edge*2;
   current[k]=p.x+x*c;current[k+1]=p.z-x*s;
  }
  if(connected){
   let offset=cursor*36;
   for(let side=0;side<2;side++){
    const k=side*4;
    vertex(offset,previous[k],previous[k+1]);vertex(offset+3,current[k],current[k+1]);vertex(offset+6,current[k+2],current[k+3]);
    vertex(offset+9,previous[k],previous[k+1]);vertex(offset+12,current[k+2],current[k+3]);vertex(offset+15,previous[k+2],previous[k+3]);offset+=18;
   }
   attribute.addUpdateRange(cursor*36,36);attribute.needsUpdate=true;
   cursor=(cursor+1)%capacity;count=Math.min(count+1,capacity);geometry.setDrawRange(0,count*12);
  }
  previous.set(current);lastX=p.x;lastZ=p.z;connected=true;
 }
 return {update,clear,dispose(){parent.remove(mesh);geometry.dispose();material.dispose()}};
}
