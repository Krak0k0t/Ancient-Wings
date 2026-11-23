import { createInitialShelf } from '../story/part1';
import {
  ChapterProgressFlags,
  GameSettings,
  KeyBindings,
  PersistedGameState,
  SceneDefinition,
  SceneId,
} from '../types/game';

export const AUTOSAVE_STORAGE_KEY = 'ancient_wings_save_v1';

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  pitchUp: 'KeyW',
  pitchDown: 'KeyS',
  turnLeft: 'KeyA',
  turnRight: 'KeyD',
  wingSurge: 'MouseRight',
  brakeHold: 'ShiftLeft',
  toggleCursorAim: 'KeyF',
  resetCamera: 'KeyC',
  restartFlight: 'KeyR',
  pauseMenu: 'Escape',
};

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'en', // Initial interface language: English (per Intructions_0)
  graphics: 'high',
  difficulty: 'adept',
  musicVolume: 0.65,
  sfxVolume: 0.8,
  touchControls: false,
  bindings: { ...DEFAULT_KEY_BINDINGS },
};

// Unified scenes array: Part 1 (1_1 .. 1_7) + hook_part_2
// Designed as the canonical 10-part scaffold; Parts 2..10 plug directly into this array.
export const SCENES: SceneDefinition[] = [
  {
    id: '1_1',
    part: 1,
    chapter: 1,
    titleRu: 'Глава 1 · Раскопки',
    titleEn: 'Chapter 1 · Excavation',
    type: 'text_graphics',
    nextId: '1_2',
    entryCondition: 'Часть 1 начата, аппарат ещё не найден',
    completionCriteria: [
      'Модель найдена',
      'Реплики 1–9 отыграны',
      'Графические вставки показаны',
    ],
    hasFlight: false,
    implemented: true,
  },
  {
    id: '1_2',
    part: 1,
    chapter: 2,
    titleRu: 'Глава 2 · Исследование и создание',
    titleEn: 'Chapter 2 · Study & Construction',
    type: 'text_graphics',
    nextId: '1_3',
    entryCondition: 'Глава 1 завершена',
    completionCriteria: [
      'Реплики 1–5 отыграны',
      'Графические вставки показаны',
      'Три узла (крыло, вес, плавник-руль) подтверждены',
      'Аппарат построен',
    ],
    hasFlight: false,
    implemented: true,
  },
  {
    id: '1_3',
    part: 1,
    chapter: 3,
    titleRu: 'Глава 3 · Испытания',
    titleEn: 'Chapter 3 · Trials',
    type: 'text_flight',
    nextId: '1_4',
    entryCondition: 'Аппарат готов к взлёту',
    completionCriteria: [
      'Реплики перед полётом отыграны',
      'Взлёт выполнен против северного ветра',
      'Маршрут пройден по обеим карточкам постов (дважды мимо двух постов + обход тёплого потока)',
      'Аномалия пройдена',
      'Портал над Нилом активен',
    ],
    hasFlight: true,
    implemented: true,
  },
  {
    id: '1_4',
    part: 1,
    chapter: 4,
    titleRu: 'Глава 4 · Полёты в реальном времени',
    titleEn: 'Chapter 4 · Real-Time Flights',
    type: 'flight',
    nextId: '1_5',
    entryCondition: 'Портал активен, аппарат откалиброван',
    completionCriteria: [
      'Миссия 1: трасса вдоль Нила через термики',
      'Миссия 2: слалом между ладьями',
      'Миссия 3: трасса против ветра (проверка плавника-руля)',
    ],
    hasFlight: true,
    implemented: true,
  },
  {
    id: '1_5',
    part: 1,
    chapter: 5,
    titleRu: 'Глава 5 · Портал в псевдо-эпоху',
    titleEn: 'Chapter 5 · Portal to the Pseudo-Era',
    type: 'flight',
    nextId: '1_6',
    entryCondition: 'Глава 4 завершена и портал активен',
    completionCriteria: [
      'Переход через портал выполнен',
      'Навигационный полёт по звёздному следу пройден до живого города',
    ],
    hasFlight: true,
    implemented: true,
  },
  {
    id: '1_6',
    part: 1,
    chapter: 6,
    titleRu: 'Глава 6 · Историческая эпоха',
    titleEn: 'Chapter 6 · Historical Era (Memphis)',
    type: 'flight',
    nextId: '1_7',
    entryCondition: 'Глава 5 завершена',
    completionCriteria: [
      'Враждебные отрезаны от контакта',
      'Нейтральные не задеты',
      'Дружелюбная стая ибисов показала путь до перехода к Главе 7',
    ],
    hasFlight: true,
    implemented: true,
  },
  {
    id: '1_7',
    part: 1,
    chapter: 7,
    titleRu: 'Глава 7 · Босс и Свидетель',
    titleEn: 'Chapter 7 · Boss & Witness',
    type: 'flight_boss',
    nextId: 'hook_part_2',
    entryCondition: 'Глава 6 завершена',
    completionCriteria: [
      'Три фазы боя с Сетом пройдены',
      'Реплика Гора отыграна',
      'Свидетель (Сокол) отыгран',
      'Показание (кусок глины) и модель на стеллаже получены',
    ],
    hasFlight: true,
    implemented: true,
  },
  {
    id: 'hook_part_2',
    part: 2,
    chapter: 0,
    titleRu: 'ЧАСТЬ 2: скоро',
    titleEn: 'PART 2: Coming Soon',
    type: 'hook_stub',
    nextId: null,
    entryCondition: 'Часть 1 завершена',
    completionCriteria: [],
    hasFlight: false,
    implemented: true,
  },
];

