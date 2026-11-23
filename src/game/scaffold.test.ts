import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activateAnomalyPortal,
  createInitialGameState,
  isSceneComplete,
  loadGameState,
  nextScene,
  recordPart1Completion,
  restartCurrentFlight,
  saveGameState,
  SCENES,
  selectChapter,
} from './scaffold';

test('SCENES registry contains 1_1 through 1_7 plus hook_part_2 in strict order', () => {
  assert.deepEqual(
    SCENES.map((s) => s.id),
    ['1_1', '1_2', '1_3', '1_4', '1_5', '1_6', '1_7', 'hook_part_2']
  );
  assert.equal(createInitialGameState().shelf.length, 10);
});

test('nextScene refuses transition when checklist is incomplete or order is skipped', () => {
  const state = createInitialGameState();
  // Cannot jump from 1_1 to 1_3
  assert.equal(nextScene(state, '1_3').currentSceneId, '1_1');
  // Cannot advance from 1_1 to 1_2 while incomplete
  assert.equal(nextScene(state, '1_2').currentSceneId, '1_1');

  // Complete 1_1 checklist
  state.flags.modelFound = true;
  state.flags.linesPlayed1_1 = 9;
  state.flags.graphicsViewed1_1 = ['g_1_1_intact', 'g_1_1_halves', 'g_1_1_note'];
  assert.equal(isSceneComplete(state, '1_1'), true);

  const after1 = nextScene(state, '1_2');
  assert.equal(after1.currentSceneId, '1_2');
  assert.ok(after1.completedScenes.includes('1_1'));
});

test('Chapter 1_2 requires all 3 node verifications (wing, weight, fin) before unlocking 1_3', () => {
  let state = createInitialGameState();
  state.currentSceneId = '1_2';
  state.flags.linesPlayed1_2 = 5;
  state.flags.graphicsViewed1_2 = ['g_1_2_fin', 'g_1_2_candle', 'g_1_2_glider'];
  state.flags.verifiedNodes1_2 = { wing: true, weight: true, fin: false };
  state.flags.apparatusReady1 = false;
  assert.equal(nextScene(state, '1_3').currentSceneId, '1_2');

  state.flags.verifiedNodes1_2.fin = true;
  state.flags.apparatusReady1 = true;
  state = nextScene(state, '1_3');
  assert.equal(state.currentSceneId, '1_3');
});

test('Chapter 1_3 anomaly activates Nile portal and gates Chapter 1_5', () => {
  let state = createInitialGameState();
  state.currentSceneId = '1_3';
  state.flags.preFlightLines1_3 = 3;
  state.flags.takeoffDone1_3 = true;
  state.flags.borderPostsVisited1_3 = 2;
  state.flags.thermalDetourDone1_3 = true;
  // Anomaly not passed yet -> cannot finish 1_3
  assert.equal(isSceneComplete(state, '1_3'), false);

  state = activateAnomalyPortal(state);
  assert.equal(state.flags.anomalyPassed1_3, true);
  assert.equal(state.flags.portalActive1, true);
  assert.equal(isSceneComplete(state, '1_3'), true);

  state = nextScene(state, '1_4');
  assert.equal(state.currentSceneId, '1_4');

  // Complete 1_4 -> 1_5 requires portalActive1
  state.flags.missions1_4 = { thermals: true, boatSlalom: true, headwindFin: true };
  state = nextScene(state, '1_5');
  assert.equal(state.currentSceneId, '1_5');
});

test('[R] restartCurrentFlight restarts ONLY flight run ID without wiping chapter or shelf', () => {
  let state = createInitialGameState();
  state.currentSceneId = '1_4';
  state.flags.portalActive1 = true;
  state.flags.missions1_4.thermals = true;
  const runBefore = state.activeFlightRunId;

  state = restartCurrentFlight(state);
  assert.equal(state.currentSceneId, '1_4');
  assert.equal(state.activeFlightRunId, runBefore + 1);
  assert.equal(state.flags.portalActive1, true);
  assert.equal(state.flags.missions1_4.thermals, true);

  // [R] on text chapter 1_1 is a no-op
  const textState = createInitialGameState();
  assert.equal(restartCurrentFlight(textState).activeFlightRunId, textState.activeFlightRunId);
});

