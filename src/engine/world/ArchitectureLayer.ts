import * as THREE from 'three';
import { ProceduralMaterialSet } from './materials';
import { groundHeightAt, nileCenterX } from './NatureLayer';

export interface ArchitectureLayerHandle {
  root: THREE.Group;
  menuPylonGroup: THREE.Group;
  courtyardGroup: THREE.Group;
  memphisGroup: THREE.Group;
  boatsGroup: THREE.Group;
  setMode: (mode: 'menu' | 'dawn' | 'duat' | 'memphis' | 'set') => void;
  update: (time: number) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();

function createFeluccaBoat(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const boat = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(2.2, 0.85, 8.5);
  const prowGeo = new THREE.ConeGeometry(1.1, 2.6, 4);
  prowGeo.rotateX(-Math.PI / 2);
  prowGeo.rotateZ(Math.PI / 4);
  const mastGeo = new THREE.CylinderGeometry(0.11, 0.14, 7.5, 8);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 5.4);
  sailShape.lineTo(4.2, 1.1);
  sailShape.closePath();
  const sailGeo = new THREE.ShapeGeometry(sailShape);
  geometries.push(hullGeo, prowGeo, mastGeo, sailGeo);

  const hull = new THREE.Mesh(hullGeo, mats.sycamoreDark);
  hull.position.y = 0.2;
  hull.castShadow = true;
  boat.add(hull);

  const prow = new THREE.Mesh(prowGeo, mats.sycamore);
  prow.position.set(0, 0.5, -5.2);
  boat.add(prow);

  const mast = new THREE.Mesh(mastGeo, mats.sycamoreDark);
  mast.position.set(0, 4.0, -0.5);
  boat.add(mast);

  const sail = new THREE.Mesh(sailGeo, mats.linenSail);
  sail.position.set(0, 1.5, -0.4);
  sail.rotation.y = Math.PI / 2;
  sail.castShadow = true;
  boat.add(sail);

  return boat;
}

function createBrazier(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[],
  localMaterials: THREE.Material[]
): THREE.Group {
  const g = new THREE.Group();
  const standGeo = new THREE.CylinderGeometry(0.38, 0.55, 2.2, 8);
  const bowlGeo = new THREE.CylinderGeometry(0.95, 0.45, 0.65, 10);
  const flameGeo = new THREE.ConeGeometry(0.55, 1.35, 7);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa63d });
  geometries.push(standGeo, bowlGeo, flameGeo);
  localMaterials.push(flameMat);

  const stand = new THREE.Mesh(standGeo, mats.limestoneDark);
  stand.position.y = 1.1;
  const bowl = new THREE.Mesh(bowlGeo, mats.bronze);
  bowl.position.y = 2.4;
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 3.2;
  g.add(stand, bowl, flame);
  return g;
}

function createStepPyramidLOD(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[]
): THREE.LOD {
  const lod = new THREE.LOD();

  // High detail: 4-stepped Saqqara limestone pyramid + perimeter enclosure + shrine court
  const high = new THREE.Group();
  const tiers = [
    { w: 56, h: 11, d: 48, y: 5.5 },
    { w: 43, h: 10, d: 37, y: 15.5 },
    { w: 31, h: 9, d: 27, y: 24.5 },
    { w: 20, h: 8, d: 18, y: 32.5 },
  ];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const geo = new THREE.BoxGeometry(t.w, t.h, t.d);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, i % 2 === 0 ? mats.limestone : mats.limestoneDark);
    mesh.position.y = t.y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    high.add(mesh);
  }

  // Enclosure perimeter walls (stepped mudbrick/limestone)
  const wallSideGeo = new THREE.BoxGeometry(3.2, 5.5, 78);
  const wallFrontGeo = new THREE.BoxGeometry(82, 5.5, 3.2);
  geometries.push(wallSideGeo, wallFrontGeo);
  const wEast = new THREE.Mesh(wallSideGeo, mats.limestoneDark);
  wEast.position.set(41, 2.5, 0);
  const wWest = new THREE.Mesh(wallSideGeo, mats.limestoneDark);
  wWest.position.set(-41, 2.5, 0);
  const wNorth = new THREE.Mesh(wallFrontGeo, mats.limestoneDark);
  wNorth.position.set(0, 2.5, -39);
  const wSouth = new THREE.Mesh(wallFrontGeo, mats.limestoneDark);
  wSouth.position.set(0, 2.5, 39);
  high.add(wEast, wWest, wNorth, wSouth);

  // Low detail: 2-tier silhouette for far horizon viewing
  const low = new THREE.Group();
  const lowBaseGeo = new THREE.BoxGeometry(56, 18, 48);
  const lowTopGeo = new THREE.BoxGeometry(28, 17, 24);
  geometries.push(lowBaseGeo, lowTopGeo);
  const lowBase = new THREE.Mesh(lowBaseGeo, mats.limestone);
  lowBase.position.y = 9;
  const lowTop = new THREE.Mesh(lowTopGeo, mats.limestoneDark);
  lowTop.position.y = 26;
  low.add(lowBase, lowTop);

  lod.addLevel(high, 0);
  lod.addLevel(low, 170);
  return lod;
}

