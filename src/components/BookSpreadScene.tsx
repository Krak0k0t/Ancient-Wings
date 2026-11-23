import React, { useState } from 'react';
import { Check, ChevronRight, Eye, Maximize2, Minimize2, Pause } from 'lucide-react';
import { getUiStrings, isRtlLanguage } from '../i18n/translations';
import {
  CHAPTER_1_1_GRAPHICS,
  CHAPTER_1_1_LINES,
  CHAPTER_1_2_GRAPHICS,
  CHAPTER_1_2_LINES,
  localizeSpeaker,
  localizeStageDirection,
  pickDialogueText,
} from '../story/part1';
import { ChapterProgressFlags, LanguageCode, SceneId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { ArchivalIllustration } from './ArchivalGraphics';

interface BookSpreadSceneProps {
  sceneId: '1_1' | '1_2';
  language: LanguageCode;
  flags: ChapterProgressFlags;
  canAdvance: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenMenu: () => void;
  onAdvanceLine: (sceneId: '1_1' | '1_2', nextCount: number) => void;
  onViewGraphic: (sceneId: '1_1' | '1_2', graphicId: string) => void;
  onVerifyNode: (node: 'wing' | 'weight' | 'fin') => void;
  onNextChapter: (targetId: SceneId) => void;
}

export const BookSpreadScene: React.FC<BookSpreadSceneProps> = ({
  sceneId,
  language,
  flags,
  canAdvance,
  isFullscreen,
  onToggleFullscreen,
  onOpenMenu,
  onAdvanceLine,
  onViewGraphic,
  onVerifyNode,
  onNextChapter,
}) => {
  const ui = getUiStrings(language);
  const isRu = language === 'ru';
  const rtl = isRtlLanguage(language);

  const lines = sceneId === '1_1' ? CHAPTER_1_1_LINES : CHAPTER_1_2_LINES;
  const graphics = sceneId === '1_1' ? CHAPTER_1_1_GRAPHICS : CHAPTER_1_2_GRAPHICS;
  const playedCount = sceneId === '1_1' ? flags.linesPlayed1_1 : flags.linesPlayed1_2;
  const viewedGraphics = sceneId === '1_1' ? flags.graphicsViewed1_1 : flags.graphicsViewed1_2;

  const [selectedGraphicIdx, setSelectedGraphicIdx] = useState(0);
  const [highlightedNode, setHighlightedNode] = useState<'wing' | 'weight' | 'fin' | null>(null);
  const [showCanonical, setShowCanonical] = useState(false);

  const activeGraphic = graphics[selectedGraphicIdx] ?? graphics[0];
  const visibleLinesCount = Math.max(1, playedCount);
  const allLinesPlayed = playedCount >= lines.length;
  const allGraphicsViewed = viewedGraphics.length >= graphics.length;

  const handleSelectGraphic = (idx: number) => {
    soundEngine.playUiClick();
    setSelectedGraphicIdx(idx);
    const g = graphics[idx];
    if (g) onViewGraphic(sceneId, g.id);
  };

  const handleRevealNextLine = () => {
    soundEngine.playUiClick();
    if (playedCount < lines.length) {
      const next = playedCount === 0 ? 2 : Math.min(lines.length, playedCount + 1);
      onAdvanceLine(sceneId, next);
      // Automatically mark currently shown graphic as viewed when reading
      if (activeGraphic && !viewedGraphics.includes(activeGraphic.id)) {
        onViewGraphic(sceneId, activeGraphic.id);
      }
    }
  };

  const handleProceed = () => {
    if (!canAdvance) return;
    soundEngine.playCheckpoint();
    onNextChapter(sceneId === '1_1' ? '1_2' : '1_3');
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col bg-[#0f0c09]/92 text-[#efe6d5] p-3 sm:p-6 overflow-hidden"
    >
      {/* Top Bar (Quiet, world-matched, Fullscreen + Menu) */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#c8964a]/25 shrink-0">
        <div className="min-w-0">
          <div className="text-xs tracking-widest uppercase text-[#c8964a] font-mono-tabular">
            {isRu ? 'ЧАСТЬ 1 · ЕГИПЕТ · ПТИЦА ИЗ САККАРЫ' : 'PART 1 · EGYPT · THE SAQQARA BIRD'}
          </div>
          <h1 className="font-display text-lg sm:text-2xl text-[#f7ebd4] truncate">
            {sceneId === '1_1'
              ? isRu
                ? 'Глава 1 · Раскопки'
                : 'Chapter 1 · Excavation'
              : isRu
                ? 'Глава 2 · Исследование и создание'
                : 'Chapter 2 · Study & Construction'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {language !== 'ru' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setShowCanonical((v) => !v);
              }}
              className="px-3 py-2 text-xs rounded border border-[#c8964a]/35 bg-[#1b1610] hover:bg-[#2a2117] text-[#e5cfa9] transition-colors whitespace-nowrap"
            >
              {showCanonical ? 'RU ✓' : 'RU'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleFullscreen();
            }}
            aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
            className="p-2.5 rounded border border-[#c8964a]/35 bg-[#1b1610] hover:bg-[#2a2117] text-[#efe6d5] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenMenu();
            }}
            aria-label={ui.paused}
            className="px-3 py-2 text-xs font-medium rounded border border-[#c8964a]/35 bg-[#1b1610] hover:bg-[#2a2117] text-[#efe6d5] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{ui.returnToMenu}</span>
          </button>
        </div>
      </div>

      {/* Two-Page Book Spread */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 py-4 max-w-6xl w-full mx-auto">
        {/* Left Page: Chronicle Dialogue */}
        <section className="flex flex-col min-h-0 rounded-lg border border-[#c8964a]/30 bg-[#17120d] p-4 sm:p-6">
          <div className="text-xs text-[#b89f78] pb-3 mb-3 border-b border-[#c8964a]/20">
            {sceneId === '1_1'
              ? isRu
                ? 'Двор гробничной мастерской, конец дня. Ветер тянет пыль с плато, над ящиками с находками качается керосиновый фонарь.'
                : 'Courtyard of the tomb workshop, end of day. Wind draws dust from the plateau; a kerosene lantern sways above the crates.'
              : isRu
                ? 'Токарная мастерская при экспедиции, ночь. По столам разложены: сикомора, бронзовый пинцет, свеча, склянка воска.'
                : 'Expedition turning workshop, night. Laid across the tables: sycamore wood, bronze tweezers, a candle, and a vial of wax.'}
          </div>

          <div className="flex-1 overflow-y-auto scroll-parchment space-y-3.5 pr-2">
            {lines.slice(0, visibleLinesCount).map((entry) => (
              <div key={entry.id} className="leading-relaxed text-sm sm:text-base">
                {entry.isStageOnly ? (
                  <p className="italic text-[#cdb896]">{pickDialogueText(entry, language)}</p>
                ) : (
                  <div>
                    <span className="font-display text-xs sm:text-sm tracking-wide text-[#e2b05e]">
                      {localizeSpeaker(entry.speaker, language)}
                    </span>
                    {entry.stageDirection && (
                      <span className="italic text-xs sm:text-sm text-[#9e8969] mx-1.5">
                        ({localizeStageDirection(entry.stageDirection, language)})
                      </span>
                    )}
                    <span className="text-[#f5ebd9]">: {pickDialogueText(entry, language)}</span>
                  </div>
                )}
                {showCanonical && language !== 'ru' && (
                  <p className="text-xs text-[#9e8a6b] mt-0.5 italic">{entry.canonicalRu}</p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 mt-3 border-t border-[#c8964a]/20 flex items-center justify-between gap-3">
            <span className="text-xs font-mono-tabular text-[#a99374]">
              {Math.min(visibleLinesCount, lines.length)} / {lines.length}
            </span>
            {!allLinesPlayed && (
              <button
                type="button"
                onClick={handleRevealNextLine}
                className="px-4 py-2.5 text-sm font-semibold rounded bg-[#c8964a] hover:bg-[#d9a85c] text-[#120e0a] transition-colors flex items-center gap-1.5"
              >
                <span>{ui.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Right Page: Archival Graphics + Chapter 1_2 Node Verification */}
        <section className="flex flex-col min-h-0 rounded-lg border border-[#c8964a]/30 bg-[#17120d] p-4 sm:p-6 overflow-y-auto scroll-parchment">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {graphics.map((g, idx) => {
              const seen = viewedGraphics.includes(g.id);
              const active = idx === selectedGraphicIdx;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGraphic(idx)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'border-[#e5b567] bg-[#2c2217] text-[#fff1d6]'
                      : 'border-[#c8964a]/25 bg-[#120e0a] text-[#bda684] hover:text-[#f5ebd9]'
                  }`}
                >
                  {seen ? <Check className="w-3.5 h-3.5 text-[#7ec47a]" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>
                    {isRu ? `Иллюстрация ${idx + 1}` : `Plate ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {activeGraphic && (
            <div className="space-y-2.5">
              <ArchivalIllustration
                graphicId={activeGraphic.id}
                language={language}
                highlightedNode={sceneId === '1_2' ? highlightedNode : null}
              />
              <div>
                <h2 className="font-display text-sm sm:text-base text-[#f0d8af]">
                  {isRu ? activeGraphic.titleRu : activeGraphic.titleEn}
                </h2>
                <p className="text-xs sm:text-sm text-[#bfa886] mt-0.5">
                  {isRu ? activeGraphic.captionRu : activeGraphic.captionEn}
                </p>
              </div>
            </div>
          )}

          {/* Mandatory 3-Node Verification Mechanic in Chapter 1_2 */}
          {sceneId === '1_2' && (
            <div className="mt-4 pt-4 border-t border-[#c8964a]/25 space-y-2.5">
              <div className="text-xs uppercase tracking-wider text-[#e2b05e] font-medium">
                {ui.verifyNodesTitle}
              </div>
              {(
                [
                  { key: 'wing', label: ui.nodeWing },
                  { key: 'weight', label: ui.nodeWeight },
                  { key: 'fin', label: ui.nodeFin },
                ] as const
              ).map((item) => {
                const verified = flags.verifiedNodes1_2[item.key];
                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHighlightedNode(item.key)}
                    onMouseLeave={() => setHighlightedNode(null)}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-[#c8964a]/25 bg-[#120e0a]"
                  >
                    <span className="text-xs sm:text-sm text-[#eadbc2]">{item.label}</span>
                    <button
                      type="button"
                      disabled={verified}
                      onClick={() => {
                        soundEngine.playWoodFlutter();
                        setHighlightedNode(item.key);
                        onVerifyNode(item.key);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
                        verified
                          ? 'bg-[#2c4228] text-[#9de096] border border-[#5d8f56]/50 cursor-default'
                          : 'bg-[#c8964a] hover:bg-[#dba95d] text-[#120e0a]'
                      }`}
                    >
                      {verified ? ui.confirmed : ui.confirmNode}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completion Checklist Status & Next Chapter Action */}
          <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[#c8964a]/20">
            <div className="text-xs text-[#9e8969]">
              {!allGraphicsViewed
                ? isRu
                  ? `Осмотрите все иллюстрации (${viewedGraphics.length}/${graphics.length})`
                  : `Inspect all plates (${viewedGraphics.length}/${graphics.length})`
                : !allLinesPlayed
                  ? isRu
                    ? 'Прочтите все реплики сцены'
                    : 'Read all dialogue lines'
                  : canAdvance
                    ? isRu
                      ? 'Условия главы выполнены'
                      : 'Chapter conditions fulfilled'
                    : isRu
                      ? 'Подтвердите все три узла аппарата'
                      : 'Verify all three glider nodes'}
            </div>

            <button
              type="button"
              disabled={!canAdvance}
              onClick={handleProceed}
              className={`px-5 py-2.5 text-sm font-semibold rounded transition-all flex items-center gap-2 whitespace-nowrap ${
                canAdvance
                  ? 'bg-[#c8964a] hover:bg-[#dfb062] text-[#120e0a] shadow-lg shadow-[#c8964a]/20'
                  : 'bg-[#261f17] text-[#6e5e48] border border-[#c8964a]/15 cursor-not-allowed'
              }`}
            >
              <span>{ui.proceedChapter}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
