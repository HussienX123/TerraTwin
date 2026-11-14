import * as T from 'three';
import {roverLOD} from './roverLOD';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
export async function loadRover(signal){
 const response=await fetch('/models/perseverance.glb',{signal});
 if(!response.ok)throw Error('Rover model could not load.');
 const data=await response.arrayBuffer(),decoder=new DRACOLoader();
 decoder.setDecoderPath('/models/draco/');
 const loader=new GLTFLoader().setDRACOLoader(decoder);
 try{
  const asset=await loader.parseAsync(data,'/models/'),model=asset.scene;
  roverLOD(model);
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const scale=7/Math.max(size.x,size.z);
  const group=new T.Group();model.position.set(-center.x,-box.min.y,-center.z);group.add(model);group.scale.setScalar(scale);
  const replacements=new Map();
  model.traverse(m=>{if(m.isMesh){
   const convert=material=>{if(!replacements.has(material))replacements.set(material,new T.MeshLambertMaterial({color:material.color,map:material.map,side:T.FrontSide,transparent:material.transparent,opacity:material.opacity,alphaTest:material.alphaTest}));return replacements.get(material)};
   m.material=Array.isArray(m.material)?m.material.map(convert):convert(m.material);
   m.castShadow=false;m.receiveShadow=false;
  }});
  for(const material of replacements.keys())material.dispose();
  return group;
 }finally{decoder.dispose()}
}
export function disposeRover(rover){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 rover.traverse(m=>{if(m.geometry)geometries.add(m.geometry);for(const mat of (Array.isArray(m.material)?m.material:[m.material]))if(mat){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value)}});
 for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.source?.data?.close?.()}
}