export function createInitialFlags(): ChapterProgressFlags {
  return {
    modelFound: false,
    linesPlayed1_1: 0,
    graphicsViewed1_1: [],

    linesPlayed1_2: 0,
    graphicsViewed1_2: [],
    verifiedNodes1_2: { wing: false, weight: false, fin: false },
    apparatusReady1: false,

    preFlightLines1_3: 0,
    takeoffDone1_3: false,
    borderPostsVisited1_3: 0,
    thermalDetourDone1_3: false,
    anomalyPassed1_3: false,
    portalActive1: false,

    missions1_4: {
      thermals: false,
      boatSlalom: false,
      headwindFin: false,
    },

    portalEntered1_5: false,
    starryTrailDone1_5: false,

    memphisFriendFollowed1_6: false,
    memphisNeutralUntouched1_6: true,
    memphisHostilesCleared1_6: false,
    memphisTransitionReached1_6: false,

    setPhase1Done: false,
    setPhase2Done: false,
    setPhase3Done: false,
    horusLinePlayed: false,
    witnessPlayed1: false,
    testimonyReceived1: false,
  };
}

export const PLAYABLE_CHAPTER_ORDER: SceneId[] = [
  '1_1',
  '1_2',
  '1_3',
  '1_4',
  '1_5',
  '1_6',
  '1_7',
  'hook_part_2',
];

export function normalizeUnlockedChapters(
  unlocked: SceneId[] | undefined,
  currentSceneId: SceneId,
  completedScenes: SceneId[]
): SceneId[] {
  const set = new Set<SceneId>(['1_1']);
  let highestIdx = PLAYABLE_CHAPTER_ORDER.indexOf(currentSceneId);
  for (const id of completedScenes) {
    set.add(id);
    const idx = PLAYABLE_CHAPTER_ORDER.indexOf(id);
    if (idx > highestIdx) highestIdx = idx;
  }
  if (Array.isArray(unlocked)) {
    for (const id of unlocked) {
      if (getSceneDefinition(id)) {
        set.add(id);
      }
    }
  }
  if (getSceneDefinition(currentSceneId)) {
    set.add(currentSceneId);
  }
  // Also unlock chapters up through highest reached chapter for clean backward save migration
  for (let i = 0; i <= highestIdx; i++) {
    set.add(PLAYABLE_CHAPTER_ORDER[i]);
  }
  return PLAYABLE_CHAPTER_ORDER.filter((id) => set.has(id));
}

