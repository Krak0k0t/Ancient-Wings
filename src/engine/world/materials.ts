import * as THREE from 'three';

export interface ProceduralMaterialSet {
  sycamore: THREE.MeshPhysicalMaterial;
  sycamoreDark: THREE.MeshStandardMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  wax: THREE.MeshPhysicalMaterial;
  obsidian: THREE.MeshPhysicalMaterial;
  limestone: THREE.MeshStandardMaterial;
  limestoneDark: THREE.MeshStandardMaterial;
  mudbrick: THREE.MeshStandardMaterial;
  palmBark: THREE.MeshStandardMaterial;
  palmFrond: THREE.MeshStandardMaterial;
  moss: THREE.MeshStandardMaterial;
  lotusPetal: THREE.MeshPhysicalMaterial;
  sand: THREE.MeshStandardMaterial;
  nileWater: THREE.MeshPhysicalMaterial;
  papyrus: THREE.MeshStandardMaterial;
  rock: THREE.MeshStandardMaterial;
  linenSail: THREE.MeshPhysicalMaterial;
  starGold: THREE.MeshStandardMaterial;
  anomalyShadow: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  repeatX: number,
  repeatY: number,
  maxAniso: number
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const [normCanvas, nCtx] = makeCanvas(w);
  const dst = nCtx.createImageData(w, h);
  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * w + x) * 4;
      dst.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(dst, 0, 0);

  const tex = new THREE.CanvasTexture(normCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  return tex;
}

function createSycamoreTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [roughCanvas, rCtx] = makeCanvas(256);

  aCtx.fillStyle = '#b98952';
  aCtx.fillRect(0, 0, 256, 256);
  rCtx.fillStyle = '#9a9a9a';
  rCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 2) {
    const wave = Math.sin(y * 0.12) * 14 + (Math.random() - 0.5) * 18;
    const tone = Math.floor(155 + wave);
    aCtx.fillStyle = `rgb(${tone + 22}, ${tone - 18}, ${tone - 68})`;
    aCtx.fillRect(0, y, 256, 2);

    const rVal = Math.floor(135 + (Math.random() - 0.5) * 45);
    rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
    rCtx.fillRect(0, y, 256, 2);
  }

  aCtx.strokeStyle = 'rgba(65, 40, 18, 0.22)';
  for (let i = 0; i < 42; i++) {
    aCtx.beginPath();
    const y = Math.random() * 256;
    aCtx.moveTo(0, y);
    aCtx.bezierCurveTo(85, y + (Math.random() - 0.5) * 10, 170, y + (Math.random() - 0.5) * 10, 256, y);
    aCtx.stroke();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(roughCanvas, 1.8, 1, 1, maxAniso);

  return { map, roughnessMap, normalMap };
}

function createLimestoneTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [heightCanvas, hCtx] = makeCanvas(256);
  const [roughCanvas, rCtx] = makeCanvas(256);

  aCtx.fillStyle = '#c8af84';
  aCtx.fillRect(0, 0, 256, 256);
  hCtx.fillStyle = '#888888';
  hCtx.fillRect(0, 0, 256, 256);
  rCtx.fillStyle = '#c8c8c8';
  rCtx.fillRect(0, 0, 256, 256);

  const rows = 4;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 64;
    for (let x = -64; x < 256; x += 128) {
      const shade = Math.floor((Math.random() - 0.5) * 22);
      aCtx.fillStyle = `rgb(${198 + shade}, ${172 + shade}, ${130 + shade})`;
      aCtx.fillRect(x + offset + 2, r * rowH + 2, 124, rowH - 4);

      const hv = Math.floor(148 + (Math.random() - 0.5) * 28);
      hCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hCtx.fillRect(x + offset + 3, r * rowH + 3, 122, rowH - 6);

      const rv = Math.floor(195 + (Math.random() - 0.5) * 35);
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(x + offset + 2, r * rowH + 2, 124, rowH - 4);
    }
    aCtx.fillStyle = 'rgba(85, 68, 45, 0.45)';
    aCtx.fillRect(0, r * rowH, 256, 3);
    hCtx.fillStyle = '#404040';
    hCtx.fillRect(0, r * rowH, 256, 3);
    rCtx.fillStyle = '#efefef';
    rCtx.fillRect(0, r * rowH, 256, 3);
  }

  for (let i = 0; i < 700; i++) {
    const px = Math.random() * 256;
    const py = Math.random() * 256;
    const s = 1 + Math.random() * 2.8;
    aCtx.fillStyle = Math.random() > 0.5 ? 'rgba(92,72,46,0.16)' : 'rgba(235,214,176,0.14)';
    aCtx.fillRect(px, py, s, s);
    hCtx.fillStyle = Math.random() > 0.5 ? '#585858' : '#b2b2b2';
    hCtx.fillRect(px, py, s, s);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(heightCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);
  bumpMap.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);
  roughnessMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(heightCanvas, 2.2, 3, 3, maxAniso);

  return { map, bumpMap, roughnessMap, normalMap };
}

function createMudbrickTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [heightCanvas, hCtx] = makeCanvas(256);

  aCtx.fillStyle = '#9b744b';
  aCtx.fillRect(0, 0, 256, 256);
  hCtx.fillStyle = '#707070';
  hCtx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 32;
    for (let x = -32; x < 256; x += 64) {
      const d = Math.floor((Math.random() - 0.5) * 26);
      aCtx.fillStyle = `rgb(${156 + d}, ${116 + d}, ${74 + Math.floor(d * 0.7)})`;
      aCtx.fillRect(x + off + 2, r * rowH + 2, 60, rowH - 4);
      const hv = Math.floor(155 + (Math.random() - 0.5) * 40);
      hCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hCtx.fillRect(x + off + 2, r * rowH + 2, 60, rowH - 4);
    }
    aCtx.fillStyle = 'rgba(58, 40, 22, 0.5)';
    aCtx.fillRect(0, r * rowH, 256, 2);
  }

  // Straw temper flecks in Nile mud brick
  aCtx.strokeStyle = 'rgba(218, 188, 125, 0.35)';
  for (let i = 0; i < 140; i++) {
    const sx = Math.random() * 256;
    const sy = Math.random() * 256;
    aCtx.beginPath();
    aCtx.moveTo(sx, sy);
    aCtx.lineTo(sx + (Math.random() - 0.5) * 10, sy + (Math.random() - 0.5) * 6);
    aCtx.stroke();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(heightCanvas, 2.5, 3, 3, maxAniso);
  return { map, normalMap };
}

function createPalmBarkTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(128);
  const [heightCanvas, hCtx] = makeCanvas(128);

  aCtx.fillStyle = '#6f4e31';
  aCtx.fillRect(0, 0, 128, 128);
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, 128, 128);

  // Overlapping diamond-scale leaf-base scars typical of Phoenix dactylifera
  const rowH = 16;
  for (let y = 0; y < 128; y += rowH) {
    const shift = ((y / rowH) % 2) * 16;
    for (let x = -16; x < 128; x += 32) {
      const shade = Math.floor((Math.random() - 0.5) * 20);
      aCtx.fillStyle = `rgb(${112 + shade}, ${78 + shade}, ${48 + Math.floor(shade * 0.6)})`;
      aCtx.beginPath();
      aCtx.moveTo(x + shift + 16, y);
      aCtx.lineTo(x + shift + 30, y + rowH * 0.7);
      aCtx.lineTo(x + shift + 16, y + rowH);
      aCtx.lineTo(x + shift + 2, y + rowH * 0.7);
      aCtx.closePath();
      aCtx.fill();

      hCtx.fillStyle = '#c8c8c8';
      hCtx.fillRect(x + shift + 5, y + 3, 22, rowH - 5);
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 6);
  map.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(heightCanvas, 2.4, 2, 6, maxAniso);
  return { map, normalMap };
}

