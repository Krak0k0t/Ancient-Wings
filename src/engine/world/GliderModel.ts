import * as THREE from 'three';
import { ProceduralMaterialSet } from './materials';

export interface SaqqaraGliderRig {
  root: THREE.Group;
  wingGroup: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  rudderGroup: THREE.Group;
  ballastRing: THREE.Mesh;
  waxCollar: THREE.Mesh;
  /** Runs subtle idle breathing + custom click animation in Menu or active flight deflection */
  updateVisuals: (time: number, dt: number, rudderAngle: number, wingAngle: number, surgeTimer: number) => void;
  triggerInspectPulse: () => void;
  highlightNode: (node: 'wing' | 'weight' | 'fin' | null) => void;
}

export function buildSaqqaraGlider(mats: ProceduralMaterialSet): SaqqaraGliderRig {
  const root = new THREE.Group();
  root.name = 'SaqqaraBirdGlider';

  // 1. Primary Silhouette: Carved Sycamore Fuselage (tapered falcon body, NO feet)
  const bodyPoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -1.65),
    new THREE.Vector2(0.24, -1.1),
    new THREE.Vector2(0.38, -0.3),
    new THREE.Vector2(0.36, 0.45),
    new THREE.Vector2(0.26, 1.1),
    new THREE.Vector2(0.14, 1.55),
    new THREE.Vector2(0.0, 1.75),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 16);
  bodyGeo.rotateX(Math.PI / 2); // align nose along -Z
  bodyGeo.scale(1.0, 0.78, 1.0);
  const bodyMesh = new THREE.Mesh(bodyGeo, mats.sycamore);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // 2. Sculpted Falcon Head & Hooked Beak (pointing -Z)
  const headGeo = new THREE.SphereGeometry(0.27, 14, 12);
  headGeo.scale(0.88, 0.85, 1.15);
  const headMesh = new THREE.Mesh(headGeo, mats.sycamore);
  headMesh.position.set(0, 0.08, -1.58);
  headMesh.castShadow = true;
  root.add(headMesh);

  const beakShape = new THREE.Shape();
  beakShape.moveTo(0, 0.08);
  beakShape.lineTo(0.42, -0.02);
  beakShape.quadraticCurveTo(0.46, -0.18, 0.25, -0.2);
  beakShape.lineTo(0, -0.08);
  beakShape.closePath();
  const beakGeo = new THREE.ExtrudeGeometry(beakShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  beakGeo.center();
  beakGeo.rotateY(Math.PI / 2);
  const beakMesh = new THREE.Mesh(beakGeo, mats.sycamoreDark);
  beakMesh.position.set(0, 0.01, -1.92);
  beakMesh.castShadow = true;
  root.add(beakMesh);

  // 3. Accent Detail: Inlaid Obsidian Eyes + Gold Collar Trim
  const eyeGeo = new THREE.SphereGeometry(0.055, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, mats.obsidian);
  leftEye.position.set(-0.2, 0.13, -1.66);
  const rightEye = new THREE.Mesh(eyeGeo, mats.obsidian);
  rightEye.position.set(0.2, 0.13, -1.66);
  root.add(leftEye, rightEye);

  // 4. Ballast Weight Ring (forward center of gravity)
  const ballastGeo = new THREE.TorusGeometry(0.32, 0.055, 10, 24);
  const ballastRing = new THREE.Mesh(ballastGeo, mats.bronze.clone());
  ballastRing.position.set(0, 0.0, -0.65);
  ballastRing.castShadow = true;
  root.add(ballastRing);

  // 5. Secondary Read: Cambered Sycamore Wings (Left & Right)
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, 0.08, -0.2);
  root.add(wingGroup);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.45);
  wingShape.quadraticCurveTo(1.5, -0.58, 3.15, -0.12);
  wingShape.quadraticCurveTo(3.3, 0.14, 2.95, 0.36);
  wingShape.quadraticCurveTo(1.6, 0.56, 0, 0.42);
  wingShape.closePath();

  const rightWingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  rightWingGeo.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(rightWingGeo, mats.sycamore.clone());
  rightWing.position.set(0.18, 0, 0);
  rightWing.rotation.z = -0.04; // subtle dihedral
  rightWing.castShadow = true;
  rightWing.receiveShadow = true;

  const leftWing = new THREE.Mesh(rightWingGeo, mats.sycamore.clone());
  leftWing.scale.x = -1;
  leftWing.position.set(-0.18, 0, 0);
  leftWing.rotation.z = 0.04;
  leftWing.castShadow = true;
  leftWing.receiveShadow = true;

  wingGroup.add(leftWing, rightWing);

  // Horizontal tail shelf (carved flat base)
  const tailShelfGeo = new THREE.BoxGeometry(0.7, 0.06, 0.72);
  const tailShelf = new THREE.Mesh(tailShelfGeo, mats.sycamoreDark);
  tailShelf.position.set(0, 0.04, 1.38);
  tailShelf.castShadow = true;
  root.add(tailShelf);

  // 6. Signature Vertical Tail-Fin Rudder (mounted vertically beneath tail, pivots on Y)
  const rudderGroup = new THREE.Group();
  rudderGroup.position.set(0, -0.05, 1.48);
  root.add(rudderGroup);

  const finShape = new THREE.Shape();
  finShape.moveTo(-0.32, 0.16);
  finShape.lineTo(0.45, 0.24);
  finShape.quadraticCurveTo(0.56, -0.24, 0.24, -0.68);
  finShape.lineTo(-0.24, -0.45);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  finGeo.center();
  finGeo.rotateY(Math.PI / 2);

  const finMesh = new THREE.Mesh(finGeo, mats.sycamoreDark.clone());
  finMesh.position.set(0, -0.22, 0.05);
  finMesh.castShadow = true;
  rudderGroup.add(finMesh);

  // 7. Wax-sealed collar on vertical tail fin (from Chapter 1_2 candle scene)
  const waxGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.14, 12);
  const waxCollar = new THREE.Mesh(waxGeo, mats.wax.clone());
  waxCollar.position.set(0, 0.05, 0);
  rudderGroup.add(waxCollar);

  // Bronze tail hinge pin
  const pinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8);
  const pinMesh = new THREE.Mesh(pinGeo, mats.bronze);
  pinMesh.position.set(0, 0, -0.1);
  rudderGroup.add(pinMesh);

  let inspectTimer = 0;

  return {
    root,
    wingGroup,
    leftWing,
    rightWing,
    rudderGroup,
    ballastRing,
    waxCollar,
    triggerInspectPulse: () => {
      inspectTimer = 1.35;
    },
    highlightNode: (node) => {
      const resetMat = (m: THREE.Material, colorHex = 0x000000) => {
        if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
          m.emissive.setHex(colorHex);
          m.emissiveIntensity = colorHex ? 0.55 : 0;
        }
      };
      resetMat(leftWing.material);
      resetMat(rightWing.material);
      resetMat(ballastRing.material);
      resetMat(finMesh.material);
      resetMat(waxCollar.material);

      if (node === 'wing') {
        resetMat(leftWing.material, 0xc8964a);
        resetMat(rightWing.material, 0xc8964a);
      } else if (node === 'weight') {
        resetMat(ballastRing.material, 0xffb84d);
      } else if (node === 'fin') {
        resetMat(finMesh.material, 0xc8964a);
        resetMat(waxCollar.material, 0xffd06b);
      }
    },
    updateVisuals: (time, dt, rudderAngle, wingAngle, surgeTimer) => {
      if (inspectTimer > 0) {
        inspectTimer = Math.max(0, inspectTimer - dt);
        const phase = (1.35 - inspectTimer) * 5.2;
        const flap = Math.sin(phase) * 0.24 * (inspectTimer / 1.35);
        leftWing.rotation.z = 0.04 + flap;
        rightWing.rotation.z = -0.04 - flap;
        rudderGroup.rotation.y = Math.sin(phase * 1.4) * 0.42 * (inspectTimer / 1.35);
        wingGroup.rotation.x = Math.cos(phase) * 0.12 * (inspectTimer / 1.35);
        return;
      }

      // Subtle idle breathing + active flight kinematics
      const breath = Math.sin(time * 2.1) * 0.015;
      const surgeFlap = surgeTimer > 0 ? Math.sin(surgeTimer * 26) * 0.16 : 0;
      leftWing.rotation.z = 0.04 + breath + surgeFlap;
      rightWing.rotation.z = -0.04 - breath - surgeFlap;
      wingGroup.rotation.x = wingAngle * 0.4;
      rudderGroup.rotation.y = rudderAngle;
    },
  };
}
