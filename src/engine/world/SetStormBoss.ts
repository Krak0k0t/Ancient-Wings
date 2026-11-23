import * as THREE from 'three';
import { HazardEntity, Vec3 } from '../../game/flightPhysics';
import { DifficultyLevel } from '../../types/game';

export interface SetStormBossHandle {
  root: THREE.Group;
  witnessGroup: THREE.Group;
  update: (
    time: number,
    dt: number,
    bossPhase: 0 | 1 | 2 | 3,
    witnessVisible: boolean,
    gliderPos: Vec3,
    difficulty: DifficultyLevel
  ) => HazardEntity[];
  dispose: () => void;
}

const STORM_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  uniform float uTurbulence;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vUv = uv;
    float t = uTime * (1.0 - uFreeze);
    vec3 swirlPos = position;
    float angle = t * 0.45 + position.y * 0.045;
    float s = sin(angle);
    float c = cos(angle);
    vec3 nSample = vec3(
      swirlPos.x * c - swirlPos.z * s,
      swirlPos.y * 0.9 - t * 2.4,
      swirlPos.x * s + swirlPos.z * c
    ) * 0.085;
    float disp = (noise3(nSample) - 0.5) * 2.0 * uTurbulence;
    disp += (noise3(nSample * 2.3 + vec3(4.1, t * 0.8, 1.7)) - 0.5) * uTurbulence * 0.65;

    vec3 displaced = position + normal * disp;
    vLocalPos = displaced;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STORM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  uniform float uOpacity;
  uniform vec3 uColorDark;
  uniform vec3 uColorMid;
  uniform vec3 uColorRim;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise2(p);
      p = p * 2.08 + vec2(3.7, 1.9);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    float t = uTime * (1.0 - uFreeze);
    vec2 flowUv = vec2(vLocalPos.x * 0.065 + t * 0.14, vLocalPos.y * 0.075 - t * 0.22);
    float n1 = fbm(flowUv);
    float n2 = fbm(flowUv * 1.9 - vec2(t * 0.19, -t * 0.11));
    float sandDensity = clamp(n1 * 0.62 + n2 * 0.48, 0.0, 1.0);

    float ndotv = clamp(abs(dot(normalize(vNormalWorld), normalize(vViewDir))), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 1.65);

    // Sunlit warm amber ridges vs deep stone-umber shadow pockets
    float sun = clamp(dot(normalize(vNormalWorld), normalize(vec3(0.45, 0.65, 0.55))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorDark, uColorMid, smoothstep(0.22, 0.78, sandDensity * 0.7 + sun * 0.35));
    col = mix(col, uColorRim, clamp(fresnel * 0.55 + sun * 0.25 * sandDensity, 0.0, 0.85));

    // Soft silhouette edge feathering so there is never a hard cylinder rim
    float edgeFade = smoothstep(0.06, 0.55, ndotv);
    float alpha = clamp((0.42 + sandDensity * 0.58) * edgeFade * uOpacity, 0.0, 0.96);
    if (alpha < 0.02) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

const STREAM_FACE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Emergent stone-dense face relief manifesting inside the swirling sand stream
  float emergentFace(vec2 p) {
    float eyeL = exp(-dot((p - vec2(-0.22, 0.16)) * vec2(1.2, 1.9), (p - vec2(-0.22, 0.16)) * vec2(1.2, 1.9)) * 28.0);
    float eyeR = exp(-dot((p - vec2(0.22, 0.16)) * vec2(1.2, 1.9), (p - vec2(0.22, 0.16)) * vec2(1.2, 1.9)) * 28.0);
    float brow = exp(-pow((p.y - 0.28 + abs(p.x) * 0.18) * 7.0, 2.0)) * smoothstep(0.42, 0.1, abs(p.x));
    float nose = exp(-pow(p.x * 11.0, 2.0)) * smoothstep(0.24, -0.04, p.y) * smoothstep(-0.18, 0.05, p.y);
    float mouth = exp(-dot((p - vec2(0.0, -0.26)) * vec2(0.95, 2.2), (p - vec2(0.0, -0.26)) * vec2(0.95, 2.2)) * 24.0);
    float hollows = clamp(eyeL + eyeR + mouth * 1.15, 0.0, 1.0);
    float ridges = clamp(brow * 0.7 + nose * 0.8, 0.0, 1.0);
    return ridges - hollows * 1.25;
  }

  void main() {
    float t = uTime * (1.0 - uFreeze);
    float theta = vUv.x * 6.2831853;
    float spin = theta + t * 0.45 + uSeed;
    vec2 swirl = vec2(cos(spin) * 2.4 + uSeed * 3.1, sin(spin) * 2.4 + vUv.y * 6.5 - t * 1.15);
    float grit = noise2(swirl) * 0.6 + noise2(swirl * 2.3 + vec2(3.1, -t * 0.6)) * 0.4;

    // Seamless periodic face manifestation inside the thick stone-hard sand belt
    float faceAng = atan(sin(theta + t * 0.18 + uSeed), cos(theta + t * 0.18 + uSeed));
    vec2 faceUv = vec2(faceAng * 0.55, (vUv.y - 0.54) * 1.75);
    float faceFrontMask = smoothstep(0.95, 0.25, abs(faceAng));
    float pulse = 0.55 + 0.45 * sin(t * 1.3 + uSeed * 4.0);
    float faceRelief = emergentFace(faceUv) * pulse * faceFrontMask * smoothstep(0.45, 0.18, abs(vUv.y - 0.52));

    float ndotv = abs(dot(normalize(vNormalWorld), normalize(vViewDir)));
    float edgeFade = smoothstep(0.12, 0.62, ndotv);
    // Feather top and bottom rims completely so sand streams rise organically from desert haze
    float yFade = smoothstep(0.03, 0.26, vUv.y) * smoothstep(0.98, 0.72, vUv.y);

    // Basalt-stone dense sand tones
    vec3 stoneDark = vec3(0.24, 0.14, 0.07);
    vec3 sandStone = vec3(0.66, 0.44, 0.23);
    vec3 eyeAmber = vec3(0.92, 0.56, 0.18);

    vec3 col = mix(stoneDark, sandStone, clamp(grit * 0.78 + faceRelief * 0.65, 0.0, 1.0));
    float eyeGlow = clamp(-faceRelief - 0.22, 0.0, 1.0);
    col = mix(col, eyeAmber, eyeGlow * 0.92);

    float alpha = clamp((0.76 + grit * 0.24) * edgeFade * yFade, 0.0, 0.94);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const UPDRAFT_VERTEX_SHADER = /* glsl */ `
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

const UPDRAFT_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;

  void main() {
    float t = uTime * (1.0 - uFreeze);
    float theta = vUv.x * 6.2831853;
    float spiral1 = sin(theta * 3.0 - vUv.y * 16.0 + t * 3.2) * 0.5 + 0.5;
    float spiral2 = sin(theta * 2.0 + vUv.y * 10.0 - t * 2.1) * 0.5 + 0.5;
    float ribbons = pow(clamp(spiral1 * 0.65 + spiral2 * 0.45, 0.0, 1.0), 2.2);

    float ndotv = abs(dot(normalize(vNormalWorld), normalize(vViewDir)));
    float softWall = smoothstep(0.08, 0.72, ndotv);
    float yFade = smoothstep(0.04, 0.25, vUv.y) * smoothstep(0.98, 0.65, vUv.y);

    vec3 col = mix(vec3(0.88, 0.65, 0.30), vec3(1.0, 0.86, 0.52), ribbons);
    float alpha = clamp((0.05 + ribbons * 0.24) * softWall * yFade, 0.0, 0.34);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const SKY_DOME_VERTEX = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_DOME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uFreeze;
  varying vec3 vWorldPos;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 dir = normalize(vWorldPos);
    float y = dir.y; // horizon ~0, upper silence > 0.11

    // Rich non-blown-out storm umber below; crisp twilight upper silence above
    vec3 stormFloor = vec3(0.32, 0.19, 0.09);
    vec3 stormBelt = vec3(0.54, 0.34, 0.16);
    vec3 shearHorizon = vec3(0.42, 0.29, 0.21);
    vec3 silenceLower = vec3(0.14, 0.18, 0.30);
    vec3 silenceZenith = vec3(0.05, 0.07, 0.14);

    float t = uTime * (1.0 - uFreeze);
    float dustStreak =
      noise2(vec2(dir.x * 4.5 + t * 0.18, y * 14.0)) * 0.6 +
      noise2(vec2(dir.z * 4.5 - t * 0.12, y * 14.0)) * 0.4;

    vec3 col = mix(stormFloor, stormBelt, smoothstep(-0.08, 0.04, y));
    col = mix(col, shearHorizon, smoothstep(0.04, 0.11, y));
    col = mix(col, silenceLower, smoothstep(0.09, 0.17, y));
    col = mix(col, silenceZenith, smoothstep(0.18, 0.58, y));

    // Subtle stratified wind dust wisps only in lower storm belt
    float beltMask = smoothstep(-0.04, 0.04, y) * (1.0 - smoothstep(0.08, 0.16, y));
    float phaseBoost = uPhase > 1.5 && uPhase < 2.5 ? 1.35 : 0.9;
    col += vec3(0.12, 0.07, 0.03) * (dustStreak - 0.5) * beltMask * phaseBoost;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const EYE_CORE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EYE_CORE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float t = uTime * (1.0 - uFreeze);
    float ang = atan(p.y, p.x);
    float vortex = sin(ang * 4.0 + r * 9.0 - t * 4.5) * 0.5 + 0.5;
    float glow = exp(-r * r * 3.4);
    float slit = exp(-pow(p.y * 4.5, 2.0)) * smoothstep(0.85, 0.0, abs(p.x));
    vec3 col = mix(vec3(0.65, 0.25, 0.05), vec3(1.0, 0.72, 0.22), clamp(glow + vortex * 0.35 + slit * 0.45, 0.0, 1.0));
    float alpha = smoothstep(1.0, 0.25, r) * 0.92;
    gl_FragColor = vec4(col, alpha);
  }
`;

function createDustSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(245, 198, 130, 0.92)');
  grad.addColorStop(0.45, 'rgba(196, 134, 68, 0.48)');
  grad.addColorStop(1, 'rgba(110, 68, 28, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sculptStormShellGeometry(
  radius: number,
  widthSegs: number,
  heightSegs: number,
  stretchX: number,
  stretchY: number,
  stretchZ: number,
  seed: number
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, widthSegs, heightSegs);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Taper base downward into desert storm skirt & widen cheekbones/brow
    const skirtFlare = ny < -0.25 ? 1.0 + (-0.25 - ny) * 0.65 : 1.0;
    const browSculpt = ny > 0.1 && ny < 0.48 && nz > 0.2 ? 1.15 : 1.0;
    // Carve eye socket hollows & sunken lower cheeks on forward-facing surface
    const eyeSocketL = Math.exp(-((nx + 0.34) ** 2 * 14 + (ny - 0.16) ** 2 * 18)) * Math.max(0, nz);
    const eyeSocketR = Math.exp(-((nx - 0.34) ** 2 * 14 + (ny - 0.16) ** 2 * 18)) * Math.max(0, nz);
    const mouthHollow = Math.exp(-((nx) ** 2 * 8 + (ny + 0.24) ** 2 * 16)) * Math.max(0, nz);
    const ripple =
      Math.sin(nx * 5.2 + seed) * Math.cos(ny * 4.4 - seed) * 0.075 +
      Math.sin((ny + nz) * 7.5 + seed * 2.1) * 0.035;

    const mod = skirtFlare * browSculpt * (1.0 + ripple - (eyeSocketL + eyeSocketR) * 0.22 - mouthHollow * 0.28);
    x *= stretchX * mod;
    y *= stretchY * (1.0 + ripple * 0.45);
    z *= stretchZ * mod;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createOrganicStreamGeometry(radiusTop: number, radiusBot: number, height: number): THREE.BufferGeometry {
  const radialSegs = 28;
  const heightSegs = 24;
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, height, radialSegs, heightSegs, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = (y + height * 0.5) / height;
    const bulge = 0.85 + 0.28 * Math.sin(ny * Math.PI * 1.8) + 0.12 * Math.cos(x * 0.6 + y * 0.28);
    const bendX = Math.sin(ny * Math.PI * 1.5) * 1.4;
    pos.setXYZ(i, x * bulge + bendX, y, z * bulge);
  }
  geo.computeVertexNormals();
  // Weld vertex normals across the u=0 / u=1 seam so fresnel & shading have zero vertical crease
  const norm = geo.attributes.normal;
  const stride = radialSegs + 1;
  for (let row = 0; row <= heightSegs; row++) {
    const a = row * stride;
    const b = a + radialSegs;
    const nx = (norm.getX(a) + norm.getX(b)) * 0.5;
    const ny = (norm.getY(a) + norm.getY(b)) * 0.5;
    const nz = (norm.getZ(a) + norm.getZ(b)) * 0.5;
    const len = Math.hypot(nx, ny, nz) || 1;
    norm.setXYZ(a, nx / len, ny / len, nz / len);
    norm.setXYZ(b, nx / len, ny / len, nz / len);
  }
  norm.needsUpdate = true;
  return geo;
}

function createLayeredHorusWings(horusMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const wingL = new THREE.Group();
  const wingR = new THREE.Group();

  // 5 layered tapered falcon pinion blades per side (no boxy rectangles!)
  const featherGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const len = 17 - i * 2.1;
    const width = 2.4 - i * 0.22;
    const shape = new THREE.Shape();
    shape.moveTo(0, -width * 0.45);
    shape.quadraticCurveTo(len * 0.55, -width * 0.6, len, -width * 0.1);
    shape.lineTo(len * 0.94, width * 0.35);
    shape.quadraticCurveTo(len * 0.45, width * 0.5, 0, width * 0.38);
    shape.closePath();

    const featherGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      bevelSegments: 2,
    });
    featherGeos.push(featherGeo);

    const fR = new THREE.Mesh(featherGeo, horusMat);
    fR.position.set(1.6, -i * 0.65, -i * 0.28);
    fR.rotation.z = -0.1 - i * 0.085;
    fR.rotation.x = 0.18;
    wingR.add(fR);

    const fL = new THREE.Mesh(featherGeo, horusMat);
    fL.scale.x = -1;
    fL.position.set(-1.6, -i * 0.65, -i * 0.28);
    fL.rotation.z = 0.1 + i * 0.085;
    fL.rotation.x = 0.18;
    wingL.add(fL);
  }

  // Falcon Solar Crest
  const solarCore = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), horusMat);
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 10, 32), horusMat);
  haloRing.position.z = -0.4;

  group.add(wingL, wingR, solarCore, haloRing);
  group.userData.wingL = wingL;
  group.userData.wingR = wingR;
  group.userData.disposables = featherGeos;
  return group;
}

