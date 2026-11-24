import * as THREE from 'three';
import { GraphicsQuality } from '../../types/game';
import { ProceduralMaterialSet } from './materials';

export interface NatureLayerHandle {
  group: THREE.Group;
  riverMesh: THREE.Mesh;
  update: (
    time: number,
    dt: number,
    quality: GraphicsQuality,
    atmosphere: 'dawn' | 'duat' | 'memphis' | 'set'
  ) => void;
  setQuality: (quality: GraphicsQuality) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function nileCenterX(z: number): number {
  return -Math.sin(z * 0.014) * 18;
}

export function groundHeightAt(x: number, z: number): number {
  const riverDist = Math.abs(x - nileCenterX(z));
  if (riverDist < 28) {
    return -3.8 * (1 - riverDist / 28);
  }
  let h =
    Math.sin(x * 0.025) * Math.cos(z * 0.022) * 3.8 +
    Math.sin((x + z) * 0.05) * 1.1;
  // Natural rising sandstone mesa perimeter far outside the valley
  if (Math.abs(x) > 165) {
    const ridgeT = Math.min(1, (Math.abs(x) - 165) / 85);
    h += ridgeT * ridgeT * (22 + Math.sin(z * 0.035) * 8 + Math.cos(x * 0.06) * 5);
  }
  const distCourt = Math.hypot(x, z - 110);
  if (distCourt < 36) {
    const blend = Math.max(0, (distCourt - 16) / 20);
    h *= blend;
  }
  return h;
}

const SUNBEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SUNBEAM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  void main() {
    float ndotv = abs(dot(normalize(vNormalWorld), normalize(vViewDir)));
    float edgeFade = smoothstep(0.12, 0.72, ndotv);
    float yFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
    float shimmer = 0.78 + 0.22 * sin(vUv.x * 18.84 + uTime * 0.6);
    float alpha = edgeFade * yFade * shimmer * uStrength;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const SAND_WISP_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float flow = sin(vUv.x * 12.0 - uTime * 2.4 + sin(vUv.y * 8.0)) * 0.5 + 0.5;
    float edgeX = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
    float edgeY = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
    float alpha = flow * edgeX * edgeY * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function buildNatureLayer(mats: ProceduralMaterialSet): NatureLayerHandle {
  const group = new THREE.Group();
  group.name = 'NatureLayer';
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Desert Ground Plane with Dune Waves & Distant Sandstone Valley Perimeter
  const desertGeo = new THREE.PlaneGeometry(760, 760, 72, 72);
  desertGeo.rotateX(-Math.PI / 2);
  const posAttr = desertGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(x, z));
  }
  desertGeo.computeVertexNormals();
  geometries.push(desertGeo);

  const desertMesh = new THREE.Mesh(desertGeo, mats.sand);
  desertMesh.receiveShadow = true;
  group.add(desertMesh);

  // 2. Nile River Water Ribbon
  const riverGeo = new THREE.PlaneGeometry(58, 760, 24, 96);
  riverGeo.rotateX(-Math.PI / 2);
  const rAttr = riverGeo.attributes.position;
  for (let i = 0; i < rAttr.count; i++) {
    const x = rAttr.getX(i);
    const z = rAttr.getZ(i);
    rAttr.setX(i, x + nileCenterX(z));
  }
  riverGeo.computeVertexNormals();
  geometries.push(riverGeo);

  const riverMesh = new THREE.Mesh(riverGeo, mats.nileWater);
  riverMesh.position.y = -0.65;
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  // 3. Instanced Desert & Limestone Rocks (flattened noise + vertexColors grey -> dark slate blue)
  const rockGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const rockPos = rockGeo.attributes.position;
  const rockColors = new Float32Array(rockPos.count * 3);
  for (let i = 0; i < rockPos.count; i++) {
    const vx = rockPos.getX(i);
    const vy = rockPos.getY(i);
    const vz = rockPos.getZ(i);
    const noise = 0.8 + 0.35 * Math.sin(vx * 3.1 + vz * 2.4);
    rockPos.setXYZ(i, vx * noise * 1.25, vy * noise * 0.58, vz * noise * 1.1);
    const t = THREE.MathUtils.clamp((vy + 1.2) / 2.4, 0, 1);
    _color.setRGB(
      THREE.MathUtils.lerp(0.24, 0.62, t),
      THREE.MathUtils.lerp(0.27, 0.56, t),
      THREE.MathUtils.lerp(0.36, 0.48, t)
    );
    rockColors[i * 3] = _color.r;
    rockColors[i * 3 + 1] = _color.g;
    rockColors[i * 3 + 2] = _color.b;
  }
  rockGeo.setAttribute('color', new THREE.BufferAttribute(rockColors, 3));
  rockGeo.computeVertexNormals();
  geometries.push(rockGeo);