export function createInitialGameState(): PersistedGameState {
  return {
    version: 1,
    currentSceneId: '1_1',
    unlockedChapters: ['1_1'],
    completedScenes: [],
    activeFlightRunId: 1,
    flags: createInitialFlags(),
    shelf: createInitialShelf(),
    settings: {
      ...DEFAULT_SETTINGS,
      bindings: { ...DEFAULT_KEY_BINDINGS },
    },
  };
}

export function getSceneDefinition(id: SceneId): SceneDefinition | undefined {
  return SCENES.find((s) => s.id === id);
}

export function isChapterUnlocked(state: PersistedGameState, targetId: SceneId): boolean {
  return (
    targetId === state.currentSceneId ||
    state.unlockedChapters.includes(targetId) ||
    state.completedScenes.includes(targetId)
  );
}

export function unlockChaptersThrough(
  state: PersistedGameState,
  targetId: SceneId
): PersistedGameState {
  const idx = PLAYABLE_CHAPTER_ORDER.indexOf(targetId);
  if (idx < 0) return state;
  const set = new Set<SceneId>(state.unlockedChapters);
  for (let i = 0; i <= idx; i++) {
    set.add(PLAYABLE_CHAPTER_ORDER[i]);
  }
  return {
    ...state,
    unlockedChapters: PLAYABLE_CHAPTER_ORDER.filter((id) => set.has(id)),
  };
}

/**
 * Verifies every completion checklist requirement for the given scene.
 */
export function isSceneComplete(state: PersistedGameState, sceneId: SceneId = state.currentSceneId): boolean {
  const f = state.flags;
  switch (sceneId) {
    case '1_1':
      return f.modelFound && f.linesPlayed1_1 >= 9 && f.graphicsViewed1_1.length >= 3;
    case '1_2':
      return (
        f.linesPlayed1_2 >= 5 &&
        f.graphicsViewed1_2.length >= 3 &&
        f.verifiedNodes1_2.wing &&
        f.verifiedNodes1_2.weight &&
        f.verifiedNodes1_2.fin &&
        f.apparatusReady1
      );
    case '1_3':
      return (
        f.preFlightLines1_3 >= 3 &&
        f.takeoffDone1_3 &&
        f.borderPostsVisited1_3 >= 2 &&
        f.thermalDetourDone1_3 &&
        f.anomalyPassed1_3 &&
        f.portalActive1
      );
    case '1_4':
      return f.missions1_4.thermals && f.missions1_4.boatSlalom && f.missions1_4.headwindFin;
    case '1_5':
      return f.portalActive1 && f.portalEntered1_5 && f.starryTrailDone1_5;
    case '1_6':
      return (
        f.memphisFriendFollowed1_6 &&
        f.memphisNeutralUntouched1_6 &&
        f.memphisHostilesCleared1_6 &&
        f.memphisTransitionReached1_6
      );
    case '1_7':
      return (
        f.setPhase1Done &&
        f.setPhase2Done &&
        f.setPhase3Done &&
        f.horusLinePlayed &&
        f.witnessPlayed1 &&
        f.testimonyReceived1 &&
        Boolean(state.shelf[0]?.apparatusUnlocked) &&
        Boolean(state.shelf[0]?.testimonyUnlocked)
      );
    case 'hook_part_2':
      return false;
    default:
      return false;
  }
}

/**
 * Activates the Nile Water-Glass Portal once the Chapter 3 vertical shadow anomaly is traversed.
 */
