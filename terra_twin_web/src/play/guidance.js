import * as T from 'three';
export function attachGuidance(game){
 const material=new T.MeshBasicMaterial({color:0xFF6A00,side:T.DoubleSide,depthTest:false});
 const shape=new T.Shape();shape.moveTo(0,-3);shape.lineTo(-1.5,0);shape.lineTo(-.5,0);shape.lineTo(-.5,2);shape.lineTo(.5,2);shape.lineTo(.5,0);shape.lineTo(1.5,0);shape.closePath();
 const arrow=new T.Mesh(new T.ShapeGeometry(shape),material);arrow.geometry.rotateX(Math.PI/2);arrow.renderOrder=5;game.group.add(arrow);
 const previous=game.xrFrame,cleanup=game.cleanup;
 game.xrFrame=(session,time)=>{const p=game.p,q=game.points[game.stats.stops];arrow.visible=!!q;if(q){arrow.position.set(p.x,p.y+5,p.z);arrow.rotation.y=Math.atan2(-(q[0]-p.x),-(q[1]-p.z));arrow.scale.setScalar(game.assist?2:1)}previous?.(session,time)};
 game.cleanup=()=>{cleanup?.();arrow.geometry.dispose();material.dispose()};
}
