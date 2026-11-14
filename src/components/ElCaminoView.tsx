'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Compass, Ear, Guitar, Sparkles } from 'lucide-react';
import { CURRICULUM_MODULES, type CurriculumModule } from '@/lib/music/curriculum';
import {
  formatPitchClass,
  getScalePitchClasses,
  mod12,
  SCALES,
  shouldUseFlats,
  type NoteNotation,
} from '@/lib/music/theory';
import { grooveEngine } from '@/lib/music/grooves';

interface ElCaminoViewProps {
  notation: NoteNotation;
  completedModules: string[];
  onToggleComplete: (moduleId: string) => void;
  onOpenInLab: (preset: CurriculumModule['labPreset']) => void;
  onOpenEarDrill: (
    drillType: CurriculumModule['earGoal']['drillType'],
    preset: CurriculumModule['labPreset']
  ) => void;
}

export function ElCaminoView({
  notation,
  completedModules,
  onToggleComplete,
  onOpenInLab,
  onOpenEarDrill,
}: ElCaminoViewProps) {
  const [selectedId, setSelectedId] = useState<string>(CURRICULUM_MODULES[0].id);
  const current = CURRICULUM_MODULES.find((m) => m.id === selectedId) || CURRICULUM_MODULES[0];
  const isCompleted = completedModules.includes(current.id);

  const scalePcs = getScalePitchClasses(current.labPreset.rootPc, current.labPreset.scaleId);
  const scaleSet = new Set(scalePcs);
  const useFlats = shouldUseFlats(
    current.labPreset.rootPc,
    current.labPreset.scaleId.includes('minor') ? 'minor' : 'major'
  );
  const triadSet = new Set([scalePcs[0], scalePcs[2], scalePcs[4]].filter((v) => v !== undefined));

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left: 5-Module Ladder */}
      <aside className="space-y-2.5">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
            Tu Ruta (5 Módulos)
          </h2>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
            {completedModules.length}/{CURRICULUM_MODULES.length}
          </span>
        </div>

        {CURRICULUM_MODULES.map((mod) => {
          const done = completedModules.includes(mod.id);
          const active = mod.id === current.id;
          return (
            <button
              key={mod.id}
              onClick={() => setSelectedId(mod.id)}
              className={`w-full rounded-xl border p-3.5 text-left transition ${
                active
                  ? 'border-amber-500/70 bg-amber-950/30 shadow-md shadow-amber-950/20'
                  : 'border-stone-800 bg-[#181310] hover:border-stone-700 hover:bg-[#1f1814]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">
                  Módulo {mod.number} · {mod.duration}
                </span>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-stone-600" />
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-stone-100">{mod.title}</p>
            </button>
          );
        })}
      </aside>

      {/* Right: Module Content & Interactive Bridge */}
      <section className="space-y-5 rounded-2xl border border-stone-800/90 bg-[#17120f] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              <Compass className="h-3.5 w-3.5" />
              Módulo {current.number} de {CURRICULUM_MODULES.length}
            </span>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-stone-50">
              {current.title}
            </h1>
            <p className="mt-1 text-sm text-stone-300">{current.subtitle}</p>
          </div>

          <button
            onClick={() => onToggleComplete(current.id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              isCompleted
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-amber-500/50 hover:text-amber-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isCompleted ? 'Completado' : 'Marcar completado'}
          </button>
        </div>

        {/* Universal Music Concept + 12-Note Wheel */}
        <div className="grid gap-5 xl:grid-cols-[1fr_270px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-800 bg-[#1d1713] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-base font-semibold text-amber-300">
                <Sparkles className="h-4 w-4" />
                {current.universalConcept.heading}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-200">
                {current.universalConcept.body}
              </p>
              <div className="mt-3.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-100">
                💡 Clave: {current.universalConcept.keyTakeaway}
              </div>
            </div>

            <div className="rounded-xl border border-stone-800 bg-[#1d1713] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-base font-semibold text-teal-300">
                <Guitar className="h-4 w-4" />
                {current.guitarBridge.heading}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-200">
                {current.guitarBridge.body}
              </p>
            </div>
          </div>

          {/* 12-Note Universal Wheel */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-stone-800 bg-[#14100d] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Rueda de 12 Sonidos
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500">
              {SCALES[current.labPreset.scaleId].name} de{' '}
              {formatPitchClass(current.labPreset.rootPc, notation, useFlats)}
            </p>

            <svg viewBox="0 0 220 220" className="mt-2 h-48 w-48 select-none">
              <circle cx={110} cy={110} r={78} fill="none" stroke="#332922" strokeWidth={2} />
              {Array.from({ length: 12 }, (_, idx) => {
                const pc = mod12(current.labPreset.rootPc + idx);
                const angle = ((idx * 30 - 90) * Math.PI) / 180;
                const x = 110 + Math.cos(angle) * 78;
                const y = 110 + Math.sin(angle) * 78;
                const inScale = scaleSet.has(pc);
                const isRoot = idx === 0;
                const isTriad = triadSet.has(pc);
                const label = formatPitchClass(pc, notation, useFlats);

                return (
                  <g
                    key={pc}
                    className="cursor-pointer"
                    onClick={() => void grooveEngine.playNote(60 + pc)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isRoot ? 16 : inScale ? 14 : 10}
                      fill={
                        isRoot
                          ? '#d97706'
                          : isTriad
                            ? '#0d9488'
                            : inScale
                              ? '#475569'
                              : '#1c1714'
                      }
                      stroke={
                        isRoot
                          ? '#fbbf24'
                          : isTriad
                            ? '#5eead4'
                            : inScale
                              ? '#94a3b8'
                              : '#332922'
                      }
                      strokeWidth={1.8}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill={inScale ? '#ffffff' : '#6b5e53'}
                      fontSize={label.length > 2 ? '9' : '10.5'}
                      fontWeight="700"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              <text x={110} y={107} textAnchor="middle" fill="#e7dccb" fontSize="11" fontWeight="700">
                1 · 3 · 5
              </text>
              <text x={110} y={122} textAnchor="middle" fill="#a89886" fontSize="9.5">
                = Acorde base
              </text>
            </svg>
            <p className="text-center text-[11px] text-stone-400">
              Toca cualquier nota para escucharla
            </p>
          </div>
        </div>

        {/* Action Bar: Jump right into Guitar Practice */}
        <div className="flex flex-col gap-3 rounded-xl border border-amber-800/30 bg-gradient-to-r from-amber-950/30 to-teal-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">{current.earGoal.title}</p>
            <p className="text-xs text-stone-300">{current.earGoal.instruction}</p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onOpenInLab(current.labPreset)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-stone-950 transition hover:bg-amber-500"
            >
              <Guitar className="h-4 w-4" />
              Probar en el Diapasón
            </button>
            <button
              onClick={() => onOpenEarDrill(current.earGoal.drillType, current.labPreset)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2.5 text-xs font-bold text-teal-200 transition hover:bg-teal-500/25"
            >
              <Ear className="h-4 w-4" />
              Ir al Reto de Oído
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

