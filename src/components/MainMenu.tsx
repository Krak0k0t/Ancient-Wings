import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Globe, ListOrdered, Maximize2, Minimize2, Play, RotateCcw, Settings } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getUiStrings, isRtlLanguage, LANGUAGES } from '../i18n/translations';
import { LanguageCode, SceneId } from '../types/game';

interface MainMenuProps {
  language: LanguageCode;
  hasSavedProgress: boolean;
  savedSceneId: SceneId;
  unlockedPartsCount: number;
  isTransitioning: boolean;
  heroClickNotice: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStartOrContinue: (continueSaved: boolean) => void;
  onOpenChapterSelect: () => void;
  onOpenSettings: () => void;
  onOpenShelf: () => void;
  onChangeLanguage: (lang: LanguageCode) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  language,
  hasSavedProgress,
  savedSceneId,
  unlockedPartsCount,
  isTransitioning,
  heroClickNotice,
  isFullscreen,
  onToggleFullscreen,
  onStartOrContinue,
  onOpenChapterSelect,
  onOpenSettings,
  onOpenShelf,
  onChangeLanguage,
}) => {
  const ui = getUiStrings(language);
  const rtl = isRtlLanguage(language);

  return (
    <motion.div
      dir={rtl ? 'rtl' : 'ltr'}
      initial={{ opacity: 1 }}
      animate={{ opacity: isTransitioning ? 0 : 1 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-8 pointer-events-none ${
        isTransitioning ? 'pointer-events-none' : ''
      }`}
    >
      {/* Top Bar: Language quick select & Fullscreen button */}
      <div className="flex items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded bg-[#14100b]/85 border border-[#c8964a]/30 px-2.5 py-1.5">
          <Globe className="w-4 h-4 text-[#c8964a] shrink-0" />
          <label htmlFor="menu-lang-select" className="sr-only">
            {ui.language}
          </label>
          <select
            id="menu-lang-select"
            value={language}
            onChange={(e) => {
              soundEngine.playUiClick();
              onChangeLanguage(e.target.value as LanguageCode);
            }}
            className="bg-transparent text-xs sm:text-sm text-[#efe6d5] focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#16120d] text-[#efe6d5]">
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onToggleFullscreen();
          }}
          aria-label={isFullscreen ? ui.exitFullscreen : ui.fullscreen}
          className="pointer-events-auto p-2.5 rounded border border-[#c8964a]/35 bg-[#14100b]/85 hover:bg-[#241c13] text-[#efe6d5] transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Left-Third Asymmetric Title Lockup & Menu Actions (leaving 3D Pylon & Glider unobstructed!) */}
      <div className="max-w-md w-full my-auto space-y-5 pointer-events-auto bg-[#120e0a]/75 p-5 sm:p-7 rounded-lg border border-[#c8964a]/25">
        {/* Bespoke Inline SVG Winged Sun & Falcon Crest Emblem */}
        <div className="space-y-2">
          <svg
            viewBox="0 0 320 76"
            className="w-64 sm:w-72 h-auto"
            role="img"
            aria-label={ui.gameTitle}
          >
            <path
              d="M16 36 Q78 12 136 32 Q152 20 160 12 Q168 20 184 32 Q242 12 304 36 Q244 38 188 42 L160 54 L132 42 Q76 38 16 36 Z"
              fill="none"
              stroke="#d9a654"
              strokeWidth="1.6"
            />
            <circle cx="160" cy="30" r="8" fill="#c8964a" fillOpacity="0.85" />
            <path d="M160 40 L166 64 L160 72 L154 64 Z" fill="#c8964a" fillOpacity="0.7" />
          </svg>
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-[#f9edd8] text-balance">
            {ui.gameTitle}
          </h1>
          <div className="text-xs font-mono-tabular text-[#c8964a]">
            {language === 'ru' ? 'ЧАСТЬ I · ПТИЦА ИЗ САККАРЫ' : 'PART I · THE SAQQARA BIRD'} · {unlockedPartsCount}/10
          </div>
        </div>

        {/* Interactive Menu Buttons with Hover Glow & Wood/Bronze Click SFX */}
        <div className="flex flex-col gap-2.5">
          {hasSavedProgress && (
            <button
              type="button"
              data-start="true"
              onMouseEnter={() => soundEngine.playUiHover()}
              onClick={() => {
                soundEngine.playUiClick();
                onStartOrContinue(true);
              }}
              className="w-full px-5 py-3 rounded font-semibold text-sm sm:text-base bg-[#c8964a] hover:bg-[#dfb062] text-[#120d09] shadow-lg shadow-[#c8964a]/20 hover:shadow-[#e6ba6e]/35 transition-all flex items-center justify-between whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                {ui.continueGame}
              </span>
              <span className="font-mono-tabular text-xs opacity-80">{savedSceneId}</span>
            </button>
          )}

          <button
            type="button"
            data-start={hasSavedProgress ? undefined : 'true'}
            onMouseEnter={() => soundEngine.playUiHover()}
            onClick={() => {
              soundEngine.playUiClick();
              onStartOrContinue(false);
            }}
            className={`w-full px-5 py-3 rounded font-semibold text-sm sm:text-base transition-all flex items-center justify-between whitespace-nowrap ${
              hasSavedProgress
                ? 'border border-[#c8964a]/40 bg-[#1c160f] hover:bg-[#2a2016] hover:border-[#e6ba6e] text-[#f5ebd9]'
                : 'bg-[#c8964a] hover:bg-[#dfb062] text-[#120d09] shadow-lg shadow-[#c8964a]/20 hover:shadow-[#e6ba6e]/35'
            }`}
          >
            <span className="flex items-center gap-2">
              {hasSavedProgress ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {hasSavedProgress ? ui.newChronicle : ui.startGame}
            </span>
          </button>

          <button
            type="button"
            onMouseEnter={() => soundEngine.playUiHover()}
            onClick={() => {
              soundEngine.playUiClick();
              onOpenChapterSelect();
            }}
            className="w-full px-4 py-2.5 rounded text-xs sm:text-sm font-medium border border-[#c8964a]/35 bg-[#18130d] hover:bg-[#261d14] hover:border-[#c8964a]/65 text-[#efe6d5] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <ListOrdered className="w-4 h-4 text-[#c8964a]" />
            <span>{ui.chapterSelect}</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onMouseEnter={() => soundEngine.playUiHover()}
              onClick={() => {
                soundEngine.playUiClick();
                onOpenShelf();
              }}
              className="px-3.5 py-2.5 rounded text-xs sm:text-sm font-medium border border-[#c8964a]/30 bg-[#18130d] hover:bg-[#261d14] hover:border-[#c8964a]/60 text-[#efe6d5] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-[#c8964a]" />
              <span>{ui.shelfCatalog}</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => soundEngine.playUiHover()}
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSettings();
              }}
              className="px-3.5 py-2.5 rounded text-xs sm:text-sm font-medium border border-[#c8964a]/30 bg-[#18130d] hover:bg-[#261d14] hover:border-[#c8964a]/60 text-[#efe6d5] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-[#c8964a]" />
              <span>{ui.settings}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[#c7b392]">
          {heroClickNotice
            ? language === 'ru'
              ? 'Крылья и хвостовой плавник откликнулись на прикосновение.'
              : 'The sycamore wings and vertical rudder fin responded.'
            : ui.clickHeroHint}
        </p>
      </div>

      {/* Bottom Clean Inline Control Hint */}
      <div className="flex justify-center">
        <div className="px-4 py-1.5 rounded bg-[#120e0a]/80 border border-[#c8964a]/25 text-center text-xs text-[#eadbc2] font-mono-tabular">
          {ui.controlHint}
        </div>
      </div>
    </motion.div>
  );
};
