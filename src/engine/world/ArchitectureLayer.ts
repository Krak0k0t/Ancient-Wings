import * as THREE from 'three';
import { ProceduralMaterialSet } from './materials';

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

function createFeluccaBoat(mats: ProceduralMaterialSet): THREE.Group {
  const boat = new THREE.Group();
  // Hull
  const hullGeo = new THREE.BoxGeometry(2.2, 0.85, 8.5);
  const hull = new THREE.Mesh(hullGeo, mats.sycamoreDark);
  hull.position.y = 0.2;
  hull.castShadow = true;
  boat.add(hull);

  // Prow & Stern curved tips
  const prowGeo = new THREE.ConeGeometry(1.1, 2.6, 4);
  prowGeo.rotateX(-Math.PI / 2);
  prowGeo.rotateZ(Math.PI / 4);
  const prow = new THREE.Mesh(prowGeo, mats.sycamore);
  prow.position.set(0, 0.5, -5.2);
  boat.add(prow);

  // Mast
  const mastGeo = new THREE.CylinderGeometry(0.11, 0.14, 7.5, 8);
  const mast = new THREE.Mesh(mastGeo, mats.sycamoreDark);
  mast.position.set(0, 4.0, -0.5);
  boat.add(mast);

  // Lateen triangular sail
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 5.4);
  sailShape.lineTo(4.2, 1.1);
  sailShape.closePath();
  const sailGeo = new THREE.ShapeGeometry(sailShape);
  const sail = new THREE.Mesh(sailGeo, mats.linenSail);
  sail.position.set(0, 1.5, -0.4);
  sail.rotation.y = Math.PI / 2;
  sail.castShadow = true;
  boat.add(sail);

  return boat;
}

function createBrazier(mats: ProceduralMaterialSet): THREE.Group {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 2.2, 8), mats.limestoneDark);
  stand.position.y = 1.1;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.45, 0.65, 10), mats.bronze);
  bowl.position.y = 2.4;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.35, 7),
    new THREE.MeshBasicMaterial({ color: 0xffa63d })
  );
  flame.position.y = 3.2;
  g.add(stand, bowl, flame);
  return g;
}

