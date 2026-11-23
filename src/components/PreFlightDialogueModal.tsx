import React from 'react';
import { ChevronRight, Maximize2, Minimize2, Pause } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getUiStrings, isRtlLanguage } from '../i18n/translations';
import {
  CHAPTER_1_3_LINES,
  localizeSpeaker,
  pickDialogueText,
} from '../story/part1';
import { LanguageCode } from '../types/game';

interface PreFlightDialogueModalProps {
  language: LanguageCode;
  linesPlayed: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenMenu: () => void;
  onAdvanceLine: (nextCount: number) => void;
  onLaunchFlight: () => void;
}

export const PreFlightDialogueModal: React.FC<PreFlightDialogueModalProps> = ({
  language,
  linesPlayed,
  isFullscreen,
  onToggleFullscreen,
  onOpenMenu,
  onAdvanceLine,
  onLaunchFlight,
}) => {
  const ui = getUiStrings(language);
  const isRu = language === 'ru';
  const rtl = isRtlLanguage(language);

  const visibleCount = Math.max(1, linesPlayed);
  const allPlayed = linesPlayed >= CHAPTER_1_3_LINES.length;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 bg-[#0c0a07]/75"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#c8964a]">
            {isRu ? 'Глава 3 · Испытания' : 'Chapter 3 · Trials'}
          </div>
          <div className="text-xs sm:text-sm text-[#cbb694] mt-0.5">
            {isRu
              ? 'Первый час после рассвета, самый тихий час. Нил лежит ниже, роса ещё держит камни.'
              : 'The first hour after dawn, the quietest hour. The Nile lies below; dew still holds the stones.'}
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
            className="p-2.5 rounded border border-[#c8964a]/35 bg-[#1b1610] hover:bg-[#2a2117] text-[#efe6d5]"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenMenu();
            }}
            className="p-2.5 rounded border border-[#c8964a]/35 bg-[#1b1610] hover:bg-[#2a2117] text-[#efe6d5]"
            aria-label={ui.paused}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto rounded-lg border border-[#c8964a]/40 bg-[#16120d]/95 p-5 sm:p-7 space-y-4">
        <div className="space-y-3.5">
          {CHAPTER_1_3_LINES.slice(0, visibleCount).map((entry) => (
            <div key={entry.id} className="text-sm sm:text-base leading-relaxed">
              <span className="font-display text-xs sm:text-sm text-[#e2b05e] tracking-wide">
                {localizeSpeaker(entry.speaker, language)}
              </span>
              <span className="text-[#f7ebd4]">: {pickDialogueText(entry, language)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#c8964a]/25 flex items-center justify-between gap-3">
          <span className="text-xs font-mono-tabular text-[#9e8969]">
            {Math.min(visibleCount, CHAPTER_1_3_LINES.length)} / {CHAPTER_1_3_LINES.length}
          </span>
          {!allPlayed ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onAdvanceLine(Math.min(CHAPTER_1_3_LINES.length, visibleCount + 1));
              }}
              className="px-4 py-2 text-sm font-semibold rounded bg-[#c8964a] hover:bg-[#dba95d] text-[#120e0a] flex items-center gap-1.5"
            >
              <span>{ui.next}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playWoodFlutter();
                onLaunchFlight();
              }}
              className="px-5 py-2.5 text-sm font-semibold rounded bg-[#c8964a] hover:bg-[#e0b266] text-[#120e0a] flex items-center gap-2"
            >
              <span>{ui.beginFlight}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div />
    </div>
  );
};
