export type SceneId =
  | '1_1'
  | '1_2'
  | '1_3'
  | '1_4'
  | '1_5'
  | '1_6'
  | '1_7'
  | 'hook_part_2'
  // Scaffold slots reserved for Parts 2-10 and Grand Finale
  | `${2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}_${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  | 'grand_ending';

export type SceneType =
  | 'text_graphics'
  | 'text_flight'
  | 'flight'
  | 'flight_boss'
  | 'hook_stub';

export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elvish'
  | 'orcish';

export type GraphicsQuality = 'low' | 'balanced' | 'high' | 'cinematic';
export type DifficultyLevel = 'pilgrim' | 'adept' | 'master';

export type BindableAction =
  | 'pitchUp'
  | 'pitchDown'
  | 'turnLeft'
  | 'turnRight'
  | 'wingSurge'
  | 'brakeHold'
  | 'toggleCursorAim'
  | 'resetCamera'
  | 'restartFlight'
  | 'pauseMenu';

export type InputCode = string; // e.g. 'KeyW', 'ArrowUp', 'MouseRight', 'MouseLeft', 'Space', 'KeyR'

export type KeyBindings = Record<BindableAction, InputCode>;

export interface DialogueEntry {
  id: string;
  speaker: string; // Empty string when purely stage direction
  stageDirection?: string;
  isStageOnly?: boolean;
  canonicalRu: string;
  en: string;
  translations?: Partial<Record<LanguageCode, string>>;
}

export interface GraphicInsert {
  id: string;
  titleRu: string;
  titleEn: string;
  captionRu: string;
  captionEn: string;
}

export interface SceneDefinition {
  id: SceneId;
  part: number;
  chapter: number;
  titleRu: string;
  titleEn: string;
  type: SceneType;
  nextId: SceneId | null;
  entryCondition: string;
  completionCriteria: string[];
  hasFlight: boolean;
  implemented: boolean;
}

export interface ShelfSlot {
  part: number;
  eraRu: string;
  eraEn: string;
  apparatusRu: string;
  apparatusEn: string;
  witnessRu: string;
  witnessEn: string;
  testimonyRu: string;
  testimonyEn: string;
  apparatusUnlocked: boolean;
  testimonyUnlocked: boolean;
  witnessNoteRu?: string;
}

export interface ChapterProgressFlags {
  // 1_1
  modelFound: boolean;
  linesPlayed1_1: number;
  graphicsViewed1_1: string[];
  // 1_2
  linesPlayed1_2: number;
  graphicsViewed1_2: string[];
  verifiedNodes1_2: {
    wing: boolean;
    weight: boolean;
    fin: boolean;
  };
  apparatusReady1: boolean;
  // 1_3
  preFlightLines1_3: number;
  takeoffDone1_3: boolean;
  borderPostsVisited1_3: number; // needs 2
  thermalDetourDone1_3: boolean;
  anomalyPassed1_3: boolean;
  portalActive1: boolean;
  // 1_4
  missions1_4: {
    thermals: boolean;
    boatSlalom: boolean;
    headwindFin: boolean;
  };
  // 1_5
  portalEntered1_5: boolean;
  starryTrailDone1_5: boolean;
  // 1_6
  memphisFriendFollowed1_6: boolean;
  memphisNeutralUntouched1_6: boolean;
  memphisHostilesCleared1_6: boolean;
  memphisTransitionReached1_6: boolean;
  // 1_7
  setPhase1Done: boolean;
  setPhase2Done: boolean;
  setPhase3Done: boolean;
  horusLinePlayed: boolean;
  witnessPlayed1: boolean;
  testimonyReceived1: boolean;
}

export interface GameSettings {
  language: LanguageCode;
  graphics: GraphicsQuality;
  difficulty: DifficultyLevel;
  musicVolume: number;
  sfxVolume: number;
  touchControls: boolean;
  bindings: KeyBindings;
}

export interface PersistedGameState {
  version: number;
  currentSceneId: SceneId;
  unlockedChapters: SceneId[];
  completedScenes: SceneId[];
  activeFlightRunId: number;
  flags: ChapterProgressFlags;
  shelf: ShelfSlot[];
  settings: GameSettings;
}

export interface HudFlightState {
  sceneId: SceneId;
  altitude: number;
  speed: number;
  headingDeg: number;
  windStrength: number;
  rudderAngleDeg: number;
  wingAngleDeg: number;
  checkpointIndex: number;
  totalCheckpoints: number;
  subMissionIndex: number;
  subMissionTotal: number;
  taskLabel: string;
  taskDetail: string;
  modelCardNote: string | null;
  activeDialogue: {
    speaker: string;
    text: string;
    stage?: string;
  } | null;
  checkpointFlash: string | null;
  bossPhase: 0 | 1 | 2 | 3;
  bossName: string | null;
  bossSilenceWindow: boolean;
  inThermal: boolean;
  nearAnomaly: boolean;
  nearPortal: boolean;
  offTrailWarning: boolean;
  hostileAlert: boolean;
  canAdvanceScene: boolean;
  flightRunId: number;
  cursorAimEnabled: boolean;
}
