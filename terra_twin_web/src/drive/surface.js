import * as T from 'three';
export function seedOf(text) {
  let s=2166136261;
  for(const ch of text)s=Math.imul(s^ch.charCodeAt(0),16777619);
  return s>>>0;
}
export function surface(site,raw){
  const n=site.width, seed=seedOf(site.id), rough=Math.max(0,site.roughness||0);
  const amplitude=3*rough/(1+rough);
  const lerp=(a,b,t)=>a+(b-a)*t;
  function coarse(x,z){
    const u=Math.max(0,Math.min(n-1,(x+30000)/site.spacing_m)),v=Math.max(0,Math.min(n-1,(z+30000)/site.spacing_m));
    const i=Math.min(n-2,Math.floor(u)),j=Math.min(n-2,Math.floor(v)),k=j*n+i;
    return lerp(lerp(raw[k],raw[k+1],u-i),lerp(raw[k+n],raw[k+n+1],u-i),v-j)*(site.max_m-site.min_m)/65535;
  }
  function hash(i,j){
    let h=Math.imul(i,374761393)^Math.imul(j,668265263)^seed;
    h=Math.imul(h^(h>>>13),1274126177);
    return ((h^(h>>>16))>>>0)/2147483648-1;
  }
  function noise(x,z,size){
    x/=size;z/=size;const i=Math.floor(x),j=Math.floor(z);x-=i;z-=j;
    x=x*x*(3-2*x);z=z*z*(3-2*z);
    return lerp(lerp(hash(i,j),hash(i+1,j),x),lerp(hash(i,j+1),hash(i+1,j+1),x),z);
  }
  const ground={coarse,exaggeration:10,detail:true,height(x,z){return coarse(x,z)*ground.exaggeration+(ground.detail?amplitude*(.55*noise(x,z,150)+.3*noise(x,z,65)+.15*noise(x,z,22)):0)}};
  return ground;
}
export function landscape(parent,ground,site,image){
  const chunks=new Map(),color=new T.Color(),grain=new Uint8Array(64*64*4);
  let s=seedOf(site.id);
  for(let i=0;i<grain.length;i+=4){
    s=(Math.imul(s,1664525)+1013904223)>>>0;
    grain[i]=grain[i+1]=grain[i+2]=215+(s%41);grain[i+3]=255;
  }
  const detail=new T.DataTexture(grain,64,64);detail.wrapS=detail.wrapT=T.RepeatWrapping;
  detail.magFilter=T.LinearFilter;detail.needsUpdate=true;detail.channel=1;
  const material=new T.MeshLambertMaterial({map:image,vertexColors:!image,aoMap:detail,flatShading:true});
  // Multiply a repeating grain into the linear base color, independently of light direction.
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','').replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= texture2D(aoMap,vAoMapUv).rgb;')};
  let oldX,oldZ;
  function update(x,z,refresh=false){
    const cx=Math.floor(x/600+.5),cz=Math.floor(z/600+.5);
    if(cx===oldX&&cz===oldZ&&!refresh)return;oldX=cx;oldZ=cz;
    const keep=new Set();
    for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
      const tx=cx+i,tz=cz+j,steps=Math.max(Math.abs(i),Math.abs(j))<2?48:16,key=[tx,tz,steps].join('/');
      keep.add(key);if(chunks.has(key)&&!refresh)continue;
      const mesh=chunks.get(key)||new T.Mesh(new T.PlaneGeometry(600,600,steps,steps).rotateX(-Math.PI/2),material);
      const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,grainUV=[],colors=[];
      for(let k=0;k<p.count;k++){
        const a=tx*600+p.getX(k),b=tz*600+p.getZ(k),h=ground.height(a,b);
        p.setY(k,h);
        if(import.meta.env.DEV && p.getY(k)!==Math.fround(ground.height(a,b)))console.warn('Drive mesh and physics height samples differ at',a,b);
        uv.setXY(k,.5+a/60000,.5-b/60000);grainUV.push(a/24,b/24);
        if(!image){const band=Math.floor(6*h/Math.max(1,site.max_m-site.min_m))/6;
          color.setHSL(.095-.035*band,.26,.47+.21*band).multiplyScalar(T.MathUtils.clamp(.88+(ground.coarse(a-25,b)-ground.coarse(a+25,b))*.012,.65,1.12));colors.push(color.r,color.g,color.b);}
      }
      g.setAttribute('uv1',new T.Float32BufferAttribute(grainUV,2));
      if(!image)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      p.needsUpdate=true;uv.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
      mesh.position.set(tx*600,0,tz*600);parent.add(mesh);chunks.set(key,mesh);
    }
    for(const [key,m] of chunks)if(!keep.has(key)){parent.remove(m);m.geometry.dispose();chunks.delete(key)}
  }
  return {update,dispose(){for(const m of chunks.values())m.geometry.dispose();material.dispose();detail.dispose()}};
}