function createMossAlphaTexture(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(128);
  const [alphaCanvas, alCtx] = makeCanvas(128);
  const [heightCanvas, hCtx] = makeCanvas(128);

  alCtx.fillStyle = '#000000';
  alCtx.fillRect(0, 0, 128, 128);
  // Organic irregular shoreline cluster blobs instead of a single round circle
  for (let b = 0; b < 9; b++) {
    const cx = 36 + Math.random() * 56;
    const cy = 36 + Math.random() * 56;
    const rOuter = 14 + Math.random() * 20;
    const grad = alCtx.createRadialGradient(cx, cy, 2, cx, cy, rOuter);
    grad.addColorStop(0, 'rgba(245,245,245,0.92)');
    grad.addColorStop(0.55, 'rgba(180,180,180,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    alCtx.fillStyle = grad;
    alCtx.fillRect(0, 0, 128, 128);
  }

  aCtx.fillStyle = '#2d441f';
  aCtx.fillRect(0, 0, 128, 128);
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 420; i++) {
    const px = Math.random() * 128;
    const py = Math.random() * 128;
    const r = 1.2 + Math.random() * 2.5;
    aCtx.fillStyle = i % 3 === 0 ? '#3a5426' : i % 3 === 1 ? '#233617' : '#4a5c28';
    aCtx.beginPath();
    aCtx.arc(px, py, r, 0, Math.PI * 2);
    aCtx.fill();

    hCtx.fillStyle = i % 2 === 0 ? '#b0b0b0' : '#505050';
    hCtx.beginPath();
    hCtx.arc(px, py, r, 0, Math.PI * 2);
    hCtx.fill();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(heightCanvas, 1.8, 1, 1, maxAniso);
  return { map, alphaMap, normalMap };
}

function createSandTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [heightCanvas, hCtx] = makeCanvas(256);

  aCtx.fillStyle = '#cfa971';
  aCtx.fillRect(0, 0, 256, 256);
  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const ripple = Math.sin((y / 256) * Math.PI * 16) * 16;
    const c = Math.floor(204 + ripple * 0.45);
    aCtx.fillStyle = `rgb(${c}, ${c - 34}, ${c - 86})`;
    aCtx.fillRect(0, y, 256, 1);

    const b = Math.floor(128 + ripple * 2.4);
    hCtx.fillStyle = `rgb(${b},${b},${b})`;
    hCtx.fillRect(0, y, 256, 1);
  }

  for (let i = 0; i < 480; i++) {
    aCtx.fillStyle = 'rgba(255,240,205,0.08)';
    aCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(18, 18);
  map.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(heightCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(18, 18);
  bumpMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(heightCanvas, 1.4, 18, 18, maxAniso);

  return { map, bumpMap, normalMap };
}

function createWaterBumpTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 16 + Math.random() * 44;
    const g = ctx.createLinearGradient(x, y, x + w, y + 4);
    g.addColorStop(0, 'rgba(128,128,128,0)');
    g.addColorStop(0.5, 'rgba(210,210,210,0.45)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 24);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createProceduralMaterials(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): ProceduralMaterialSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const syc = createSycamoreTextures(maxAniso);
  textures.push(syc.map, syc.roughnessMap, syc.normalMap);

  const lime = createLimestoneTextures(maxAniso);
  textures.push(lime.map, lime.bumpMap, lime.roughnessMap, lime.normalMap);

  const mud = createMudbrickTextures(maxAniso);
  textures.push(mud.map, mud.normalMap);

  const palm = createPalmBarkTextures(maxAniso);
  textures.push(palm.map, palm.normalMap);

  const mossTex = createMossAlphaTexture(maxAniso);
  textures.push(mossTex.map, mossTex.alphaMap, mossTex.normalMap);

  const sandTex = createSandTextures(maxAniso);
  textures.push(sandTex.map, sandTex.bumpMap, sandTex.normalMap);

  const waterBump = createWaterBumpTexture(maxAniso);
  textures.push(waterBump);

  const sycamore = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: syc.map,
    roughnessMap: syc.roughnessMap,
    normalMap: syc.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.58,
    metalness: 0.04,
    anisotropy: 0.55,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55,
  });

  const sycamoreDark = new THREE.MeshStandardMaterial({
    color: 0x7c532d,
    map: syc.map,
    normalMap: syc.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.72,
    metalness: 0.05,
  });

  const bronze = new THREE.MeshPhysicalMaterial({
    color: 0xc8964a,
    roughness: 0.28,
    metalness: 0.92,
    anisotropy: 0.7,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  });

  const wax = new THREE.MeshPhysicalMaterial({
    color: 0xd8a84e,
    roughness: 0.32,
    metalness: 0.02,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
    sheen: 0.3,
    sheenColor: new THREE.Color(0xffe19c),
  });

  const obsidian = new THREE.MeshPhysicalMaterial({
    color: 0x151822,
    roughness: 0.12,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const limestone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: lime.map,
    normalMap: lime.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: lime.roughnessMap,
    roughness: 0.86,
    metalness: 0.02,
  });

  const limestoneDark = new THREE.MeshStandardMaterial({
    color: 0x9b8667,
    map: lime.map,
    normalMap: lime.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: lime.roughnessMap,
    roughness: 0.92,
    metalness: 0.03,
  });

  const mudbrick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: mud.map,
    normalMap: mud.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.94,
    metalness: 0.0,
  });

  const palmBark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: palm.map,
    normalMap: palm.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.85,
    metalness: 0.0,
  });

  const palmFrond = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Tinted per-instance via setColorAt
    roughness: 0.78,
    metalness: 0.0,
    emissive: new THREE.Color(0x0c1707),
    emissiveIntensity: 0.08,
    side: THREE.DoubleSide,
  });

  const moss = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: mossTex.map,
    alphaMap: mossTex.alphaMap,
    normalMap: mossTex.normalMap,
    transparent: true,
    alphaTest: 0.16,
    roughness: 1.0,
    metalness: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const lotusPetal = new THREE.MeshPhysicalMaterial({
    color: 0xe6b8ca,
    emissive: new THREE.Color(0x2d1621),
    emissiveIntensity: 0.1,
    roughness: 0.42,
    metalness: 0.0,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xffe6f0),
    transmission: isSoftwareGl ? 0 : 0.2,
    thickness: 0.15,
    side: THREE.DoubleSide,
  });

  const sand = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sandTex.map,
    normalMap: sandTex.normalMap,
    normalScale: new THREE.Vector2(0.42, 0.42),
    bumpMap: sandTex.bumpMap,
    bumpScale: 0.12,
    roughness: 0.94,
    metalness: 0.0,
  });

  const nileWater = new THREE.MeshPhysicalMaterial({
    color: 0x1b5c72,
    emissive: new THREE.Color(0x092430),
    emissiveIntensity: 0.28,
    bumpMap: waterBump,
    bumpScale: 0.14,
    roughness: 0.24,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.16,
    transmission: isSoftwareGl ? 0 : 0.22,
    ior: 1.33,
    transparent: true,
    opacity: 0.95,
  });

  const papyrus = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Tinted per-instance via setColorAt
    roughness: 0.74,
    metalness: 0.02,
    emissive: new THREE.Color(0x283e18),
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });

  const rock = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Tinted per-instance via setColorAt (grey to dark-blue/slate)
    roughness: 0.86,
    metalness: 0.04,
    normalMap: lime.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
  });

  const linenSail = new THREE.MeshPhysicalMaterial({
    color: 0xeadcc2,
    roughness: 0.84,
    metalness: 0.0,
    sheen: 0.5,
    sheenColor: new THREE.Color(0xfff4de),
    side: THREE.DoubleSide,
  });

  const starGold = new THREE.MeshStandardMaterial({
    color: 0xf4c96b,
    emissive: new THREE.Color(0xe5a93c),
    emissiveIntensity: 1.35,
    roughness: 0.28,
    metalness: 0.85,
  });

  const anomalyShadow = new THREE.MeshPhysicalMaterial({
    color: 0x0d0b14,
    emissive: new THREE.Color(0x3b2768),
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.4,
    transparent: true,
    opacity: 0.82,
    clearcoat: 0.9,
  });

  materials.push(
    sycamore,
    sycamoreDark,
    bronze,
    wax,
    obsidian,
    limestone,
    limestoneDark,
    mudbrick,
    palmBark,
    palmFrond,
    moss,
    lotusPetal,
    sand,
    nileWater,
    papyrus,
    rock,
    linenSail,
    starGold,
    anomalyShadow
  );

  return {
    sycamore,
    sycamoreDark,
    bronze,
    wax,
    obsidian,
    limestone,
    limestoneDark,
    mudbrick,
    palmBark,
    palmFrond,
    moss,
    lotusPetal,
    sand,
    nileWater,
    papyrus,
    rock,
    linenSail,
    starGold,
    anomalyShadow,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
