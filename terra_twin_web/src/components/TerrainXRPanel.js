import * as THREE from 'three';
import {CAPTION, EXAGGERATIONS} from './terrainData';
export function createXRPanel() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide, toneMapped: false});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.82, .82), material);
  mesh.position.set(0, 1.25, -1);
  const buttons = [
    {id: 'previous', text: 'Previous site', x: 32, y: 100, w: 460, h: 88},
    {id: 'next', text: 'Next site', x: 532, y: 100, w: 460, h: 88},
    ...EXAGGERATIONS.map((n, i) => ({id: String(n), text: n + 'x', x: 32 + i * 250, y: 220, w: 210, h: 88})),
    {id: 'colors', text: 'Slope colors', x: 32, y: 340, w: 460, h: 88},
    {id: 'info', text: 'Show / hide info', x: 532, y: 340, w: 460, h: 88},
    {id: 'exit', text: 'Exit VR', x: 32, y: 890, w: 960, h: 88},
  ];
  function draw(state, hover = null) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#1D1D1F'; ctx.font = 'bold 34px system-ui';
    ctx.fillText(state.name.slice(0, 46) + ' / Jezero', 32, 58);
    for (const button of buttons) {
      const active = button.id === String(state.exaggeration) || (button.id === 'colors' && state.colors);
      ctx.fillStyle = button.id === hover || active ? '#0066CC' : '#F5F5F7';
      ctx.fillRect(button.x, button.y, button.w, button.h);
      ctx.strokeStyle = '#6E6E73'; ctx.strokeRect(button.x, button.y, button.w, button.h);
      ctx.fillStyle = active || button.id === hover ? '#FFFFFF' : '#1D1D1F';
      ctx.font = '32px system-ui'; ctx.fillText(button.text, button.x + 20, button.y + 55);
    }
    ctx.fillStyle = '#1D1D1F'; ctx.font = 'bold 30px system-ui';
    ctx.fillText('Vertical exaggeration ' + state.exaggeration + 'x', 32, 488);
    if (state.info) {
      ctx.font = '28px system-ui';
      const words = CAPTION.split(' ');
      let line = '', y = 540;
      for (const word of words) {
        if (ctx.measureText(line + word).width > 944) { ctx.fillText(line, 32, y); line = ''; y += 38; }
        line += word + ' ';
      }
      ctx.fillText(line, 32, y);
    }
    texture.needsUpdate = true;
  }
  function hit(uv) {
    const x = uv.x * 1024, y = (1 - uv.y) * 1024;
    return buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)?.id ?? null;
  }
  return {mesh, draw, hit, dispose() {mesh.geometry.dispose(); material.dispose(); texture.dispose();}};
}
