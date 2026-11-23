import React from 'react';
import { Award, CheckCircle2, Lock, Maximize2, Minimize2, Play, RotateCcw, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getUiStrings, isRtlLanguage } from '../i18n/translations';
import { isChapterUnlocked, SCENES } from '../game/scaffold';
import { PersistedGameState, SceneDefinition, SceneId } from '../types/game';

interface ChapterSelectModalProps {
  gameState: PersistedGameState;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSelectChapter: (targetId: SceneId) => void;
  onClose: () => void;
}

function getEarnedRewardNote(
  scene: SceneDefinition,
  gameState: PersistedGameState,
  completed: boolean,
  isRu: boolean
): string | null {
  switch (scene.id) {
    case '1_1':
      if (completed || gameState.flags.modelFound) {
        return isRu ? 'Награда: Найдена сикоморовая модель сокола' : 'Evidence: Sycamore falcon model discovered';
      }
      return null;
    case '1_2':
      if (completed || gameState.flags.apparatusReady1) {
        return isRu ? 'Аппарат: Планёр-сокол собран и сбалансирован' : 'Apparatus: Falcon glider assembled & calibrated';
      }
      return null;
    case '1_3':
      if (completed || gameState.flags.portalActive1) {
        return isRu ? 'Мир: Портал на стекле Нила активирован' : 'World: Nile water-glass portal activated';
      }
      return null;
    case '1_4':
      if (completed || (gameState.flags.missions1_4.thermals && gameState.flags.missions1_4.headwindFin)) {
        return isRu ? 'Испытание: Три трассы над Нилом пройдены' : 'Trial: Three Nile flight routes mastered';
      }
      return null;
    case '1_5':
      if (completed || gameState.flags.starryTrailDone1_5) {
        return isRu ? 'Переход: Звёздный след Дуата пройден' : 'Passage: Starry Duat trail crossed';
      }
      return null;
    case '1_6':
      if (completed || gameState.flags.memphisTransitionReached1_6) {
        return isRu ? 'Путь: Стая ибисов довела до границы бури' : 'Route: Sacred ibis flock led past Memphis';
      }
      return null;
    case '1_7':
      if (gameState.shelf[0]?.apparatusUnlocked && gameState.shelf[0]?.testimonyUnlocked) {
        return isRu
          ? 'Стеллаж: Кусок глины с отпечатком крыла и планёр-сокол'
          : 'Shelf: Clay fragment with wing imprint & Saqqara glider';
      }
      return null;
    case 'hook_part_2':
      return isRu
        ? 'Стеллаж Части I заполнен (1/10)'
        : 'Part I Workshop Shelf slot recorded (1/10)';
    default:
      return null;
  }
}

