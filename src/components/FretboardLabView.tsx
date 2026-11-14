'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Hand, Mic, MicOff, Pause, Play, SlidersHorizontal, Volume2 } from 'lucide-react';
import { FretboardSVG } from './FretboardSVG';
import { LeftHandDiagram } from './LeftHandDiagram';
import {
  formatChordSymbol,
  formatPitchClass,
  getChordFingering,
  getDiatonicChords,
  parseChordToken,
  SCALES,
  shouldUseFlats,
  splitProgressionTokens,
  type ChordInfo,
  type FretboardViewMode,
  type NoteNotation,
  type ScaleId,
  type TuningId,
} from '@/lib/music/theory';
import { GROOVE_PATTERNS, GROOVE_STYLES, grooveEngine, type GrooveStyle, type GuitarTimbre, type StrumEvent } from '@/lib/music/grooves';
import { GuitarMicMonitor, type MicPitchReading } from '@/lib/audio/micPitch';

interface FretboardLabViewProps {
  notation: NoteNotation;
  tuningId: TuningId;
  capo: number;
  rootPc: number;
  onChangeRootPc: (pc: number) => void;
  scaleId: ScaleId;
  onChangeScaleId: (id: ScaleId) => void;
  viewMode: FretboardViewMode;
  onChangeViewMode: (mode: FretboardViewMode) => void;
  grooveStyle: GrooveStyle;
  onChangeGrooveStyle: (style: GrooveStyle) => void;
  bpm: number;
  onChangeBpm: (bpm: number) => void;
  progressionText: string;
  onChangeProgressionText: (text: string) => void;
  micNoiseGate: number;
}

const POSITION_WINDOWS = [
  { label: 'Trastes 0–4 (Abierta)', start: 0 },
  { label: 'Trastes 2–6', start: 2 },
  { label: 'Trastes 5–9', start: 5 },
  { label: 'Trastes 7–11', start: 7 },
  { label: 'Trastes 10–14', start: 10 },
];

