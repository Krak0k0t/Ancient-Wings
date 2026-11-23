import * as THREE from 'three';

export interface ProceduralMaterialSet {
  sycamore: THREE.MeshPhysicalMaterial;
  sycamoreDark: THREE.MeshStandardMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  wax: THREE.MeshPhysicalMaterial;
  obsidian: THREE.MeshPhysicalMaterial;
  limestone: THREE.MeshStandardMaterial;
  limestoneDark: THREE.MeshStandardMaterial;
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

  // Fine longitudinal micro-scratches & wear
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

  return { map, roughnessMap };
}

function createLimestoneTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [bumpCanvas, bCtx] = makeCanvas(256);

  aCtx.fillStyle = '#c8af84';
  aCtx.fillRect(0, 0, 256, 256);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  // Ashlar stone blocks with weathered mortar seams
  const rows = 4;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 64;
    for (let x = -64; x < 256; x += 128) {
      const shade = Math.floor((Math.random() - 0.5) * 20);
      aCtx.fillStyle = `rgb(${198 + shade}, ${172 + shade}, ${130 + shade})`;
      aCtx.fillRect(x + offset + 2, r * rowH + 2, 124, rowH - 4);

      bCtx.fillStyle = '#9a9a9a';
      bCtx.fillRect(x + offset + 3, r * rowH + 3, 122, rowH - 6);
    }
    // Mortar line
    aCtx.fillStyle = 'rgba(85, 68, 45, 0.45)';
    aCtx.fillRect(0, r * rowH, 256, 3);
    bCtx.fillStyle = '#404040';
    bCtx.fillRect(0, r * rowH, 256, 3);
  }

  // Pitting and desert dust wear
  for (let i = 0; i < 650; i++) {
    const px = Math.random() * 256;
    const py = Math.random() * 256;
    const s = 1 + Math.random() * 2.5;
    aCtx.fillStyle = Math.random() > 0.5 ? 'rgba(92,72,46,0.16)' : 'rgba(235,214,176,0.14)';
    aCtx.fillRect(px, py, s, s);
    bCtx.fillStyle = Math.random() > 0.5 ? '#585858' : '#b2b2b2';
    bCtx.fillRect(px, py, s, s);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);
  bumpMap.anisotropy = maxAniso;

  return { map, bumpMap };
}

function createSandTextures(maxAniso: number) {
  const [albedoCanvas, aCtx] = makeCanvas(256);
  const [bumpCanvas, bCtx] = makeCanvas(256);

  aCtx.fillStyle = '#cfa971';
  aCtx.fillRect(0, 0, 256, 256);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const ripple = Math.sin((y / 256) * Math.PI * 16) * 16;
    const c = Math.floor(204 + ripple * 0.45);
    aCtx.fillStyle = `rgb(${c}, ${c - 34}, ${c - 86})`;
    aCtx.fillRect(0, y, 256, 1);

    const b = Math.floor(128 + ripple * 2.4);
    bCtx.fillStyle = `rgb(${b},${b},${b})`;
    bCtx.fillRect(0, y, 256, 1);
  }

  for (let i = 0; i < 400; i++) {
    aCtx.fillStyle = 'rgba(255,240,205,0.08)';
    aCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(18, 18);
  map.anisotropy = maxAniso;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(18, 18);
  bumpMap.anisotropy = maxAniso;

  return { map, bumpMap };
}

function createWaterBumpTexture(maxAniso: number) {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) {
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
  textures.push(syc.map, syc.roughnessMap);

  const lime = createLimestoneTextures(maxAniso);
  textures.push(lime.map, lime.bumpMap);

  const sandTex = createSandTextures(maxAniso);
  textures.push(sandTex.map, sandTex.bumpMap);

  const waterBump = createWaterBumpTexture(maxAniso);
  textures.push(waterBump);

  const sycamore = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: syc.map,
    roughnessMap: syc.roughnessMap,
    roughness: 0.58,
    metalness: 0.04,
    anisotropy: 0.55,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55,
  });

  const sycamoreDark = new THREE.MeshStandardMaterial({
    color: 0x7c532d,
    map: syc.map,
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
    bumpMap: lime.bumpMap,
    bumpScale: 0.18,
    roughness: 0.86,
    metalness: 0.02,
  });

  const limestoneDark = new THREE.MeshStandardMaterial({
    color: 0x9b8667,
    map: lime.map,
    bumpMap: lime.bumpMap,
    bumpScale: 0.22,
    roughness: 0.92,
    metalness: 0.03,
  });

  const sand = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: sandTex.map,
    bumpMap: sandTex.bumpMap,
    bumpScale: 0.14,
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
    color: 0x5c7c46,
    roughness: 0.78,
    metalness: 0.02,
    emissive: new THREE.Color(0x2d3f18),
    emissiveIntensity: 0.18,
    side: THREE.DoubleSide,
  });

  const rock = new THREE.MeshStandardMaterial({
    color: 0xffffff, // tinted per-instance via setColorAt (grey to dark-blue/slate)
    roughness: 0.88,
    metalness: 0.04,
    bumpMap: lime.bumpMap,
    bumpScale: 0.24,
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
