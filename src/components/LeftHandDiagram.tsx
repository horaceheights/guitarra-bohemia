'use client';

import React from 'react';

export const FINGER_STYLES: Record<
  number,
  { name: string; fill: string; stroke: string; badgeClass: string }
> = {
  0: {
    name: 'Al aire',
    fill: '#334155',
    stroke: '#94a3b8',
    badgeClass: 'border-slate-500/50 bg-slate-500/15 text-slate-200',
  },
  1: {
    name: 'Índice',
    fill: '#d97706',
    stroke: '#fbbf24',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-200',
  },
  2: {
    name: 'Medio',
    fill: '#0d9488',
    stroke: '#5eead4',
    badgeClass: 'border-teal-500/50 bg-teal-500/15 text-teal-200',
  },
  3: {
    name: 'Anular',
    fill: '#2563eb',
    stroke: '#93c5fd',
    badgeClass: 'border-blue-500/50 bg-blue-500/15 text-blue-200',
  },
  4: {
    name: 'Meñique',
    fill: '#7c3aed',
    stroke: '#c4b5fd',
    badgeClass: 'border-violet-500/50 bg-violet-500/15 text-violet-200',
  },
};

interface LeftHandDiagramProps {
  activeFinger?: number | null;
  usedFingers?: number[];
  chordSymbol?: string;
}

export function LeftHandDiagram({
  activeFinger = null,
  usedFingers = [],
  chordSymbol,
}: LeftHandDiagramProps) {
  const usedSet = new Set(usedFingers);
  const fingers = [
    { num: 1, x: 64, topY: 36, baseY: 108, width: 18 },
    { num: 2, x: 92, topY: 22, baseY: 104, width: 19 },
    { num: 3, x: 121, topY: 32, baseY: 106, width: 18 },
    { num: 4, x: 148, topY: 54, baseY: 114, width: 16 },
  ];

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-amber-900/30 bg-[#181310] p-4 shadow-inner">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Mano Izquierda
        </p>
        <p className="mt-0.5 text-sm font-bold text-stone-100">
          {chordSymbol ? `Acorde: ${chordSymbol}` : 'Posición de dedos'}
        </p>
      </div>

      <svg
        viewBox="0 0 200 210"
        className="my-2 h-48 w-44 select-none"
        role="img"
        aria-label="Diagrama de mano izquierda con dedos numerados del 1 al 4"
      >
        {/* Palm */}
        <path
          d="M 52 110 C 50 148 58 182 100 185 C 142 185 156 154 158 114 C 158 104 146 102 104 102 C 68 102 52 104 52 110 Z"
          fill="#2b211b"
          stroke="#57463a"
          strokeWidth={2}
        />

        {/* Thumb (behind neck) */}
        <path
          d="M 54 134 C 34 126 26 106 32 92 C 37 82 50 86 55 104"
          fill="#261d17"
          stroke="#57463a"
          strokeWidth={2}
        />
        <text x={38} y={108} textAnchor="middle" fill="#8f7d6c" fontSize="10" fontWeight="700">
          P
        </text>

        {/* 4 Fretting Fingers */}
        {fingers.map((f) => {
          const style = FINGER_STYLES[f.num];
          const isHovered = activeFinger === f.num;
          const isUsed = usedSet.has(f.num);
          const r = f.width / 2;
          return (
            <g key={f.num} opacity={usedFingers.length > 0 && !isUsed && !isHovered ? 0.35 : 1}>
              <rect
                x={f.x - r}
                y={f.topY}
                width={f.width}
                height={f.baseY - f.topY + 12}
                rx={r}
                fill={isHovered || isUsed ? style.fill : '#2b211b'}
                stroke={isHovered ? '#ffffff' : style.stroke}
                strokeWidth={isHovered ? 2.6 : 1.8}
                fillOpacity={isHovered ? 0.95 : isUsed ? 0.55 : 0.85}
              />
              <circle
                cx={f.x}
                cy={f.topY + 13}
                r={10}
                fill={style.fill}
                stroke={isHovered ? '#ffffff' : style.stroke}
                strokeWidth={1.8}
              />
              <text
                x={f.x}
                y={f.topY + 17}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11.5"
                fontWeight="800"
              >
                {f.num}
              </text>
            </g>
          );
        })}

        <text x={102} y={152} textAnchor="middle" fill="#8f7d6c" fontSize="10" fontWeight="600">
          Palma
        </text>
      </svg>

      {/* Numbered finger key */}
      <div className="grid w-full grid-cols-2 gap-1.5 text-[11px]">
        {[1, 2, 3, 4].map((num) => {
          const st = FINGER_STYLES[num];
          const isHovered = activeFinger === num;
          const isUsed = usedSet.has(num);
          return (
            <div
              key={num}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 font-semibold transition ${
                st.badgeClass
              } ${isHovered ? 'ring-2 ring-white/80' : ''} ${
                usedFingers.length > 0 && !isUsed ? 'opacity-40' : ''
              }`}
            >
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: st.fill }}
              >
                {num}
              </span>
              <span>{st.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
