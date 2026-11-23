import * as THREE from 'three';
import { GraphicsQuality } from '../../types/game';
import { ProceduralMaterialSet } from './materials';

export interface NatureLayerHandle {
  group: THREE.Group;
  riverMesh: THREE.Mesh;
  update: (time: number, dt: number, quality: GraphicsQuality, isDuat: boolean) => void;
  setQuality: (quality: GraphicsQuality) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildNatureLayer(mats: ProceduralMaterialSet): NatureLayerHandle {
  const group = new THREE.Group();
  group.name = 'NatureLayer';
  const geometries: THREE.BufferGeometry[] = [];

  // 1. Desert Ground Plane with gentle dunes (extends far to horizon fog)
  const desertGeo = new THREE.PlaneGeometry(760, 760, 64, 64);
  desertGeo.rotateX(-Math.PI / 2);
  const posAttr = desertGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    // Keep central Nile channel depressed and flat courtyard around z=110
    const riverDist = Math.abs(x + Math.sin(z * 0.014) * 18);
    let h = 0;
    if (riverDist < 28) {
      h = -3.8 * (1 - riverDist / 28);
    } else {
      h =
        Math.sin(x * 0.025) * Math.cos(z * 0.022) * 3.8 +
        Math.sin((x + z) * 0.05) * 1.1;
      // Flatten Saqqara tomb courtyard around (0, 110)
      const distCourt = Math.hypot(x, z - 110);
      if (distCourt < 36) {
        const blend = Math.max(0, (distCourt - 16) / 20);
        h *= blend;
      }
    }
    posAttr.setY(i, h);
  }
  desertGeo.computeVertexNormals();
  geometries.push(desertGeo);

  const desertMesh = new THREE.Mesh(desertGeo, mats.sand);
  desertMesh.receiveShadow = true;
  group.add(desertMesh);

  // 2. Nile River Water Ribbon (offset cleanly above river bed)
  const riverGeo = new THREE.PlaneGeometry(58, 760, 24, 96);
  riverGeo.rotateX(-Math.PI / 2);
  const rAttr = riverGeo.attributes.position;
  for (let i = 0; i < rAttr.count; i++) {
    const x = rAttr.getX(i);
    const z = rAttr.getZ(i);
    rAttr.setX(i, x - Math.sin(z * 0.014) * 18);
  }
  riverGeo.computeVertexNormals();
  geometries.push(riverGeo);

  const riverMesh = new THREE.Mesh(riverGeo, mats.nileWater);
  riverMesh.position.y = -0.65;
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  // 3. Instanced Rocks (flattened noise geometry + vertexColors grey -> dark slate blue)
  const rockGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const rockPos = rockGeo.attributes.position;
  const rockColors = new Float32Array(rockPos.count * 3);
  for (let i = 0; i < rockPos.count; i++) {
    const vx = rockPos.getX(i);
    const vy = rockPos.getY(i);
    const vz = rockPos.getZ(i);
    const noise = 0.8 + 0.35 * Math.sin(vx * 3.1 + vz * 2.4);
    rockPos.setXYZ(i, vx * noise * 1.25, vy * noise * 0.58, vz * noise * 1.1);
    // Vertex color gradient from warm grey at top to dark slate-blue at base
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

  const MAX_ROCKS = 140;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, MAX_ROCKS);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  for (let i = 0; i < MAX_ROCKS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -220 + ((i * 37) % 420);
    const riverX = -Math.sin(z * 0.014) * 18;
    const x = riverX + side * (32 + ((i * 23) % 135));
    _dummy.position.set(x, -0.35, z);
    _dummy.rotation.set((i % 5) * 0.14, (i * 1.7) % (Math.PI * 2), (i % 3) * 0.12);
    const s = 0.75 + ((i * 19) % 100) * 0.025;
    _dummy.scale.set(s * 1.3, s * 0.75, s);
    _dummy.updateMatrix();
    rockInst.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.1 + (i % 7) * 0.015, 0.16, 0.48 + (i % 5) * 0.06);
    rockInst.setColorAt(i, _color);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  // 4. Instanced Papyrus / Riverbank Reeds (curved leaf blade)
  const reedGeo = new THREE.PlaneGeometry(0.45, 3.6, 1, 4);
  const reedPos = reedGeo.attributes.position;
  for (let i = 0; i < reedPos.count; i++) {
    const y = reedPos.getY(i) + 1.8; // pivot at base
    const bend = (y / 3.6) * (y / 3.6) * 0.7;
    reedPos.setY(i, y);
    reedPos.setZ(i, bend);
    reedPos.setX(i, reedPos.getX(i) * (1 - (y / 3.6) * 0.75));
  }
  reedGeo.computeVertexNormals();
  geometries.push(reedGeo);

