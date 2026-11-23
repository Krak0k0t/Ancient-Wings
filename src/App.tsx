/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { BookSpreadScene } from './components/BookSpreadScene';
import { ChapterSelectModal } from './components/ChapterSelectModal';
import { FlightHud } from './components/FlightHud';
import { MainMenu } from './components/MainMenu';
import { PreFlightDialogueModal } from './components/PreFlightDialogueModal';
import { SettingsModal } from './components/SettingsModal';
import { ShelfCatalogModal } from './components/ShelfCatalogModal';
import { FlightEngine } from './engine/FlightEngine';
import {
  activateAnomalyPortal,
  createInitialGameState,
  getSceneDefinition,
  isSceneComplete,
  loadGameState,
  nextScene,
  recordPart1Completion,
  restartCurrentFlight,
  saveGameState,
  selectChapter,
  unlockChaptersThrough,
} from './game/scaffold';
import {
  GameSettings,
  HudFlightState,
  LanguageCode,
  PersistedGameState,
  SceneId,
} from './types/game';

type AppScreenMode = 'menu' | 'transition' | 'active';

function createInitialHud(sceneId: SceneId, runId: number): HudFlightState {
  return {
    sceneId,
    altitude: 14,
    speed: 25,
    headingDeg: 0,
    windStrength: 5,
    rudderAngleDeg: 0,
    wingAngleDeg: 3,
    checkpointIndex: 0,
    totalCheckpoints: 6,
    subMissionIndex: 1,
    subMissionTotal: 3,
    taskLabel: '',
    taskDetail: '',
    modelCardNote: null,
    activeDialogue: null,
    checkpointFlash: null,
    bossPhase: sceneId === '1_7' ? 1 : 0,
    bossName: null,
    bossSilenceWindow: false,
    inThermal: false,
    nearAnomaly: false,
    nearPortal: false,
    offTrailWarning: false,
    hostileAlert: false,
    canAdvanceScene: false,
    flightRunId: runId,
    cursorAimEnabled: true,
  };
}

function parseBootstrapParams(): { autostart: boolean; targetScene: SceneId | null } {
  if (typeof window === 'undefined') return { autostart: false, targetScene: null };
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const rawScene = params.get('scene') as SceneId | null;
  const targetScene = rawScene && getSceneDefinition(rawScene) ? rawScene : null;
  return { autostart, targetScene };
}

function buildBootstrappedState(): {
  initialState: PersistedGameState;
  initialScreen: AppScreenMode;
  initialPreFlightLaunched: boolean;
} {
  const { autostart, targetScene } = parseBootstrapParams();
  let state = loadGameState();

  if (
    typeof window !== 'undefined' &&
    !window.localStorage.getItem('ancient_wings_save_v1') &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    state = {
      ...state,
      settings: {
        ...state.settings,
        touchControls: true,
      },
    };
  }

  if (targetScene) {
    state = unlockChaptersThrough(state, targetScene);
    state = {
      ...state,
      currentSceneId: targetScene,
      flags: {
        ...state.flags,
        modelFound: true,
        linesPlayed1_1: targetScene !== '1_1' ? 9 : state.flags.linesPlayed1_1,
        graphicsViewed1_1:
          targetScene !== '1_1' ? ['g_1_1_intact', 'g_1_1_halves', 'g_1_1_note'] : state.flags.graphicsViewed1_1,
        linesPlayed1_2: targetScene !== '1_1' && targetScene !== '1_2' ? 5 : state.flags.linesPlayed1_2,
        graphicsViewed1_2:
          targetScene !== '1_1' && targetScene !== '1_2'
            ? ['g_1_2_fin', 'g_1_2_candle', 'g_1_2_glider']
            : state.flags.graphicsViewed1_2,
        verifiedNodes1_2:
          targetScene !== '1_1' && targetScene !== '1_2'
            ? { wing: true, weight: true, fin: true }
            : state.flags.verifiedNodes1_2,
        apparatusReady1: targetScene !== '1_1' && targetScene !== '1_2',
        preFlightLines1_3: targetScene === '1_3' && autostart ? 3 : state.flags.preFlightLines1_3,
        portalActive1: ['1_4', '1_5', '1_6', '1_7', 'hook_part_2'].includes(targetScene)
          ? true
          : state.flags.portalActive1,
      },
    };
  }

  const initialScreen: AppScreenMode = autostart ? 'active' : 'menu';
  const initialPreFlightLaunched = Boolean(autostart && targetScene === '1_3');

  return {
    initialState: state,
    initialScreen,
    initialPreFlightLaunched,
  };
}

