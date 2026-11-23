import { DifficultyLevel, SceneId } from '../types/game';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FlightInput {
  pitchUp: boolean;
  pitchDown: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  wingSurge: boolean;
  brakeHold: boolean;
  touchX?: number; // -1..1
  touchY?: number; // -1..1
  cursorAimActive?: boolean;
  aimTargetDir?: Vec3; // unit vector from glider toward cursor raycast target
}

export interface GliderKinematics {
  pos: Vec3;
  yaw: number; // radians, 0 = -Z (North)
  pitch: number; // radians, + = nose up
  roll: number; // radians
  speed: number;
  rudderAngle: number; // radians
  wingAngle: number; // radians
  surgeCooldown: number;
  surgeTimer: number;
  checkpointPos: Vec3;
  checkpointYaw: number;
}

export interface ThermalZone {
  id: string;
  pos: Vec3;
  radius: number;
  height: number;
  lift: number;
  avoid?: boolean; // true for Chapter 1_3 sunrise glare thermal to skirt around
}

export interface WaypointGate {
  id: string;
  pos: Vec3;
  radius: number;
  labelRu: string;
  labelEn: string;
  kind: 'takeoff' | 'post' | 'checkpoint' | 'anomaly' | 'portal' | 'exit' | 'horus';
}

export interface HazardEntity {
  id: string;
  pos: Vec3;
  vel: Vec3;
  radius: number;
  kind: 'neutral_watcher' | 'hostile_spear' | 'set_sand_wave' | 'set_wind_blast';
}

export interface ChapterMissionLayout {
  sceneId: SceneId;
  spawnPos: Vec3;
  spawnYaw: number;
  windVec: Vec3; // world wind velocity
  minAltitude: number;
  maxAltitude: number;
  thermals: ThermalZone[];
  waypoints: WaypointGate[];
}

export function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function getDifficultyMultiplier(diff: DifficultyLevel): number {
  if (diff === 'pilgrim') return 0.65;
  if (diff === 'master') return 1.35;
  return 1.0;
}