  const rockMat = mats.rock.clone();
  rockMat.vertexColors = true;
  localMaterials.push(rockMat);

  const MAX_ROCKS = 160;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, MAX_ROCKS);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  for (let i = 0; i < MAX_ROCKS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -220 + ((i * 37) % 420);
    const riverX = nileCenterX(z);
    const x = riverX + side * (34 + ((i * 23) % 135));
    const gy = groundHeightAt(x, z);
    _dummy.position.set(x, gy + 0.25, z);
    _dummy.rotation.set((i % 5) * 0.14, (i * 1.7) % (Math.PI * 2), (i % 3) * 0.12);
    const s = 0.75 + ((i * 19) % 100) * 0.025;
    _dummy.scale.set(s * 1.35, s * 0.72, s);
    _dummy.updateMatrix();
    rockInst.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.1 + (i % 7) * 0.015, 0.16, 0.48 + (i % 5) * 0.06);
    rockInst.setColorAt(i, _color);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  // 4. Authentic Nile Date Palms (Phoenix dactylifera): curved trunks + arched palm frond crowns
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.35, 2.4, 0.15),
    new THREE.Vector3(0.95, 5.2, -0.1),
    new THREE.Vector3(1.45, 7.8, -0.25),
  ]);
  const palmTrunkGeo = new THREE.TubeGeometry(trunkCurve, 12, 0.28, 7, false);
  // Taper trunk upward
  const ptPos = palmTrunkGeo.attributes.position;
  for (let i = 0; i < ptPos.count; i++) {
    const y = ptPos.getY(i);
    const taper = 1.15 - THREE.MathUtils.clamp(y / 8.0, 0, 1) * 0.45;
    const centerOnCurve = trunkCurve.getPoint(THREE.MathUtils.clamp(y / 7.8, 0, 1));
    ptPos.setX(i, centerOnCurve.x + (ptPos.getX(i) - centerOnCurve.x) * taper);
    ptPos.setZ(i, centerOnCurve.z + (ptPos.getZ(i) - centerOnCurve.z) * taper);
  }
  palmTrunkGeo.computeVertexNormals();
  geometries.push(palmTrunkGeo);

  // Arched feather palm frond blade (curved along length)
  const frondGeo = new THREE.PlaneGeometry(0.85, 3.6, 2, 7);
  const fPos = frondGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const y = fPos.getY(i) + 1.8; // 0..3.6 from crown core outward
    const ny = y / 3.6;
    const x = fPos.getX(i);
    // Taper to pointed tip and arch gracefully downward
    const widthProfile = Math.sin(ny * Math.PI) * 1.15;
    const archY = Math.sin(ny * Math.PI * 0.78) * 0.72 - ny * ny * 1.25;
    fPos.setXYZ(i, x * widthProfile, archY, y);
  }
  frondGeo.computeVertexNormals();
  geometries.push(frondGeo);

  const MAX_PALMS = 56;
  const FRONDS_PER_PALM = 9;
  const palmTrunkInst = new THREE.InstancedMesh(palmTrunkGeo, mats.palmBark, MAX_PALMS);
  palmTrunkInst.castShadow = true;
  palmTrunkInst.receiveShadow = true;
  const palmFrondInst = new THREE.InstancedMesh(
    frondGeo,
    mats.palmFrond,
    MAX_PALMS * FRONDS_PER_PALM
  );
  palmFrondInst.castShadow = true;

  const palmPlacements: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    scale: number;
    phase: number;
  }[] = [];

  for (let i = 0; i < MAX_PALMS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    let z = -205 + ((i * 17.3) % 390);
    // Keep Saqqara launch courtyard clear around z=88..132
    if (z > 84 && z < 134) z -= 54;
    const x = nileCenterX(z) + side * (29.5 + (i % 5) * 2.1);
    const y = groundHeightAt(x, z) - 0.1;
    const rotY = (i * 2.39) % (Math.PI * 2);
    const scale = 0.8 + (i % 5) * 0.1;
    palmPlacements.push({ x, y, z, rotY, scale, phase: i * 0.7 });

    _dummy.position.set(x, y, z);
    _dummy.rotation.set(0, rotY, 0);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    palmTrunkInst.setMatrixAt(i, _dummy.matrix);

    // Crown tip in local trunk coordinates is (1.45, 7.8, -0.25)
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const crownX = x + (1.45 * cosR - -0.25 * sinR) * scale;
    const crownY = y + 7.75 * scale;
    const crownZ = z + (-1.45 * sinR - 0.25 * cosR) * scale;

    for (let f = 0; f < FRONDS_PER_PALM; f++) {
      const idx = i * FRONDS_PER_PALM + f;
      const fYaw = (f / FRONDS_PER_PALM) * Math.PI * 2 + (i % 3) * 0.25;
      const fPitch = f % 2 === 0 ? 0.18 : -0.14;
      _dummy.position.set(crownX, crownY, crownZ);
      _dummy.rotation.set(fPitch, fYaw, 0, 'YXZ');
      _dummy.scale.setScalar(scale * (0.92 + (f % 3) * 0.08));
      _dummy.updateMatrix();
      palmFrondInst.setMatrixAt(idx, _dummy.matrix);
      _color.setHSL(0.25 + (f % 3) * 0.02, 0.56, 0.20 + (i % 4) * 0.03);
      palmFrondInst.setColorAt(idx, _color);
    }
  }
  palmTrunkInst.instanceMatrix.needsUpdate = true;
  palmFrondInst.instanceMatrix.needsUpdate = true;
  if (palmFrondInst.instanceColor) palmFrondInst.instanceColor.needsUpdate = true;
  palmTrunkInst.computeBoundingSphere();
  palmFrondInst.computeBoundingSphere();
  group.add(palmTrunkInst, palmFrondInst);

  // 5. Clustered Desert Tamarisk / Acacia Scrub Limbs (3 splayed limbs per shrub cluster, no worm twigs)
  const branchGeo = new THREE.CylinderGeometry(0.05, 0.16, 2.2, 5, 3);
  const bPos = branchGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const y = bPos.getY(i) + 1.1;
    const spread = (y / 2.2) * (y / 2.2) * 0.95;
    bPos.setXYZ(i, bPos.getX(i) + spread, y, bPos.getZ(i));
  }
  branchGeo.computeVertexNormals();
  geometries.push(branchGeo);

  const SHRUB_CLUSTERS = 28;
  const LIMBS_PER_SHRUB = 4;
  const MAX_BRANCHES = SHRUB_CLUSTERS * LIMBS_PER_SHRUB;
  const branchInst = new THREE.InstancedMesh(branchGeo, mats.sycamoreDark, MAX_BRANCHES);
  for (let c = 0; c < SHRUB_CLUSTERS; c++) {
    const side = c % 2 === 0 ? -1 : 1;
    const z = -185 + ((c * 31) % 365);
    const x = nileCenterX(z) + side * (36 + ((c * 23) % 85));
    const y = groundHeightAt(x, z) - 0.15;
    const baseScale = 0.7 + (c % 4) * 0.16;
    for (let k = 0; k < LIMBS_PER_SHRUB; k++) {
      const idx = c * LIMBS_PER_SHRUB + k;
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(0.42 + (k % 2) * 0.15, (k / LIMBS_PER_SHRUB) * Math.PI * 2 + c * 0.7, 0.35);
      _dummy.scale.setScalar(baseScale * (0.8 + (k % 3) * 0.12));
      _dummy.updateMatrix();
      branchInst.setMatrixAt(idx, _dummy.matrix);
    }
  }
  branchInst.instanceMatrix.needsUpdate = true;
  branchInst.computeBoundingSphere();
  group.add(branchInst);

  // 6. Riverbank Moss / Wet Silt Cushion Patches hugging the Nile water edge
  const mossGeo = new THREE.PlaneGeometry(3.8, 3.0);
  mossGeo.rotateX(-Math.PI / 2);
  geometries.push(mossGeo);
  const MAX_MOSS = 68;
  const mossInst = new THREE.InstancedMesh(mossGeo, mats.moss, MAX_MOSS);
  for (let i = 0; i < MAX_MOSS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -195 + ((i * 19.5) % 380);
    const x = nileCenterX(z) + side * (22.2 + (i % 4) * 0.75);
    const y = Math.max(-0.55, groundHeightAt(x, z) + 0.06);
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(0, (i * 1.4) % (Math.PI * 2), 0);
    const sc = 0.75 + (i % 4) * 0.22;
    _dummy.scale.set(sc, 1, sc * 1.15);
    _dummy.updateMatrix();
    mossInst.setMatrixAt(i, _dummy.matrix);
  }
  mossInst.instanceMatrix.needsUpdate = true;
  mossInst.computeBoundingSphere();
  group.add(mossInst);

  // 7. Instanced Papyrus / Riverbank Reeds (curved leaf blades along Nile shore)
  const reedGeo = new THREE.PlaneGeometry(0.45, 3.6, 1, 4);
  const reedPos = reedGeo.attributes.position;
  for (let i = 0; i < reedPos.count; i++) {
    const y = reedPos.getY(i) + 1.8;
    const bend = (y / 3.6) * (y / 3.6) * 0.7;
    reedPos.setY(i, y);
    reedPos.setZ(i, bend);
    reedPos.setX(i, reedPos.getX(i) * (1 - (y / 3.6) * 0.75));
  }
  reedGeo.computeVertexNormals();
  geometries.push(reedGeo);

  const MAX_REEDS = 380;
  const reedInst = new THREE.InstancedMesh(reedGeo, mats.papyrus, MAX_REEDS);
  const reedData: { x: number; y: number; z: number; rotY: number; scale: number }[] = [];
  for (let i = 0; i < MAX_REEDS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -210 + ((i * 18.2) % 400);
    const x = nileCenterX(z) + side * (25 + (i % 9));
    const y = Math.max(-0.75, groundHeightAt(x, z) - 0.15);
    const rotY = (i * 1.31) % (Math.PI * 2);
    const scale = 0.75 + (i % 7) * 0.12;
    reedData.push({ x, y, z, rotY, scale });

    _dummy.position.set(x, y, z);
    _dummy.rotation.set(0, rotY, 0);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    reedInst.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.24 + (i % 5) * 0.02, 0.38, 0.34 + (i % 4) * 0.05);
    reedInst.setColorAt(i, _color);
  }
  reedInst.instanceMatrix.needsUpdate = true;
  if (reedInst.instanceColor) reedInst.instanceColor.needsUpdate = true;
  reedInst.computeBoundingSphere();
  group.add(reedInst);

  // 8. Floating Nile Lotus Pads + Layered Blossoms near Quiet Eddies (hidden in Set & Duat)
  const lotusPadGeo = new THREE.CircleGeometry(0.95, 10, 0.2, Math.PI * 1.85);
  lotusPadGeo.rotateX(-Math.PI / 2);
  const lotusGeo = new THREE.CylinderGeometry(0.42, 0.14, 0.28, 7, 1, true);
  geometries.push(lotusPadGeo, lotusGeo);
  const lotusPadMat = new THREE.MeshStandardMaterial({
    color: 0x2f5425,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  localMaterials.push(lotusPadMat);

  const MAX_LOTUS = 44;
  const lotusPadInst = new THREE.InstancedMesh(lotusPadGeo, lotusPadMat, MAX_LOTUS);
  const lotusInst = new THREE.InstancedMesh(lotusGeo, mats.lotusPetal, MAX_LOTUS);
  for (let i = 0; i < MAX_LOTUS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -185 + ((i * 23) % 360);
    const x = nileCenterX(z) + side * (20 + (i % 5) * 1.0);
    const sc = 0.75 + (i % 4) * 0.2;
    _dummy.position.set(x, -0.60, z);
    _dummy.rotation.set(0, (i * 0.9) % (Math.PI * 2), 0);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    lotusPadInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(x, -0.49, z);
    _dummy.scale.setScalar(sc * 0.85);
    _dummy.updateMatrix();
    lotusInst.setMatrixAt(i, _dummy.matrix);
  }
  lotusPadInst.instanceMatrix.needsUpdate = true;
  lotusInst.instanceMatrix.needsUpdate = true;
  lotusPadInst.computeBoundingSphere();
  lotusInst.computeBoundingSphere();
  group.add(lotusPadInst, lotusInst);

  // 9. Natural Phenomena: Dawn/Golden Sunbeam Shafts + Dune Sand-Drift Wisps + Soaring Cliff Swallows
  const sunbeamGroup = new THREE.Group();
  const beamGeo = new THREE.CylinderGeometry(9, 26, 130, 14, 1, true);
  geometries.push(beamGeo);
  const sunbeamUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0xffe2a8) },
    uStrength: { value: 0.09 },
  };
  const sunbeamMat = new THREE.ShaderMaterial({
    uniforms: sunbeamUniforms,
    vertexShader: SUNBEAM_VERTEX,
    fragmentShader: SUNBEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  localMaterials.push(sunbeamMat);
  const beamPositions = [
    { x: 52, y: 42, z: 38, rz: 0.38 },
    { x: 58, y: 46, z: -48, rz: 0.4 },
    { x: -46, y: 44, z: -115, rz: 0.34 },
  ];
  for (const bp of beamPositions) {
    const beam = new THREE.Mesh(beamGeo, sunbeamMat);
    beam.position.set(bp.x, bp.y, bp.z);
    beam.rotation.z = bp.rz;
    sunbeamGroup.add(beam);
  }
  group.add(sunbeamGroup);

  const sandWispUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0xe6be84) },
    uOpacity: { value: 0.18 },
  };
  const sandWispMat = new THREE.ShaderMaterial({
    uniforms: sandWispUniforms,
    vertexShader: SUNBEAM_VERTEX,
    fragmentShader: SAND_WISP_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  localMaterials.push(sandWispMat);
  const wispGeo = new THREE.PlaneGeometry(34, 12);
  wispGeo.rotateX(-Math.PI / 2);
  geometries.push(wispGeo);
  const wispGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -140 + i * 36;
    const x = nileCenterX(z) + side * (52 + (i % 3) * 18);
    const w = new THREE.Mesh(wispGeo, sandWispMat);
    w.position.set(x, groundHeightAt(x, z) + 0.65, z);
    w.rotation.y = (i % 3) * 0.25;
    wispGroup.add(w);
  }
  group.add(wispGroup);

  // High-soaring distant desert swifts/hawks circling palm cliffs (adds life & scale)
  const birdWingGeo = new THREE.BufferGeometry();
  const birdVerts = new Float32Array([
    0, 0, 0.3, -1.6, 0.2, -0.2, 0, 0, -0.35,
    0, 0, 0.3, 0, 0, -0.35, 1.6, 0.2, -0.2,
  ]);
  birdWingGeo.setAttribute('position', new THREE.BufferAttribute(birdVerts, 3));
  birdWingGeo.computeVertexNormals();
  geometries.push(birdWingGeo);
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.65, side: THREE.DoubleSide });
  localMaterials.push(birdMat);
  const MAX_BIRDS = 14;
  const birdInst = new THREE.InstancedMesh(birdWingGeo, birdMat, MAX_BIRDS);
  birdInst.frustumCulled = false;
  group.add(birdInst);

  // 10. Instanced Atmospheric Dust & Lantern Embers
  const moteGeo = new THREE.OctahedronGeometry(0.14, 0);
  geometries.push(moteGeo);
  const moteMat = new THREE.MeshBasicMaterial({
    color: 0xffd78c,
    transparent: true,
    opacity: 0.72,
  });
  localMaterials.push(moteMat);
  const MAX_MOTES = 180;
  const moteInst = new THREE.InstancedMesh(moteGeo, moteMat, MAX_MOTES);
  const moteSeeds = new Float32Array(MAX_MOTES * 4);
  for (let i = 0; i < MAX_MOTES; i++) {
    moteSeeds[i * 4 + 0] = (Math.random() - 0.5) * 180;
    moteSeeds[i * 4 + 1] = 2 + Math.random() * 48;
    moteSeeds[i * 4 + 2] = -140 + Math.random() * 290;
    moteSeeds[i * 4 + 3] = 0.5 + Math.random() * 1.5;
  }
  moteInst.frustumCulled = false;
  group.add(moteInst);

  const setQuality = (quality: GraphicsQuality) => {
    if (quality === 'low') {
      reedInst.count = 0;
      mossInst.count = 18;
      lotusPadInst.count = 14;
      lotusInst.count = 14;
      palmTrunkInst.count = 24;
      palmFrondInst.count = 24 * FRONDS_PER_PALM;
      branchInst.count = 32;
      rockInst.count = 55;
      moteInst.count = 40;
      birdInst.count = 6;
    } else if (quality === 'balanced') {
      reedInst.count = 110;
      mossInst.count = 40;
      lotusPadInst.count = 26;
      lotusInst.count = 26;
      palmTrunkInst.count = 36;
      palmFrondInst.count = 36 * FRONDS_PER_PALM;
      branchInst.count = 64;
      rockInst.count = 95;
      moteInst.count = 85;
      birdInst.count = 10;
    } else if (quality === 'high') {
      reedInst.count = 260;
      mossInst.count = MAX_MOSS;
      lotusPadInst.count = MAX_LOTUS;
      lotusInst.count = MAX_LOTUS;
      palmTrunkInst.count = MAX_PALMS;
      palmFrondInst.count = MAX_PALMS * FRONDS_PER_PALM;
      branchInst.count = MAX_BRANCHES;
      rockInst.count = MAX_ROCKS;
      moteInst.count = 135;
      birdInst.count = MAX_BIRDS;
    } else {
      reedInst.count = MAX_REEDS;
      mossInst.count = MAX_MOSS;
      lotusPadInst.count = MAX_LOTUS;
      lotusInst.count = MAX_LOTUS;
      palmTrunkInst.count = MAX_PALMS;
      palmFrondInst.count = MAX_PALMS * FRONDS_PER_PALM;
      branchInst.count = MAX_BRANCHES;
      rockInst.count = MAX_ROCKS;
      moteInst.count = MAX_MOTES;
      birdInst.count = MAX_BIRDS;
    }
  };

  return {
    group,
    riverMesh,
    setQuality,
    update: (time, _dt, quality, atmosphere) => {
      if (mats.nileWater.bumpMap) {
        mats.nileWater.bumpMap.offset.y = (time * 0.04) % 1;
      }

      const isDuat = atmosphere === 'duat';
      const isSet = atmosphere === 'set';

      mossInst.visible = !isDuat && !isSet;
      lotusPadInst.visible = !isDuat && !isSet;
      lotusInst.visible = !isDuat && !isSet;

      sunbeamGroup.visible = !isDuat && !isSet && quality !== 'low';
      sunbeamUniforms.uTime.value = time;
      sunbeamUniforms.uStrength.value = atmosphere === 'memphis' ? 0.075 : 0.1;

      wispGroup.visible = !isDuat;
      sandWispUniforms.uTime.value = time * (isSet ? 2.1 : 1.0);
      sandWispUniforms.uOpacity.value = isSet ? 0.28 : 0.15;

      // Distant soaring birds hidden in storm & Duat
      birdInst.visible = !isDuat && !isSet;
      if (birdInst.visible) {
        for (let i = 0; i < birdInst.count; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const cx = side * (64 + (i % 4) * 18);
          const cz = -90 + (i % 5) * 48;
          const ang = time * (0.28 + (i % 3) * 0.06) + i * 1.1;
          const rad = 14 + (i % 4) * 5;
          _dummy.position.set(
            cx + Math.cos(ang) * rad,
            34 + Math.sin(time * 0.9 + i) * 3.5 + (i % 3) * 6,
            cz + Math.sin(ang) * rad
          );
          _dummy.rotation.set(
            Math.sin(time * 4 + i) * 0.08,
            -ang,
            Math.sin(time * 5 + i) * 0.18
          );
          _dummy.scale.setScalar(0.85 + (i % 3) * 0.18);
          _dummy.updateMatrix();
          birdInst.setMatrixAt(i, _dummy.matrix);
        }
        birdInst.instanceMatrix.needsUpdate = true;
      }

      // Gentle wind sway on papyrus reeds (High / Cinematic)
      if (quality === 'high' || quality === 'cinematic') {
        const count = Math.min(reedInst.count, reedData.length);
        for (let i = 0; i < count; i++) {
          const d = reedData[i];
          _dummy.position.set(d.x, d.y, d.z);
          _dummy.rotation.set(Math.sin(time * 1.6 + d.x * 0.2) * (isSet ? 0.18 : 0.08), d.rotY, 0);
          _dummy.scale.setScalar(d.scale);
          _dummy.updateMatrix();
          reedInst.setMatrixAt(i, _dummy.matrix);
        }
        reedInst.instanceMatrix.needsUpdate = true;
      }

      moteMat.color.setHex(isDuat ? 0x9be2ff : 0xffd78c);
      for (let i = 0; i < moteInst.count; i++) {
        const bx = moteSeeds[i * 4 + 0];
        const by = moteSeeds[i * 4 + 1];
        const bz = moteSeeds[i * 4 + 2];
        const spd = moteSeeds[i * 4 + 3];
        _dummy.position.set(
          bx + Math.sin(time * 0.4 * spd + i) * 3.5,
          by + Math.cos(time * 0.6 * spd + i) * 1.8,
          bz + ((time * 2.5 * spd) % 30) - 15
        );
        _dummy.rotation.set(time * spd, time * 0.7 * spd, 0);
        const sc = 0.6 + 0.5 * Math.sin(time * 2 + i);
        _dummy.scale.setScalar(sc);
        _dummy.updateMatrix();
        moteInst.setMatrixAt(i, _dummy.matrix);
      }
      moteInst.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
