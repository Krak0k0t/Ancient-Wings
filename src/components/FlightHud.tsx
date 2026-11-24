import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronRight,
  Crosshair,
  Maximize2,
  Minimize2,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getUiStrings, isRtlLanguage } from '../i18n/translations';
import { HudFlightState, LanguageCode, SceneId } from '../types/game';

interface FlightHudProps {
  hud: HudFlightState;
  language: LanguageCode;
  isPaused: boolean;
  isFullscreen: boolean;
  showTouchControls: boolean;
  nextSceneId: SceneId | null;
  onToggleFullscreen: () => void;
  onTogglePause: () => void;
  onRestartFlight: () => void;
  onToggleCursorAim: () => void;
  onResetCamera: () => void;
  onOpenChapterSelect: () => void;
  onOpenSettings: () => void;
  onOpenShelf: () => void;
  onReturnToMenu: () => void;
  onNextChapter: (targetId: SceneId) => void;
  onTouchInput: (x: number, y: number, surge: boolean) => void;
}

export const FlightHud: React.FC<FlightHudProps> = ({
  hud,
  language,
  isPaused,
  isFullscreen,
  showTouchControls,
  nextSceneId,
  onToggleFullscreen,
  onTogglePause,
  onRestartFlight,
  onToggleCursorAim,
  onResetCamera,
  onOpenChapterSelect,
  onOpenSettings,
  onOpenShelf,
  onReturnToMenu,
  onNextChapter,
  onTouchInput,
}) => {
  const ui = getUiStrings(language);
  const rtl = isRtlLanguage(language);
  const isRu = language === 'ru';
  const [muted, setMuted] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [reticleVisible, setReticleVisible] = useState(false);
  const [confirmChapterSelect, setConfirmChapterSelect] = useState(false);

  useEffect(() => {
    if (!isPaused) {
      setConfirmChapterSelect(false);
    }
  }, [isPaused]);

  useEffect(() => {
    if (!hud.cursorAimEnabled || isPaused) {
      setReticleVisible(false);
      return;
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setReticleVisible(true);
      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [hud.cursorAimEnabled, isPaused]);

  const handlePadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, -(((e.clientY - rect.top) / rect.height) * 2 - 1)));
    setStickOffset({ x: nx * 24, y: -ny * 24 });
    onTouchInput(nx, ny, false);
  };

  const handlePadReset = () => {
    setStickOffset({ x: 0, y: 0 });
    onTouchInput(0, 0, false);
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5"
    >
      {/* Active Cursor Aim Reticle & Subtle Center Reference (only shown when Cursor Aim is active) */}
      {hud.cursorAimEnabled && !isPaused && !showTouchControls && (
        <>
          <div
            aria-hidden="true"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#e5b567]/45 pointer-events-none"
          />
          <div
            ref={reticleRef}
            aria-hidden="true"
            style={{
              transform: 'translate3d(50vw, 50vh, 0)',
              opacity: reticleVisible ? 0.95 : 0.45,
            }}
            className="fixed top-0 left-0 -ml-4 -mt-4 w-8 h-8 pointer-events-none flex items-center justify-center transition-opacity duration-150"
          >
            <span className="w-7 h-7 rounded-full border border-[#e5b567]/80 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-[#fff1d6]" />
            </span>
          </div>
        </>
      )}
      {/* Top Perimeter Row: Compact Telemetry Cluster + Utility Controls */}
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        {/* Top-Left: World-Matched Flight Instruments & Objective */}
        <div className="pointer-events-auto min-w-0 flex-1 max-w-md rounded border border-[#c8964a]/35 bg-[#130f0b]/85 px-2.5 py-2 sm:px-3.5 sm:py-2.5 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] font-mono-tabular uppercase tracking-wider text-[#c8964a]">
            <span>{isRu ? `ГЛАВА ${hud.sceneId.replace('_', '.')}` : `CHAPTER ${hud.sceneId.replace('_', '.')}`}</span>
            <span aria-hidden="true">·</span>
            <span>
              {ui.checkpointLabel} {hud.checkpointIndex}/{hud.totalCheckpoints}
            </span>
            {hud.bossName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#ffad5c]">
                  {hud.bossName} ({hud.bossPhase}/3)
                </span>
              </>
            )}
          </div>

          <div className="text-xs sm:text-sm font-medium text-[#f5ebd9]">
            {hud.taskLabel}
          </div>

          {hud.modelCardNote && (
            <div className="text-[11px] italic text-[#d8be92] pt-0.5">
              {hud.modelCardNote}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 pt-1 text-xs font-mono-tabular text-[#cbb899]">
            <span>
              {ui.altLabel} <strong className="text-[#f7ebd4]">{hud.altitude}m</strong>
            </span>
            <span>
              {ui.speedLabel} <strong className="text-[#f7ebd4]">{hud.speed}</strong>
            </span>
            <span>
              {ui.rudderLabel} <strong className="text-[#f7ebd4]">{hud.rudderAngleDeg}°</strong>
            </span>
            <span>
              {ui.wingLabel} <strong className="text-[#f7ebd4]">{hud.wingAngleDeg}°</strong>
            </span>
            <button
              type="button"
              tabIndex={-1}
              data-testid="cursor-aim-toggle"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCursorAim();
              }}
              className={`px-2 py-0.5 rounded border text-[10px] sm:text-[11px] flex items-center gap-1 transition-colors ${
                hud.cursorAimEnabled
                  ? 'border-[#e5b567]/60 bg-[#2c2113] text-[#ffd993]'
                  : 'border-[#c8964a]/25 bg-[#19140e] text-[#9e8c72]'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>{hud.cursorAimEnabled ? ui.cursorAimOn : ui.cursorAimOff} [F]</span>
            </button>
          </div>
        </div>

        {/* Top-Right: Compact Square Utility Controls (Mute, Reset Cam [C], Restart [R], Fullscreen, Pause [Esc]) */}
        <div className="pointer-events-auto flex flex-wrap sm:flex-nowrap justify-end max-w-[7.2rem] sm:max-w-none items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              const next = !muted;
              setMuted(next);
              soundEngine.setMuted(next);
            }}
            aria-label="Mute Audio"
            className="p-1.5 sm:p-2.5 rounded border border-[#c8964a]/35 bg-[#130f0b]/85 hover:bg-[#241c13] text-[#efe6d5]"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            data-testid="reset-camera-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetCamera();
            }}
            aria-label={ui.resetCamera}
            title={`${ui.resetCamera} [C]`}
            className="p-1.5 sm:p-2.5 rounded border border-[#c8964a]/35 bg-[#130f0b]/85 hover:bg-[#241c13] text-[#efe6d5]"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playUiClick();
              onRestartFlight();
            }}
            aria-label={ui.restartFlight}
            title={`${ui.restartFlight} [R]`}
            className="p-1.5 sm:p-2.5 rounded border border-[#c8964a]/35 bg-[#130f0b]/85 hover:bg-[#241c13] text-[#efe6d5]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playUiClick();
              onToggleFullscreen();
            }}
            aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
            className="p-1.5 sm:p-2.5 rounded border border-[#c8964a]/35 bg-[#130f0b]/85 hover:bg-[#241c13] text-[#efe6d5]"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              soundEngine.playUiClick();
              onTogglePause();
            }}
            aria-label={ui.paused}
            className="p-1.5 sm:p-2.5 rounded border border-[#c8964a]/35 bg-[#130f0b]/85 hover:bg-[#241c13] text-[#efe6d5]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Notices (Active Dialogue, Checkpoint Flash, or Chapter Advance CTA — NO victory screen!) */}
      <div className="my-auto flex flex-col items-center gap-3">
        {hud.checkpointFlash && (
          <div className="px-4 py-2 rounded border border-[#e09d48]/50 bg-[#1a130c]/90 text-xs sm:text-sm text-[#ffdba3]">
            {hud.checkpointFlash}
          </div>
        )}

        {hud.nearAnomaly && (
          <div className="px-4 py-1.5 rounded border border-[#8b6eff]/50 bg-[#131020]/85 text-xs text-[#d6c8ff]">
            {isRu ? 'Вертикальная тень над гробницей — пройдите сквозь неё' : 'Vertical shadow above the tomb — fly through it'}
          </div>
        )}

        {hud.bossSilenceWindow && (
          <div className="px-4 py-1.5 rounded border border-[#f5be49]/50 bg-[#1b150c]/90 text-xs text-[#ffe7a3]">
            {isRu ? 'Тишина: пропустите удар по знаку Гора' : 'Silence: yield through Horus’s wing-sign corridor'}
          </div>
        )}

        {hud.canAdvanceScene && nextSceneId && (
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playCheckpoint();
                onNextChapter(nextSceneId);
              }}
              className="px-6 py-3 rounded font-semibold text-sm sm:text-base bg-[#c8964a] hover:bg-[#dfb062] text-[#120e0a] shadow-xl flex items-center gap-2"
            >
              <span>{ui.proceedChapter}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Row: Verbatim Dialogue Subtitle & Optional Mobile Touch Controls */}
      <div className="flex items-end justify-between gap-4">
        {showTouchControls ? (
          <div
            ref={padRef}
            onPointerDown={handlePadMove}
            onPointerMove={handlePadMove}
            onPointerUp={handlePadReset}
            onPointerCancel={handlePadReset}
            className="pointer-events-auto w-28 h-28 rounded-full border border-[#c8964a]/45 bg-[#14100b]/80 relative flex items-center justify-center touch-none"
          >
            <div
              style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }}
              className="w-11 h-11 rounded-full bg-[#c8964a]/85 border border-[#ffe4b5]"
            />
          </div>
        ) : (
          <div />
        )}

        {hud.activeDialogue ? (
          <div className="mx-auto max-w-2xl rounded border border-[#c8964a]/40 bg-[#120e0a]/92 px-5 py-3 text-center space-y-1">
            <div className="font-display text-xs tracking-wider text-[#e2b05e]">
              {hud.activeDialogue.speaker}
              {hud.activeDialogue.stage ? (
                <span className="italic font-sans text-[#a89476] mx-1.5">
                  ({hud.activeDialogue.stage})
                </span>
              ) : null}
            </div>
            <p className="text-sm sm:text-base text-[#f7ebd4] leading-snug">
              {hud.activeDialogue.text}
            </p>
          </div>
        ) : (
          <div className="mx-auto hidden sm:block px-3.5 py-1 rounded bg-[#120e0a]/75 border border-[#c8964a]/25 text-[11px] font-mono-tabular text-[#eadbc2]">
            {ui.controlHint}
          </div>
        )}

        {showTouchControls ? (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onTouchInput(0, 0, true);
            }}
            className="pointer-events-auto w-20 h-20 rounded-full border border-[#c8964a]/60 bg-[#c8964a]/85 active:bg-[#e5b567] text-[#120e0a] font-semibold text-xs"
          >
            {isRu ? 'ПОРЫВ' : 'SURGE'}
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Pause Modal Overlay */}
      {isPaused && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#090705]/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#c8964a]/40 bg-[#16120d] p-6 space-y-4">
            {confirmChapterSelect ? (
              <>
                <h2 className="font-display text-xl text-[#f7ebd4] text-center">
                  {ui.confirmChapterLeaveTitle}
                </h2>
                <p className="text-sm text-[#d9c7a8] text-center leading-relaxed">
                  {ui.confirmChapterLeaveBody}
                </p>
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    data-testid="confirm-chapter-select-btn"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setConfirmChapterSelect(false);
                      onOpenChapterSelect();
                    }}
                    className="w-full py-2.5 px-4 rounded bg-[#c8964a] hover:bg-[#dfb062] text-[#120e0a] font-semibold text-sm"
                  >
                    {ui.confirmProceed}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setConfirmChapterSelect(false);
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/35 bg-[#1e1812] hover:bg-[#2a2118] text-[#efe6d5] text-sm"
                  >
                    {ui.cancel}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl text-[#f7ebd4] text-center">{ui.paused}</h2>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onTogglePause();
                    }}
                    className="w-full py-2.5 px-4 rounded bg-[#c8964a] hover:bg-[#dfb062] text-[#120e0a] font-semibold text-sm"
                  >
                    {ui.resume}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onRestartFlight();
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/35 bg-[#1e1812] hover:bg-[#2a2118] text-[#efe6d5] text-sm"
                  >
                    {ui.restartFlight} [R]
                  </button>
                  <button
                    type="button"
                    data-testid="pause-chapter-select-btn"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setConfirmChapterSelect(true);
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/35 bg-[#1e1812] hover:bg-[#2a2118] text-[#efe6d5] text-sm"
                  >
                    {ui.chapterSelect}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onOpenShelf();
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/35 bg-[#1e1812] hover:bg-[#2a2118] text-[#efe6d5] text-sm"
                  >
                    {ui.shelfCatalog}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onOpenSettings();
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/35 bg-[#1e1812] hover:bg-[#2a2118] text-[#efe6d5] text-sm"
                  >
                    {ui.settings}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onReturnToMenu();
                    }}
                    className="w-full py-2.5 px-4 rounded border border-[#c8964a]/25 bg-[#120e0a] hover:bg-[#221a12] text-[#ccb796] text-sm"
                  >
                    {ui.returnToMenu}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