export function buildArchitectureLayer(mats: ProceduralMaterialSet): ArchitectureLayerHandle {
  const root = new THREE.Group();
  root.name = 'ArchitectureLayer';

  // 1. Saqqara Tomb Courtyard & Gate Pylon (MainMenu Centerpiece + 1_3 Launch Yard)
  const courtyardGroup = new THREE.Group();
  courtyardGroup.position.set(0, 0, 110);
  root.add(courtyardGroup);

  // Stone platform floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 34), mats.limestone);
  floor.position.y = -0.35;
  floor.receiveShadow = true;
  courtyardGroup.add(floor);

  // Monumental Twin Pylon Gate (camera flies THROUGH this archway on Start Game!)
  const menuPylonGroup = new THREE.Group();
  menuPylonGroup.position.set(0, 0, -14);
  courtyardGroup.add(menuPylonGroup);

  const towerGeo = new THREE.BoxGeometry(8.5, 18, 6.2);
  const leftTower = new THREE.Mesh(towerGeo, mats.limestone);
  leftTower.position.set(-9.5, 9, 0);
  leftTower.castShadow = true;
  leftTower.receiveShadow = true;

  const rightTower = new THREE.Mesh(towerGeo, mats.limestone);
  rightTower.position.set(9.5, 9, 0);
  rightTower.castShadow = true;
  rightTower.receiveShadow = true;

  // Lintel arch & winged sun frieze
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(28, 3.4, 6.6), mats.limestoneDark);
  lintel.position.set(0, 17.5, 0);
  lintel.castShadow = true;

  const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 16), mats.bronze);
  sunDisc.rotation.x = Math.PI / 2;
  sunDisc.position.set(0, 17.5, 3.4);

  // Obelisk flankers (with LOD for distant viewing)
  const obeliskHigh = new THREE.Group();
  const obShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 11, 4), mats.limestoneDark);
  obShaft.position.y = 5.5;
  obShaft.rotation.y = Math.PI / 4;
  const obTip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 4), mats.bronze);
  obTip.position.y = 11.8;
  obTip.rotation.y = Math.PI / 4;
  obeliskHigh.add(obShaft, obTip);

  const obeliskLow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 12, 1.2), mats.limestoneDark);
  obeliskLow.position.y = 6;

  const lodLeft = new THREE.LOD();
  lodLeft.addLevel(obeliskHigh, 0);
  lodLeft.addLevel(obeliskLow, 90);
  lodLeft.position.set(-15.5, 0, 5.5);

  const lodRight = new THREE.LOD();
  lodRight.addLevel(obeliskHigh.clone(), 0);
  lodRight.addLevel(obeliskLow.clone(), 90);
  lodRight.position.set(15.5, 0, 5.5);

  menuPylonGroup.add(leftTower, rightTower, lintel, sunDisc, lodLeft, lodRight);

  // Expedition crates & stone pedestal for hero glider preview in courtyard
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 1.4, 8), mats.limestoneDark);
  pedestal.position.set(0, 0.7, 2);
  pedestal.receiveShadow = true;
  courtyardGroup.add(pedestal);

  const crateGeo = new THREE.BoxGeometry(1.8, 1.2, 1.4);
  for (let i = 0; i < 4; i++) {
    const crate = new THREE.Mesh(crateGeo, mats.sycamoreDark);
    crate.position.set(-11 + i * 2.3, 0.6, 9.5);
    crate.rotation.y = (i - 1.5) * 0.25;
    crate.castShadow = true;
    courtyardGroup.add(crate);
  }

  // Courtyard braziers
  const b1 = createBrazier(mats);
  b1.position.set(-4.8, 0, -9);
  const b2 = createBrazier(mats);
  b2.position.set(4.8, 0, -9);
  courtyardGroup.add(b1, b2);

  // 2. Two Border Watchposts along the Nile (Chapter 1_3)
  const createPost = (x: number, z: number) => {
    const post = new THREE.Group();
    post.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), mats.limestone);
    base.position.y = 6;
    base.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.2, 6.8), mats.limestoneDark);
    cap.position.y = 12.6;
    const brazier = createBrazier(mats);
    brazier.position.set(0, 13.2, 0);
    post.add(base, cap, brazier);
    return post;
  };
  const post1 = createPost(-24, 0);
  const post2 = createPost(-18, -68);
  root.add(post1, post2);

  // 3. Nile Felucca Boats (Chapters 1_3, 1_4, 1_6)
  const boatsGroup = new THREE.Group();
  root.add(boatsGroup);
  const boatConfigs = [
    { x: -10, z: -25, rot: 0.15 },
    { x: 10, z: -55, rot: -0.2 },
    { x: -12, z: -90, rot: 0.1 },
    { x: 8, z: 35, rot: -0.1 },
  ];
  const boats: THREE.Group[] = [];
  for (const cfg of boatConfigs) {
    const b = createFeluccaBoat(mats);
    b.position.set(cfg.x, -0.5, cfg.z);
    b.rotation.y = cfg.rot;
    boatsGroup.add(b);
    boats.push(b);
  }

  // 4. Living Memphis Cityscape (Chapter 1_6: Temple of Ptah, quays, piers, residential quarters)
  const memphisGroup = new THREE.Group();
  memphisGroup.visible = false;
  root.add(memphisGroup);

  // Temple of Ptah monumental colonnade
  const templeBase = new THREE.Mesh(new THREE.BoxGeometry(46, 4, 58), mats.limestone);
  templeBase.position.set(-48, 2, -20);
  memphisGroup.add(templeBase);

  const colGeo = new THREE.CylinderGeometry(1.1, 1.35, 16, 12);
  const colInst = new THREE.InstancedMesh(colGeo, mats.limestone, 16);
  const mDummy = new THREE.Object3D();
  let cIdx = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      mDummy.position.set(-60 + col * 8, 12, -40 + row * 12);
      mDummy.updateMatrix();
      colInst.setMatrixAt(cIdx++, mDummy.matrix);
    }
  }
  colInst.instanceMatrix.needsUpdate = true;
  colInst.computeBoundingSphere();
  memphisGroup.add(colInst);

  // Stone Quays & Piers along the Nile
  const quayLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 220), mats.limestoneDark);
  quayLeft.position.set(-28, 0.8, -20);
  const quayRight = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 220), mats.limestoneDark);
  quayRight.position.set(28, 0.8, -20);
  memphisGroup.add(quayLeft, quayRight);

  // Mud-brick residential quarters (instanced for high performance)
  const houseGeo = new THREE.BoxGeometry(9, 6.5, 9);
  const houseInst = new THREE.InstancedMesh(houseGeo, mats.limestoneDark, 28);
  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const hx = side * (42 + (i % 4) * 14);
    const hz = 75 - Math.floor(i / 2) * 16;
    mDummy.position.set(hx, 3.2, hz);
    mDummy.scale.set(0.85 + (i % 3) * 0.25, 0.7 + (i % 4) * 0.35, 0.9 + (i % 2) * 0.25);
    mDummy.updateMatrix();
    houseInst.setMatrixAt(i, mDummy.matrix);
  }
  houseInst.instanceMatrix.needsUpdate = true;
  houseInst.computeBoundingSphere();
  memphisGroup.add(houseInst);

  // Quay braziers
  for (let z = 60; z >= -100; z -= 40) {
    const br = createBrazier(mats);
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
      post1.visible = mode === 'dawn';
      post2.visible = mode === 'dawn';
      boatsGroup.visible = mode === 'dawn' || mode === 'memphis';
      memphisGroup.visible = mode === 'memphis';
    },
    update: (time) => {
      boats.forEach((b, idx) => {
        b.position.y = -0.5 + Math.sin(time * 1.4 + idx) * 0.14;
        b.rotation.z = Math.sin(time * 1.1 + idx) * 0.03;
      });
    },
    dispose: () => {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    },
  };
}