function createMudbrickShrine(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[],
  localMaterials: THREE.Material[]
): THREE.Group {
  const g = new THREE.Group();
  // Base plinth
  const plinthGeo = new THREE.BoxGeometry(8.6, 0.8, 7.6);
  // Battered mudbrick walls
  const bodyGeo = new THREE.BoxGeometry(7.2, 4.4, 6.2);
  const corniceGeo = new THREE.BoxGeometry(7.9, 0.65, 6.9);
  // Timber roof beam & doorway lintel
  const lintelGeo = new THREE.BoxGeometry(3.4, 0.45, 1.1);
  const doorRecessGeo = new THREE.BoxGeometry(2.1, 3.1, 0.8);
  const recessMat = new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: 0.95 });
  geometries.push(plinthGeo, bodyGeo, corniceGeo, lintelGeo, doorRecessGeo);
  localMaterials.push(recessMat);

  const plinth = new THREE.Mesh(plinthGeo, mats.limestoneDark);
  plinth.position.y = 0.4;
  plinth.receiveShadow = true;

  const body = new THREE.Mesh(bodyGeo, mats.mudbrick);
  body.position.y = 2.8;
  body.castShadow = true;
  body.receiveShadow = true;

  const cornice = new THREE.Mesh(corniceGeo, mats.limestone);
  cornice.position.y = 5.2;
  cornice.castShadow = true;

  const lintel = new THREE.Mesh(lintelGeo, mats.sycamoreDark);
  lintel.position.set(0, 3.7, 3.05);

  const door = new THREE.Mesh(doorRecessGeo, recessMat);
  door.position.set(0, 1.9, 2.95);

  g.add(plinth, body, cornice, lintel, door);
  return g;
}

function createRuinedColonnade(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const g = new THREE.Group();
  const baseGeo = new THREE.CylinderGeometry(1.15, 1.3, 0.65, 12);
  const shaftFullGeo = new THREE.CylinderGeometry(0.75, 0.92, 9.2, 12);
  const capGeo = new THREE.CylinderGeometry(1.38, 0.8, 1.35, 12);
  const shaftBrokenGeo = new THREE.CylinderGeometry(0.84, 0.92, 5.2, 12);
  const drumGeo = new THREE.CylinderGeometry(0.85, 0.88, 2.3, 12);
  const architraveGeo = new THREE.BoxGeometry(7.6, 1.1, 1.9);
  geometries.push(baseGeo, shaftFullGeo, capGeo, shaftBrokenGeo, drumGeo, architraveGeo);

  // Column 1 (standing intact with flared papyrus capital)
  const b1 = new THREE.Mesh(baseGeo, mats.limestoneDark);
  b1.position.set(-3.0, 0.3, 0);
  const s1 = new THREE.Mesh(shaftFullGeo, mats.limestone);
  s1.position.set(-3.0, 5.2, 0);
  s1.castShadow = true;
  const c1 = new THREE.Mesh(capGeo, mats.limestoneDark);
  c1.position.set(-3.0, 10.4, 0);

  // Column 2 (standing intact)
  const b2 = new THREE.Mesh(baseGeo, mats.limestoneDark);
  b2.position.set(3.0, 0.3, 0);
  const s2 = new THREE.Mesh(shaftFullGeo, mats.limestone);
  s2.position.set(3.0, 5.2, 0);
  s2.castShadow = true;
  const c2 = new THREE.Mesh(capGeo, mats.limestoneDark);
  c2.position.set(3.0, 10.4, 0);

  // Spanning stone architrave
  const architrave = new THREE.Mesh(architraveGeo, mats.limestoneDark);
  architrave.position.set(0, 11.6, 0);
  architrave.castShadow = true;

  // Column 3 (snapped mid-shaft + fallen drum beside it)
  const b3 = new THREE.Mesh(baseGeo, mats.limestoneDark);
  b3.position.set(8.6, 0.3, 1.4);
  const s3 = new THREE.Mesh(shaftBrokenGeo, mats.limestone);
  s3.position.set(8.6, 3.1, 1.4);
  s3.castShadow = true;

  const fallenDrum = new THREE.Mesh(drumGeo, mats.limestone);
  fallenDrum.position.set(10.8, 0.82, 3.4);
  fallenDrum.rotation.z = Math.PI / 2;
  fallenDrum.rotation.y = 0.55;
  fallenDrum.castShadow = true;

  g.add(b1, s1, c1, b2, s2, c2, architrave, b3, s3, fallenDrum);
  return g;
}