export function activateAnomalyPortal(state: PersistedGameState): PersistedGameState {
  if (state.flags.anomalyPassed1_3 && state.flags.portalActive1) return state;
  return {
    ...state,
    flags: {
      ...state.flags,
      anomalyPassed1_3: true,
      portalActive1: true,
    },
  };
}

/**
 * Records Part 1 completion onto Shelf Slot 1 (Saqqara Falcon Glider + Clay fragment).
 */
export function recordPart1Completion(state: PersistedGameState): PersistedGameState {
  const nextShelf = state.shelf.map((slot) =>
    slot.part === 1
      ? {
          ...slot,
          apparatusUnlocked: true,
          testimonyUnlocked: true,
          witnessNoteRu: 'В показаниях Свидетеля нет имени: только крыло, глина и звёздный след над Нилом.',
        }
      : slot
  );
  return {
    ...state,
    flags: {
      ...state.flags,
      witnessPlayed1: true,
      testimonyReceived1: true,
    },
    shelf: nextShelf,
  };
}

/**
 * Strict transition handler `nextScene(id)`:
 * - Only transitions when the current scene satisfies all completion conditions.
 * - Enforces exact fixed sequence (1_1 -> 1_2 -> 1_3 -> 1_4 -> 1_5 -> 1_6 -> 1_7 -> hook_part_2).
 * - Never triggers victory screens, timers, or auto-menu.
 */
export function nextScene(state: PersistedGameState, targetId: SceneId): PersistedGameState {
  const currentDef = getSceneDefinition(state.currentSceneId);
  if (!currentDef) return state;
  if (currentDef.nextId !== targetId) {
    return state;
  }
  if (!isSceneComplete(state, state.currentSceneId)) {
    return state;
  }
  const targetDef = getSceneDefinition(targetId);
  if (!targetDef) return state;

  // Enforce anomaly->portal prerequisite for Chapter 5
  if (targetId === '1_5' && !state.flags.portalActive1) {
    return state;
  }

  const completedSet = new Set(state.completedScenes);
  completedSet.add(state.currentSceneId);
  const unlocked = normalizeUnlockedChapters(
    [...state.unlockedChapters, state.currentSceneId, targetId],
    targetId,
    Array.from(completedSet)
  );

  return {
    ...state,
    currentSceneId: targetId,
    unlockedChapters: unlocked,
    completedScenes: Array.from(completedSet),
    activeFlightRunId: state.activeFlightRunId + 1,
  };
}

/**
 * Chapter Select handler:
 * - Only allows jumping to unlocked or previously completed scenes.
 * - Initializes the entry state and resets ONLY that chapter's active flight/combat step flags
 *   so replaying a chapter starts cleanly from its entry conditions.
 * - Protects overall progress: never wipes unlockedChapters, completedScenes, or Shelf rewards.
 */
