import React from 'react';
import { Lock, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { getUiStrings, isRtlLanguage } from '../i18n/translations';
import { LanguageCode, ShelfSlot } from '../types/game';

interface ShelfCatalogModalProps {
  shelf: ShelfSlot[];
  language: LanguageCode;
  isHookScene: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose?: () => void;
  onReturnToMenu?: () => void;
}

export const ShelfCatalogModal: React.FC<ShelfCatalogModalProps> = ({
  shelf,
  language,
  isHookScene,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  onReturnToMenu,
}) => {
  const ui = getUiStrings(language);
  const isRu = language === 'ru';
  const rtl = isRtlLanguage(language);
  const unlockedCount = shelf.filter((s) => s.apparatusUnlocked).length;

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090705]/92 p-3 sm:p-6"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-lg border border-[#c8964a]/40 bg-[#15110c] text-[#efe6d5] overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#c8964a]/25">
          <div>
            {isHookScene && (
              <div className="font-display text-xl sm:text-2xl text-[#ffd27d] tracking-wide">
                {ui.part2Soon}
              </div>
            )}
            <div className="text-xs sm:text-sm text-[#cbb899] font-mono-tabular">
              {ui.shelfProgress}: {unlockedCount} / 10
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
            {onReturnToMenu && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onReturnToMenu();
                }}
                className="px-3 py-2 rounded text-xs font-medium border border-[#c8964a]/35 bg-[#1d1711] hover:bg-[#2a2118] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{ui.returnToMenu}</span>
              </button>
            )}
            {onClose && (
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
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-parchment p-5 space-y-4">
          {isHookScene && (
            <div className="rounded border border-[#c8964a]/30 bg-[#1b150e] p-4 text-sm text-[#e8d9be] leading-relaxed">
              {isRu
                ? 'ЧАСТЬ 2: скоро. В вашей мастерской на стеллаже-каталоге уже стоит планёр-сокол из Саккары и лежит кусок глины с отпечатком крыла. Впереди — девять эпох до возвращения к общему небу.'
                : 'PART 2: Coming Soon. Upon the workshop catalog shelf now stands the Saqqara falcon glider alongside the clay fragment bearing a wing imprint. Nine eras remain before the tenth sky opens.'}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shelf.map((slot) => {
              const unlocked = slot.apparatusUnlocked;
              return (
                <div
                  key={slot.part}
                  className={`rounded border p-3.5 space-y-1.5 ${
                    unlocked
                      ? 'border-[#c8964a]/55 bg-[#1f1810]'
                      : 'border-[#c8964a]/15 bg-[#110e0a] opacity-65'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-[#c8964a]">
                    <span>
                      {isRu ? `ЧАСТЬ ${slot.part}` : `PART ${slot.part}`} ·{' '}
                      {isRu ? slot.eraRu : slot.eraEn}
                    </span>
                    {!unlocked && <Lock className="w-3.5 h-3.5" />}
                  </div>

                  {unlocked ? (
                    <>
                      <div className="font-display text-sm text-[#f7ebd4]">
                        {ui.apparatusLabel}: {isRu ? slot.apparatusRu : slot.apparatusEn}
                      </div>
                      <div className="text-xs text-[#e2c693]">
                        {ui.testimonyLabel}: {isRu ? slot.testimonyRu : slot.testimonyEn}
                      </div>
                      {slot.witnessNoteRu && (
                        <p className="text-xs italic text-[#a89373] pt-0.5">
                          {isRu
                            ? slot.witnessNoteRu
                            : 'There is no name in the Witness testimony: only a wing, clay, and a starry trail above the Nile.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-[#7d6e58] italic">{ui.lockedSlot}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