function createNileShadufQuay(
  mats: ProceduralMaterialSet,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const g = new THREE.Group();

  // Stepped limestone nilometer quay slabs
  const step1Geo = new THREE.BoxGeometry(6.8, 1.1, 9.5);
  const step2Geo = new THREE.BoxGeometry(4.4, 1.1, 7.6);
  const postGeo = new THREE.CylinderGeometry(0.22, 0.26, 3.8, 8);
  const pivotGeo = new THREE.CylinderGeometry(0.11, 0.14, 7.4, 8);
  pivotGeo.rotateZ(Math.PI / 2);
  const counterGeo = new THREE.SphereGeometry(0.58, 10, 8);
  const ropeGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
  const bucketGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.55, 8);
  geometries.push(step1Geo, step2Geo, postGeo, pivotGeo, counterGeo, ropeGeo, bucketGeo);

  const step1 = new THREE.Mesh(step1Geo, mats.limestoneDark);
  step1.position.set(0, 0.4, 0);
  step1.receiveShadow = true;
  const step2 = new THREE.Mesh(step2Geo, mats.limestone);
  step2.position.set(1.2, 1.45, 0);
  step2.receiveShadow = true;

  // Shaduf upright mudbrick/timber pillars
  const pillarL = new THREE.Mesh(postGeo, mats.mudbrick);
  pillarL.position.set(1.4, 3.2, -1.3);
  const pillarR = new THREE.Mesh(postGeo, mats.mudbrick);
  pillarR.position.set(1.4, 3.2, 1.3);

  // Counterweighted sycamore sweep beam reaching out over water (-x toward river)
  const armGroup = new THREE.Group();
  armGroup.position.set(1.4, 4.7, 0);
  armGroup.rotation.z = -0.18;

  const arm = new THREE.Mesh(pivotGeo, mats.sycamoreDark);
  arm.position.set(-0.9, 0, 0);
  const counterweight = new THREE.Mesh(counterGeo, mats.mudbrick);
  counterweight.position.set(2.7, -0.1, 0);
  const rope = new THREE.Mesh(ropeGeo, mats.sycamore);
  rope.position.set(-4.3, -1.1, 0);
  const bucket = new THREE.Mesh(bucketGeo, mats.bronze);
  bucket.position.set(-4.3, -2.25, 0);
  armGroup.add(arm, counterweight, rope, bucket);
  armGroup.name = 'shadufArm';

  g.add(step1, step2, pillarL, pillarR, armGroup);
  return g;
}