export function createChapterLayout(sceneId: SceneId): ChapterMissionLayout {
  switch (sceneId) {
    case '1_3':
      return {
        sceneId: '1_3',
        spawnPos: { x: 0, y: 18, z: 82 },
        spawnYaw: 0, // facing -Z (north wind)
        windVec: { x: 0, y: 0, z: 4.2 }, // headwind from north (+Z pushes back)
        minAltitude: 2.5,
        maxAltitude: 120,
        thermals: [
          { id: 'sunrise_glare', pos: { x: 38, y: 18, z: -30 }, radius: 18, height: 60, lift: 9, avoid: true },
          { id: 'bank_lift', pos: { x: -24, y: 16, z: 15 }, radius: 22, height: 65, lift: 7.5 },
        ],
        waypoints: [
          {
            id: 'takeoff_gate',
            pos: { x: 0, y: 18, z: 58 },
            radius: 16,
            labelRu: 'Разбег и подъём против северного ветра',
            labelEn: 'Lift off against the north wind',
            kind: 'takeoff',
          },
          {
            id: 'post_1_a',
            pos: { x: -18, y: 30, z: 0 },
            radius: 17,
            labelRu: 'Пограничный пост I (наблюдение: земля видит нас и молчит)',
            labelEn: 'Border Post I (observation: the earth sees us and stays silent)',
            kind: 'post',
          },
          {
            id: 'post_2_a',
            pos: { x: -12, y: 34, z: -68 },
            radius: 17,
            labelRu: 'Пограничный пост II (Нил серой лентой)',
            labelEn: 'Border Post II (Nile as a grey ribbon)',
            kind: 'post',
          },
          {
            id: 'skirt_turn',
            pos: { x: 10, y: 32, z: -110 },
            radius: 18,
            labelRu: 'Обход тёплого потока от восходящего солнца',
            labelEn: 'Skirt the warm plume of the rising sun',
            kind: 'checkpoint',
          },
          {
            id: 'post_2_b',
            pos: { x: 18, y: 30, z: -55 },
            radius: 17,
            labelRu: 'Второй проход мимо поста II',
            labelEn: 'Second pass by Border Post II',
            kind: 'post',
          },
          {
            id: 'post_1_b',
            pos: { x: 14, y: 26, z: 15 },
            radius: 17,
            labelRu: 'Второй проход мимо поста I',
            labelEn: 'Second pass by Border Post I',
            kind: 'post',
          },
          {
            id: 'anomaly_shadow',
            pos: { x: 26, y: 26, z: 58 },
            radius: 18,
            labelRu: 'Аномалия: вертикальная тень над гробницей',
            labelEn: 'Anomaly: vertical shadow above the tomb',
            kind: 'anomaly',
          },
        ],
      };

    case '1_4':
      return {
        sceneId: '1_4',
        spawnPos: { x: 0, y: 26, z: 120 },
        spawnYaw: 0,
        windVec: { x: 1.5, y: 0, z: 5.0 },
        minAltitude: 2.5,
        maxAltitude: 130,
        thermals: [
          { id: 'nile_t1', pos: { x: -14, y: 10, z: 70 }, radius: 20, height: 70, lift: 8.5 },
          { id: 'nile_t2', pos: { x: 16, y: 10, z: 10 }, radius: 20, height: 70, lift: 8.5 },
          { id: 'nile_t3', pos: { x: -8, y: 10, z: -55 }, radius: 22, height: 75, lift: 9.0 },
        ],
        waypoints: [
          // Mission 1: Nile Thermal Route
          { id: 'm1_1', pos: { x: -14, y: 28, z: 70 }, radius: 18, labelRu: 'Миссия 1/3: Трасса вдоль Нила через термики', labelEn: 'Mission 1/3: Nile Thermal Route', kind: 'checkpoint' },
          { id: 'm1_2', pos: { x: 16, y: 34, z: 10 }, radius: 18, labelRu: 'Миссия 1/3: Подъём в восходящем потоке', labelEn: 'Mission 1/3: Riding the thermal', kind: 'checkpoint' },
          // Mission 2: Slalom between Nile boats
          { id: 'm2_1', pos: { x: -20, y: 15, z: -35 }, radius: 17, labelRu: 'Миссия 2/3: Слалом между ладьями (левый борт)', labelEn: 'Mission 2/3: Boat Slalom (Port)', kind: 'checkpoint' },
          { id: 'm2_2', pos: { x: 20, y: 15, z: -75 }, radius: 17, labelRu: 'Миссия 2/3: Слалом между ладьями (правый борт)', labelEn: 'Mission 2/3: Boat Slalom (Starboard)', kind: 'checkpoint' },
          // Mission 3: Headwind Rudder Verification
          { id: 'm3_1', pos: { x: 0, y: 26, z: -120 }, radius: 18, labelRu: 'Миссия 3/3: Трасса против ветра (проверка плавника-руля)', labelEn: 'Mission 3/3: Headwind Rudder Course', kind: 'checkpoint' },
          { id: 'm3_2', pos: { x: 0, y: 30, z: -175 }, radius: 19, labelRu: 'Миссия 3/3: Выход к порталу на Ниле', labelEn: 'Mission 3/3: Approach to the Nile Portal', kind: 'checkpoint' },
        ],
      };

    case '1_5':
      return {
        sceneId: '1_5',
        spawnPos: { x: 0, y: 28, z: 140 },
        spawnYaw: 0,
        windVec: { x: 0, y: 0, z: 1.5 },
        minAltitude: 4,
        maxAltitude: 130,
        thermals: [],
        waypoints: [
          { id: 'nile_portal_entry', pos: { x: 0, y: 28, z: 105 }, radius: 20, labelRu: 'Портал: стекло воды над Нилом', labelEn: 'Portal: Water-Glass above the Nile', kind: 'portal' },
          { id: 'duat_star_1', pos: { x: 18, y: 32, z: 45 }, radius: 20, labelRu: 'Звёздный след · Регистр I', labelEn: 'Starry Trail · Register I', kind: 'checkpoint' },
          { id: 'duat_star_2', pos: { x: -16, y: 36, z: -15 }, radius: 20, labelRu: 'Звёздный след · Солнечная ладья', labelEn: 'Starry Trail · Solar Barque', kind: 'checkpoint' },
          { id: 'duat_star_3', pos: { x: 8, y: 34, z: -80 }, radius: 20, labelRu: 'Звёздный след · Силуэты звёздных богов', labelEn: 'Starry Trail · Starry Deities', kind: 'checkpoint' },
          { id: 'duat_exit_dense', pos: { x: 0, y: 30, z: -145 }, radius: 22, labelRu: 'Плотный слой воздуха: живой Мемфис', labelEn: 'Dense Air Layer: Living Memphis', kind: 'exit' },
        ],
      };

    case '1_6':
      return {
        sceneId: '1_6',
        spawnPos: { x: 0, y: 30, z: 140 },
        spawnYaw: 0,
        windVec: { x: -1.8, y: 0, z: 2.5 },
        minAltitude: 4,
        maxAltitude: 125,
        thermals: [
          { id: 'ibis_t1', pos: { x: -24, y: 12, z: 65 }, radius: 20, height: 70, lift: 8.5 },
          { id: 'ibis_t2', pos: { x: 24, y: 12, z: -25 }, radius: 20, height: 70, lift: 8.5 },
        ],
        waypoints: [
          { id: 'ibis_lead_1', pos: { x: -22, y: 30, z: 75 }, radius: 19, labelRu: 'Стая ибисов ведёт над храмом Птаха', labelEn: 'Ibis flock guides above the Temple of Ptah', kind: 'checkpoint' },
          { id: 'ibis_lead_2', pos: { x: 22, y: 33, z: 5 }, radius: 19, labelRu: 'Между жаровнями, дымами и стрелами с верёвками', labelEn: 'Between braziers, smoke, and tethered arrows', kind: 'checkpoint' },
          { id: 'ibis_lead_3', pos: { x: -14, y: 34, z: -65 }, radius: 19, labelRu: 'Над каналами и набережной (не тревожь жрецов)', labelEn: 'Over canals and quays (spare the neutral watchers)', kind: 'checkpoint' },
          { id: 'memphis_exit', pos: { x: 0, y: 36, z: -135 }, radius: 22, labelRu: 'Выход к границе бури Сета', labelEn: 'Transition toward the storm of Set', kind: 'exit' },
        ],
      };

    case '1_7':
    default:
      return {
        sceneId: '1_7',
        spawnPos: { x: 0, y: 28, z: 115 },
        spawnYaw: 0,
        windVec: { x: 0, y: 0, z: 5.5 },
        minAltitude: 5,
        maxAltitude: 135,
        thermals: [
          { id: 'storm_updraft_1', pos: { x: -26, y: 10, z: 30 }, radius: 22, height: 95, lift: 11 },
          { id: 'storm_updraft_2', pos: { x: 26, y: 10, z: 10 }, radius: 22, height: 95, lift: 11 },
        ],
        waypoints: [
          { id: 'set_phase_1_gate', pos: { x: 0, y: 28, z: 48 }, radius: 20, labelRu: 'Фаза I: «Пустыня смотрит»', labelEn: 'Phase I: "The Desert Watches"', kind: 'checkpoint' },
          { id: 'set_phase_2_silence', pos: { x: 0, y: 58, z: -10 }, radius: 22, labelRu: 'Фаза II: «Штормовое лицо» — уйди в верхнюю тишину', labelEn: 'Phase II: "Storm Face" — climb to the upper silence', kind: 'checkpoint' },
          { id: 'set_phase_3_horus', pos: { x: 0, y: 36, z: -68 }, radius: 24, labelRu: 'Фаза III: «Тихий удар» — пропусти удар по знаку Гора', labelEn: 'Phase III: "Silent Strike" — yield at Horus’s wing sign', kind: 'horus' },
        ],
      };
  }
}