export function selectChapter(state: PersistedGameState, targetId: SceneId): PersistedGameState {
  const targetDef = getSceneDefinition(targetId);
  if (!targetDef || !isChapterUnlocked(state, targetId)) {
    return state;
  }

  const targetIdx = PLAYABLE_CHAPTER_ORDER.indexOf(targetId);
  const baseFlags = createInitialFlags();

  // Populate entry prerequisites from chapters prior to targetId
  if (targetIdx > 0) {
    baseFlags.modelFound = true;
    baseFlags.linesPlayed1_1 = 9;
    baseFlags.graphicsViewed1_1 = ['g_1_1_intact', 'g_1_1_halves', 'g_1_1_note'];
  }
  if (targetIdx > 1) {
    baseFlags.linesPlayed1_2 = 5;
    baseFlags.graphicsViewed1_2 = ['g_1_2_fin', 'g_1_2_candle', 'g_1_2_glider'];
    baseFlags.verifiedNodes1_2 = { wing: true, weight: true, fin: true };
    baseFlags.apparatusReady1 = true;
  }
  if (targetIdx > 2) {
    baseFlags.preFlightLines1_3 = 3;
    baseFlags.takeoffDone1_3 = true;
    baseFlags.borderPostsVisited1_3 = 2;
    baseFlags.thermalDetourDone1_3 = true;
    baseFlags.anomalyPassed1_3 = true;
    baseFlags.portalActive1 = true;
  }
  if (targetIdx > 3) {
    baseFlags.missions1_4 = { thermals: true, boatSlalom: true, headwindFin: true };
  }
  if (targetIdx > 4) {
    baseFlags.portalEntered1_5 = true;
    baseFlags.starryTrailDone1_5 = true;
  }
  if (targetIdx > 5) {
    baseFlags.memphisFriendFollowed1_6 = true;
    baseFlags.memphisNeutralUntouched1_6 = true;
    baseFlags.memphisHostilesCleared1_6 = true;
    baseFlags.memphisTransitionReached1_6 = true;
  }
  if (targetIdx > 6) {
    baseFlags.setPhase1Done = true;
    baseFlags.setPhase2Done = true;
    baseFlags.setPhase3Done = true;
    baseFlags.horusLinePlayed = true;
    baseFlags.witnessPlayed1 = true;
    baseFlags.testimonyReceived1 = true;
  }

  const unlocked = normalizeUnlockedChapters(
    state.unlockedChapters,
    state.currentSceneId,
    state.completedScenes
  );

  return {
    ...state,
    currentSceneId: targetId,
    unlockedChapters: unlocked.includes(targetId)
      ? unlocked
      : normalizeUnlockedChapters([...unlocked, targetId], targetId, state.completedScenes),
    // Protect completedScenes & shelf rewards!
    completedScenes: [...state.completedScenes],
    shelf: state.shelf.map((slot) => ({ ...slot })),
    activeFlightRunId: state.activeFlightRunId + 1,
    flags: baseFlags,
  };
}

/**
 * Key [R] handler: restarts ONLY the current flight run, preserving chapter progress,
 * story lines already completed, shelf items, and portal triggers.
 */
export function restartCurrentFlight(state: PersistedGameState): PersistedGameState {
  const currentDef = getSceneDefinition(state.currentSceneId);
  if (!currentDef || !currentDef.hasFlight) {
    return state;
  }
  return {
    ...state,
    activeFlightRunId: state.activeFlightRunId + 1,
  };
}

export function saveGameState(state: PersistedGameState, storage?: Storage): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;
    store.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode issues cleanly
  }
}

export function loadGameState(storage?: Storage): PersistedGameState {
  const fallback = createInitialGameState();
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return fallback;
    const raw = store.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedGameState>;
    if (!parsed || typeof parsed !== 'object') return fallback;

    const validScene = getSceneDefinition(parsed.currentSceneId as SceneId)?.id ?? '1_1';
    const completedScenes = Array.isArray(parsed.completedScenes) ? parsed.completedScenes : [];
    const unlockedChapters = normalizeUnlockedChapters(
      parsed.unlockedChapters,
      validScene,
      completedScenes
    );
    return {
      version: 1,
      currentSceneId: validScene,
      unlockedChapters,
      completedScenes,
      activeFlightRunId: typeof parsed.activeFlightRunId === 'number' ? parsed.activeFlightRunId : 1,
      flags: {
        ...createInitialFlags(),
        ...(parsed.flags ?? {}),
        verifiedNodes1_2: {
          ...createInitialFlags().verifiedNodes1_2,
          ...(parsed.flags?.verifiedNodes1_2 ?? {}),
        },
        missions1_4: {
          ...createInitialFlags().missions1_4,
          ...(parsed.flags?.missions1_4 ?? {}),
        },
      },
      shelf: Array.isArray(parsed.shelf) && parsed.shelf.length === 10 ? parsed.shelf : createInitialShelf(),
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        bindings: {
          ...DEFAULT_KEY_BINDINGS,
          ...(parsed.settings?.bindings ?? {}),
        },
      },
    };
  } catch {
    return fallback;
  }
}
