'use client';

import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Guitar, MessageSquare, Play, Send, Sparkles, Square, Trash2 } from 'lucide-react';
import {
  analyzeProgression,
  SCALES,
  type FretboardViewMode,
  type NoteNotation,
  type ScaleId,
} from '@/lib/music/theory';
import { PROGRESSION_PRESETS } from '@/lib/music/presets';
import { grooveEngine, type GrooveStyle } from '@/lib/music/grooves';
import type { SavedProgression } from '@/lib/storage';

interface ProgressionAnalyzerViewProps {
  notation: NoteNotation;
  savedProgressions: SavedProgression[];
  onSaveProgression: (title: string, chordsText: string) => void;
  onDeleteProgression: (id: string) => void;
  onSendToLab: (params: {
    rootPc: number;
    scaleId: ScaleId;
    viewMode: FretboardViewMode;
    groove: GrooveStyle;
    bpm: number;
    progression: string;
  }) => void;
}

export function ProgressionAnalyzerView({
  notation,
  savedProgressions,
  onSaveProgression,
  onDeleteProgression,
  onSendToLab,
}: ProgressionAnalyzerViewProps) {
  const [chordsInput, setChordsInput] = useState('G D7 C G');
  const [selectedGroove, setSelectedGroove] = useState<GrooveStyle>('6/8');
  const [bpm, setBpm] = useState<number>(106);
  const [isPlaying, setIsPlaying] = useState(false);

  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [tutorMode, setTutorMode] = useState<string | null>(null);
  const [isAskingTutor, setIsAskingTutor] = useState(false);

  const analysis = useMemo(
    () => analyzeProgression(chordsInput, notation),
    [chordsInput, notation]
  );

  const toggleGroove = async () => {
    if (isPlaying) {
      grooveEngine.stopGroove();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await grooveEngine.startGroove({
      progressionText: chordsInput,
      style: selectedGroove,
      bpm,
    });
  };

  const askTutor = async (customQ?: string) => {
    const q = (customQ ?? tutorQuestion).trim();
    if (!q) return;
    setIsAskingTutor(true);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            keyDisplay: analysis?.keyDisplay,
            progression: chordsInput,
            scaleName: analysis ? SCALES[analysis.recommendedScale].name : undefined,
            genre: 'Regional Mexicano / Acústico',
          },
        }),
      });
      const data = (await res.json()) as { reply?: string; mode?: string; error?: string };
      setTutorReply(data.reply || data.error || 'Sin respuesta.');
      setTutorMode(data.mode || null);
    } catch {
      setTutorReply('Error de red al consultar al Tutor IA.');
    } finally {
      setIsAskingTutor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Presets & Input */}
      <div className="rounded-2xl border border-stone-800 bg-[#17120f] p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100">
            Analizador de Progresiones (&ldquo;¿Por Qué Funciona Esta Canción?&rdquo;)
          </h2>
          <p className="text-xs text-stone-400">
            Escribe los acordes en inglés (<code className="text-amber-300">G D7 Em C</code>) o en español (
            <code className="text-amber-300">Sol Re7 Mim Do</code>) o elige una base clásica.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PROGRESSION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setChordsInput(preset.chordsText);
                setSelectedGroove(preset.groove);
                setBpm(preset.bpm);
                if (isPlaying) {
                  grooveEngine.stopGroove();
                  setIsPlaying(false);
                }
              }}
              className="rounded-xl border border-stone-700 bg-[#211a15] px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-amber-500/60 hover:text-amber-200"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Input Row */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={chordsInput}
            onChange={(e) => setChordsInput(e.target.value)}
            placeholder="Ej. Am G F E7  o  Sol Re Mim Do"
            className="min-w-[260px] flex-1 rounded-xl border border-stone-700 bg-[#221b16] px-4 py-2.5 text-sm font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
          />

          <button
            onClick={() => void toggleGroove()}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              isPlaying
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
            }`}
          >
            <span className="inline-flex" aria-hidden="true">
              {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </span>
            <span>{isPlaying ? 'Detener' : `Escuchar (${selectedGroove})`}</span>
          </button>

          <button
            onClick={() => {
              if (!chordsInput.trim()) return;
              const title = analysis ? `${analysis.keyDisplay} (${chordsInput.trim()})` : chordsInput.trim();
              onSaveProgression(title, chordsInput.trim());
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-[#211a15] px-3.5 py-2.5 text-xs font-semibold text-stone-200 hover:border-teal-500/50"
          >
            <BookmarkPlus className="h-4 w-4 text-teal-400" />
            Guardar
          </button>
        </div>

        {savedProgressions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Guardadas:
            </span>
            {savedProgressions.map((sp) => (
              <div
                key={sp.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-800 bg-[#1f1814] px-2.5 py-1 text-xs"
              >
                <button
                  onClick={() => setChordsInput(sp.chordsText)}
                  className="text-stone-200 hover:text-amber-300"
                >
                  {sp.chordsText}
                </button>
                <button
                  onClick={() => onDeleteProgression(sp.id)}
                  className="text-stone-500 hover:text-rose-400"
                  aria-label="Eliminar progresión guardada"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deterministic Breakdown + Tutor IA */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Breakdown */}
        <div className="space-y-4 rounded-2xl border border-stone-800 bg-[#17120f] p-5">
          {analysis ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Tonalidad Detectada ({analysis.confidence}% coincidencia)
                  </span>
                  <h3 className="text-2xl font-bold text-stone-50">{analysis.keyDisplay}</h3>
                </div>

                <button
                  onClick={() =>
                    onSendToLab({
                      rootPc: analysis.keyRootPc,
                      scaleId: analysis.recommendedScale,
                      viewMode: analysis.keyMode === 'major' ? 'requinto-terceras' : 'position',
                      groove: selectedGroove,
                      bpm,
                      progression: chordsInput,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-teal-500"
                >
                  <Guitar className="h-4 w-4" />
                  Abrir en el Diapasón
                </button>
              </div>

              <p className="text-sm text-stone-200">{analysis.summary}</p>

              {/* Chord cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {analysis.chords.map((ch, idx) => (
                  <div
                    key={`${ch.symbol}-${idx}`}
                    className="rounded-xl border border-stone-800 bg-[#201915] p-3"
                  >
                    <span className="text-xs font-mono text-amber-400">{ch.roman}</span>
                    <p className="text-lg font-bold text-stone-100">{ch.symbol}</p>
                    {ch.mexicanRole && (
                      <p className="text-[11px] text-teal-300">{ch.mexicanRole}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Scale Recommendation */}
              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                  Escala Recomendada: {SCALES[analysis.recommendedScale].name}
                </p>
                <p className="text-xs leading-relaxed text-stone-200">{analysis.secondaryNote}</p>
              </div>

              {/* Capo Suggestions */}
              {analysis.capoSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Opciones con Capotraste (Acordes más cómodos)
                  </p>
                  <div className="space-y-2">
                    {analysis.capoSuggestions.map((cap) => (
                      <div
                        key={cap.capo}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-[#1d1713] px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <span className="font-bold text-amber-300">Capo traste {cap.capo}:</span>{' '}
                          <span className="text-stone-200">
                            toca como <strong className="font-mono">{cap.playAsChords.join(' – ')}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">{cap.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">
              Escribe al menos un acorde válido (por ejemplo: <code className="text-amber-300">G D7 C</code> o{' '}
              <code className="text-amber-300">Sol Re7 Do</code>).
            </p>
          )}
        </div>

        {/* OpenRouter Tutor IA */}
        <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-[#17120f] p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-amber-300">
                <MessageSquare className="h-4 w-4" />
                Tutor IA Bohemia
              </h3>
              <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[10px] font-medium text-stone-400">
                OpenRouter
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Pregúntale en español sencillo cómo meter adornos, por qué entra un acorde o cómo sacar el requinto de esta progresión.
            </p>

            {/* Quick prompt chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                '¿Cómo hago un adorno entre estos acordes?',
                '¿Por qué suena bien esta progresión?',
                '¿Cómo empiezo un requinto aquí?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setTutorQuestion(q);
                    void askTutor(q);
                  }}
                  className="rounded-lg border border-stone-700 bg-[#221b16] px-2.5 py-1 text-[11px] text-stone-300 hover:border-amber-500/60 hover:text-amber-200"
                >
                  {q}
                </button>
              ))}
            </div>

            {tutorReply && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-amber-500/25 bg-[#1e1713] p-4 text-xs leading-relaxed text-stone-200 whitespace-pre-line">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {tutorMode === 'fallback' ? 'Guía local (sin API Key)' : 'Respuesta del Tutor IA'}
                </div>
                {tutorReply}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askTutor();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={tutorQuestion}
              onChange={(e) => setTutorQuestion(e.target.value)}
              placeholder="Escribe tu duda sobre estos acordes..."
              className="flex-1 rounded-xl border border-stone-700 bg-[#221b16] px-3.5 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAskingTutor}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-500 disabled:opacity-60"
            >
              <span className="inline-flex" aria-hidden="true">
                <Send className="h-3.5 w-3.5" />
              </span>
              <span>{isAskingTutor ? '...' : 'Preguntar'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
