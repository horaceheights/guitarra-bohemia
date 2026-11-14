'use client';

import React, { useState } from 'react';
import { APP_CONFIG } from '@/lib/config';
import { grooveEngine } from '@/lib/music/grooves';

export function BohemiaLogo() {
  const [strumming, setStrumming] = useState(false);

  const handleLogoStrum = () => {
    setStrumming(true);
    void grooveEngine.playChordStrum(7, 'maj', 'down');
    window.setTimeout(() => setStrumming(false), 450);
  };

  return (
    <button
      type="button"
      onClick={handleLogoStrum}
      title="¡Toca el logo para rasguear!"
      className="group flex cursor-pointer items-center gap-3.5 text-left focus:outline-none"
    >
      {/* Guitar-Pick (Púa) Sunburst Emblem with Interactive Acoustic Guitar */}
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
          strumming ? 'scale-110 -rotate-3' : ''
        }`}
      >
        <svg
          viewBox="0 0 72 72"
          className="h-14 w-14 drop-shadow-[0_4px_10px_rgba(245,158,11,0.28)]"
          role="img"
          aria-label="Logo interactivo de Guitarra Bohemia"
        >
          <defs>
            <linearGradient id="pickSunburst" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="50%" stopColor="#29150b" />
              <stop offset="100%" stopColor="#140c08" />
            </linearGradient>
            <linearGradient id="pickRim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <radialGradient id="bodySunburst" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>

          {/* Outer Guitar Pick (Púa) Shield */}
          <path
            d="M 36 4 C 57 4 66 18 61 36 C 56 52 43 65 36 68 C 29 65 16 52 11 36 C 6 18 15 4 36 4 Z"
            fill="url(#pickSunburst)"
            stroke="url(#pickRim)"
            strokeWidth="2.4"
          />

          {/* Subtle inner pick groove */}
          <path
            d="M 36 8.5 C 53 8.5 60 19.5 56 35 C 51.5 48.5 41 59.5 36 62.5 C 31 59.5 20.5 48.5 16 35 C 12 19.5 19 8.5 36 8.5 Z"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="0.7"
            strokeDasharray="2 2.5"
            opacity="0.45"
          />

          {/* Tilted Acoustic Guitar */}
          <g transform="translate(36 35) rotate(-30) translate(-36 -35)">
            {/* Headstock */}
            <rect
              x="32.5"
              y="9"
              width="7"
              height="8.5"
              rx="2"
              fill="#b45309"
              stroke="#fde68a"
              strokeWidth="1"
            />
            <circle cx="31" cy="11.5" r="1.1" fill="#fde68a" />
            <circle cx="31" cy="14.8" r="1.1" fill="#fde68a" />
            <circle cx="41" cy="11.5" r="1.1" fill="#fde68a" />
            <circle cx="41" cy="14.8" r="1.1" fill="#fde68a" />

            {/* Neck */}
            <rect x="33.8" y="16.5" width="4.4" height="16.5" rx="1" fill="#2b1205" />

            {/* Sunburst Guitar Body */}
            <path
              d="M 36 29
                 C 28.5 29, 25.5 33.5, 27 38.5
                 C 28 41.5, 27.5 42.5, 25 45
                 C 21.8 48.5, 23 56.5, 30 58.5
                 C 33.5 59.5, 38.5 59.5, 42 58.5
                 C 49 56.5, 50.2 48.5, 47 45
                 C 44.5 42.5, 44 41.5, 45 38.5
                 C 46.5 33.5, 43.5 29, 36 29 Z"
              fill="url(#bodySunburst)"
              stroke="#fef3c7"
              strokeWidth="1.3"
            />

            {/* Rosette & Soundhole */}
            <circle cx="36" cy="41.5" r="5.3" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.85" />
            <circle cx="36" cy="41.5" r="3.9" fill="#140c08" stroke="#fde68a" strokeWidth="1" />

            {/* Bridge */}
            <rect x="31.5" y="50.5" width="9" height="2.4" rx="1" fill="#1c0d04" />

            {/* Strings (glow & vibrate on hover/click) */}
            <g className={strumming ? 'animate-string-vibrate' : undefined}>
              <line x1="34.8" y1="16.5" x2="34.8" y2="50.5" stroke="#fef3c7" strokeWidth="0.7" opacity="0.9" />
              <line x1="36" y1="16.5" x2="36" y2="50.5" stroke="#fde68a" strokeWidth="0.75" opacity="0.95" />
              <line x1="37.2" y1="16.5" x2="37.2" y2="50.5" stroke="#fef3c7" strokeWidth="0.7" opacity="0.9" />
            </g>
          </g>

          {/* Floating Music Note Accent */}
          <text
            x="54"
            y="18"
            fill="#2dd4bf"
            fontSize="12"
            fontWeight="900"
            className={`transition-all duration-300 ${
              strumming ? '-translate-y-1.5 opacity-100' : 'opacity-75 group-hover:-translate-y-0.5 group-hover:opacity-100'
            }`}
          >
            ♪
          </text>
        </svg>
      </div>

      {/* Creative Word Art: Guitarra Bohemia */}
      <div className="leading-none">
        <div className="relative flex flex-wrap items-baseline gap-x-2">
          {/* Guitarra with subtle 6-string backdrop */}
          <span className="relative inline-block text-xl sm:text-2xl font-black tracking-tight">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-[2.5px] opacity-20"
            >
              <span className="h-[1px] w-full bg-amber-300" />
              <span className="h-[1px] w-full bg-amber-300" />
              <span className="h-[1px] w-full bg-amber-300" />
            </span>
            <span className="relative bg-gradient-to-b from-white via-amber-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              Guitarra
            </span>
          </span>

          {/* Bohemia in tilted poster style with Soundhole "o" + Pick Swash */}
          <span className="relative inline-flex items-center text-xl sm:text-2xl font-black italic tracking-wide -rotate-2">
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              B
            </span>
            {/* Soundhole Rosette "o" */}
            <span
              className="mx-[0.5px] inline-flex h-[0.72em] w-[0.72em] translate-y-[0.04em] items-center justify-center rounded-full border-2 border-amber-300 bg-[#1a110b] shadow-[0_0_8px_rgba(251,191,36,0.45)] ring-1 ring-teal-400/70"
              aria-label="o"
            >
              <span className="h-[0.26em] w-[0.26em] rounded-full bg-amber-400/90" />
            </span>
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
              hemia
            </span>

            {/* Sweeping Guitar-Neck Swash + Mini Pick */}
            <svg
              viewBox="0 0 140 14"
              className="pointer-events-none absolute -bottom-2 left-0 h-2.5 w-full overflow-visible"
              aria-hidden="true"
            >
              <path
                d="M 2 7 Q 68 1 130 6"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M 10 10 Q 70 5 124 8.5"
                fill="none"
                stroke="#2dd4bf"
                strokeWidth="1.1"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* Mini Guitar Pick at the tip */}
              <path
                d="M 133 2 C 136 2 137.5 5 136 7.5 C 135 9.5 133.5 10.5 133 10.8 C 132.5 10.5 131 9.5 130 7.5 C 128.5 5 130 2 133 2 Z"
                fill="#fde68a"
                stroke="#b45309"
                strokeWidth="0.9"
              />
            </svg>
          </span>
        </div>

        <p className="mt-1.5 text-[11px] sm:text-xs text-stone-400">
          {APP_CONFIG.tagline}
        </p>
      </div>
    </button>
  );
}
