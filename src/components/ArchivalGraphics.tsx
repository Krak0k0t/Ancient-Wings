import React from 'react';
import { LanguageCode } from '../types/game';

interface Props {
  graphicId: string;
  language: LanguageCode;
  highlightedNode?: 'wing' | 'weight' | 'fin' | null;
}

export const ArchivalIllustration: React.FC<Props> = ({
  graphicId,
  language,
  highlightedNode,
}) => {
  const isRu = language === 'ru';

  if (graphicId === 'g_1_1_intact') {
    return (
      <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#1a1510]">
        {/* Excavation Ledger Grid */}
        <path d="M24 30 H336 M24 65 H336 M24 100 H336 M24 135 H336 M24 170 H336" stroke="#c8964a" strokeOpacity="0.16" strokeWidth="1" />
        <rect x="20" y="16" width="320" height="168" fill="none" stroke="#c8964a" strokeOpacity="0.45" strokeWidth="1.5" />
        <text x="34" y="34" fill="#d9be94" fontSize="10" fontFamily="monospace">
          {isRu ? 'ОПИСЬ №13 · ПАДИ-ИМЕНЕ · САККАРА' : 'LEDGER #13 · PA-DI-IMEN · SAQQARA'}
        </text>
        {/* Intact Sycamore Falcon Silhouette (No Feet, Vertical Tail Fin) */}
        <g transform="translate(180,104)">
          <path d="M-85 -8 Q-40 -26 25 -14 L65 -4 L78 8 L64 14 L22 10 Q-35 22 -85 -8 Z" fill="#b98952" stroke="#e4c28e" strokeWidth="1.4" />
          {/* Wing profile */}
          <path d="M-28 -12 Q5 -54 44 -48 Q26 -14 14 -10 Z" fill="#cfa066" stroke="#f0d2a2" strokeWidth="1.2" />
          {/* Vertical tail fin */}
          <path d="M58 6 L82 4 L76 34 L54 24 Z" fill="#8b5d2e" stroke="#f2ba63" strokeWidth="1.6" />
          {/* Eye */}
          <circle cx="-62" cy="-7" r="2.6" fill="#181410" stroke="#ffd27d" strokeWidth="0.9" />
          {/* No feet indicator */}
          <line x1="-18" y1="18" x2="10" y2="18" stroke="#c8964a" strokeDasharray="3 3" strokeOpacity="0.65" />
        </g>
        <text x="34" y="176" fill="#c8964a" fontSize="9.5" fontFamily="monospace">
          {isRu ? 'Сикомора · Без лап · Вертикальный плавник' : 'Sycamore · Footless · Vertical Tail Fin'}
        </text>
      </svg>
    );
  }

  if (graphicId === 'g_1_1_halves') {
    return (
      <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#18130e]">
        {/* Courtyard doorpost */}
        <rect x="280" y="20" width="24" height="160" fill="#5b452d" stroke="#8a6c49" strokeWidth="1.5" />
        {/* Split Left Half */}
        <g transform="translate(115,112) rotate(-14)">
          <path d="M-65 -6 Q-25 -22 18 -12 L10 12 Q-25 18 -65 -6 Z" fill="#b98952" stroke="#e4c28e" strokeWidth="1.4" />
          <path d="M-20 -10 Q0 -42 28 -38 L14 -10 Z" fill="#cfa066" stroke="#f0d2a2" strokeWidth="1.1" />
          <circle cx="-48" cy="-5" r="2.2" fill="#15120e" />
        </g>
        {/* Split Right Half with Tail Fin */}
        <g transform="translate(212,126) rotate(19)">
          <path d="M-22 -11 L32 -4 L42 6 L30 12 L-18 10 Z" fill="#9c6f3e" stroke="#e4c28e" strokeWidth="1.4" />
          <path d="M24 5 L45 4 L40 30 L20 22 Z" fill="#7d5228" stroke="#f2ba63" strokeWidth="1.5" />
        </g>
        {/* Glide trajectory arc */}
        <path d="M35 72 Q155 44 278 96" fill="none" stroke="#ffd27d" strokeOpacity="0.55" strokeDasharray="5 4" strokeWidth="1.5" />
        <text x="26" y="34" fill="#d9be94" fontSize="10" fontFamily="monospace">
          {isRu ? 'ПОЛЁТ ЧЕРЕЗ ДВОР · СКОЛ О КОСЯК' : 'COURTYARD GLIDE · SPLIT AT DOORPOST'}
        </text>
      </svg>
    );
  }

  if (graphicId === 'g_1_1_note') {
    return (
      <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#1e1811]">
        <rect x="28" y="22" width="304" height="156" rx="4" fill="#2a2117" stroke="#c8964a" strokeOpacity="0.5" />
        <text x="46" y="54" fill="#a89880" fontSize="12" fontFamily="Georgia, serif">
          {isRu ? 'Форма учёта №13:' : 'Registry Form #13:'}
        </text>
        <text x="46" y="90" fill="#a89880" fontSize="13.5" fontFamily="Georgia, serif">
          {isRu ? '«фигурка птицы, назначение не установлено»' : '"bird figurine, purpose undetermined"'}
        </text>
        {/* Crossed-out stroke by Mansur */}
        <line x1="158" y1="85" x2="318" y2="85" stroke="#d95c3f" strokeWidth="2.2" />
        <text x="46" y="136" fill="#ffd27d" fontSize="15" fontWeight="bold" fontFamily="Georgia, serif">
          {isRu ? 'Назначение... установлено.' : 'Purpose... determined.'}
        </text>
        <text x="46" y="162" fill="#8f7e68" fontSize="10" fontFamily="monospace">
          {isRu ? '— Мансур, копиист экспедиции' : '— Mansur, expedition scribe'}
        </text>
      </svg>
    );
  }

  if (graphicId === 'g_1_2_fin') {
    return (
      <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#17130f]">
        <g transform="translate(175,92)">
          {/* Wing highlight */}
          <path
            d="M-32 -14 Q10 -64 56 -56 Q34 -14 18 -10 Z"
            fill={highlightedNode === 'wing' ? '#e5a93c' : '#b98952'}
            stroke={highlightedNode === 'wing' ? '#fff3cc' : '#e4c28e'}
            strokeWidth={highlightedNode === 'wing' ? 2.4 : 1.2}
          />
          {/* Body */}
          <path d="M-92 -6 Q-42 -24 32 -12 L72 -4 L84 8 L70 14 L26 10 Q-38 22 -92 -6 Z" fill="#9c6f3e" stroke="#e4c28e" strokeWidth="1.2" />
          {/* Ballast center */}
          <circle
            cx="-38"
            cy="-2"
            r="10"
            fill={highlightedNode === 'weight' ? '#f5b841' : '#70512c'}
            stroke="#ffd27d"
            strokeWidth={highlightedNode === 'weight' ? 2.5 : 1.2}
          />
          {/* Vertical Fin highlight */}
          <path
            d="M62 6 L88 4 L82 40 L56 28 Z"
            fill={highlightedNode === 'fin' ? '#f5b841' : '#6c4520'}
            stroke="#ffd27d"
            strokeWidth={highlightedNode === 'fin' ? 2.6 : 1.4}
          />
        </g>
        <text x="24" y="30" fill="#d9be94" fontSize="10" fontFamily="monospace">
          {isRu ? 'ЧЕРТЁЖ УЗЛОВ: КРЫЛО · ВЕС · ПЛАВНИК-РУЛЬ' : 'NODE SCHEMATIC: WING · WEIGHT · TAIL FIN'}
        </text>
        <text x="24" y="176" fill="#c8964a" fontSize="10" fontFamily="monospace">
          {isRu ? 'Плавник под хвостом — не резьба, а руль' : 'The fin beneath the tail is not carving — it is a rudder'}
        </text>
      </svg>
    );
  }

  if (graphicId === 'g_1_2_candle') {
    return (
      <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#16110d]">
        {/* Candle & Flame */}
        <rect x="164" y="122" width="24" height="54" rx="2" fill="#e6d6b8" />
        <path d="M176 88 Q188 106 176 120 Q164 106 176 88 Z" fill="#ff9e3b" />
        <path d="M176 98 Q182 108 176 118 Q170 108 176 98 Z" fill="#fff2b2" />
        {/* Tail fin held in bronze tweezers above flame */}
        <line x1="70" y1="68" x2="154" y2="74" stroke="#c8964a" strokeWidth="3" />
        <path d="M150 66 L195 62 L188 86 L148 80 Z" fill="#8b5d2e" stroke="#ffd27d" strokeWidth="1.5" />
        {/* Wax bubbles */}
        <circle cx="170" cy="79" r="3" fill="#ffdc7a" />
        <circle cx="179" cy="81" r="2.2" fill="#ffdc7a" />
        <circle cx="186" cy="77" r="2.6" fill="#ffdc7a" />
        <text x="24" y="30" fill="#d9be94" fontSize="10" fontFamily="monospace">
          {isRu ? 'СВЕЧА И ВОСК · ФИКСАЦИЯ УГЛА РУЛЯ' : 'CANDLE & WAX · SETTING THE RUDDER ANGLE'}
        </text>
      </svg>
    );
  }

  // g_1_2_glider
  return (
    <svg viewBox="0 0 360 200" className="w-full h-44 rounded border border-[#c8964a]/30 bg-[#14110e]">
      <rect x="20" y="148" width="320" height="30" fill="#2c241b" />
      <g transform="translate(180,96)">
        <path d="M-128 0 Q-50 -16 65 -6 L112 2 L120 12 L95 16 L45 12 Q-55 24 -128 0 Z" fill="#b98952" stroke="#f0d2a2" strokeWidth="1.5" />
        <path d="M-45 -8 Q15 -58 72 -50 Q42 -12 22 -6 Z" fill="#cfa066" stroke="#f7dfa8" strokeWidth="1.3" />
        <path d="M88 10 L118 8 L112 44 L82 32 Z" fill="#8b5d2e" stroke="#ffd27d" strokeWidth="1.6" />
        <circle cx="-54" cy="2" r="7" fill="none" stroke="#c8964a" strokeWidth="2.5" />
      </g>
      <text x="24" y="30" fill="#d9be94" fontSize="10" fontFamily="monospace">
        {isRu ? 'ПОЛНОРАЗМЕРНЫЙ ПЛАНЁР-СОКОЛ ГОТОВ' : 'FULL-SCALE FALCON GLIDER READY'}
      </text>
    </svg>
  );
};