export const ChapterSelectModal: React.FC<ChapterSelectModalProps> = ({
  gameState,
  isFullscreen,
  onToggleFullscreen,
  onSelectChapter,
  onClose,
}) => {
  const lang = gameState.settings.language;
  const ui = getUiStrings(lang);
  const isRu = lang === 'ru';
  const rtl = isRtlLanguage(lang);

  const unlockedCount = SCENES.filter((s) => isChapterUnlocked(gameState, s.id)).length;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={ui.chapterSelect}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090705]/92 p-3 sm:p-6"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-lg border border-[#c8964a]/40 bg-[#15110c] text-[#efe6d5] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#c8964a]/25">
          <div>
            <h2 className="font-display text-xl sm:text-2xl text-[#f7ebd4] tracking-wide">
              {ui.chapterSelect}
            </h2>
            <div className="text-xs sm:text-sm text-[#cbb899] font-mono-tabular">
              {isRu ? `ЧАСТЬ I · ПТИЦА ИЗ САККАРЫ` : `PART I · THE SAQQARA BIRD`} · {unlockedCount} / {SCENES.length}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onToggleFullscreen();
              }}
              aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
              className="p-2 rounded border border-[#c8964a]/30 bg-[#1d1711] hover:bg-[#2a2118]"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              aria-label={ui.close}
              className="p-2 rounded border border-[#c8964a]/30 bg-[#1d1711] hover:bg-[#2a2118]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto scroll-parchment p-4 sm:p-5 space-y-3">
          {SCENES.map((scene, index) => {
            const unlocked = isChapterUnlocked(gameState, scene.id);
            const completed = gameState.completedScenes.includes(scene.id);
            const isCurrent = gameState.currentSceneId === scene.id;
            const rewardNote = unlocked ? getEarnedRewardNote(scene, gameState, completed, isRu) : null;

            const chapterIndexLabel =
              scene.id === 'hook_part_2'
                ? isRu
                  ? 'ФИНАЛ ЧАСТИ I'
                  : 'PART I FINALE'
                : isRu
                  ? `ГЛАВА ${scene.chapter}`
                  : `CHAPTER ${scene.chapter}`;

            if (!unlocked) {
              return (
                <div
                  key={scene.id}
                  data-chapter-id={scene.id}
                  data-chapter-status="locked"
                  className="w-full rounded border border-[#c8964a]/15 bg-[#100d0a] px-4 py-3.5 opacity-60 flex items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded border border-[#c8964a]/20 bg-[#18130e] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-[#8c785c]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#8c785c]">
                        {chapterIndexLabel}
                      </div>
                      <div className="text-sm sm:text-base font-medium text-[#9e8b70] truncate">
                        {ui.lockedChapterTitle}
                      </div>
                      <div className="text-xs text-[#73624a] truncate">
                        {ui.lockedChapterHint}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded text-[11px] font-mono-tabular border border-[#c8964a]/15 bg-[#16110c] text-[#8c785c]">
                    {ui.statusLocked}
                  </span>
                </div>
              );
            }

            const title = isRu ? scene.titleRu : scene.titleEn;

            return (
              <button
                key={scene.id}
                type="button"
                data-chapter-id={scene.id}
                data-chapter-status={completed ? 'completed' : 'available'}
                onMouseEnter={() => soundEngine.playUiHover()}
                onClick={() => {
                  soundEngine.playUiClick();
                  onSelectChapter(scene.id);
                }}
                className={`w-full text-left rounded border px-4 py-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'border-[#e5b567]/75 bg-[#241c13] hover:bg-[#2d2318]'
                    : completed
                      ? 'border-[#c8964a]/45 bg-[#1b150e] hover:bg-[#261d14] hover:border-[#e5b567]/70'
                      : 'border-[#c8964a]/35 bg-[#18130d] hover:bg-[#241c13] hover:border-[#e5b567]/70'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded border flex items-center justify-center shrink-0 font-mono-tabular text-xs font-semibold ${
                      completed
                        ? 'border-[#e5b567]/50 bg-[#2d2213] text-[#ffd993]'
                        : 'border-[#c8964a]/35 bg-[#1e1710] text-[#d9a654]'
                    }`}
                  >
                    {scene.id === 'hook_part_2' ? 'II' : `0${index + 1}`}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#c8964a]">
                        {chapterIndexLabel}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular bg-[#c8964a]/25 text-[#ffe1a3] border border-[#e5b567]/40">
                          {ui.statusCurrent}
                        </span>
                      )}
                    </div>
                    <div className="text-sm sm:text-base font-medium text-[#f7ebd4]">
                      {title}
                    </div>
                    {rewardNote && (
                      <div className="flex items-center gap-1.5 text-xs text-[#d6be96]">
                        <Award className="w-3.5 h-3.5 text-[#c8964a] shrink-0" />
                        <span>{rewardNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <span
                    className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular border flex items-center gap-1 ${
                      completed
                        ? 'border-[#6da876]/45 bg-[#162519] text-[#a5dfa9]'
                        : 'border-[#c8964a]/40 bg-[#241c12] text-[#f0cf90]'
                    }`}
                  >
                    {completed && <CheckCircle2 className="w-3 h-3" />}
                    <span>{completed ? ui.statusCompleted : ui.statusAvailable}</span>
                  </span>
                  <span className="px-3 py-1.5 rounded bg-[#c8964a] text-[#120d09] font-semibold text-xs flex items-center gap-1.5">
                    {completed ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{completed ? ui.replayChapter : ui.launchChapter}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