export function FretboardLabView({
  notation,
  tuningId,
  capo,
  rootPc,
  onChangeRootPc,
  scaleId,
  onChangeScaleId,
  viewMode,
  onChangeViewMode,
  grooveStyle,
  onChangeGrooveStyle,
  bpm,
  onChangeBpm,
  progressionText,
  onChangeProgressionText,
  micNoiseGate,
}: FretboardLabViewProps) {
  const [labelMode, setLabelMode] = useState<'degrees' | 'notes'>('degrees');
  const [positionStart, setPositionStart] = useState<number>(2);
  const [requintoPair, setRequintoPair] = useState<'1-2' | '2-3'>('1-2');
  const [selectedChordIdx, setSelectedChordIdx] = useState<number>(0);
  const [manualChord, setManualChord] = useState<ChordInfo | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [guitarTimbre, setGuitarTimbre] = useState<GuitarTimbre>('steel');
  const [liveGrooveChord, setLiveGrooveChord] = useState<ChordInfo | null>(null);
  const [liveChordIndex, setLiveChordIndex] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [lastStrum, setLastStrum] = useState<StrumEvent | null>(null);
  const [hoveredFinger, setHoveredFinger] = useState<number | null>(null);

  const [micActive, setMicActive] = useState(false);
  const [micReading, setMicReading] = useState<MicPitchReading | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const micRef = useRef<GuitarMicMonitor | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsMobileDevice(coarse || window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const keyMode: 'major' | 'minor' = scaleId.includes('minor') ? 'minor' : 'major';
  const useFlats = useMemo(() => shouldUseFlats(rootPc, keyMode), [rootPc, keyMode]);

  const diatonicChords = useMemo(
    () => getDiatonicChords(rootPc, keyMode, notation),
    [rootPc, keyMode, notation]
  );

  const progressionChords = useMemo(() => {
    const tokens = splitProgressionTokens(progressionText);
    const parsed = tokens
      .map(parseChordToken)
      .filter((c): c is Omit<ChordInfo, 'roman'> => c !== null)
      .map((c) => ({
        ...c,
        symbol: formatChordSymbol(c.rootPc, c.quality, notation, useFlats),
      }));
    return parsed.length > 0
      ? parsed
      : [
        {
          symbol: formatChordSymbol(7, 'maj', notation, useFlats),
          rootPc: 7,
          quality: 'maj' as const,
          intervals: [0, 4, 7],
        },
      ];
  }, [progressionText, notation, useFlats]);

  const activeChord = isPlaying && liveGrooveChord
    ? liveGrooveChord
    : manualChord || diatonicChords[selectedChordIdx] || diatonicChords[0];

  const activeFingering = useMemo(
    () => (activeChord ? getChordFingering(activeChord.rootPc, activeChord.quality) : null),
    [activeChord]
  );

  const usedFingers = useMemo(
    () => (activeFingering ? activeFingering.fingers.filter((f) => f > 0) : []),
    [activeFingering]
  );

  const togglePlay = async () => {
    if (isPlaying) {
      grooveEngine.stopGroove();
      setIsPlaying(false);
      setLiveGrooveChord(null);
      setLiveChordIndex(0);
      setLastStrum(null);
      return;
    }

    setIsPlaying(true);
    await grooveEngine.startGroove({
      progressionText,
      style: grooveStyle,
      bpm,
      onChordChange: (idx, chord) => {
        setLiveChordIndex(idx);
        setLiveGrooveChord(chord);
      },
      onBeat: (beat) => setCurrentBeat(beat),
      onStrum: (event) => setLastStrum(event),
    });
  };

  const toggleMic = async () => {
    setMicError(null);
    if (micActive) {
      micRef.current?.stop();
      setMicActive(false);
      setMicReading(null);
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMicError('El micrófono en celular requiere HTTPS (o abrirlo desde localhost en la PC).');
      return;
    }
    try {
      if (!micRef.current) micRef.current = new GuitarMicMonitor();
      await micRef.current.start({
        noiseGate: micNoiseGate,
        onReading: (r) => setMicReading(r),
      });
      setMicActive(true);
    } catch {
      setMicError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  // Update BPM dynamically if playing
  useEffect(() => {
    grooveEngine.setBpm(bpm);
  }, [bpm]);

  // Restart groove in real time if style or progression changes while playing
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const didMountGrooveSync = useRef(false);

  useEffect(() => {
    if (!didMountGrooveSync.current) {
      didMountGrooveSync.current = true;
      return;
    }
    if (!isPlayingRef.current) return;
    void grooveEngine.startGroove({
      progressionText,
      style: grooveStyle,
      bpm: bpmRef.current,
      onChordChange: (idx, chord) => {
        setLiveChordIndex(idx);
        setLiveGrooveChord(chord);
      },
      onBeat: (beat) => setCurrentBeat(beat),
      onStrum: (event) => setLastStrum(event),
    });
  }, [grooveStyle, progressionText]);

  // Hands-free keyboard shortcuts: Space = Play/Pause groove, M = Mic toggle
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        void togglePlay();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        void toggleMic();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      grooveEngine.stopGroove();
      micRef.current?.stop();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Controls: Key, Scale, View Filter */}
      <div className="grid gap-4 rounded-2xl border border-stone-800 bg-[#17120f] p-4 sm:p-5 lg:grid-cols-3">
        {/* Key Picker */}
        <div>
          <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-amber-400">
            1. Tono (Nota Casa)
          </label>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, pc) => {
              const label = formatPitchClass(pc, notation, shouldUseFlats(pc, keyMode));
              const active = pc === rootPc;
              return (
                <button
                  key={pc}
                  onClick={() => onChangeRootPc(pc)}
                  className={`rounded-xl py-2.5 text-sm font-bold transition ${active
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'bg-[#211a15] text-stone-300 hover:bg-[#2c231c]'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scale Picker */}
        <div>
          <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-amber-400">
            2. Escala (Solo las esenciales)
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.values(SCALES).map((s) => (
              <button
                key={s.id}
                onClick={() => onChangeScaleId(s.id)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${scaleId === s.id
                  ? 'bg-teal-600 text-white shadow'
                  : 'bg-[#211a15] text-stone-300 hover:bg-[#2c231c]'
                  }`}
              >
                {s.shortName}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-stone-400">{SCALES[scaleId].subtitle}</p>
        </div>

        {/* View Mode & Labels */}
        <div className="space-y-3">
          <div>
            <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-amber-400">
              3. Vista del Diapasón
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'finger-shape', label: 'Acorde y Dedos' },
                  { id: 'position', label: 'Zona / Acorde' },
                  { id: 'requinto-terceras', label: 'Requinto Terceras' },
                  { id: 'requinto-sextas', label: 'Requinto Sextas' },
                  { id: 'full', label: 'Diapasón Completo' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => onChangeViewMode(v.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${viewMode === v.id
                    ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/60'
                    : 'bg-[#211a15] text-stone-300 hover:bg-[#2c231c]'
                    }`}
                >
                  {v.id === 'finger-shape' && <Hand className="h-4 w-4 text-amber-400" />}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="inline-flex rounded-xl bg-[#211a15] p-1 text-sm">
              <button
                onClick={() => setLabelMode('degrees')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${labelMode === 'degrees' ? 'bg-stone-700 text-white' : 'text-stone-400'
                  }`}
              >
                Grados (1–7)
              </button>
              <button
                onClick={() => setLabelMode('notes')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${labelMode === 'notes' ? 'bg-stone-700 text-white' : 'text-stone-400'
                  }`}
              >
                Notas
              </button>
            </div>

            {viewMode === 'position' && (
              <select
                value={positionStart}
                onChange={(e) => setPositionStart(Number(e.target.value))}
                className="rounded-xl border border-stone-700 bg-[#211a15] px-3 py-2 text-sm text-stone-200"
              >
                {POSITION_WINDOWS.map((w) => (
                  <option key={w.start} value={w.start}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}

            {(viewMode === 'requinto-terceras' || viewMode === 'requinto-sextas') && (
              <select
                value={requintoPair}
                onChange={(e) => setRequintoPair(e.target.value as '1-2' | '2-3')}
                className="rounded-xl border border-stone-700 bg-[#211a15] px-3 py-2 text-sm text-stone-200"
              >
                <option value="1-2">Cuerdas 1 y 2 (Agudas)</option>
                <option value="2-3">Cuerdas 2 y 3 (Medias)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Groove Player Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-stone-800 bg-[#181310] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void togglePlay()}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition ${isPlaying
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
              }`}
          >
            <span className="inline-flex" aria-hidden="true">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </span>
            <span>{isPlaying ? 'Detener Base' : 'Tocar Base'}</span>
          </button>

          <select
            value={grooveStyle}
            onChange={(e) => onChangeGrooveStyle(e.target.value as GrooveStyle)}
            className="rounded-xl border border-stone-700 bg-[#221b16] px-3.5 py-2.5 text-sm font-semibold text-stone-200"
          >
            {GROOVE_STYLES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border border-stone-800 bg-[#211a15] p-1 text-sm">
            <button
              onClick={() => {
                setGuitarTimbre('steel');
                grooveEngine.setGuitarTimbre('steel');
              }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${guitarTimbre === 'steel'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-300 hover:text-white'
                }`}
            >
              Acústica
            </button>
            <button
              onClick={() => {
                setGuitarTimbre('nylon');
                grooveEngine.setGuitarTimbre('nylon');
              }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${guitarTimbre === 'nylon'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-300 hover:text-white'
                }`}
            >
              Nylon
            </button>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-stone-800 bg-[#1f1814] px-3.5 py-2">
            <SlidersHorizontal className="h-4 w-4 text-stone-400" />
            <span className="text-sm font-mono text-stone-200 w-18">{bpm} BPM</span>
            <input
              type="range"
              min={60}
              max={145}
              value={bpm}
              onChange={(e) => onChangeBpm(Number(e.target.value))}
              className="w-28 accent-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-400">Progresión:</span>
            <input
              type="text"
              value={progressionText}
              onChange={(e) => {
                const raw = e.target.value;
                const formatted =
                  raw.length > progressionText.length
                    ? raw.replace(/([^\s,\-|–—>])([A-G]|Do|Re|Mi|Sol|La|Si)/g, '$1 $2')
                    : raw;
                onChangeProgressionText(formatted);
              }}
              placeholder="GD7CG"
              className="w-40 rounded-xl border border-stone-700 bg-[#221b16] px-3.5 py-2 text-sm font-mono text-amber-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-3 w-full">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-800 bg-[#1a1410] px-3.5 py-2">
              {isPlaying && (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-teal-400" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Acordes:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {progressionChords.map((chord, idx) => {
                  const isCurrent = isPlaying
                    ? liveChordIndex === idx
                    : manualChord?.symbol === chord.symbol;
                  return (
                    <button
                      type="button"
                      key={`${chord.symbol}-${idx}`}
                      onClick={() => {
                        setManualChord({ ...chord, roman: '' });
                        void grooveEngine.playChordStrum(chord.rootPc, chord.quality, 'down');
                        setLastStrum({ id: Date.now(), direction: 'down', strings: [0, 1, 2, 3, 4, 5] });
                      }}
                      className={`inline-flex h-8 min-w-9 cursor-pointer items-center justify-center rounded-lg border px-2.5 text-sm font-bold transition-all duration-100 active:scale-95 ${isCurrent
                        ? 'border-teal-300 bg-teal-500 text-stone-950 shadow-[0_0_14px_rgba(20,184,166,0.75)] scale-105'
                        : 'border-stone-700/80 bg-[#231b16] text-stone-300 hover:border-amber-500/60 hover:text-white'
                        }`}
                    >
                      {chord.symbol}
                    </button>
                  );
                })}
              </div>
              {isPlaying && (
                <span className="ml-1 text-xs font-mono text-teal-300">· pulso {currentBeat + 1}</span>
              )}
            </div>

            <button
              onClick={() => void toggleMic()}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${micActive
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                : 'border-stone-700 bg-[#211a15] text-stone-300 hover:border-stone-500'
                }`}
              title="Atajo: tecla M"
            >
              <span className="inline-flex" aria-hidden="true">
                {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </span>
              <span>
                {micActive
                  ? micReading
                    ? `Escuchando: ${formatPitchClass(micReading.pitchClass, notation, useFlats)}`
                    : 'Mic activo...'
                  : isMobileDevice
                    ? 'Ver mi guitarra'
                    : 'Ver mi guitarra (M)'}
              </span>
            </button>
          </div>

          {/* Live Strum Pattern Strip */}
          <div className="flex items-center gap-2.5 rounded-xl border border-stone-800 bg-[#1a1410] px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Rasgueo:
            </span>
            <div className="flex items-center gap-1.5">
              {GROOVE_PATTERNS[grooveStyle].map((slot) => {
                const isActive = isPlaying && lastStrum?.stepInBar === slot.step;
                if (slot.type === 'rest') {
                  return (
                    <span
                      key={slot.step}
                      className="flex h-8 w-5 items-center justify-center text-base font-bold text-stone-600"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  );
                }

                const baseColors =
                  slot.type === 'bass'
                    ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
                    : slot.type === 'down'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-orange-500/30 bg-orange-500/10 text-orange-300';

                const activeColors =
                  slot.type === 'bass'
                    ? 'border-teal-300 bg-teal-500 text-stone-950 shadow-[0_0_14px_rgba(45,212,191,0.75)] scale-115'
                    : 'border-amber-200 bg-amber-400 text-stone-950 shadow-[0_0_14px_rgba(251,191,36,0.85)] scale-115';

                return (
                  <span
                    key={slot.step}
                    title={
                      slot.type === 'down'
                        ? 'Rasgueo abajo'
                        : slot.type === 'up'
                          ? 'Rasgueo arriba'
                          : 'Bajeo'
                    }
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-base font-black transition-all duration-75 ${isActive ? activeColors : baseColors
                      }`}
                  >
                    {slot.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {micError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
          {micError}
        </div>
      )}

      {/* Interactive Fretboard + Optional Left Hand Diagram */}
      <div className={viewMode === 'finger-shape' ? 'grid gap-4 lg:grid-cols-[minmax(0,920px)_250px] items-start justify-center' : 'flex justify-center'}>
        <FretboardSVG
          rootPc={rootPc}
          scaleId={scaleId}
          tuningId={tuningId}
          capo={capo}
          notation={notation}
          viewMode={viewMode}
          labelMode={labelMode}
          activeChord={activeChord}
          positionStartFret={positionStart}
          requintoStringPair={requintoPair}
          detectedPitchClass={micActive && micReading ? micReading.pitchClass : null}
          detectedMidi={micActive && micReading ? micReading.midi : null}
          lastStrum={lastStrum}
          onHoverFinger={setHoveredFinger}
          onPlayNote={(midi) => void grooveEngine.playNote(midi)}
          onPlayPair={(m1, m2) => void grooveEngine.playPair(m1, m2)}
          onStrumString={(stringIdx, direction) =>
            setLastStrum({ id: Date.now() + stringIdx, direction, strings: [stringIdx] })
          }
        />

        {viewMode === 'finger-shape' && (
          <LeftHandDiagram
            activeFinger={hoveredFinger}
            usedFingers={usedFingers}
            chordSymbol={
              activeChord
                ? formatChordSymbol(activeChord.rootPc, activeChord.quality, notation, useFlats)
                : undefined
            }
          />
        )}
      </div>

      {/* Diatonic Chords Strip (Connect Chords -> Scale) */}
      <div className="rounded-2xl border border-stone-800 bg-[#17120f] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">
              Acordes que viven dentro de {formatPitchClass(rootPc, notation, useFlats)}{' '}
              {SCALES[scaleId].shortName}
            </h3>
            <p className="text-xs text-stone-400">
              Selecciona un acorde para ver sus notas (3 y 5 en turquesa) iluminadas dentro de la escala.
            </p>
          </div>
          {!isMobileDevice && (
            <span className="text-[11px] text-stone-500">
              Atajos: Espacio = Play/Pausa · M = Micrófono
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {diatonicChords.map((ch, idx) => {
            const isSelected = activeChord?.symbol === ch.symbol;
            return (
              <button
                key={`${ch.roman}-${ch.symbol}`}
                onClick={() => {
                  setManualChord(null);
                  setSelectedChordIdx(idx);
                  void grooveEngine.playChordStrum(ch.rootPc, ch.quality, 'down');
                  setLastStrum({ id: Date.now(), direction: 'down', strings: [0, 1, 2, 3, 4, 5] });
                }}
                className={`rounded-xl border p-2.5 text-left transition ${isSelected
                  ? 'border-teal-400/70 bg-teal-950/40'
                  : 'border-stone-800 bg-[#201915] hover:border-stone-700'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-stone-400">{ch.roman}</span>
                  <Volume2 className="h-3 w-3 text-stone-500" />
                </div>
                <p className="mt-0.5 text-base font-bold text-stone-100">{ch.symbol}</p>
                {ch.mexicanRole && (
                  <p className="mt-0.5 text-[10px] font-medium text-amber-300/90">
                    {ch.mexicanRole}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

