'use client';

import React from 'react';
import { APP_CONFIG } from '@/lib/config';

export function BohemiaLogo() {
  return (
    <div className="flex items-center gap-3.5">
      {/* Custom Acoustic Guitar Emblem */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-[#2a1d15] via-[#1c130e] to-[#120c09] shadow-lg shadow-amber-950/50">
        <svg
          viewBox="0 0 64 64"
          className="h-10 w-10"
          role="img"
          aria-label="Logo de Guitarra Bohemia"
        >
          <defs>
            <linearGradient id="guitarWood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="guitarHighlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Tilted Acoustic Guitar Silhouette */}
          <g transform="translate(32 32) rotate(-35) translate(-32 -32)">
            {/* Headstock */}
            <rect
              x="28.5"
              y="5"
              width="7"
              height="9"
              rx="2"
              fill="#b45309"
              stroke="#fde68a"
              strokeWidth="1"
            />
            {/* Tuning pegs */}
            <circle cx="27" cy="7.5" r="1.1" fill="#fde68a" />
            <circle cx="27" cy="11" r="1.1" fill="#fde68a" />
            <circle cx="37" cy="7.5" r="1.1" fill="#fde68a" />
            <circle cx="37" cy="11" r="1.1" fill="#fde68a" />

            {/* Neck / Fretboard */}
            <rect x="29.8" y="13" width="4.4" height="17" rx="1" fill="#451a03" />

            {/* Guitar Body (upper + lower bout) */}
            <path
              d="M 32 27
                 C 25 27, 22 31.5, 23.5 36.5
                 C 24.4 39.2, 24 40.5, 21.8 43
                 C 18.8 46.5, 20 54.5, 26.5 56.5
                 C 29.8 57.5, 34.2 57.5, 37.5 56.5
                 C 44 54.5, 45.2 46.5, 42.2 43
                 C 40 40.5, 39.6 39.2, 40.5 36.5
                 C 42 31.5, 39 27, 32 27 Z"
              fill="url(#guitarWood)"
              stroke="#fef3c7"
              strokeWidth="1.4"
            />

            {/* Subtle top sheen */}
            <ellipse cx="29" cy="46" rx="6" ry="7" fill="url(#guitarHighlight)" opacity="0.35" />

            {/* Soundhole + Rosette */}
            <circle
              cx="32"
              cy="39.5"
              r="4.2"
              fill="#1c120d"
              stroke="#fde68a"
              strokeWidth="1.2"
            />

            {/* Bridge */}
            <rect x="27.5" y="48.5" width="9" height="2.4" rx="1" fill="#29170e" />

            {/* Strings */}
            <line x1="30.8" y1="13" x2="30.8" y2="48.5" stroke="#fef3c7" strokeWidth="0.65" opacity="0.85" />
            <line x1="32" y1="13" x2="32" y2="48.5" stroke="#fef3c7" strokeWidth="0.65" opacity="0.85" />
            <line x1="33.2" y1="13" x2="33.2" y2="48.5" stroke="#fef3c7" strokeWidth="0.65" opacity="0.85" />
          </g>
        </svg>
      </div>

      {/* Word Art Title + Tagline */}
      <div className="leading-none">
        <h1 className="flex items-baseline gap-1.5 text-xl sm:text-2xl tracking-tight">
          <span className="bg-gradient-to-b from-stone-50 via-amber-100 to-amber-300 bg-clip-text font-black text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            Guitarra
          </span>
          <span className="relative inline-block bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text font-extrabold italic text-transparent">
            Bohemia
            {/* Subtle guitar-string flourish underline */}
            <svg
              viewBox="0 0 120 10"
              className="mt-0.5 block h-1.5 w-full overflow-visible"
              aria-hidden="true"
            >
              <path
                d="M 2 5 Q 60 0 118 5"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
              <circle cx="118" cy="5" r="2" fill="#fde68a" />
            </svg>
          </span>
        </h1>
        <p className="mt-0.5 text-[11px] sm:text-xs text-stone-400">
          {APP_CONFIG.tagline}
        </p>
      </div>
    </div>
  );
}