export function createInitialKinematics(sceneId: SceneId): GliderKinematics {
  const layout = createChapterLayout(sceneId);
  return {
    pos: { ...layout.spawnPos },
    yaw: layout.spawnYaw,
    pitch: 0.03,
    roll: 0,
    speed: 26,
    rudderAngle: 0,
    wingAngle: 0.05,
    surgeCooldown: 0,
    surgeTimer: 0,
    checkpointPos: { ...layout.spawnPos },
    checkpointYaw: layout.spawnYaw,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function wrapAngleRad(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export interface StepFlightResult {
  kinematics: GliderKinematics;
  inThermal: boolean;
  hitAvoidThermal: boolean;
  crashedToCheckpoint: boolean;
}

/**
 * Pure deterministic aerodynamic step for the Saqqara Falcon Glider.
 * Zero GC overhead when called by engine; returns updated kinematics state.
 */
export function stepFlightPhysics(
  prev: GliderKinematics,
  input: FlightInput,
  layout: ChapterMissionLayout,
  difficulty: DifficultyLevel,
  rawDt: number
): StepFlightResult {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const diffMult = getDifficultyMultiplier(difficulty);

  const hasManualTurn = input.turnLeft || input.turnRight || Math.abs(input.touchX ?? 0) > 0.05;
  const hasManualPitch = input.pitchUp || input.pitchDown || Math.abs(input.touchY ?? 0) > 0.05;
  const useCursorAim = Boolean(input.cursorAimActive && input.aimTargetDir && !hasManualTurn && !hasManualPitch);

  let rudderAngle: number;
  let pitch: number;
  let roll: number;

  if (useCursorAim && input.aimTargetDir) {
    const aim = input.aimTargetDir;
    const desiredYaw = Math.atan2(-aim.x, -aim.z);
    const yawDiff = wrapAngleRad(desiredYaw - prev.yaw);
    const targetRudder = clamp(yawDiff * 0.95, -0.55, 0.55);
    rudderAngle = damp(prev.rudderAngle, targetRudder, 8.5, dt);

    const desiredPitch = clamp(Math.asin(clamp(aim.y, -0.9, 0.9)), -0.52, 0.56);
    pitch = damp(prev.pitch, desiredPitch, 5.0, dt);
    roll = damp(prev.roll, rudderAngle * 0.9, 5.5, dt);
  } else {
    // Rudder & turn control (vertical tail fin)
    const turnAxis =
      (input.turnLeft ? 1 : 0) -
      (input.turnRight ? 1 : 0) -
      (input.touchX ?? 0);
    const targetRudder = clamp(turnAxis, -1, 1) * 0.55;
    rudderAngle = damp(prev.rudderAngle, targetRudder, 9, dt);

    // Pitch / wing angle of attack
    const pitchAxis =
      (input.pitchUp ? 1 : 0) -
      (input.pitchDown ? 1 : 0) +
      (input.touchY ?? 0);
    const targetPitch = clamp(prev.pitch + pitchAxis * 1.15 * dt, -0.58, 0.62);
    // Preserve current trajectory smoothly when cursor aim is toggled off (no abrupt snap)
    pitch = pitchAxis === 0 ? damp(prev.pitch, clamp(prev.pitch, -0.22, 0.28), 0.75, dt) : targetPitch;
    // Smooth roll leveling when transitioning from banked turn to free flight
    roll = damp(prev.roll, rudderAngle * 0.85, 3.8, dt);
  }

  const yawRate = rudderAngle * 1.95;
  const yaw = prev.yaw + yawRate * dt;
  const wingAngle = damp(prev.wingAngle, pitch * 0.6 + 0.05, 8, dt);

  // Wing Surge (Right-click / Space)
  let surgeCooldown = Math.max(0, prev.surgeCooldown - dt);
  let surgeTimer = Math.max(0, prev.surgeTimer - dt);
  let surgeBoost = 0;
  let surgeLift = 0;
  if (input.wingSurge && surgeCooldown <= 0) {
    surgeCooldown = 1.6;
    surgeTimer = 0.42;
  }
  if (surgeTimer > 0) {
    surgeBoost = 12;
    surgeLift = 8.5;
  }

  // Speed dynamics: diving accelerates, climbing/braking slows, stays above stall
  const baseCruise = input.brakeHold ? 18 : 27;
  const targetSpeed = clamp(baseCruise - Math.sin(pitch) * 14 + surgeBoost, 15, 46);
  const speed = damp(prev.speed, targetSpeed, 3.2, dt);

  // Check thermals
  let thermalLift = 0;
  let inThermal = false;
  let hitAvoidThermal = false;
  for (const t of layout.thermals) {
    const d = distXZ(prev.pos, t.pos);
    if (d <= t.radius && prev.pos.y >= t.pos.y - 4 && prev.pos.y <= t.pos.y + t.height) {
      if (t.avoid) {
        hitAvoidThermal = true;
      } else {
        inThermal = true;
        thermalLift += t.lift;
      }
    }
  }

  // Forward direction vector in Three.js (-Z when yaw=0)
  const fx = -Math.sin(yaw) * Math.cos(pitch);
  const fy = Math.sin(pitch);
  const fz = -Math.cos(yaw) * Math.cos(pitch);

  // Aerodynamic glide lift balances gravity at cruise speed; wind nudges subtly
  const glideLift = (speed / 26) * 1.4 - 1.25;
  const windFactor = 0.28 * diffMult;

  const nx = prev.pos.x + (fx * speed + layout.windVec.x * windFactor) * dt;
  const ny = clamp(
    prev.pos.y + (fy * speed * 0.85 + glideLift + thermalLift + surgeLift) * dt,
    0,
    layout.maxAltitude
  );
  const nz = prev.pos.z + (fz * speed + layout.windVec.z * windFactor) * dt;

  // Check ground/ceiling/world-bounds failure -> respawn at last checkpoint (failure is NOT death!)
  const outOfBounds = Math.abs(nx) > 220 || nz > 210 || nz < -260;
  const hitGround = ny <= layout.minAltitude;

  if (hitGround || outOfBounds) {
    return {
      kinematics: {
        ...prev,
        pos: { ...prev.checkpointPos },
        yaw: prev.checkpointYaw,
        pitch: 0.04,
        roll: 0,
        speed: 26,
        surgeTimer: 0,
      },
      inThermal: false,
      hitAvoidThermal: false,
      crashedToCheckpoint: true,
    };
  }

  return {
    kinematics: {
      ...prev,
      pos: { x: nx, y: ny, z: nz },
      yaw,
      pitch,
      roll,
      speed,
      rudderAngle,
      wingAngle,
      surgeCooldown,
      surgeTimer,
    },
    inThermal,
    hitAvoidThermal,
    crashedToCheckpoint: false,
  };
}

export function respawnAtCheckpoint(k: GliderKinematics): GliderKinematics {
  return {
    ...k,
    pos: { ...k.checkpointPos },
    yaw: k.checkpointYaw,
    pitch: 0.04,
    roll: 0,
    speed: 26,
    surgeTimer: 0,
  };
}