export function buildSetStormBoss(): SetStormBossHandle {
  const root = new THREE.Group();
  root.name = 'SetStormBoss';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 1. Stratified Storm + Upper Silence Sky Dome
  const skyGeo = new THREE.SphereGeometry(410, 28, 18);
  geometries.push(skyGeo);
  const skyUniforms = {
    uTime: { value: 0 },
    uPhase: { value: 1 },
    uFreeze: { value: 0 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_DOME_VERTEX,
    fragmentShader: SKY_DOME_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  root.add(skyDome);

  // 2. Suspended Dust Stratum Ceiling at y = 41 across the storm flight corridor (separates Storm Dust below from Upper Silence above)
  const ceilingGeo = new THREE.PlaneGeometry(340, 135, 20, 12);
  ceilingGeo.rotateX(-Math.PI / 2);
  geometries.push(ceilingGeo);
  const ceilingUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 1.1 },
    uOpacity: { value: 0.24 },
    uColorDark: { value: new THREE.Color(0x4a2c12) },
    uColorMid: { value: new THREE.Color(0x8e5d2c) },
    uColorRim: { value: new THREE.Color(0xb87b3c) },
  };
  const ceilingMat = new THREE.ShaderMaterial({
    uniforms: ceilingUniforms,
    vertexShader: STORM_VERTEX_SHADER,
    fragmentShader: STORM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(ceilingMat);
  const dustCeiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  dustCeiling.position.set(0, 41, 10);
  root.add(dustCeiling);

  // 3. Colossal Upward-Looking Swirling Sandstorm Face of SET
  const faceBossGroup = new THREE.Group();
  faceBossGroup.position.set(0, 34, -108);
  faceBossGroup.scale.setScalar(0.84);
  // Tilt backward so the monumental sandstorm face gazes skyward ("устремлённым взглядом вверх")
  faceBossGroup.rotation.x = -0.26;
  root.add(faceBossGroup);

  const outerShellGeo = sculptStormShellGeometry(36, 40, 28, 1.32, 1.38, 0.92, 0.7);
  const midShellGeo = sculptStormShellGeometry(28, 36, 24, 1.18, 1.24, 0.86, 2.1);
  const browRidgeGeo = sculptStormShellGeometry(11, 24, 16, 2.4, 0.45, 0.85, 3.4);
  const noseGeo = sculptStormShellGeometry(5.5, 20, 14, 0.78, 2.25, 1.15, 4.9);
  const jawGeo = sculptStormShellGeometry(12, 24, 16, 1.65, 0.65, 1.0, 6.2);
  geometries.push(outerShellGeo, midShellGeo, browRidgeGeo, noseGeo, jawGeo);

  const outerStormUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 4.4 },
    uOpacity: { value: 0.72 },
    uColorDark: { value: new THREE.Color(0x3a200d) },
    uColorMid: { value: new THREE.Color(0x9a642e) },
    uColorRim: { value: new THREE.Color(0xe6a152) },
  };
  const midStormUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 2.6 },
    uOpacity: { value: 0.94 },
    uColorDark: { value: new THREE.Color(0x2d1709) },
    uColorMid: { value: new THREE.Color(0x885322) },
    uColorRim: { value: new THREE.Color(0xdc9342) },
  };
  const outerStormMat = new THREE.ShaderMaterial({
    uniforms: outerStormUniforms,
    vertexShader: STORM_VERTEX_SHADER,
    fragmentShader: STORM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const midStormMat = new THREE.ShaderMaterial({
    uniforms: midStormUniforms,
    vertexShader: STORM_VERTEX_SHADER,
    fragmentShader: STORM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
  });
  materials.push(outerStormMat, midStormMat);

  const outerShell = new THREE.Mesh(outerShellGeo, outerStormMat);
  const midShell = new THREE.Mesh(midShellGeo, midStormMat);

  // Heavy Sculpted Brow & Cheekbone Dune Ridges
  const browRidge = new THREE.Mesh(browRidgeGeo, midStormMat);
  browRidge.position.set(0, 12.5, 22.5);
  browRidge.rotation.x = 0.22;

  const noseRidge = new THREE.Mesh(noseGeo, midStormMat);
  noseRidge.position.set(0, 2.5, 26.2);
  noseRidge.rotation.x = -0.12;

  // Dark Nostrils hollowed beneath nasal ridge
  const chasmMat = new THREE.MeshBasicMaterial({ color: 0x160a03, transparent: true, opacity: 0.95 });
  materials.push(chasmMat);
  const nostrilGeo = new THREE.SphereGeometry(2.1, 12, 10);
  geometries.push(nostrilGeo);
  const nostrilL = new THREE.Mesh(nostrilGeo, chasmMat);
  nostrilL.position.set(-2.6, -4.2, 25.5);
  nostrilL.scale.set(1.0, 1.3, 0.7);
  const nostrilR = new THREE.Mesh(nostrilGeo, chasmMat);
  nostrilR.position.set(2.6, -4.2, 25.5);
  nostrilR.scale.set(1.0, 1.3, 0.7);

  // Deep-set Sunken Ocular Storm Eyes (no flat boxes!)
  const eyeSocketGeo = new THREE.SphereGeometry(5.6, 16, 12);
  const eyeCoreGeo = new THREE.PlaneGeometry(9.8, 6.8);
  geometries.push(eyeSocketGeo, eyeCoreGeo);
  const eyeUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
  };
  const eyeCoreMat = new THREE.ShaderMaterial({
    uniforms: eyeUniforms,
    vertexShader: EYE_CORE_VERTEX,
    fragmentShader: EYE_CORE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  materials.push(eyeCoreMat);

  const socketL = new THREE.Mesh(eyeSocketGeo, chasmMat);
  socketL.position.set(-11.2, 7.6, 21.5);
  socketL.scale.set(1.25, 0.68, 0.55);
  socketL.rotation.z = -0.2;
  const eyeL = new THREE.Mesh(eyeCoreGeo, eyeCoreMat);
  eyeL.position.set(-11.2, 7.8, 24.4);
  eyeL.rotation.z = -0.2;

  const socketR = new THREE.Mesh(eyeSocketGeo, chasmMat);
  socketR.position.set(11.2, 7.6, 21.5);
  socketR.scale.set(1.25, 0.68, 0.55);
  socketR.rotation.z = 0.2;
  const eyeR = new THREE.Mesh(eyeCoreGeo, eyeCoreMat);
  eyeR.position.set(11.2, 7.8, 24.4);
  eyeR.rotation.z = 0.2;

  // Cavernous Storm Maw & Articulated Lower Jaw
  const mouthChasmGeo = new THREE.SphereGeometry(11.5, 18, 14);
  geometries.push(mouthChasmGeo);
  const mouthChasm = new THREE.Mesh(mouthChasmGeo, chasmMat);
  mouthChasm.position.set(0, -13.5, 20.5);
  mouthChasm.scale.set(1.35, 0.65, 0.6);

  const lowerJaw = new THREE.Mesh(jawGeo, midStormMat);
  lowerJaw.position.set(0, -21, 19.5);

  faceBossGroup.add(
    outerShell,
    midShell,
    browRidge,
    noseRidge,
    nostrilL,
    nostrilR,
    socketL,
    socketR,
    eyeL,
    eyeR,
    mouthChasm,
    lowerJaw
  );

  // 4. Swirling Volumetric Sand Vortex Particles (850 soft sprites)
  const dustTex = createDustSpriteTexture();
  textures.push(dustTex);
  const PARTICLE_COUNT = 850;
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pSeeds = new Float32Array(PARTICLE_COUNT * 4); // angle, radius, height, speed
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const isBelt = i >= 500;
    const radius = isBelt ? 28 + Math.random() * 120 : 28 + Math.random() * 44;
    const y = isBelt ? 4 + Math.random() * 36 : 6 + Math.random() * 64;
    const spd = (0.35 + Math.random() * 0.9) * (isBelt ? 0.65 : 1.0);
    pSeeds[i * 4 + 0] = angle;
    pSeeds[i * 4 + 1] = radius;
    pSeeds[i * 4 + 2] = y;
    pSeeds[i * 4 + 3] = spd;
    pPositions[i * 3 + 0] = Math.cos(angle) * radius;
    pPositions[i * 3 + 1] = y;
    pPositions[i * 3 + 2] = (isBelt ? -28 : -106) + Math.sin(angle) * radius;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  geometries.push(particleGeo);
  const particleMat = new THREE.PointsMaterial({
    map: dustTex,
    color: 0xd99e57,
    size: 2.35,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  materials.push(particleMat);
  const particleCloud = new THREE.Points(particleGeo, particleMat);
  particleCloud.frustumCulled = false;
  root.add(particleCloud);

  // 5. Phase 1: Stone-Dense Sand Streams with Emerging Faces ("плотности камня")
  const sandStreamGeo = createOrganicStreamGeometry(4.2, 6.4, 46);
  geometries.push(sandStreamGeo);
  const streamMeshes: { mesh: THREE.Mesh; uniforms: { uTime: { value: number }; uFreeze: { value: number }; uSeed: { value: number } }; baseX: number; baseZ: number }[] = [];
  const streamConfigs = [
    { x: -24, z: 72, seed: 0.4 },
    { x: 24, z: 58, seed: 1.7 },
    { x: -21, z: 26, seed: 2.9 },
    { x: 22, z: 4, seed: 4.2 },
  ];
  for (const cfg of streamConfigs) {
    const uniforms = {
      uTime: { value: 0 },
      uFreeze: { value: 0 },
      uTurbulence: { value: 1.6 },
      uSeed: { value: cfg.seed },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: STORM_VERTEX_SHADER,
      fragmentShader: STREAM_FACE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.push(mat);
    const streamMesh = new THREE.Mesh(sandStreamGeo, mat);
    streamMesh.position.set(cfg.x, 18, cfg.z);
    root.add(streamMesh);
    streamMeshes.push({ mesh: streamMesh, uniforms, baseX: cfg.x, baseZ: cfg.z });
  }

  // 6. Phase 2: Mouth Wind Blast Wave & Flanking Updraft Guides to Upper Silence
  const blastGeo = sculptStormShellGeometry(22, 28, 20, 2.35, 0.65, 1.85, 8.8);
  geometries.push(blastGeo);
  const blastUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 4.2 },
    uOpacity: { value: 0.85 },
    uColorDark: { value: new THREE.Color(0x3a200d) },
    uColorMid: { value: new THREE.Color(0x9b642c) },
    uColorRim: { value: new THREE.Color(0xe59c4a) },
  };
  const blastMat = new THREE.ShaderMaterial({
    uniforms: blastUniforms,
    vertexShader: STORM_VERTEX_SHADER,
    fragmentShader: STORM_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(blastMat);
  const blastWaveMesh = new THREE.Mesh(blastGeo, blastMat);
  blastWaveMesh.position.set(0, 22, -25);
  blastWaveMesh.visible = false;
  root.add(blastWaveMesh);

  // Sleek feathered golden updraft ribbons aligned with flanking thermals (lead to y=58 upper silence without obscuring Set)
  const updraftGeo = new THREE.CylinderGeometry(4.4, 6.2, 66, 20, 8, true);
  geometries.push(updraftGeo);
  const updraftUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
  };
  const updraftMat = new THREE.ShaderMaterial({
    uniforms: updraftUniforms,
    vertexShader: UPDRAFT_VERTEX_SHADER,
    fragmentShader: UPDRAFT_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(updraftMat);
  const updraftL = new THREE.Mesh(updraftGeo, updraftMat);
  updraftL.position.set(-28, 36, 30);
  const updraftR = new THREE.Mesh(updraftGeo, updraftMat);
  updraftR.position.set(28, 36, 10);
  root.add(updraftL, updraftR);

  // 7. Phase 3: Horus Layered Falcon Wing-Sign in Upper Silence
  const horusMat = new THREE.MeshStandardMaterial({
    color: 0xffe6a6,
    emissive: new THREE.Color(0xf0b842),
    emissiveIntensity: 1.35,
    roughness: 0.25,
    metalness: 0.6,
    transparent: true,
    opacity: 0.94,
  });
  materials.push(horusMat);
  const horusGroup = createLayeredHorusWings(horusMat);
  horusGroup.position.set(0, 38, -68);
  horusGroup.visible = false;
  root.add(horusGroup);
  const horusDisposables = horusGroup.userData.disposables as THREE.BufferGeometry[] | undefined;
  if (horusDisposables) geometries.push(...horusDisposables);

  // 8. Witness Falcon Silhouette (appears briefly beside wing, obscured features)
  const witnessGroup = new THREE.Group();
  const witnessMat = new THREE.MeshStandardMaterial({
    color: 0xffe4ad,
    emissive: new THREE.Color(0xc8964a),
    emissiveIntensity: 0.95,
    transparent: true,
    opacity: 0.82,
    roughness: 0.5,
  });
  materials.push(witnessMat);
  const witnessBodyGeo = new THREE.ConeGeometry(0.4, 2.2, 10);
  witnessBodyGeo.rotateX(Math.PI / 2);
  const witnessWingGeo = new THREE.BufferGeometry();
  const wVerts = new Float32Array([
    0, 0, 0.4,
    2.6, 0.1, -0.1,
    0.8, 0, -0.5,
  ]);
  witnessWingGeo.setAttribute('position', new THREE.BufferAttribute(wVerts, 3));
  witnessWingGeo.computeVertexNormals();
  geometries.push(witnessBodyGeo, witnessWingGeo);

  const witnessBody = new THREE.Mesh(witnessBodyGeo, witnessMat);
  const witnessWingL = new THREE.Mesh(witnessWingGeo, witnessMat);
  witnessWingL.scale.x = -1;
  const witnessWingR = new THREE.Mesh(witnessWingGeo, witnessMat);
  witnessGroup.add(witnessBody, witnessWingL, witnessWingR);
  witnessGroup.visible = false;

  let frozenPhaseTime = 0;

  return {
    root,
    witnessGroup,
    update: (time, dt, bossPhase, witnessVisible, gliderPos, difficulty) => {
      const hazards: HazardEntity[] = [];
      const diffScale = difficulty === 'pilgrim' ? 0.75 : difficulty === 'master' ? 1.3 : 1.0;
      const isFrozen = bossPhase === 3;
      const freezeScalar = isFrozen ? 1.0 : 0.0;

      if (!isFrozen) {
        frozenPhaseTime += dt;
      }

      // Sync shaders
      skyUniforms.uTime.value = frozenPhaseTime;
      skyUniforms.uPhase.value = bossPhase;
      skyUniforms.uFreeze.value = freezeScalar;

      ceilingUniforms.uTime.value = frozenPhaseTime;
      ceilingUniforms.uFreeze.value = freezeScalar;
      ceilingUniforms.uOpacity.value = bossPhase === 2 ? 0.46 : bossPhase === 3 ? 0.16 : 0.3;

      outerStormUniforms.uTime.value = frozenPhaseTime;
      outerStormUniforms.uFreeze.value = freezeScalar;
      midStormUniforms.uTime.value = frozenPhaseTime;
      midStormUniforms.uFreeze.value = freezeScalar;
      eyeUniforms.uTime.value = frozenPhaseTime;
      eyeUniforms.uFreeze.value = freezeScalar;
      blastUniforms.uTime.value = frozenPhaseTime;
      blastUniforms.uFreeze.value = freezeScalar;
      updraftUniforms.uTime.value = frozenPhaseTime;
      updraftUniforms.uFreeze.value = freezeScalar;

      // Subtle living tilt on Set's face + wide gaping jaw in Phase 2
      faceBossGroup.rotation.y = isFrozen ? 0 : Math.sin(frozenPhaseTime * 0.45) * 0.08;
      const mouthTargetScaleY = bossPhase === 2 ? 1.65 + Math.sin(frozenPhaseTime * 6.5) * 0.2 : 0.72;
      mouthChasm.scale.y = THREE.MathUtils.lerp(mouthChasm.scale.y, mouthTargetScaleY, 1 - Math.exp(-6 * dt));
      lowerJaw.position.y = THREE.MathUtils.lerp(
        lowerJaw.position.y,
        bossPhase === 2 ? -27.5 : -20.5,
        1 - Math.exp(-6 * dt)
      );

      // Update swirling sand vortex particles (freezes completely in Phase 3 silence!)
      const pPosAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      if (!isFrozen) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const isBelt = i >= 500;
          const a = pSeeds[i * 4 + 0] + frozenPhaseTime * pSeeds[i * 4 + 3] * (isBelt ? 0.35 : 0.9);
          const r = pSeeds[i * 4 + 1] + Math.sin(frozenPhaseTime * 1.4 + i) * 2.5;
          const baseY = pSeeds[i * 4 + 2];
          const y = isBelt
            ? baseY + Math.sin(frozenPhaseTime * 1.1 + i * 0.3) * 1.8
            : ((baseY + frozenPhaseTime * 6.0 * pSeeds[i * 4 + 3]) % 72) + 4;
          pPosAttr.setXYZ(
            i,
            Math.cos(a) * r,
            y,
            (isBelt ? -28 : -106) + Math.sin(a) * r * (isBelt ? 0.72 : 0.62)
          );
        }
        pPosAttr.needsUpdate = true;
      }

      // Phase 1: Stone-dense sand streams with emerging faces
      streamMeshes.forEach((st, idx) => {
        st.mesh.visible = bossPhase === 1 || bossPhase === 2 || bossPhase === 3;
        st.uniforms.uTime.value = frozenPhaseTime;
        st.uniforms.uFreeze.value = freezeScalar;

        if (!isFrozen) {
          const sway = Math.sin(frozenPhaseTime * 1.3 * diffScale + idx * 1.7) * 9.5;
          st.mesh.position.x = st.baseX + sway;
          st.mesh.rotation.y = frozenPhaseTime * (idx % 2 === 0 ? 0.55 : -0.55);
        }

        if (bossPhase === 1) {
          hazards.push({
            id: `set_stream_${idx}`,
            pos: { x: st.mesh.position.x, y: 24, z: st.mesh.position.z },
            vel: { x: 0, y: 0, z: 12 },
            radius: 7.5,
            kind: 'set_sand_wave',
          });
        }
      });

      // Phase 2: Gaping mouth wind blast sweeping lower/mid air (y <= 41), forcing climb to Upper Silence (y >= 48)
      blastWaveMesh.visible = bossPhase === 2;
      updraftL.visible = bossPhase === 1 || bossPhase === 2;
      updraftR.visible = bossPhase === 1 || bossPhase === 2;
      if (bossPhase === 2) {
        const waveCycle = (frozenPhaseTime * 28 * diffScale) % 105;
        const waveZ = -68 + waveCycle;
        blastWaveMesh.position.set(0, 24, waveZ);
        const expand = 0.8 + (waveCycle / 105) * 0.75;
        blastWaveMesh.scale.set(expand, 0.95, 1.0);

        // Sweeping wind-blast hazard disks occupying low altitude below Upper Silence
        for (let row = 0; row < 3; row++) {
          const hz = waveZ + (row - 1) * 18;
          hazards.push({
            id: `set_wind_blast_${row}`,
            pos: { x: 0, y: 22, z: hz },
            vel: { x: 0, y: 0, z: 28 },
            radius: 19,
            kind: 'set_wind_blast',
          });
        }
      }

      // Phase 3: Horus appears in the upper silence and lowers his wing sign
      horusGroup.visible = bossPhase === 3;
      if (bossPhase === 3) {
        const wL = horusGroup.userData.wingL as THREE.Group;
        const wR = horusGroup.userData.wingR as THREE.Group;
        const lowerSign = Math.sin(time * 1.4) * 0.08 - 0.14;
        wL.rotation.z = -lowerSign;
        wR.rotation.z = lowerSign;
      }

      // Witness Falcon beside glider wing (unremembered features)
      witnessGroup.visible = witnessVisible;
      if (witnessVisible) {
        witnessGroup.position.set(gliderPos.x + 4.4, gliderPos.y + 1.15, gliderPos.z - 2.4);
        const flap = Math.sin(time * 7) * 0.24;
        witnessWingL.rotation.z = flap;
        witnessWingR.rotation.z = -flap;
      }

      return hazards;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
