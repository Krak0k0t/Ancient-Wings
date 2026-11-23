import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { DEFAULT_KEY_BINDINGS } from '../game/scaffold';
import { getUiStrings, isRtlLanguage, LANGUAGES } from '../i18n/translations';
import {
  BindableAction,
  DifficultyLevel,
  GameSettings,
  GraphicsQuality,
  LanguageCode,
} from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

const ACTION_ORDER: BindableAction[] = [
  'pitchUp',
  'pitchDown',
  'turnLeft',
  'turnRight',
  'wingSurge',
  'brakeHold',
  'toggleCursorAim',
  'resetCamera',
  'restartFlight',
  'pauseMenu',
];

function formatBinding(code: string): string {
  if (code === 'MouseRight') return 'Right Mouse';
  if (code === 'MouseLeft') return 'Left Mouse';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isFullscreen,
  onToggleFullscreen,
  onUpdateSettings,
  onClose,
}) => {
  const ui = getUiStrings(settings.language);
  const rtl = isRtlLanguage(settings.language);
  const [listeningAction, setListeningAction] = useState<BindableAction | null>(null);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onUpdateSettings({
        ...settings,
        bindings: {
          ...settings.bindings,
          [listeningAction]: e.code,
        },
      });
      setListeningAction(null);
      soundEngine.playUiClick();
    };

    const handleMouse = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code = e.button === 0 ? 'MouseLeft' : e.button === 2 ? 'MouseRight' : `Mouse${e.button}`;
      onUpdateSettings({
        ...settings,
        bindings: {
          ...settings.bindings,
          [listeningAction]: code,
        },
      });
      setListeningAction(null);
      soundEngine.playUiClick();
    };

    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('mousedown', handleMouse, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('mousedown', handleMouse, true);
    };
  }, [listeningAction, settings, onUpdateSettings]);

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090705]/85 p-3 sm:p-6"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg border border-[#c8964a]/40 bg-[#15110c] text-[#efe6d5] overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#c8964a]/25">
          <h2 className="font-display text-xl text-[#f7ebd4]">{ui.settings}</h2>
          <div className="flex items-center gap-2">
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

        <div className="flex-1 overflow-y-auto scroll-parchment p-5 space-y-6">
          {/* Language (16 Languages) */}
          <div className="space-y-2">
            <label htmlFor="settings-lang" className="block text-xs uppercase tracking-wider text-[#c8964a]">
              {ui.language}
            </label>
            <select
              id="settings-lang"
              value={settings.language}
              onChange={(e) => {
                soundEngine.playUiClick();
                onUpdateSettings({ ...settings, language: e.target.value as LanguageCode });
              }}
              className="w-full px-3 py-2.5 rounded border border-[#c8964a]/35 bg-[#1b1610] text-sm text-[#f5ebd9]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.englishName})
                </option>
              ))}
            </select>
          </div>

          {/* Graphics Quality (4 Levels) */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-[#c8964a]">
              {ui.graphicsQuality}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['low', 'balanced', 'high', 'cinematic'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdateSettings({ ...settings, graphics: q });
                  }}
                  className={`py-2 px-3 rounded text-xs sm:text-sm font-medium border transition-colors ${
                    settings.graphics === q
                      ? 'bg-[#c8964a] text-[#120e0a] border-[#e6ba6e]'
                      : 'bg-[#1b1610] text-[#d9c8ac] border-[#c8964a]/25 hover:bg-[#261f16]'
                  }`}
                >
                  {ui.graphicsNames[q]}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty (3 Levels) */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-[#c8964a]">{ui.difficulty}</div>
            <div className="grid grid-cols-3 gap-2">
              {(['pilgrim', 'adept', 'master'] as DifficultyLevel[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdateSettings({ ...settings, difficulty: d });
                  }}
                  className={`py-2 px-3 rounded text-xs sm:text-sm font-medium border transition-colors ${
                    settings.difficulty === d
                      ? 'bg-[#c8964a] text-[#120e0a] border-[#e6ba6e]'
                      : 'bg-[#1b1610] text-[#d9c8ac] border-[#c8964a]/25 hover:bg-[#261f16]'
                  }`}
                >
                  {ui.difficultyNames[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Audio & Touch Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs uppercase tracking-wider text-[#c8964a]">
              <span>
                {ui.musicVolume}: {Math.round(settings.musicVolume * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })
                }
                className="w-full accent-[#c8964a]"
              />
            </label>
            <label className="space-y-1.5 text-xs uppercase tracking-wider text-[#c8964a]">
              <span>
                {ui.sfxVolume}: {Math.round(settings.sfxVolume * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
                }
                className="w-full accent-[#c8964a]"
              />
            </label>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded border border-[#c8964a]/25 bg-[#1b1610]">
            <span className="text-sm">{ui.touchControls}</span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ ...settings, touchControls: !settings.touchControls });
              }}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold ${
                settings.touchControls
                  ? 'bg-[#c8964a] text-[#120e0a]'
                  : 'bg-[#282118] text-[#cbb899]'
              }`}
            >
              {settings.touchControls ? ui.on : ui.off}
            </button>
          </div>

          {/* Key & Mouse Rebinding */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#c8964a]">
                {ui.keyBindings}
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onUpdateSettings({ ...settings, bindings: { ...DEFAULT_KEY_BINDINGS } });
                }}
                className="text-xs text-[#cbb899] hover:text-[#fff1d6] flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{ui.resetDefaults}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTION_ORDER.map((action) => {
                const isListening = listeningAction === action;
                return (
                  <div
                    key={action}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-[#c8964a]/20 bg-[#1a150f]"
                  >
                    <span className="text-xs sm:text-sm text-[#e7d8be] truncate">
                      {ui.actionNames[action]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setListeningAction(isListening ? null : action);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono-tabular whitespace-nowrap border ${
                        isListening
                          ? 'border-[#ffd27d] bg-[#c8964a] text-[#120e0a]'
                          : 'border-[#c8964a]/35 bg-[#120e0a] text-[#f5ebd9]'
                      }`}
                    >
                      {isListening ? ui.pressKeyToBind : formatBinding(settings.bindings[action])}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
