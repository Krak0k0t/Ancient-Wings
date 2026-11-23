import * as THREE from 'three';
import { ChapterMissionLayout, HazardEntity, Vec3 } from '../../game/flightPhysics';
import { DifficultyLevel, SceneId } from '../../types/game';
import { ProceduralMaterialSet } from './materials';
import { buildSetStormBoss } from './SetStormBoss';

export interface EntitiesAndBossHandle {
  root: THREE.Group;
  configureForScene: (
    sceneId: SceneId,
    layout: ChapterMissionLayout,
    portalActive: boolean,
    difficulty: DifficultyLevel
  ) => void;
  update: (
    time: number,
    dt: number,
    sceneId: SceneId,
    activeWaypointIdx: number,
    bossPhase: 0 | 1 | 2 | 3,
    witnessVisible: boolean,
    gliderPos: Vec3
  ) => {
    hazards: HazardEntity[];
  };
  dispose: () => void;
}

export function buildEntitiesAndBoss(mats: ProceduralMaterialSet): EntitiesAndBossHandle {
  const root = new THREE.Group();
  root.name = 'EntitiesAndBoss';

  // Reusable shared geometries
  const ringGeo = new THREE.TorusGeometry(6.2, 0.28, 10, 32);
  const thermalGeo = new THREE.CylinderGeometry(7.5, 9.5, 42, 16, 1, true);
  const wingGeo = new THREE.PlaneGeometry(1.6, 0.55);

  const thermalMat = new THREE.MeshBasicMaterial({
    color: 0xf7c56b,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const avoidThermalMat = new THREE.MeshBasicMaterial({
    color: 0xe65c2e,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const activeGateMat = new THREE.MeshStandardMaterial({
    color: 0xffd578,
    emissive: new THREE.Color(0xf2a738),
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.8,
  });
  const passedGateMat = new THREE.MeshStandardMaterial({
    color: 0x5c6954,
    roughness: 0.7,
    metalness: 0.2,
    transparent: true,
    opacity: 0.35,
  });

  // 1. Dynamic waypoint & thermal containers
  const waypointsGroup = new THREE.Group();
  const thermalsGroup = new THREE.Group();
  root.add(waypointsGroup, thermalsGroup);

  let waypointMeshes: THREE.Mesh[] = [];

  // 2. Vertical Shadow Anomaly (Chapter 1_3)
  const anomalyGroup = new THREE.Group();
  const anomalyMonolith = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 46, 0.8),
    mats.anomalyShadow
  );
  const anomalyAura = new THREE.Mesh(
    new THREE.TorusGeometry(7.5, 0.35, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x8b6eff, transparent: true, opacity: 0.65 })
  );
  anomalyGroup.add(anomalyMonolith, anomalyAura);
  anomalyGroup.visible = false;
  root.add(anomalyGroup);

  // 3. Nile Water-Glass Portal (Chapter 1_5 entry)
  const portalGroup = new THREE.Group();
  const portalFrame = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.65, 12, 36), mats.bronze);
  const portalGlass = new THREE.Mesh(
    new THREE.CircleGeometry(10, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x7fd8f0,
      emissive: new THREE.Color(0x286e8a),
      emissiveIntensity: 0.75,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    })
  );
  portalGroup.add(portalFrame, portalGlass);
  portalGroup.visible = false;
  root.add(portalGroup);

  // 4. Book of the Dead Pseudo-Era Setpieces (Chapter 1_5)
  const duatGroup = new THREE.Group();
  duatGroup.visible = false;
  root.add(duatGroup);

  // Solar Barque on the northern horizon
  const barque = new THREE.Group();
  barque.position.set(0, 48, -210);
  const barqueHull = new THREE.Mesh(new THREE.TorusGeometry(18, 1.4, 10, 28, Math.PI), mats.starGold);
  barqueHull.rotation.z = Math.PI;
  const barqueSun = new THREE.Mesh(new THREE.SphereGeometry(7.5, 20, 16), mats.starGold);
  barqueSun.position.y = 4;
  barque.add(barqueHull, barqueSun);
  duatGroup.add(barque);

  // Monumental Starry Deity Silhouettes flanking the Nile
  const deityMat = new THREE.MeshBasicMaterial({
    color: 0x162447,
    transparent: true,
    opacity: 0.82,
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const deity = new THREE.Group();
    deity.position.set(side * 68, 10, 60 - Math.floor(i / 2) * 85);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 5.2, 46, 8), deityMat);
    torso.position.y = 23;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.8, 14, 6), deityMat);
    crown.position.y = 54;
    const starEye = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), mats.starGold);
    starEye.position.set(-side * 2, 45, 3);
    deity.add(torso, crown, starEye);
    duatGroup.add(deity);
  }

  // Starry Trail curve connecting waypoints in 1_5
  const trailPoints = [
    new THREE.Vector3(0, 28, 105),
    new THREE.Vector3(18, 32, 45),
    new THREE.Vector3(-16, 36, -15),
    new THREE.Vector3(8, 34, -80),
    new THREE.Vector3(0, 30, -145),
  ];
  const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
  const trailTube = new THREE.Mesh(
    new THREE.TubeGeometry(trailCurve, 64, 0.55, 8, false),
    mats.starGold
  );
  duatGroup.add(trailTube);

  // 5. Memphis Air Factions (Chapter 1_6)
  const memphisFactionsGroup = new THREE.Group();
  memphisFactionsGroup.visible = false;
  root.add(memphisFactionsGroup);

  // Friendly Flock of Sacred Ibises
  const ibisMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f2e7, roughness: 0.5, sheen: 0.4 });
  const ibisGroup = new THREE.Group();
  const ibises: { root: THREE.Group; lWing: THREE.Mesh; rWing: THREE.Mesh; offset: Vec3 }[] = [];
  for (let i = 0; i < 5; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 6), ibisMat);
    body.rotation.x = -Math.PI / 2;
    const lw = new THREE.Mesh(wingGeo, ibisMat);
    lw.position.set(-0.8, 0, 0);
    const rw = new THREE.Mesh(wingGeo, ibisMat);
    rw.position.set(0.8, 0, 0);
    bird.add(body, lw, rw);
    ibisGroup.add(bird);
    ibises.push({
      root: bird,
      lWing: lw,
      rWing: rw,
      offset: { x: (i - 2) * 3.2, y: Math.abs(i - 2) * 1.1, z: -Math.abs(i - 2) * 2.5 },
    });
  }
  memphisFactionsGroup.add(ibisGroup);

  // Neutral River Watchers & Priests on Piers
  const neutralWatcherPositions: Vec3[] = [
    { x: -24, y: 6, z: 45 },
    { x: 24, y: 6, z: -15 },
    { x: -24, y: 6, z: -75 },
  ];
  const watcherMat = new THREE.MeshStandardMaterial({ color: 0xf0ead6, roughness: 0.7 });
  for (const p of neutralWatcherPositions) {
    const priest = new THREE.Group();
    priest.position.set(p.x, 2.5, p.z);
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.8, 8), watcherMat);
    robe.position.y = 1.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 8), mats.sycamore);
    head.position.y = 3.1;
    priest.add(robe, head);
    memphisFactionsGroup.add(priest);
  }

  // Hostile Spear-Arrows with trailing ropes
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xff5a36,
    emissive: new THREE.Color(0xc42b1c),
    emissiveIntensity: 0.9,
  });
  const hostileArrows: { mesh: THREE.Group; base: Vec3; speed: number; phase: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.5, 6), arrowMat);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 18, 4),
      new THREE.MeshBasicMaterial({ color: 0x9c7b4d, transparent: true, opacity: 0.55 })
    );
    rope.position.y = -11;
    arrow.add(shaft, rope);
    memphisFactionsGroup.add(arrow);
    hostileArrows.push({
      mesh: arrow,
      base: {
        x: (i % 2 === 0 ? -18 : 18) + (i - 2.5) * 3,
        y: 8,
        z: 55 - i * 32,
      },
      speed: 22 + (i % 3) * 5,
      phase: i * 1.1,
    });
  }

  // 6. Boss SET Volumetric Sandstorm Face + Horus Wing-Sign + Falcon Witness (Chapter 1_7)
  const setBoss = buildSetStormBoss();
  setBoss.root.visible = false;
  root.add(setBoss.root, setBoss.witnessGroup);

  let currentDiff: DifficultyLevel = 'adept';

  return {
    root,
    configureForScene: (sceneId, layout, portalActive, difficulty) => {
      currentDiff = difficulty;

      // Clear previous dynamic gates & thermals
      while (waypointsGroup.children.length > 0) {
        waypointsGroup.remove(waypointsGroup.children[0]);
      }
      while (thermalsGroup.children.length > 0) {
        thermalsGroup.remove(thermalsGroup.children[0]);
      }
      waypointMeshes = [];

      // Thermals (1_7 uses SetStormBoss feathered updraft ribbons instead of wide raw cylinders)
      if (sceneId !== '1_7') {
        for (const t of layout.thermals) {
          const cyl = new THREE.Mesh(thermalGeo, t.avoid ? avoidThermalMat : thermalMat);
          cyl.position.set(t.pos.x, t.pos.y + 18, t.pos.z);
          cyl.scale.set(t.radius / 8, t.height / 42, t.radius / 8);
          thermalsGroup.add(cyl);
        }
      }

      // Waypoint Rings
      for (const wp of layout.waypoints) {
        const ring = new THREE.Mesh(ringGeo, activeGateMat);
        ring.position.set(wp.pos.x, wp.pos.y, wp.pos.z);
        if (wp.kind === 'anomaly') {
          ring.visible = false; // anomaly has its own monolith mesh
        }
        waypointsGroup.add(ring);
        waypointMeshes.push(ring);
      }

      // Anomaly in 1_3 (positioned at the return tomb spur)
      const anomalyWp = layout.waypoints.find((w) => w.kind === 'anomaly');
      anomalyGroup.visible = sceneId === '1_3' && Boolean(anomalyWp);
      if (anomalyWp) {
        anomalyGroup.position.set(anomalyWp.pos.x, anomalyWp.pos.y, anomalyWp.pos.z);
      }

      // Nile Portal in 1_3 (appears after anomaly) & 1_5 (entry)
      portalGroup.visible = (sceneId === '1_3' && portalActive) || sceneId === '1_5';
      portalGroup.position.set(0, 28, sceneId === '1_3' ? 20 : 105);

      duatGroup.visible = sceneId === '1_5';
      memphisFactionsGroup.visible = sceneId === '1_6';
      setBoss.root.visible = sceneId === '1_7';
      setBoss.witnessGroup.visible = false;
    },

    update: (time, _dt, sceneId, activeWaypointIdx, bossPhase, witnessVisible, gliderPos) => {
      const hazards: HazardEntity[] = [];
      const diffScale = currentDiff === 'pilgrim' ? 0.75 : currentDiff === 'master' ? 1.3 : 1.0;

      // Waypoint highlight
      for (let i = 0; i < waypointMeshes.length; i++) {
        const m = waypointMeshes[i];
        if (i < activeWaypointIdx) {
          m.material = passedGateMat;
          m.scale.setScalar(0.82);
        } else if (i === activeWaypointIdx) {
          m.material = activeGateMat;
          m.scale.setScalar(1.08 + Math.sin(time * 4) * 0.06);
        } else {
          m.material = passedGateMat;
          m.scale.setScalar(0.95);
        }
      }

      // Anomaly shimmer
      if (anomalyGroup.visible) {
        anomalyAura.rotation.z = time * 1.4;
        anomalyMonolith.rotation.y = Math.sin(time * 0.9) * 0.15;
      }

      // Portal spin
      if (portalGroup.visible) {
        portalFrame.rotation.z = time * 0.8;
      }

      // Chapter 1_6 Memphis factions
      if (sceneId === '1_6') {
        // Friendly Ibises fly slightly ahead of glider toward active waypoint
        const leadZ = Math.max(-135, gliderPos.z - 22);
        const leadX = Math.sin(leadZ * 0.03) * 18;
        ibisGroup.position.set(leadX, Math.max(26, gliderPos.y + 2), leadZ);
        ibises.forEach((b, idx) => {
          b.root.position.set(b.offset.x, b.offset.y, b.offset.z);
          const flap = Math.sin(time * 9 + idx) * 0.45;
          b.lWing.rotation.z = flap;
          b.rWing.rotation.z = -flap;
        });

        // Neutral watchers
        neutralWatcherPositions.forEach((p, idx) => {
          hazards.push({
            id: `neutral_${idx}`,
            pos: p,
            vel: { x: 0, y: 0, z: 0 },
            radius: 10,
            kind: 'neutral_watcher',
          });
        });

        // Hostile tethered arrows arcing upward from piers
        hostileArrows.forEach((a, idx) => {
          const cycle = (time * a.speed * diffScale * 0.05 + a.phase) % 1;
          const y = 3 + Math.sin(cycle * Math.PI) * 34;
          a.mesh.position.set(a.base.x + Math.sin(time + idx) * 2.5, y, a.base.z);
          hazards.push({
            id: `spear_${idx}`,
            pos: { x: a.mesh.position.x, y, z: a.mesh.position.z },
            vel: { x: 0, y: 0, z: 0 },
            radius: 6.5,
            kind: 'hostile_spear',
          });
        });
      }

      // Chapter 1_7 Volumetric Set Sandstorm Boss & Witness
      if (sceneId === '1_7') {
        const setHazards = setBoss.update(time, _dt, bossPhase, witnessVisible, gliderPos, currentDiff);
        hazards.push(...setHazards);
      } else {
        setBoss.witnessGroup.visible = false;
      }

      return { hazards };
    },

    dispose: () => {
      ringGeo.dispose();
      thermalGeo.dispose();
      wingGeo.dispose();
      thermalMat.dispose();
      avoidThermalMat.dispose();
      activeGateMat.dispose();
      passedGateMat.dispose();
      deityMat.dispose();
      ibisMat.dispose();
      watcherMat.dispose();
      arrowMat.dispose();
      setBoss.dispose();
    },
  };
}
