import {canvasTheme} from './canvasTheme';
import {HORIZONTAL_MAGNIFICATION} from './GlobeTerrainPatch';
import * as THREE from 'three';
import {textureCaption} from './GlobeTerrainControls';
export function createGlobeXRPanel() {
  const theme=canvasTheme();
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1200;
  const ctx = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.76, .89), new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, toneMapped: false}));
  mesh.position.set(0, 1.3, -1.1);
  const buttons = [
    {id: 'previous', text: 'Previous site', x: 24, y: 90, w: 466, h: 88},
    {id: 'next', text: 'Next site', x: 534, y: 90, w: 466, h: 88},
    {id: 'image', text: 'Image / Slope colors', x: 24, y: 205, w: 976, h: 88},
    ...[1, 2, 5, 10].map((n, i) => ({id: String(n), text: n + 'x', x: 24 + i * 250, y: 320, w: 220, h: 88})),
    {id: 'compare', text: 'Compare with Jezero', x: 24, y: 435, w: 976, h: 88},
    {id: 'stage', text: 'Side by side / Return', x: 24, y: 550, w: 976, h: 88},
    {id: 'hide', text: 'Hide / Show terrain', x: 24, y: 665, w: 976, h: 88},
    {id: 'exit', text: 'Exit VR', x: 24, y: 1090, w: 976, h: 88},
  ];
  function draw(state, site, hover) {
    ctx.fillStyle = theme.navy; ctx.fillRect(0, 0, 1024, 1200);
    ctx.fillStyle = theme.label; ctx.font = 'bold 30px system-ui'; ctx.fillText(site?.name || 'Choose a terrain site', 24, 50);
    for (const b of buttons) {
      const active = b.id === String(state.exaggeration) || b.id === hover || (b.id === 'compare' && state.compareTerrain);
      ctx.fillStyle = active ? theme.orange : theme.raised; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = theme.orange; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = active ? theme.navy : theme.label; ctx.font = '30px system-ui'; ctx.fillText(b.text, b.x + 20, b.y + 55);
    }
    ctx.fillStyle = theme.label; ctx.font = '26px system-ui';
    ctx.fillText('Magnified about '+HORIZONTAL_MAGNIFICATION.toFixed(1)+' x (horizontal)',24,795);
    ctx.fillText('Vertical exaggeration ' + state.exaggeration + 'x / ' + (state.terrainMode === 'image' ? 'Image' : 'Slope colors'), 24, 830);
    if (site) {
      let line = '', y = 870;
      for (const word of textureCaption(site).split(' ')) {
        if (ctx.measureText(line + word).width > 976) {ctx.fillText(line, 24, y); line = ''; y += 30;}
        line += word + ' ';
      }
      ctx.fillText(line, 24, y);
    }
    texture.needsUpdate = true;
  }
  return {mesh, draw, hit(uv) {
    const x = uv.x * 1024, y = (1 - uv.y) * 1200;
    return buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)?.id;
  }, dispose() {mesh.geometry.dispose(); mesh.material.dispose(); texture.dispose();}};
}