export default function App() {
  const boot = useMemo(() => buildBootstrappedState(), []);
  const [gameState, setGameState] = useState<PersistedGameState>(boot.initialState);
  const [screenMode, setScreenMode] = useState<AppScreenMode>(boot.initialScreen);
  const [preFlightLaunched, setPreFlightLaunched] = useState<boolean>(boot.initialPreFlightLaunched);
  const [isPaused, setIsPaused] = useState(false);
  const [showChapterSelect, setShowChapterSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShelf, setShowShelf] = useState(false);
  const [heroClickNotice, setHeroClickNotice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hud, setHud] = useState<HudFlightState>(() =>
    createInitialHud(boot.initialState.currentSceneId, boot.initialState.activeFlightRunId)
  );

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlightEngine | null>(null);
  const stateRef = useRef<PersistedGameState>(gameState);
  const screenRef = useRef<AppScreenMode>(screenMode);
  const preFlightRef = useRef<boolean>(preFlightLaunched);

  stateRef.current = gameState;
  screenRef.current = screenMode;
  preFlightRef.current = preFlightLaunched;

  // Persist every state change automatically
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Sync audio volumes & engine settings
  useEffect(() => {
    soundEngine.setVolumes(gameState.settings.musicVolume, gameState.settings.sfxVolume);
    engineRef.current?.setSettings(
      gameState.settings.graphics,
      gameState.settings.difficulty,
      gameState.settings.language,
      gameState.settings.bindings
    );
  }, [gameState.settings]);

  // Sync adaptive musical theme per active screen & chapter
  useEffect(() => {
    if (screenMode === 'menu') {
      soundEngine.setTheme('menu');
      return;
    }
    if (screenMode === 'transition') {
      soundEngine.setTheme('excavation');
      return;
    }
    const id = gameState.currentSceneId;
    if (id === '1_1') soundEngine.setTheme('excavation');
    else if (id === '1_2') soundEngine.setTheme('workshop');
    else if (id === '1_3' || id === '1_4') soundEngine.setTheme('flight_dawn');
    else if (id === '1_5') soundEngine.setTheme('portal_duat');
    else if (id === '1_6') soundEngine.setTheme('memphis');
    else if (id === '1_7') soundEngine.setTheme('boss_set');
    else if (id === 'hook_part_2') soundEngine.setTheme('hook');
  }, [screenMode, gameState.currentSceneId]);

  // Expose semantic DOM state for accessibility & automated verification
  useEffect(() => {
    if (screenMode === 'menu') {
      document.body.dataset.state = 'title';
    } else if (screenMode === 'transition') {
      document.body.dataset.state = 'transition';
    } else if (isPaused) {
      document.body.dataset.state = 'paused';
    } else {
      const id = gameState.currentSceneId;
      const inFlight =
        id === '1_4' ||
        id === '1_5' ||
        id === '1_6' ||
        id === '1_7' ||
        (id === '1_3' && preFlightLaunched);
      document.body.dataset.state = inFlight ? 'playing' : 'reading';
    }
  }, [screenMode, isPaused, gameState.currentSceneId, preFlightLaunched]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const enterSceneInEngine = useCallback((state: PersistedGameState, launchPreFlightImmediately: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    const def = getSceneDefinition(state.currentSceneId);
    if (!def) return;

    if (def.id === '1_3') {
      if (launchPreFlightImmediately) {
        engine.startFlightScene('1_3', state.activeFlightRunId, state.flags.portalActive1);
      } else {
        engine.enterStaticBackdrop();
      }
      return;
    }

    if (def.hasFlight) {
      engine.startFlightScene(def.id, state.activeFlightRunId, state.flags.portalActive1);
    } else {
      engine.enterStaticBackdrop();
    }
  }, []);

  // Initialize Three.js FlightEngine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new FlightEngine(
      mount,
      {
        onHudUpdate: (nextHud) => {
          setHud(nextHud);
        },
        onChapterProgressEvent: (ev) => {
          setGameState((prev) => {
            switch (ev.type) {
              case '1_3_takeoff':
                return { ...prev, flags: { ...prev.flags, takeoffDone1_3: true } };
              case '1_3_post':
                return {
                  ...prev,
                  flags: {
                    ...prev.flags,
                    borderPostsVisited1_3: Math.max(prev.flags.borderPostsVisited1_3, ev.totalPosts),
                  },
                };
              case '1_3_thermal_detour':
                return { ...prev, flags: { ...prev.flags, thermalDetourDone1_3: true } };
              case '1_3_anomaly':
                return activateAnomalyPortal(prev);
              case '1_4_mission':
                return {
                  ...prev,
                  flags: {
                    ...prev.flags,
                    missions1_4: { ...prev.flags.missions1_4, [ev.mission]: true },
                  },
                };
              case '1_5_portal':
                return { ...prev, flags: { ...prev.flags, portalEntered1_5: true } };
              case '1_5_trail_done':
                return { ...prev, flags: { ...prev.flags, starryTrailDone1_5: true } };
              case '1_6_memphis_done':
                return {
                  ...prev,
                  flags: {
                    ...prev.flags,
                    memphisFriendFollowed1_6: true,
                    memphisNeutralUntouched1_6: true,
                    memphisHostilesCleared1_6: true,
                    memphisTransitionReached1_6: true,
                  },
                };
              case '1_7_phase':
                return {
                  ...prev,
                  flags: {
                    ...prev.flags,
                    setPhase1Done: prev.flags.setPhase1Done || ev.phase >= 1,
                    setPhase2Done: prev.flags.setPhase2Done || ev.phase >= 2,
                    setPhase3Done: prev.flags.setPhase3Done || ev.phase >= 3,
                  },
                };
              case '1_7_horus':
                return { ...prev, flags: { ...prev.flags, horusLinePlayed: true } };
              case '1_7_witness_done':
                return recordPart1Completion(prev);
              case 'flight_complete':
                return prev;
            }
          });
        },
        onHeroPreviewClicked: () => {
          setHeroClickNotice(true);
        },
        onTransitionComplete: () => {
          setScreenMode('active');
          setIsPaused(false);
          enterSceneInEngine(stateRef.current, preFlightRef.current);
        },
        onRequestRestartFlight: () => {
          setGameState((prev) => {
            const restarted = restartCurrentFlight(prev);
            engineRef.current?.startFlightScene(
              restarted.currentSceneId,
              restarted.activeFlightRunId,
              restarted.flags.portalActive1
            );
            return restarted;
          });
        },
        onRequestPause: () => {
          setIsPaused((p) => {
            const next = !p;
            engineRef.current?.setPaused(next);
            return next;
          });
        },
      },
      stateRef.current.settings.bindings
    );

    engineRef.current = engine;
    engine.setSettings(
      stateRef.current.settings.graphics,
      stateRef.current.settings.difficulty,
      stateRef.current.settings.language,
      stateRef.current.settings.bindings
    );

    if (screenRef.current === 'active') {
      enterSceneInEngine(stateRef.current, preFlightRef.current);
    } else {
      engine.enterMenuMode();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [enterSceneInEngine]);

  const handleStartOrContinue = useCallback(
    (continueSaved: boolean) => {
      soundEngine.unlock();
      if (!continueSaved) {
        const fresh = createInitialGameState();
        const preservedSettings = stateRef.current.settings;
        const resetState: PersistedGameState = { ...fresh, settings: preservedSettings };
        setGameState(resetState);
        stateRef.current = resetState;
        setPreFlightLaunched(false);
        preFlightRef.current = false;
      } else {
        setPreFlightLaunched(false);
        preFlightRef.current = false;
      }
      setIsPaused(false);
      setShowChapterSelect(false);
      setShowSettings(false);
      setShowShelf(false);
      setScreenMode('transition');
      engineRef.current?.startMenuTransition();
    },
    []
  );

  // Global keyboard shortcuts: Enter/Space to start on Title; Esc to close modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showSettings || showShelf || showChapterSelect) {
        if (e.code === 'Escape') {
          setShowChapterSelect(false);
          setShowSettings(false);
          setShowShelf(false);
        }
        return;
      }
      if (screenMode === 'menu' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        const hasProgress =
          gameState.currentSceneId !== '1_1' ||
          gameState.flags.linesPlayed1_1 > 0 ||
          gameState.completedScenes.length > 0;
        handleStartOrContinue(hasProgress);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screenMode,
    showChapterSelect,
    showSettings,
    showShelf,
    gameState.currentSceneId,
    gameState.flags.linesPlayed1_1,
    gameState.completedScenes.length,
    handleStartOrContinue,
  ]);

  const handleAdvanceBookLine = useCallback((sceneId: '1_1' | '1_2', nextCount: number) => {
    setGameState((prev) => {
      if (sceneId === '1_1') {
        return {
          ...prev,
          flags: {
            ...prev.flags,
            modelFound: prev.flags.modelFound || nextCount >= 2,
            linesPlayed1_1: Math.max(prev.flags.linesPlayed1_1, nextCount),
          },
        };
      }
      return {
        ...prev,
        flags: {
          ...prev.flags,
          linesPlayed1_2: Math.max(prev.flags.linesPlayed1_2, nextCount),
        },
      };
    });
  }, []);

  const handleViewBookGraphic = useCallback((sceneId: '1_1' | '1_2', graphicId: string) => {
    setGameState((prev) => {
      if (sceneId === '1_1') {
        const list = prev.flags.graphicsViewed1_1.includes(graphicId)
          ? prev.flags.graphicsViewed1_1
          : [...prev.flags.graphicsViewed1_1, graphicId];
        return {
          ...prev,
          flags: {
            ...prev.flags,
            modelFound: true,
            graphicsViewed1_1: list,
          },
        };
      }
      const list = prev.flags.graphicsViewed1_2.includes(graphicId)
        ? prev.flags.graphicsViewed1_2
        : [...prev.flags.graphicsViewed1_2, graphicId];
      return {
        ...prev,
        flags: {
          ...prev.flags,
          graphicsViewed1_2: list,
        },
      };
    });
  }, []);

  const handleVerifyNode = useCallback((node: 'wing' | 'weight' | 'fin') => {
    setGameState((prev) => {
      const nextNodes = { ...prev.flags.verifiedNodes1_2, [node]: true };
      const allReady = nextNodes.wing && nextNodes.weight && nextNodes.fin;
      return {
        ...prev,
        flags: {
          ...prev.flags,
          verifiedNodes1_2: nextNodes,
          apparatusReady1: allReady,
        },
      };
    });
  }, []);

  const handleNextChapter = useCallback(
    (targetId: SceneId) => {
      const prev = stateRef.current;
      const advanced = nextScene(prev, targetId);
      if (advanced.currentSceneId === prev.currentSceneId) {
        return;
      }
      stateRef.current = advanced;
      setGameState(advanced);
      const willBePreFlight = advanced.currentSceneId === '1_3';
      setPreFlightLaunched(!willBePreFlight);
      preFlightRef.current = !willBePreFlight;
      setIsPaused(false);
      enterSceneInEngine(advanced, !willBePreFlight);
    },
    [enterSceneInEngine]
  );

  const handleLaunchChapter13Flight = useCallback(() => {
    setPreFlightLaunched(true);
    preFlightRef.current = true;
    engineRef.current?.startFlightScene(
      '1_3',
      stateRef.current.activeFlightRunId,
      stateRef.current.flags.portalActive1
    );
  }, []);

  const handleRestartFlight = useCallback(() => {
    setIsPaused(false);
    engineRef.current?.setPaused(false);
    const restarted = restartCurrentFlight(stateRef.current);
    stateRef.current = restarted;
    setGameState(restarted);
    engineRef.current?.startFlightScene(
      restarted.currentSceneId,
      restarted.activeFlightRunId,
      restarted.flags.portalActive1
    );
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      engineRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const handleSelectChapter = useCallback(
    (targetId: SceneId) => {
      soundEngine.unlock();
      const nextState = selectChapter(stateRef.current, targetId);
      stateRef.current = nextState;
      setGameState(nextState);

      const willBePreFlight = nextState.currentSceneId === '1_3';
      setPreFlightLaunched(!willBePreFlight);
      preFlightRef.current = !willBePreFlight;

      setShowChapterSelect(false);
      setShowSettings(false);
      setShowShelf(false);
      setIsPaused(false);
      engineRef.current?.setPaused(false);
      setScreenMode('active');
      enterSceneInEngine(nextState, !willBePreFlight);
    },
    [enterSceneInEngine]
  );

  const handleReturnToMenu = useCallback(() => {
    setIsPaused(false);
    setShowChapterSelect(false);
    setShowSettings(false);
    setShowShelf(false);
    setScreenMode('menu');
    engineRef.current?.enterMenuMode();
  }, []);

  const handleUpdateSettings = useCallback((nextSettings: GameSettings) => {
    setGameState((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
  }, []);

  const handleChangeLanguage = useCallback((language: LanguageCode) => {
    setGameState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        language,
      },
    }));
  }, []);

  const hasSavedProgress =
    gameState.currentSceneId !== '1_1' ||
    gameState.flags.linesPlayed1_1 > 0 ||
    gameState.completedScenes.length > 0;
  const unlockedPartsCount = gameState.shelf.filter((s) => s.apparatusUnlocked).length;
  const currentDef = getSceneDefinition(gameState.currentSceneId);
  const currentSceneComplete = isSceneComplete(gameState, gameState.currentSceneId);
  const inFlightHud =
    screenMode === 'active' &&
    Boolean(currentDef?.hasFlight) &&
    (gameState.currentSceneId !== '1_3' || preFlightLaunched);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0a08]">
      {/* Dedicated Three.js WebGL Mount (never touched by React children) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu Overlay */}
      {(screenMode === 'menu' || screenMode === 'transition') && (
        <MainMenu
          language={gameState.settings.language}
          hasSavedProgress={hasSavedProgress}
          savedSceneId={gameState.currentSceneId}
          unlockedPartsCount={unlockedPartsCount}
          isTransitioning={screenMode === 'transition'}
          heroClickNotice={heroClickNotice}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onStartOrContinue={handleStartOrContinue}
          onOpenChapterSelect={() => setShowChapterSelect(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenShelf={() => setShowShelf(true)}
          onChangeLanguage={handleChangeLanguage}
        />
      )}

      {/* Chapter 1_1 & 1_2 Interactive Book Spread */}
      {screenMode === 'active' && (gameState.currentSceneId === '1_1' || gameState.currentSceneId === '1_2') && (
        <BookSpreadScene
          sceneId={gameState.currentSceneId}
          language={gameState.settings.language}
          flags={gameState.flags}
          canAdvance={currentSceneComplete}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenMenu={handleReturnToMenu}
          onAdvanceLine={handleAdvanceBookLine}
          onViewGraphic={handleViewBookGraphic}
          onVerifyNode={handleVerifyNode}
          onNextChapter={handleNextChapter}
        />
      )}

      {/* Chapter 1_3 Pre-Flight Dawn Dialogue */}
      {screenMode === 'active' && gameState.currentSceneId === '1_3' && !preFlightLaunched && (
        <PreFlightDialogueModal
          language={gameState.settings.language}
          linesPlayed={gameState.flags.preFlightLines1_3}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenMenu={handleReturnToMenu}
          onAdvanceLine={(nextCount) =>
            setGameState((prev) => ({
              ...prev,
              flags: {
                ...prev.flags,
                preFlightLines1_3: Math.max(prev.flags.preFlightLines1_3, nextCount),
              },
            }))
          }
          onLaunchFlight={handleLaunchChapter13Flight}
        />
      )}

      {/* Live 3D Flight HUD (Chapters 1_3 .. 1_7) */}
      {inFlightHud && (
        <FlightHud
          hud={{
            ...hud,
            canAdvanceScene: hud.canAdvanceScene && currentSceneComplete,
          }}
          language={gameState.settings.language}
          isPaused={isPaused}
          isFullscreen={isFullscreen}
          showTouchControls={gameState.settings.touchControls}
          nextSceneId={currentDef?.nextId ?? null}
          onToggleFullscreen={handleToggleFullscreen}
          onTogglePause={handleTogglePause}
          onRestartFlight={handleRestartFlight}
          onToggleCursorAim={() => engineRef.current?.toggleCursorAim()}
          onResetCamera={() => engineRef.current?.resetCamera()}
          onOpenChapterSelect={() => {
            setIsPaused(true);
            engineRef.current?.setPaused(true);
            setShowChapterSelect(true);
          }}
          onOpenSettings={() => {
            setIsPaused(true);
            engineRef.current?.setPaused(true);
            setShowSettings(true);
          }}
          onOpenShelf={() => {
            setIsPaused(true);
            engineRef.current?.setPaused(true);
            setShowShelf(true);
          }}
          onReturnToMenu={handleReturnToMenu}
          onNextChapter={handleNextChapter}
          onTouchInput={(x, y, surge) => engineRef.current?.setTouchInput(x, y, surge)}
        />
      )}

      {/* Hook Stub Screen: Part 2 Coming Soon */}
      {screenMode === 'active' && gameState.currentSceneId === 'hook_part_2' && (
        <ShelfCatalogModal
          shelf={gameState.shelf}
          language={gameState.settings.language}
          isHookScene={true}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {/* Chapter Select Modal */}
      {showChapterSelect && (
        <ChapterSelectModal
          gameState={gameState}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onSelectChapter={handleSelectChapter}
          onClose={() => setShowChapterSelect(false)}
        />
      )}

      {/* 10-Part Shelf Catalog Overlay */}
      {showShelf && (
        <ShelfCatalogModal
          shelf={gameState.shelf}
          language={gameState.settings.language}
          isHookScene={false}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={() => setShowShelf(false)}
        />
      )}

      {/* Full Settings & Key/Mouse Rebinding Modal */}
      {showSettings && (
        <SettingsModal
          settings={gameState.settings}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
