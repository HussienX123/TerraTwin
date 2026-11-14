import * as T from 'three';
// Retain material groups and representative vertex attributes while reducing tiny CAD details.
export function roverLOD(model){
 model.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry.index)return;
  const source=mesh.geometry,position=source.attributes.position;
  if(source.index.count<3000)return;
  source.computeBoundingBox();const box=source.boundingBox,size=box.getSize(new T.Vector3()),step=Math.max(size.x,size.y,size.z)/64;
  if(!step)return;
  const buckets=new Map(),remap=new Uint32Array(position.count),representatives=[];
  for(let i=0;i<position.count;i++){
   const key=[Math.round(position.getX(i)/step),Math.round(position.getY(i)/step),Math.round(position.getZ(i)/step)].join('/');
   let target=buckets.get(key);if(target===undefined){target=representatives.length;buckets.set(key,target);representatives.push(i)}remap[i]=target;
  }
  const indices=[];for(let i=0;i<source.index.count;i+=3){const a=remap[source.index.getX(i)],b=remap[source.index.getX(i+1)],c=remap[source.index.getX(i+2)];if(a!==b&&b!==c&&a!==c)indices.push(a,b,c)}
  const geometry=new T.BufferGeometry();
  for(const [name,attribute] of Object.entries(source.attributes)){
   const values=new Float32Array(representatives.length*attribute.itemSize);
   for(let i=0;i<representatives.length;i++)for(let c=0;c<attribute.itemSize;c++)values[i*attribute.itemSize+c]=attribute.getComponent(representatives[i],c);
   geometry.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize));
  }
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();mesh.geometry=geometry;source.dispose();
 });
}