  const MAX_REEDS = 360;
  const reedInst = new THREE.InstancedMesh(reedGeo, mats.papyrus, MAX_REEDS);
  const reedData: { x: number; y: number; z: number; rotY: number; scale: number }[] = [];
  for (let i = 0; i < MAX_REEDS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -210 + ((i * 19) % 400);
    const riverX = -Math.sin(z * 0.014) * 18;
    const x = riverX + side * (25 + (i % 9));
    const rotY = (i * 1.31) % (Math.PI * 2);
    const scale = 0.75 + (i % 7) * 0.12;
    reedData.push({ x, y: -0.75, z, rotY, scale });

    _dummy.position.set(x, -0.75, z);
    _dummy.rotation.set(0, rotY, 0);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    reedInst.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.24 + (i % 5) * 0.02, 0.38, 0.35 + (i % 4) * 0.05);
    reedInst.setColorAt(i, _color);
  }
  reedInst.instanceMatrix.needsUpdate = true;
  if (reedInst.instanceColor) reedInst.instanceColor.needsUpdate = true;
  reedInst.computeBoundingSphere();
  group.add(reedInst);

  // 5. Instanced Atmospheric Dust & Lantern Embers (pooled, zero-GC)
  const moteGeo = new THREE.OctahedronGeometry(0.14, 0);
  geometries.push(moteGeo);
  const moteMat = new THREE.MeshBasicMaterial({
    color: 0xffd78c,
    transparent: true,
    opacity: 0.72,
  });
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
      rockInst.count = 45;
      moteInst.count = 40;
    } else if (quality === 'balanced') {
      reedInst.count = 90;
      rockInst.count = 80;
      moteInst.count = 80;
    } else if (quality === 'high') {
      reedInst.count = 240;
      rockInst.count = MAX_ROCKS;
      moteInst.count = 130;
    } else {
      reedInst.count = MAX_REEDS;
      rockInst.count = MAX_ROCKS;
      moteInst.count = MAX_MOTES;
    }
  };

  return {
    group,
    riverMesh,
    setQuality,
    update: (time, _dt, quality, isDuat) => {
      // Animate Nile water bump texture drift
      if (mats.nileWater.bumpMap) {
        mats.nileWater.bumpMap.offset.y = (time * 0.04) % 1;
      }

      // Gentle papyrus sway on High/Cinematic
      if (quality === 'high' || quality === 'cinematic') {
        const count = Math.min(reedInst.count, reedData.length);
        for (let i = 0; i < count; i++) {
          const d = reedData[i];
          _dummy.position.set(d.x, d.y, d.z);
          _dummy.rotation.set(Math.sin(time * 1.6 + d.x * 0.2) * 0.08, d.rotY, 0);
          _dummy.scale.setScalar(d.scale);
          _dummy.updateMatrix();
          reedInst.setMatrixAt(i, _dummy.matrix);
        }
        reedInst.instanceMatrix.needsUpdate = true;
      }

      // Update floating dust/star motes
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
      rockMat.dispose();
      moteMat.dispose();
    },
  };
}
