import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChapterLayout,
  createInitialKinematics,
  FlightInput,
  stepFlightPhysics,
} from './flightPhysics';

const NEUTRAL_INPUT: FlightInput = {
  pitchUp: false,
  pitchDown: false,
  turnLeft: false,
  turnRight: false,
  wingSurge: false,
  brakeHold: false,
};

test('Glider survives first 3 seconds without input (stable glide)', () => {
  const layout = createChapterLayout('1_3');
  let k = createInitialKinematics('1_3');
  let crashed = false;

  for (let i = 0; i < 90; i++) {
    const res = stepFlightPhysics(k, NEUTRAL_INPUT, layout, 'adept', 1 / 30);
    k = res.kinematics;
    if (res.crashedToCheckpoint) crashed = true;
  }

  assert.equal(crashed, false);
  assert.ok(k.pos.z < layout.spawnPos.z, 'Glider should move forward toward North (-Z)');
  assert.ok(k.pos.y > layout.minAltitude + 4, 'Glider should remain safely airborne');
});

test('Rudder left/right deflects vertical fin and changes yaw', () => {
  const layout = createChapterLayout('1_4');
  let k = createInitialKinematics('1_4');
  const startYaw = k.yaw;

  for (let i = 0; i < 30; i++) {
    k = stepFlightPhysics(k, { ...NEUTRAL_INPUT, turnLeft: true }, layout, 'adept', 1 / 30).kinematics;
  }
  assert.ok(k.rudderAngle > 0.1, 'Vertical tail fin should deflect');
  assert.ok(k.yaw > startYaw + 0.2, 'Glider yaw should turn left');
});

test('Hitting ground returns glider to last checkpoint without permadeath', () => {
  const layout = createChapterLayout('1_3');
  let k = createInitialKinematics('1_3');
  k.checkpointPos = { x: -18, y: 30, z: 0 };
  k.pos = { x: -10, y: 2.4, z: -20 };

  const res = stepFlightPhysics(k, { ...NEUTRAL_INPUT, pitchDown: true }, layout, 'adept', 1 / 30);
  assert.equal(res.crashedToCheckpoint, true);
  assert.deepEqual(res.kinematics.pos, { x: -18, y: 30, z: 0 });
});

test('Wing Surge (Right-Click / Space) provides lift and speed burst', () => {
  const layout = createChapterLayout('1_7');
  let k = createInitialKinematics('1_7');
  const startY = k.pos.y;

  const res = stepFlightPhysics(k, { ...NEUTRAL_INPUT, wingSurge: true }, layout, 'adept', 1 / 30);
  assert.ok(res.kinematics.surgeTimer > 0);
  assert.ok(res.kinematics.pos.y > startY);
});

test('Cursor Aim mode steers glider pitch and yaw smoothly toward raycast target direction', () => {
  const layout = createChapterLayout('1_4');
  let k = createInitialKinematics('1_4');
  // Aim toward upper-left (-X, +Y, -Z normalized)
  const len = Math.hypot(-0.55, 0.35, -0.76);
  const aimDir = { x: -0.55 / len, y: 0.35 / len, z: -0.76 / len };

  for (let i = 0; i < 30; i++) {
    k = stepFlightPhysics(
      k,
      { ...NEUTRAL_INPUT, cursorAimActive: true, aimTargetDir: aimDir },
      layout,
      'adept',
      1 / 30
    ).kinematics;
  }

  assert.ok(k.yaw > 0.2, 'Glider should yaw left toward cursor aim direction');
  assert.ok(k.pitch > 0.15, 'Glider should pitch up toward cursor aim direction');
  assert.ok(k.roll > 0.1, 'Glider should bank smoothly into the cursor turn');
});

test('Disabling Cursor Aim preserves velocity and levels roll smoothly without abrupt jumps', () => {
  const layout = createChapterLayout('1_4');
  let k = createInitialKinematics('1_4');
  k.roll = 0.42;
  k.pitch = 0.18;
  k.speed = 31;

  const step1 = stepFlightPhysics(k, { ...NEUTRAL_INPUT, cursorAimActive: false }, layout, 'adept', 1 / 30).kinematics;
  assert.ok(Math.abs(step1.roll - 0.42) < 0.08, 'Roll should level gradually without snapping');
  assert.ok(step1.roll < 0.42 && step1.roll > 0.3, 'Roll should decrease smoothly over one frame');
  assert.ok(Math.abs(step1.speed - 31) < 1.0, 'Speed should preserve momentum smoothly');
  assert.ok(Math.abs(step1.pitch - 0.18) < 0.03, 'Pitch should not snap abruptly on F release');
});