export function buildArchitectureLayer(mats: ProceduralMaterialSet): ArchitectureLayerHandle {
  const root = new THREE.Group();
  root.name = 'ArchitectureLayer';
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];

  // 1. Saqqara Tomb Courtyard & Gate Pylon (MainMenu Centerpiece + 1_3 Launch Yard)
  const courtyardGroup = new THREE.Group();
  courtyardGroup.position.set(0, 0, 110);
  root.add(courtyardGroup);

  const floorGeo = new THREE.BoxGeometry(34, 0.8, 34);
  geometries.push(floorGeo);
  const floor = new THREE.Mesh(floorGeo, mats.limestone);
  floor.position.y = -0.35;
  floor.receiveShadow = true;
  courtyardGroup.add(floor);

  const menuPylonGroup = new THREE.Group();
  menuPylonGroup.position.set(0, 0, -14);
  courtyardGroup.add(menuPylonGroup);

  const towerGeo = new THREE.BoxGeometry(8.5, 18, 6.2);
  const lintelGeo = new THREE.BoxGeometry(28, 3.4, 6.6);
  const sunDiscGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.5, 16);
  const obShaftGeo = new THREE.CylinderGeometry(0.55, 0.95, 11, 4);
  const obTipGeo = new THREE.ConeGeometry(0.55, 1.6, 4);
  const obLowGeo = new THREE.BoxGeometry(1.2, 12, 1.2);
  const pedestalGeo = new THREE.CylinderGeometry(2.1, 2.5, 1.4, 8);
  const crateGeo = new THREE.BoxGeometry(1.8, 1.2, 1.4);
  geometries.push(
    towerGeo,
    lintelGeo,
    sunDiscGeo,
    obShaftGeo,
    obTipGeo,
    obLowGeo,
    pedestalGeo,
    crateGeo
  );

  const leftTower = new THREE.Mesh(towerGeo, mats.limestone);
  leftTower.position.set(-9.5, 9, 0);
  leftTower.castShadow = true;
  leftTower.receiveShadow = true;

  const rightTower = new THREE.Mesh(towerGeo, mats.limestone);
  rightTower.position.set(9.5, 9, 0);
  rightTower.castShadow = true;
  rightTower.receiveShadow = true;

  const lintel = new THREE.Mesh(lintelGeo, mats.limestoneDark);
  lintel.position.set(0, 17.5, 0);
  lintel.castShadow = true;

  const sunDisc = new THREE.Mesh(sunDiscGeo, mats.bronze);
  sunDisc.rotation.x = Math.PI / 2;
  sunDisc.position.set(0, 17.5, 3.4);

  const makeObeliskLOD = (xPos: number) => {
    const obeliskHigh = new THREE.Group();
    const obShaft = new THREE.Mesh(obShaftGeo, mats.limestoneDark);
    obShaft.position.y = 5.5;
    obShaft.rotation.y = Math.PI / 4;
    const obTip = new THREE.Mesh(obTipGeo, mats.bronze);
    obTip.position.y = 11.8;
    obTip.rotation.y = Math.PI / 4;
    obeliskHigh.add(obShaft, obTip);

    const obeliskLow = new THREE.Mesh(obLowGeo, mats.limestoneDark);
    obeliskLow.position.y = 6;

    const lod = new THREE.LOD();
    lod.addLevel(obeliskHigh, 0);
    lod.addLevel(obeliskLow, 90);
    lod.position.set(xPos, 0, 5.5);
    return lod;
  };

  menuPylonGroup.add(
    leftTower,
    rightTower,
    lintel,
    sunDisc,
    makeObeliskLOD(-15.5),
    makeObeliskLOD(15.5)
  );

  const pedestal = new THREE.Mesh(pedestalGeo, mats.limestoneDark);
  pedestal.position.set(0, 0.7, 2);
  pedestal.receiveShadow = true;
  courtyardGroup.add(pedestal);

  for (let i = 0; i < 4; i++) {
    const crate = new THREE.Mesh(crateGeo, mats.sycamoreDark);
    crate.position.set(-11 + i * 2.3, 0.6, 9.5);
    crate.rotation.y = (i - 1.5) * 0.25;
    crate.castShadow = true;
    courtyardGroup.add(crate);
  }

  const b1 = createBrazier(mats, geometries, localMaterials);
  b1.position.set(-4.8, 0, -9);
  const b2 = createBrazier(mats, geometries, localMaterials);
  b2.position.set(4.8, 0, -9);
  courtyardGroup.add(b1, b2);

  // 2. Distant Saqqara Step Pyramid Monument (Menu, Dawn, & subtle storm horizon in Set)
  const stepPyramidGroup = new THREE.Group();
  const pyrX = -126;
  const pyrZ = 38;
  stepPyramidGroup.position.set(pyrX, groundHeightAt(pyrX, pyrZ) - 1.0, pyrZ);
  stepPyramidGroup.rotation.y = 0.22;
  stepPyramidGroup.add(createStepPyramidLOD(mats, geometries));
  root.add(stepPyramidGroup);

  // 3. Chapter 1 Dawn Valley Landmarks (Watchposts, Mudbrick Shrines, Ruined Columns, Nile Shaduf Quay)
  const dawnLandmarksGroup = new THREE.Group();
  root.add(dawnLandmarksGroup);

  const createPost = (x: number, z: number) => {
    const post = new THREE.Group();
    const gy = groundHeightAt(x, z);
    post.position.set(x, gy - 0.5, z);
    const baseGeo = new THREE.BoxGeometry(6, 12, 6);
    const capGeo = new THREE.BoxGeometry(6.8, 1.2, 6.8);
    geometries.push(baseGeo, capGeo);
    const base = new THREE.Mesh(baseGeo, mats.limestone);
    base.position.y = 6;
    base.castShadow = true;
    const cap = new THREE.Mesh(capGeo, mats.limestoneDark);
    cap.position.y = 12.6;
    const brazier = createBrazier(mats, geometries, localMaterials);
    brazier.position.set(0, 13.2, 0);
    post.add(base, cap, brazier);
    return post;
  };
  dawnLandmarksGroup.add(createPost(-38, 8));
  dawnLandmarksGroup.add(createPost(44, -62));

  // Weathered Mudbrick Roadside Shrines
  const shrineCoords = [
    { x: 50, z: 54, rot: -0.95 },
    { x: -56, z: -36, rot: 0.85 },
    { x: 52, z: -124, rot: -1.1 },
  ];
  for (const sc of shrineCoords) {
    const shrine = createMudbrickShrine(mats, geometries, localMaterials);
    shrine.position.set(sc.x, groundHeightAt(sc.x, sc.z) - 0.35, sc.z);
    shrine.rotation.y = sc.rot;
    dawnLandmarksGroup.add(shrine);
  }

  // Ruined Fluted Colonnades flanking the valley dunes
  const ruinCoords = [
    { x: -52, z: 72, rot: 0.45 },
    { x: 56, z: -18, rot: -0.5 },
    { x: -48, z: -102, rot: 0.32 },
  ];
  for (const rc of ruinCoords) {
    const ruin = createRuinedColonnade(mats, geometries);
    ruin.position.set(rc.x, groundHeightAt(rc.x, rc.z) - 0.3, rc.z);
    ruin.rotation.y = rc.rot;
    dawnLandmarksGroup.add(ruin);
  }

  // Nile Riverbanks: Timber Shaduf & Stepped Limestone Nilometer Piers
  const shadufZCoords = [26, -72];
  const shadufArms: THREE.Object3D[] = [];
  for (const sz of shadufZCoords) {
    const sx = nileCenterX(sz) + 27;
    const quay = createNileShadufQuay(mats, geometries);
    quay.position.set(sx, -1.0, sz);
    dawnLandmarksGroup.add(quay);
    const arm = quay.getObjectByName('shadufArm');
    if (arm) shadufArms.push(arm);
  }

  // Scattered half-buried mudbrick ruins / ancient boundary stelae across dunes (InstancedMesh)
  const stelaGeo = new THREE.BoxGeometry(2.8, 5.2, 1.4);
  geometries.push(stelaGeo);
  const stelaInst = new THREE.InstancedMesh(stelaGeo, mats.mudbrick, 14);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 95 - i * 20;
    const x = nileCenterX(z) + side * (58 + (i % 4) * 14);
    const y = groundHeightAt(x, z);
    _dummy.position.set(x, y + 1.4, z);
    _dummy.rotation.set(((i % 3) - 1) * 0.08, i * 0.7, ((i % 5) - 2) * 0.05);
    const sc = 0.8 + (i % 3) * 0.28;
    _dummy.scale.set(sc, sc * (0.75 + (i % 2) * 0.4), sc);
    _dummy.updateMatrix();
    stelaInst.setMatrixAt(i, _dummy.matrix);
  }
  stelaInst.instanceMatrix.needsUpdate = true;
  stelaInst.computeBoundingSphere();
  dawnLandmarksGroup.add(stelaInst);

  // 4. Nile Felucca Boats (Chapters 1_3, 1_4, 1_6)
  const boatsGroup = new THREE.Group();
  root.add(boatsGroup);
  const boatConfigs = [
    { z: -25, offset: -9, rot: 0.15 },
    { z: -55, offset: 9, rot: -0.2 },
    { z: -90, offset: -10, rot: 0.1 },
    { z: 35, offset: 8, rot: -0.1 },
  ];
  const boats: THREE.Group[] = [];
  for (const cfg of boatConfigs) {
    const b = createFeluccaBoat(mats, geometries);
    b.position.set(nileCenterX(cfg.z) + cfg.offset, -0.5, cfg.z);
    b.rotation.y = cfg.rot;
    boatsGroup.add(b);
    boats.push(b);
  }

  // 5. Living Memphis Cityscape (Chapter 1_6: Temple of Ptah, quays, piers, mudbrick quarters)
  const memphisGroup = new THREE.Group();
  memphisGroup.visible = false;
  root.add(memphisGroup);

  const templeBaseGeo = new THREE.BoxGeometry(46, 4, 58);
  const colGeo = new THREE.CylinderGeometry(1.1, 1.35, 16, 12);
  const quayGeo = new THREE.BoxGeometry(10, 3.2, 220);
  const houseGeo = new THREE.BoxGeometry(9, 6.5, 9);
  geometries.push(templeBaseGeo, colGeo, quayGeo, houseGeo);

  const templeBase = new THREE.Mesh(templeBaseGeo, mats.limestone);
  templeBase.position.set(-48, 2, -20);
  memphisGroup.add(templeBase);

  const colInst = new THREE.InstancedMesh(colGeo, mats.limestone, 16);
  let cIdx = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      _dummy.position.set(-60 + col * 8, 12, -40 + row * 12);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      colInst.setMatrixAt(cIdx++, _dummy.matrix);
    }
  }
  colInst.instanceMatrix.needsUpdate = true;
  colInst.computeBoundingSphere();
  memphisGroup.add(colInst);

  const quayLeft = new THREE.Mesh(quayGeo, mats.limestoneDark);
  quayLeft.position.set(-28, 0.8, -20);
  const quayRight = new THREE.Mesh(quayGeo, mats.limestoneDark);
  quayRight.position.set(28, 0.8, -20);
  memphisGroup.add(quayLeft, quayRight);

  const houseInst = new THREE.InstancedMesh(houseGeo, mats.mudbrick, 28);
  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const hx = side * (42 + (i % 4) * 14);
    const hz = 75 - Math.floor(i / 2) * 16;
    _dummy.position.set(hx, 3.2, hz);
    _dummy.rotation.set(0, ((i % 4) - 1.5) * 0.05, 0);
    _dummy.scale.set(0.85 + (i % 3) * 0.25, 0.7 + (i % 4) * 0.35, 0.9 + (i % 2) * 0.25);
    _dummy.updateMatrix();
    houseInst.setMatrixAt(i, _dummy.matrix);
  }
  houseInst.instanceMatrix.needsUpdate = true;
  houseInst.computeBoundingSphere();
  memphisGroup.add(houseInst);

  for (let z = 60; z >= -100; z -= 40) {
    const br = createBrazier(mats, geometries, localMaterials);
    br.position.set(24, 2.4, z);
    memphisGroup.add(br);
  }

  return {
    root,
    menuPylonGroup,
    courtyardGroup,
    memphisGroup,
    boatsGroup,
    setMode: (mode) => {
      courtyardGroup.visible = mode === 'menu' || mode === 'dawn';
      stepPyramidGroup.visible = mode === 'menu' || mode === 'dawn';
      dawnLandmarksGroup.visible = mode === 'dawn' || mode === 'menu';
      boatsGroup.visible = mode === 'dawn' || mode === 'memphis';
      memphisGroup.visible = mode === 'memphis';
    },
    update: (time) => {
      boats.forEach((b, idx) => {
        b.position.y = -0.5 + Math.sin(time * 1.4 + idx) * 0.14;
        b.rotation.z = Math.sin(time * 1.1 + idx) * 0.03;
      });
      shadufArms.forEach((arm, idx) => {
        arm.rotation.z = -0.18 + Math.sin(time * 0.65 + idx * 1.7) * 0.16;
      });
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}
