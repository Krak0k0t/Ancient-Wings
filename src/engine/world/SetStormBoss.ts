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
    float angle = t * 0.42 + position.y * 0.04;
    float s = sin(angle);
    float c = cos(angle);
    vec3 nSample = vec3(
      swirlPos.x * c - swirlPos.z * s,
      swirlPos.y * 0.9 - t * 2.2,
      swirlPos.x * s + swirlPos.z * c
    ) * 0.09;
    float disp = (noise3(nSample) - 0.5) * 2.0 * uTurbulence;
    disp += (noise3(nSample * 2.7 + vec3(4.1, t * 0.7, 1.7)) - 0.5) * uTurbulence * 0.72;

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
  uniform float uErodeEdge;
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

  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
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
      p = p * 2.12 + vec2(3.7, 1.9);
      amp *= 0.5;
    }
    return v;
  }

  // Cellular Voronoi edge fracture cracks (F2 - F1) for "stone-dense" sand strata
  float rockCrack(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash22(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return smoothstep(0.012, 0.085, d2 - d1);
  }

  void main() {
    float t = uTime * (1.0 - uFreeze);
    vec2 flowUv = vec2(vLocalPos.x * 0.07 + t * 0.11, vLocalPos.y * 0.085 - t * 0.17);
    float n1 = fbm(flowUv);
    float n2 = fbm(flowUv * 2.2 - vec2(t * 0.16, -t * 0.09));
    float grit = noise2(vLocalPos.xy * 0.85 + vec2(vLocalPos.z * 0.6, t * 0.5));

    // Stratified sedimentary stone bands + tectonic sandstone fractures
    float strata = sin(vLocalPos.y * 0.46 + n1 * 4.8 - t * 0.42) * 0.5 + 0.5;
    float cracks = rockCrack(vLocalPos.xy * 0.16 + vec2(n1 * 0.55, vLocalPos.z * 0.08));
    float stoneMass = clamp(n1 * 0.46 + n2 * 0.34 + strata * 0.24 + grit * 0.14, 0.0, 1.0);
    stoneMass *= mix(0.68, 1.0, cracks);

    float ndotv = clamp(abs(dot(normalize(vNormalWorld), normalize(vViewDir))), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 1.75);

    // Directional amber sunlight catching sculpted brow/snout vs deep umber recesses
    float sun = clamp(dot(normalize(vNormalWorld), normalize(vec3(0.42, 0.66, 0.62))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorDark, uColorMid, smoothstep(0.18, 0.76, stoneMass * 0.62 + sun * 0.44));
    col = mix(col, uColorRim, clamp(fresnel * 0.46 + sun * 0.30 * stoneMass, 0.0, 0.88));
    // Crisp dark fracture lines along rock plate seams
    col *= mix(0.42, 1.05, cracks);

    // Eroded tattered outer edges ("рваные края") dissolving into dust
    float shred = smoothstep(0.05 + uErodeEdge * (1.0 - n2) * 0.34, 0.50, ndotv);
    float alpha = clamp((0.56 + stoneMass * 0.44) * shred * uOpacity, 0.0, 0.98);
    if (alpha < 0.03) discard;

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

  // Distorted desert faces manifesting inside stone-dense swirling pillars
  float emergentFace(vec2 p) {
    float eyeL = exp(-dot((p - vec2(-0.23, 0.16)) * vec2(1.25, 1.85), (p - vec2(-0.23, 0.16)) * vec2(1.25, 1.85)) * 26.0);
    float eyeR = exp(-dot((p - vec2(0.23, 0.16)) * vec2(1.25, 1.85), (p - vec2(0.23, 0.16)) * vec2(1.25, 1.85)) * 26.0);
    float brow = exp(-pow((p.y - 0.30 + abs(p.x) * 0.22) * 7.5, 2.0)) * smoothstep(0.45, 0.08, abs(p.x));
    float nose = exp(-pow(p.x * 10.5, 2.0)) * smoothstep(0.26, -0.05, p.y) * smoothstep(-0.20, 0.06, p.y);
    float cheekL = exp(-dot((p - vec2(-0.30, -0.04)) * vec2(1.4, 2.0), (p - vec2(-0.30, -0.04)) * vec2(1.4, 2.0)) * 18.0);
    float cheekR = exp(-dot((p - vec2(0.30, -0.04)) * vec2(1.4, 2.0), (p - vec2(0.30, -0.04)) * vec2(1.4, 2.0)) * 18.0);
    float mouth = exp(-dot((p - vec2(0.0, -0.28)) * vec2(0.9, 2.35), (p - vec2(0.0, -0.28)) * vec2(0.9, 2.35)) * 22.0);
    float hollows = clamp(eyeL + eyeR + mouth * 1.25, 0.0, 1.0);
    float ridges = clamp(brow * 0.8 + nose * 0.9 + (cheekL + cheekR) * 0.45, 0.0, 1.0);
    return ridges - hollows * 1.35;
  }

  void main() {
    float t = uTime * (1.0 - uFreeze);
    float theta = vUv.x * 6.2831853;
    float spin = theta + t * 0.48 + uSeed;
    vec2 swirl = vec2(cos(spin) * 2.5 + uSeed * 3.1, sin(spin) * 2.5 + vUv.y * 6.8 - t * 1.2);
    float grit = noise2(swirl) * 0.58 + noise2(swirl * 2.4 + vec2(3.1, -t * 0.6)) * 0.42;

    float faceAng = atan(sin(theta + t * 0.22 + uSeed), cos(theta + t * 0.22 + uSeed));
    vec2 faceUv = vec2(faceAng * 0.52, (vUv.y - 0.54) * 1.72);
    float faceFrontMask = smoothstep(1.0, 0.22, abs(faceAng));
    float pulse = 0.62 + 0.38 * sin(t * 1.25 + uSeed * 3.7);
    float faceRelief = emergentFace(faceUv) * pulse * faceFrontMask * smoothstep(0.46, 0.16, abs(vUv.y - 0.52));

    float ndotv = abs(dot(normalize(vNormalWorld), normalize(vViewDir)));
    float edgeFade = smoothstep(0.14, 0.62, ndotv);
    float yFade = smoothstep(0.03, 0.24, vUv.y) * smoothstep(0.98, 0.72, vUv.y);

    vec3 stoneDark = vec3(0.22, 0.13, 0.06);
    vec3 sandStone = vec3(0.70, 0.46, 0.23);
    vec3 eyeEmber = vec3(0.98, 0.58, 0.16);

    vec3 col = mix(stoneDark, sandStone, clamp(grit * 0.76 + faceRelief * 0.72, 0.0, 1.0));
    float eyeGlow = clamp(-faceRelief - 0.22, 0.0, 1.0);
    col = mix(col, eyeEmber, eyeGlow * 0.95);

    float alpha = clamp((0.78 + grit * 0.22) * edgeFade * yFade, 0.0, 0.92);
    if (alpha < 0.025) discard;
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
    float alpha = clamp((0.05 + ribbons * 0.24) * softWall * yFade, 0.0, 0.32);
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
    float y = dir.y;

    vec3 stormFloor = vec3(0.28, 0.17, 0.08);
    vec3 stormBelt = vec3(0.52, 0.32, 0.15);
    vec3 shearHorizon = vec3(0.40, 0.27, 0.20);
    vec3 silenceLower = vec3(0.12, 0.16, 0.28);
    vec3 silenceZenith = vec3(0.04, 0.06, 0.13);

    float t = uTime * (1.0 - uFreeze);
    float dustStreak =
      noise2(vec2(dir.x * 4.5 + t * 0.18, y * 14.0)) * 0.6 +
      noise2(vec2(dir.z * 4.5 - t * 0.12, y * 14.0)) * 0.4;

    vec3 col = mix(stormFloor, stormBelt, smoothstep(-0.08, 0.04, y));
    col = mix(col, shearHorizon, smoothstep(0.04, 0.11, y));
    col = mix(col, silenceLower, smoothstep(0.09, 0.17, y));
    col = mix(col, silenceZenith, smoothstep(0.18, 0.58, y));

    float beltMask = smoothstep(-0.04, 0.04, y) * (1.0 - smoothstep(0.08, 0.16, y));
    float phaseBoost = uPhase > 1.5 && uPhase < 2.5 ? 1.35 : 0.9;
    col += vec3(0.12, 0.07, 0.03) * (dustStreak - 0.5) * beltMask * phaseBoost;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const EYE_CORE_VERTEX = /* glsl */ `
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

const EYE_CORE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFreeze;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  void main() {
    float t = uTime * (1.0 - uFreeze);
    float ndotv = clamp(dot(normalize(vNormalWorld), normalize(vViewDir)), 0.0, 1.0);
    // Bright smoldering ember iris deep inside orbital cavern, fading softly at curved rim
    float ember = pow(ndotv, 1.7);
    float slit = exp(-pow((vUv.x - 0.5) * 14.0, 2.0)) * smoothstep(0.15, 0.5, vUv.y) * smoothstep(0.85, 0.5, vUv.y);
    float pulse = 0.85 + 0.15 * sin(t * 4.2 + vUv.y * 8.0);
    vec3 darkRim = vec3(0.14, 0.05, 0.02);
    vec3 fieryCore = vec3(1.0, 0.62, 0.16);
    vec3 whiteHeat = vec3(1.0, 0.90, 0.58);
    vec3 col = mix(darkRim, fieryCore, ember * pulse);
    col = mix(col, whiteHeat, slit * ember * 0.78);
    gl_FragColor = vec4(col, 1.0);
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

// Sculpted predatory Sha-beast cranium & storm skirt with deep orbital caverns
function sculptSetCraniumGeometry(radius: number, scaleMult: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 42, 30);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Narrow predatory temple/cranium tapering upward, widening into flared storm shoulders below
    const crownNarrow = ny > 0.1 ? 1.0 - (ny - 0.1) * 0.34 : 1.0;
    const skirtFlare = ny < -0.25 ? 1.0 + (-0.25 - ny) * 0.75 : 1.0;
    // Elongate snout direction forward (+Z) below eye line
    const snoutPull = nz > 0.15 && ny < 0.25 && ny > -0.35 ? (nz - 0.15) * 0.42 : 0.0;
    // Angular predatory brow ridge jutting over deep eye sockets
    const browRidge =
      Math.exp(-((ny - 0.30) ** 2 * 22)) *
      Math.max(0, nz) *
      (1.0 - Math.abs(nx) * 0.35) *
      0.24;
    // Deeply carved orbital caverns under brow
    const eyeHollowL =
      Math.exp(-((nx + 0.38) ** 2 * 15 + (ny - 0.16) ** 2 * 20)) * Math.max(0, nz);
    const eyeHollowR =
      Math.exp(-((nx - 0.38) ** 2 * 15 + (ny - 0.16) ** 2 * 20)) * Math.max(0, nz);
    const cheekHollowL =
      Math.exp(-((nx + 0.45) ** 2 * 12 + (ny + 0.12) ** 2 * 14)) * Math.max(0, nz);
    const cheekHollowR =
      Math.exp(-((nx - 0.45) ** 2 * 12 + (ny + 0.12) ** 2 * 14)) * Math.max(0, nz);

    const ripple =
      Math.sin(nx * 6.0 + seed) * Math.cos(ny * 5.2 - seed) * 0.065 +
      Math.sin((ny + nz) * 8.4 + seed * 1.9) * 0.032;

    const rMod =
      skirtFlare *
      (1.0 +
        ripple +
        browRidge -
        (eyeHollowL + eyeHollowR) * 0.32 -
        (cheekHollowL + cheekHollowR) * 0.16);

    x *= 0.86 * crownNarrow * rMod * scaleMult;
    y *= 1.18 * (1.0 + ripple * 0.45) * scaleMult;
    z *= (1.12 + snoutPull) * rMod * scaleMult;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Sculpted elongated Sha-beast snout / muzzle projecting forward & slightly upturned
function createSetSnoutGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(3.4, 7.6, 26, 22, 16);
  geo.rotateX(Math.PI / 2); // align along +Z
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nz = (z + 13) / 26; // 0 = base at skull, 1 = snout tip
    // Flatten underside for cavernous mouth gap & ridge nasal spine on top
    if (y < 0) y *= 0.55;
    if (y > 0) y *= 0.82 - nz * 0.22;
    // Slight predatory upward hook at snout tip + sharp nasal bridge
    const curveY = Math.pow(nz, 1.7) * 2.1;
    const pinchX = 1.0 - nz * 0.36;
    const grit = Math.sin(z * 0.85 + x * 1.1) * 0.32 + Math.cos(y * 1.4 - z * 0.5) * 0.22;
    pos.setXYZ(i, x * pinchX + grit * 0.4, y + curveY + grit * 0.3, z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Articulated elongated predatory lower jaw
function createSetLowerJawGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(2.6, 5.8, 22, 18, 12);
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const nz = (z + 11) / 22;
    if (y > 0) y *= 0.4; // concave tongue trough
    const grit = Math.sin(z * 0.9 + x) * 0.25;
    pos.setXYZ(i, x * (0.9 - nz * 0.34), y * 0.72 + grit * 0.25, z + 10); // pivot at skull back
  }
  geo.computeVertexNormals();
  return geo;
}

// Iconic tall squared-off upright Set (Sha-beast) ears/crests with eroded rocky ridges
function createSetEarGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(4.4, 34, 6.2, 6, 18, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ny = (y + 17) / 34; // 0 = base, 1 = squared flat crest tip

    // Characteristic Set silhouette: narrow waist rising to slightly flared squared-flat tip
    const flare = ny < 0.25 ? 1.15 - ny * 0.6 : 0.88 + ny * 0.26;
    // Swept slightly backward as it rises
    const sweepZ = -Math.pow(ny, 1.4) * 3.8;
    // Eroded stone ridges & tattered crest tip notch
    const ridge = Math.sin(y * 0.65 + z * 0.5) * 0.35 + Math.cos(x * 1.4 + y * 0.4) * 0.24;
    const tipNotch = ny > 0.88 ? Math.sin(z * 1.1) * 1.1 : 0;

    pos.setXYZ(
      i,
      x * (0.72 + (1 - ny) * 0.25) + ridge * 0.35,
      y + tipNotch,
      z * flare + sweepZ + ridge * 0.3
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function createSheddingRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(1.0, 0);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 0.72 + 0.45 * Math.abs(Math.sin(x * 3.7 + y * 2.1 + z * 4.3));
    pos.setXYZ(i, x * n * 1.25, y * n * 0.72, z * n);
    // Stone-dense vertex color gradient from dark basalt to warm sandstone
    const t = Math.max(0, Math.min(1, y * 0.5 + 0.5));
    colors[i * 3] = 0.26 + t * 0.42;
    colors[i * 3 + 1] = 0.16 + t * 0.26;
    colors[i * 3 + 2] = 0.09 + t * 0.12;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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

  const solarCore = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), horusMat);
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.24, 10, 32), horusMat);
  haloRing.position.z = -0.4;

  group.add(wingL, wingR, solarCore, haloRing);
  group.userData.wingL = wingL;
  group.userData.wingR = wingR;
  group.userData.disposables = featherGeos;
  return group;
}

const _debrisDummy = new THREE.Object3D();

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
  root.add(new THREE.Mesh(skyGeo, skyMat));

  // 2. Suspended Dust Stratum Ceiling at y = 41 separating Storm Dust below from Upper Silence above
  const ceilingGeo = new THREE.PlaneGeometry(340, 135, 20, 12);
  ceilingGeo.rotateX(-Math.PI / 2);
  geometries.push(ceilingGeo);
  const ceilingUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 1.15 },
    uOpacity: { value: 0.24 },
    uErodeEdge: { value: 0.85 },
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

  // 3. Monumental Predatory Sha-Beast Sand/Stone Colossus of SET (tilted skyward toward player)
  const faceBossGroup = new THREE.Group();
  faceBossGroup.position.set(0, 32, -106);
  faceBossGroup.scale.setScalar(0.84);
  // Upward-tilted skyward gaze confronting the approaching glider
  faceBossGroup.rotation.x = -0.24;
  root.add(faceBossGroup);

  const outerShellGeo = sculptSetCraniumGeometry(32, 1.16, 0.7);
  const midShellGeo = sculptSetCraniumGeometry(26, 1.0, 2.1);
  const snoutGeo = createSetSnoutGeometry();
  const jawGeo = createSetLowerJawGeometry();
  const earGeo = createSetEarGeometry();
  const browGeo = new THREE.BoxGeometry(20, 4.4, 10.5);
  const cheekGeo = new THREE.ConeGeometry(6.5, 16, 7);
  geometries.push(outerShellGeo, midShellGeo, snoutGeo, jawGeo, earGeo, browGeo, cheekGeo);

  const outerStormUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 3.4 },
    uOpacity: { value: 0.42 },
    uErodeEdge: { value: 1.0 },
    uColorDark: { value: new THREE.Color(0x3a200d) },
    uColorMid: { value: new THREE.Color(0x9e6730) },
    uColorRim: { value: new THREE.Color(0xeba656) },
  };
  const midStormUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 1.45 },
    uOpacity: { value: 0.98 },
    uErodeEdge: { value: 0.35 },
    uColorDark: { value: new THREE.Color(0x2d1709) },
    uColorMid: { value: new THREE.Color(0x8e5624) },
    uColorRim: { value: new THREE.Color(0xe39b48) },
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

  // Outer swirling dust sheath sits behind the sculpted face so it never occludes Set's eyes or snout
  const outerShell = new THREE.Mesh(outerShellGeo, outerStormMat);
  outerShell.position.set(0, 0, -9);
  outerShell.scale.set(1.08, 1.06, 0.72);

  const midShell = new THREE.Mesh(midShellGeo, midStormMat);
  midShell.scale.set(0.95, 1.0, 0.78);

  // Tall characteristic upright/slightly flaring squared Set Ears / Crests
  const earL = new THREE.Mesh(earGeo, midStormMat);
  earL.position.set(-13.2, 34, -4.5);
  earL.rotation.z = 0.17;
  earL.rotation.x = -0.12;

  const earR = new THREE.Mesh(earGeo, midStormMat);
  earR.position.set(13.2, 34, -4.5);
  earR.rotation.z = -0.17;
  earR.rotation.x = -0.12;

  // Outer eroding sand sheaths trailing off each Set ear
  const earAuraL = new THREE.Mesh(earGeo, outerStormMat);
  earAuraL.position.copy(earL.position);
  earAuraL.position.z -= 2;
  earAuraL.rotation.copy(earL.rotation);
  earAuraL.scale.set(1.25, 1.08, 1.2);

  const earAuraR = new THREE.Mesh(earGeo, outerStormMat);
  earAuraR.position.copy(earR.position);
  earAuraR.position.z -= 2;
  earAuraR.rotation.copy(earR.rotation);
  earAuraR.scale.set(1.25, 1.08, 1.2);

  // Heavy overhanging angular brow ridges & fierce flared cheekbones
  const browL = new THREE.Mesh(browGeo, midStormMat);
  browL.position.set(-9.4, 12.6, 25.0);
  browL.rotation.set(0.32, 0.25, -0.28);

  const browR = new THREE.Mesh(browGeo, midStormMat);
  browR.position.set(9.4, 12.6, 25.0);
  browR.rotation.set(0.32, -0.25, 0.28);

  const cheekL = new THREE.Mesh(cheekGeo, midStormMat);
  cheekL.position.set(-16.5, 1.5, 18.5);
  cheekL.rotation.set(0.4, 0, -0.95);

  const cheekR = new THREE.Mesh(cheekGeo, midStormMat);
  cheekR.position.set(16.5, 1.5, 18.5);
  cheekR.rotation.set(0.4, 0, 0.95);

  // Elongated Predatory Muzzle / Snout projecting cleanly forward beyond cranium
  const snout = new THREE.Mesh(snoutGeo, midStormMat);
  snout.position.set(0, 2.2, 32.5);
  snout.rotation.x = 0.08;

  // Deep cavernous chasm material (eye cavities, nostril slits, roaring throat)
  const chasmMat = new THREE.MeshBasicMaterial({ color: 0x0a0401 });
  materials.push(chasmMat);

  // Carved slit nostrils near snout tip
  const nostrilGeo = new THREE.BoxGeometry(1.15, 1.7, 4.4);
  geometries.push(nostrilGeo);
  const nostrilL = new THREE.Mesh(nostrilGeo, chasmMat);
  nostrilL.position.set(-2.1, 3.8, 43.2);
  nostrilL.rotation.set(0.18, -0.35, -0.3);
  const nostrilR = new THREE.Mesh(nostrilGeo, chasmMat);
  nostrilR.position.set(2.1, 3.8, 43.2);
  nostrilR.rotation.set(0.18, 0.35, 0.3);

  // Deeply recessed 3D eye sockets + smoldering 3D vortex ember orbs tucked INSIDE the sockets
  const eyeSocketGeo = new THREE.SphereGeometry(5.6, 16, 12);
  const eyeOrbGeo = new THREE.SphereGeometry(2.85, 16, 14);
  geometries.push(eyeSocketGeo, eyeOrbGeo);

  const eyeUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
  };
  const eyeOrbMat = new THREE.ShaderMaterial({
    uniforms: eyeUniforms,
    vertexShader: EYE_CORE_VERTEX,
    fragmentShader: EYE_CORE_FRAGMENT,
  });
  materials.push(eyeOrbMat);

  // Socket caverns sit in front of flattened cranium (z=22.2) under overhanging brows (z=25.0), glowing ember irises at z=23.6
  const socketL = new THREE.Mesh(eyeSocketGeo, chasmMat);
  socketL.position.set(-10.2, 7.8, 22.2);
  socketL.scale.set(1.26, 0.68, 0.45);
  socketL.rotation.set(0.12, -0.22, -0.24);

  const eyeL = new THREE.Mesh(eyeOrbGeo, eyeOrbMat);
  eyeL.position.set(-10.0, 7.6, 23.8);
  eyeL.scale.set(1.05, 0.72, 0.65);

  const socketR = new THREE.Mesh(eyeSocketGeo, chasmMat);
  socketR.position.set(10.2, 7.8, 22.2);
  socketR.scale.set(1.26, 0.68, 0.45);
  socketR.rotation.set(0.12, 0.22, 0.24);

  const eyeR = new THREE.Mesh(eyeOrbGeo, eyeOrbMat);
  eyeR.position.set(10.0, 7.6, 23.8);
  eyeR.scale.set(1.05, 0.72, 0.65);

  // Cavernous Jaw Pit + Articulated Hinged Lower Jaw + Stone Fang Ridges
  const mouthChasmGeo = new THREE.SphereGeometry(9.6, 16, 12);
  const fangGeo = new THREE.ConeGeometry(1.15, 4.2, 5);
  geometries.push(mouthChasmGeo, fangGeo);

  const mouthChasm = new THREE.Mesh(mouthChasmGeo, chasmMat);
  mouthChasm.position.set(0, -5.8, 26.5);
  mouthChasm.scale.set(0.82, 0.75, 1.3);

  const lowerJawGroup = new THREE.Group();
  lowerJawGroup.position.set(0, -9.6, 21.5);
  const lowerJaw = new THREE.Mesh(jawGeo, midStormMat);
  lowerJawGroup.add(lowerJaw);

  // Jagged stone fangs flanking upper & lower muzzle edges
  const fangOffsets = [-3.6, -1.8, 1.8, 3.6];
  for (const fx of fangOffsets) {
    const upperFang = new THREE.Mesh(fangGeo, midStormMat);
    upperFang.position.set(fx, -1.8, 36.5 - Math.abs(fx) * 1.4);
    upperFang.rotation.x = Math.PI;
    faceBossGroup.add(upperFang);

    const lowerFang = new THREE.Mesh(fangGeo, midStormMat);
    lowerFang.position.set(fx * 0.85, 1.5, 14 - Math.abs(fx) * 1.2);
    lowerJawGroup.add(lowerFang);
  }

  faceBossGroup.add(
    outerShell,
    midShell,
    earL,
    earR,
    earAuraL,
    earAuraR,
    browL,
    browR,
    cheekL,
    cheekR,
    snout,
    nostrilL,
    nostrilR,
    socketL,
    socketR,
    eyeL,
    eyeR,
    mouthChasm,
    lowerJawGroup
  );

  // 4. Shedding Stone & Sand Clumps Whipping Off Set's Ears, Jaw & Outer Vortex (InstancedMesh)
  const MAX_DEBRIS = 120;
  const debrisGeo = createSheddingRockGeometry();
  const debrisMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
  });
  geometries.push(debrisGeo);
  materials.push(debrisMat);

  const debrisInst = new THREE.InstancedMesh(debrisGeo, debrisMat, MAX_DEBRIS);
  const debrisSeeds = new Float32Array(MAX_DEBRIS * 4);
  for (let i = 0; i < MAX_DEBRIS; i++) {
    debrisSeeds[i * 4 + 0] = Math.random() * Math.PI * 2;
    debrisSeeds[i * 4 + 1] = 0.55 + Math.random() * 0.95;
    debrisSeeds[i * 4 + 2] = 0.28 + Math.random() * 0.55;
    debrisSeeds[i * 4 + 3] = 24 + Math.random() * 42;
  }
  debrisInst.frustumCulled = false;
  root.add(debrisInst);

  // 5. Swirling Volumetric Sand Vortex Particles (850 soft sprites)
  const dustTex = createDustSpriteTexture();
  textures.push(dustTex);
  const PARTICLE_COUNT = 850;
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pSeeds = new Float32Array(PARTICLE_COUNT * 4);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const isBelt = i >= 500;
    const radius = isBelt ? 28 + Math.random() * 120 : 28 + Math.random() * 44;
    const y = isBelt ? 4 + Math.random() * 36 : 6 + Math.random() * 68;
    const spd = (0.35 + Math.random() * 0.9) * (isBelt ? 0.65 : 1.0);
    pSeeds[i * 4 + 0] = angle;
    pSeeds[i * 4 + 1] = radius;
    pSeeds[i * 4 + 2] = y;
    pSeeds[i * 4 + 3] = spd;
    pPositions[i * 3 + 0] = Math.cos(angle) * radius;
    pPositions[i * 3 + 1] = y;
    pPositions[i * 3 + 2] = (isBelt ? -28 : -110) + Math.sin(angle) * radius;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  geometries.push(particleGeo);
  const particleMat = new THREE.PointsMaterial({
    map: dustTex,
    color: 0xd99e57,
    size: 2.35,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  materials.push(particleMat);
  const particleCloud = new THREE.Points(particleGeo, particleMat);
  particleCloud.frustumCulled = false;
  root.add(particleCloud);

  // 6. Phase 1: Stone-Dense Sand Streams with Emerging Faces ("Пустыня смотрит")
  const sandStreamGeo = createOrganicStreamGeometry(4.2, 6.4, 46);
  geometries.push(sandStreamGeo);
  const streamMeshes: {
    mesh: THREE.Mesh;
    uniforms: { uTime: { value: number }; uFreeze: { value: number }; uTurbulence: { value: number }; uSeed: { value: number } };
    baseX: number;
    baseZ: number;
  }[] = [];
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

  // 7. Phase 2: Mouth Wind Blast Wave & Flanking Updraft Guides to Upper Silence
  const blastGeo = sculptSetCraniumGeometry(18, 1.0, 8.8);
  geometries.push(blastGeo);
  const blastUniforms = {
    uTime: { value: 0 },
    uFreeze: { value: 0 },
    uTurbulence: { value: 4.0 },
    uOpacity: { value: 0.84 },
    uErodeEdge: { value: 1.0 },
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
  blastWaveMesh.scale.set(1.9, 0.55, 1.4);
  blastWaveMesh.visible = false;
  root.add(blastWaveMesh);

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

  // 8. Phase 3: Horus Layered Falcon Wing-Sign in Upper Silence
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

  // 9. Witness Falcon Silhouette beside glider wing
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
  const wVerts = new Float32Array([0, 0, 0.4, 2.6, 0.1, -0.1, 0.8, 0, -0.5]);
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

      skyUniforms.uTime.value = frozenPhaseTime;
      skyUniforms.uPhase.value = bossPhase;
      skyUniforms.uFreeze.value = freezeScalar;

      ceilingUniforms.uTime.value = frozenPhaseTime;
      ceilingUniforms.uFreeze.value = freezeScalar;
      ceilingUniforms.uOpacity.value = bossPhase === 2 ? 0.44 : bossPhase === 3 ? 0.16 : 0.28;

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

      // Subtle living predatory tilt & jaw articulation in Phase 2 roar
      faceBossGroup.rotation.y = isFrozen ? 0 : Math.sin(frozenPhaseTime * 0.42) * 0.07;
      const jawTargetAngle = bossPhase === 2 ? 0.48 + Math.sin(frozenPhaseTime * 6.0) * 0.08 : 0.08;
      lowerJawGroup.rotation.x = THREE.MathUtils.lerp(
        lowerJawGroup.rotation.x,
        jawTargetAngle,
        1 - Math.exp(-6 * dt)
      );
      mouthChasm.scale.y = THREE.MathUtils.lerp(
        mouthChasm.scale.y,
        bossPhase === 2 ? 1.38 : 0.72,
        1 - Math.exp(-6 * dt)
      );

      // Continuously shedding sandstone/rock debris whipping off Set's ears, jaw & edges (freezes in Phase 3)
      for (let i = 0; i < MAX_DEBRIS; i++) {
        const a0 = debrisSeeds[i * 4 + 0];
        const spd = debrisSeeds[i * 4 + 1];
        const sc = debrisSeeds[i * 4 + 2];
        const rad = debrisSeeds[i * 4 + 3];
        const phase = (frozenPhaseTime * 0.35 * spd + a0) % 1.0;

        if (i < 46) {
          // Shedding directly off the tall left & right Set ears
          const side = i % 2 === 0 ? -1 : 1;
          _debrisDummy.position.set(
            side * (12 + phase * 18) + Math.sin(frozenPhaseTime * 2 + i) * 2.2,
            50 + (i % 12) * 2.4 + phase * 14,
            -112 - phase * 10 + Math.cos(i) * 4
          );
        } else {
          // Swirling fragments orbiting & peeling from outer sandstorm silhouette
          const ang = a0 + frozenPhaseTime * spd * 0.75;
          _debrisDummy.position.set(
            Math.cos(ang) * (rad + phase * 12),
            8 + ((i * 7 + frozenPhaseTime * 5 * spd) % 58),
            -108 + Math.sin(ang) * (rad * 0.68)
          );
        }
        _debrisDummy.rotation.set(
          frozenPhaseTime * spd * 2.1 + i,
          frozenPhaseTime * spd * 1.4,
          i * 0.7
        );
        const fadeScale = sc * Math.sin(phase * Math.PI);
        _debrisDummy.scale.setScalar(Math.max(0.2, fadeScale));
        _debrisDummy.updateMatrix();
        debrisInst.setMatrixAt(i, _debrisDummy.matrix);
      }
      debrisInst.instanceMatrix.needsUpdate = true;

      // Swirling dust vortex particles (freezes completely in Phase 3)
      const pPosAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      if (!isFrozen) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const isBelt = i >= 500;
          const a = pSeeds[i * 4 + 0] + frozenPhaseTime * pSeeds[i * 4 + 3] * (isBelt ? 0.35 : 0.9);
          const r = pSeeds[i * 4 + 1] + Math.sin(frozenPhaseTime * 1.4 + i) * 2.5;
          const baseY = pSeeds[i * 4 + 2];
          const y = isBelt
            ? baseY + Math.sin(frozenPhaseTime * 1.1 + i * 0.3) * 1.8
            : ((baseY + frozenPhaseTime * 6.0 * pSeeds[i * 4 + 3]) % 76) + 4;
          pPosAttr.setXYZ(
            i,
            Math.cos(a) * r,
            y,
            (isBelt ? -28 : -110) + Math.sin(a) * r * (isBelt ? 0.72 : 0.62)
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

      // Phase 2: Roaring snout wind blast sweeping low/mid air (y <= 41), forcing climb to Upper Silence (y >= 48)
      blastWaveMesh.visible = bossPhase === 2;
      updraftL.visible = bossPhase === 1 || bossPhase === 2;
      updraftR.visible = bossPhase === 1 || bossPhase === 2;
      if (bossPhase === 2) {
        const waveCycle = (frozenPhaseTime * 28 * diffScale) % 105;
        const waveZ = -68 + waveCycle;
        blastWaveMesh.position.set(0, 24, waveZ);
        const expand = 1.45 + (waveCycle / 105) * 1.1;
        blastWaveMesh.scale.set(expand, 0.55, 1.35);

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

      // Phase 3: Horus appears in Upper Silence and lowers his wing sign
      horusGroup.visible = bossPhase === 3;
      if (bossPhase === 3) {
        const wL = horusGroup.userData.wingL as THREE.Group;
        const wR = horusGroup.userData.wingR as THREE.Group;
        const lowerSign = Math.sin(time * 1.4) * 0.08 - 0.14;
        wL.rotation.z = -lowerSign;
        wR.rotation.z = lowerSign;
      }

      // Witness Falcon beside glider wing
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