test('Chapter 1_7 completion records Clay testimony & glider onto Shelf Slot 1 and unlocks hook_part_2', () => {
  let state = createInitialGameState();
  state.currentSceneId = '1_7';
  state.flags.setPhase1Done = true;
  state.flags.setPhase2Done = true;
  state.flags.setPhase3Done = true;
  state.flags.horusLinePlayed = true;
  assert.equal(isSceneComplete(state, '1_7'), false);

  state = recordPart1Completion(state);
  assert.equal(state.shelf[0].apparatusUnlocked, true);
  assert.equal(state.shelf[0].testimonyUnlocked, true);
  assert.equal(isSceneComplete(state, '1_7'), true);

  state = nextScene(state, 'hook_part_2');
  assert.equal(state.currentSceneId, 'hook_part_2');
});

test('Autosave roundtrips currentSceneId, flags, settings, and shelf through Storage', () => {
  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  let state = createInitialGameState();
  state.currentSceneId = '1_5';
  state.flags.portalActive1 = true;
  state.settings.language = 'ru';
  state.settings.graphics = 'cinematic';
  saveGameState(state, mockStorage);

  const loaded = loadGameState(mockStorage);
  assert.equal(loaded.currentSceneId, '1_5');
  assert.equal(loaded.flags.portalActive1, true);
  assert.equal(loaded.settings.language, 'ru');
  assert.equal(loaded.settings.graphics, 'cinematic');
  assert.deepEqual(loaded.unlockedChapters, ['1_1', '1_2', '1_3', '1_4', '1_5']);
});

test('Chapter Select tracks unlockedChapters automatically via nextScene and rejects locked chapters', () => {
  let state = createInitialGameState();
  assert.deepEqual(state.unlockedChapters, ['1_1']);

  // Cannot select locked chapter 1_3
  const attempted = selectChapter(state, '1_3');
  assert.equal(attempted.currentSceneId, '1_1');

  // Complete 1_1 and advance to 1_2
  state.flags.modelFound = true;
  state.flags.linesPlayed1_1 = 9;
  state.flags.graphicsViewed1_1 = ['g_1_1_intact', 'g_1_1_halves', 'g_1_1_note'];
  state = nextScene(state, '1_2');
  assert.deepEqual(state.unlockedChapters, ['1_1', '1_2']);
  assert.deepEqual(state.completedScenes, ['1_1']);
});

test('selectChapter initializes entry conditions cleanly and preserves completedScenes, unlockedChapters, and shelf rewards', () => {
  let state = createInitialGameState();
  state.currentSceneId = 'hook_part_2';
  state.unlockedChapters = ['1_1', '1_2', '1_3', '1_4', '1_5', '1_6', '1_7', 'hook_part_2'];
  state.completedScenes = ['1_1', '1_2', '1_3', '1_4', '1_5', '1_6', '1_7'];
  state = recordPart1Completion(state);
  state.flags.setPhase1Done = true;
  state.flags.setPhase2Done = true;
  state.flags.setPhase3Done = true;
  state.flags.horusLinePlayed = true;

  // Replay Chapter 1_7: Set boss flags reset to replay, entry prerequisites stay valid, shelf & unlocks stay intact!
  const replaying7 = selectChapter(state, '1_7');
  assert.equal(replaying7.currentSceneId, '1_7');
  assert.equal(replaying7.flags.apparatusReady1, true);
  assert.equal(replaying7.flags.portalActive1, true);
  assert.equal(replaying7.flags.setPhase1Done, false);
  assert.equal(replaying7.flags.setPhase2Done, false);
  assert.equal(replaying7.flags.setPhase3Done, false);
  assert.equal(replaying7.shelf[0].apparatusUnlocked, true);
  assert.equal(replaying7.shelf[0].testimonyUnlocked, true);
  assert.ok(replaying7.unlockedChapters.includes('hook_part_2'));
  assert.ok(replaying7.completedScenes.includes('1_7'));

  // Replay Chapter 1_3: anomaly/flight flags reset cleanly, while 1_7 + shelf stay protected!
  const replaying3 = selectChapter(replaying7, '1_3');
  assert.equal(replaying3.currentSceneId, '1_3');
  assert.equal(replaying3.flags.apparatusReady1, true);
  assert.equal(replaying3.flags.takeoffDone1_3, false);
  assert.equal(replaying3.flags.anomalyPassed1_3, false);
  assert.equal(replaying3.shelf[0].apparatusUnlocked, true);
  assert.ok(replaying3.unlockedChapters.includes('1_7'));
});

