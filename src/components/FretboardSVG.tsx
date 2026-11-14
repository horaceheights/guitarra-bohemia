'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  formatPitchClass,
  getChordFingering,
  getDegreeForPitchClass,
  getEffectiveOpenMidi,
  getRequintoPairs,
  getScalePitchClasses,
  mod12,
  shouldUseFlats,
  type ChordInfo,
  type FretboardViewMode,
  type NoteNotation,
  type ScaleId,
  type TuningId,
} from '@/lib/music/theory';
import type { StrumEvent } from '@/lib/music/grooves';
import { FINGER_STYLES } from './LeftHandDiagram';

interface FretboardSVGProps {
  rootPc: number;
  scaleId: ScaleId;
  tuningId: TuningId;
  capo: number;
  notation: NoteNotation;
  viewMode: FretboardViewMode;
  labelMode: 'degrees' | 'notes';
  activeChord?: ChordInfo | null;
  positionStartFret?: number;
  requintoStringPair?: '1-2' | '2-3';
  detectedPitchClass?: number | null;
  detectedMidi?: number | null;
  lastStrum?: StrumEvent | null;
  onHoverFinger?: (finger: number | null) => void;
  onPlayNote: (midi: number) => void;
  onPlayPair?: (midiA: number, midiB: number) => void;
  onStrumString?: (stringIdx: number, direction: 'down' | 'up') => void;
}

const MAX_FRET = 15;
const INLAY_FRETS = new Set([3, 5, 7, 9, 12, 15]);

export function FretboardSVG({
  rootPc,
  scaleId,
  tuningId,
  capo,
  notation,
  viewMode,
  labelMode,
  activeChord,
  positionStartFret = 2,
  requintoStringPair = '1-2',
  detectedPitchClass = null,
  detectedMidi = null,
  lastStrum = null,
  onHoverFinger,
  onPlayNote,
  onPlayPair,
  onStrumString,
}: FretboardSVGProps) {
  const [showRoot, setShowRoot] = useState(true);
  const [showChordTones, setShowChordTones] = useState(true);
  const [showPassingNotes, setShowPassingNotes] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isStrummingRef = useRef(false);
  const lastSvgYRef = useRef<number | null>(null);
  const didStrumDragRef = useRef(false);
  const startedOnInteractiveRef = useRef(false);
  const lastStringHitRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const [playedNoteFlash, setPlayedNoteFlash] = useState<{ id: number; label: string } | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  const openMidi = useMemo(() => getEffectiveOpenMidi(tuningId, capo), [tuningId, capo]);
  const useFlats = useMemo(
    () => shouldUseFlats(rootPc, scaleId.includes('minor') ? 'minor' : 'major'),
    [rootPc, scaleId]
  );

  const playAndFlashNote = (midi: number) => {
    onPlayNote(midi);
    const label = formatPitchClass(midi, notation, useFlats);
    setPlayedNoteFlash({ id: performance.now() + Math.random(), label });
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setPlayedNoteFlash(null);
    }, 550);
  };
  const scalePcs = useMemo(() => new Set(getScalePitchClasses(rootPc, scaleId)), [rootPc, scaleId]);

  const activeChordToneMap = useMemo(() => {
    const map = new Map<number, 'root' | 'tone'>();
    if (!activeChord) return map;
    activeChord.intervals.forEach((iv, idx) => {
      const pc = mod12(activeChord.rootPc + iv);
      map.set(pc, idx === 0 ? 'root' : 'tone');
    });
    return map;
  }, [activeChord]);

  const requintoPairs = useMemo(() => {
    if (viewMode !== 'requinto-terceras' && viewMode !== 'requinto-sextas') return [];
    const mode = viewMode === 'requinto-terceras' ? 'terceras' : 'sextas';
    const upperStringIdx = requintoStringPair === '1-2' ? 5 : 4;
    return getRequintoPairs(rootPc, scaleId, tuningId, capo, mode, upperStringIdx, MAX_FRET);
  }, [viewMode, rootPc, scaleId, tuningId, capo, requintoStringPair]);

  const isRequintoMode = viewMode === 'requinto-terceras' || viewMode === 'requinto-sextas';
  const isFingerShapeMode = viewMode === 'finger-shape';
  const chordFingering = useMemo(
    () => (activeChord ? getChordFingering(activeChord.rootPc, activeChord.quality) : null),
    [activeChord]
  );

  // Zoom into a spacious 7-fret window in Acorde y Dedos mode so frets are large & easy to read
  const displayStartFret = useMemo(() => {
    if (!isFingerShapeMode || !chordFingering) return 1;
    const maxChordFret = Math.max(...chordFingering.frets, 4);
    if (maxChordFret <= 7) return 1;
    return Math.min(9, Math.max(1, chordFingering.baseFret - 1));
  }, [isFingerShapeMode, chordFingering]);

  const displayEndFret = isFingerShapeMode ? Math.min(MAX_FRET, displayStartFret + 6) : MAX_FRET;
  const visibleFrets = useMemo(
    () => Array.from({ length: displayEndFret - displayStartFret + 1 }, (_, i) => displayStartFret + i),
    [displayStartFret, displayEndFret]
  );

  // Map detected MIDI note to most likely (stringIdx, fret) on the guitar
  const primaryDetected = useMemo(() => {
    if (detectedMidi === null || detectedMidi === undefined) return null;
    const candidates: Array<{ stringIdx: number; fret: number }> = [];
    for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
      const fret = detectedMidi - openMidi[stringIdx];
      if (fret >= 0 && fret <= MAX_FRET) {
        candidates.push({ stringIdx, fret });
      }
    }
    if (candidates.length === 0) return null;

    if (isFingerShapeMode && chordFingering) {
      const chordMatch = candidates.find((c) => chordFingering.frets[c.stringIdx] === c.fret);
      if (chordMatch) return chordMatch;
    }

    const inView = candidates.filter(
      (c) => c.fret === 0 || (c.fret >= displayStartFret && c.fret <= displayEndFret)
    );
    const pool = inView.length > 0 ? inView : candidates;
    // Prefer lowest fret (open / first position)
    return pool.reduce((best, cur) => (cur.fret < best.fret ? cur : best), pool[0]);
  }, [detectedMidi, openMidi, isFingerShapeMode, chordFingering, displayStartFret, displayEndFret]);

  // SVG Layout dimensions
  const width = 960;
  const height = 265;
  const leftPad = 48;
  const rightPad = 54;
  const topPad = 30;
  const bottomPad = 34;
  const boardWidth = width - leftPad - rightPad;
  const boardHeight = height - topPad - bottomPad;
  const fretWidth = boardWidth / visibleFrets.length;
  const stringSpacing = boardHeight / 5;

  // x position of fret center (0 = open string nut area)
  const getFretX = (fret: number) => {
    if (fret === 0 || fret < displayStartFret) return leftPad - 20;
    return leftPad + (fret - displayStartFret + 0.5) * fretWidth;
  };

  // String index 5 (high E) at top (row 0), string index 0 (low E) at bottom (row 5)
  const getStringY = (stringIdx: number) => topPad + (5 - stringIdx) * stringSpacing;

  const clientYToSvgY = (clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return null;
    return ((clientY - rect.top) / rect.height) * height;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const svgY = clientYToSvgY(e.clientY);
    if (svgY === null) return;
    isStrummingRef.current = true;
    lastSvgYRef.current = svgY;
    didStrumDragRef.current = false;
    startedOnInteractiveRef.current = Boolean((e.target as Element | null)?.closest('.cursor-pointer'));
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isStrummingRef.current || lastSvgYRef.current === null) return;
    const curY = clientYToSvgY(e.clientY);
    if (curY === null) return;
    const prevY = lastSvgYRef.current;
    if (Math.abs(curY - prevY) < 2) return;
    didStrumDragRef.current = true;

    const minY = Math.min(prevY, curY);
    const maxY = Math.max(prevY, curY);
    const direction: 'down' | 'up' = curY < prevY ? 'down' : 'up';
    const now = performance.now();

    const order = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    for (const stringIdx of order) {
      const sy = getStringY(stringIdx);
      if (sy >= minY && sy <= maxY && now - lastStringHitRef.current[stringIdx] > 65) {
        if (chordFingering && chordFingering.frets[stringIdx] === -1) continue;
        lastStringHitRef.current[stringIdx] = now;
        const fretOffset = chordFingering ? Math.max(0, chordFingering.frets[stringIdx]) : 0;
        playAndFlashNote(openMidi[stringIdx] + fretOffset);
        onStrumString?.(stringIdx, direction);
      }
    }

    lastSvgYRef.current = curY;
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isStrummingRef.current && !didStrumDragRef.current && !startedOnInteractiveRef.current) {
      const svgY = clientYToSvgY(e.clientY);
      if (svgY !== null) {
        let closestStr: number | null = null;
        let closestDist = stringSpacing * 0.55;
        for (let s = 0; s < 6; s++) {
          const dist = Math.abs(getStringY(s) - svgY);
          if (dist <= closestDist) {
            closestDist = dist;
            closestStr = s;
          }
        }
        if (closestStr !== null && (!chordFingering || chordFingering.frets[closestStr] !== -1)) {
          const fretOffset = chordFingering ? Math.max(0, chordFingering.frets[closestStr]) : 0;
          playAndFlashNote(openMidi[closestStr] + fretOffset);
          onStrumString?.(closestStr, 'down');
        }
      }
    }
    stopStrumGesture();
  };

  const stopStrumGesture = () => {
    isStrummingRef.current = false;
    lastSvgYRef.current = null;
    didStrumDragRef.current = false;
    startedOnInteractiveRef.current = false;
  };

  return (
    <div className="w-full max-w-[920px] overflow-x-auto rounded-2xl border border-amber-900/30 bg-[#181310] p-2.5 sm:p-3 shadow-inner">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={stopStrumGesture}
        onPointerLeave={stopStrumGesture}
        className={`w-full h-auto select-none ${isFingerShapeMode ? 'touch-none min-w-0 sm:min-w-[560px]' : 'touch-pan-x min-w-[560px]'}`}
        role="img"
        aria-label="Diapasón interactivo de guitarra"
      >
        <defs>
          <linearGradient id="pickBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="strumTrailDown" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="strumTrailUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.9" />
          </linearGradient>
          <filter id="pickShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Rosewood fretboard surface */}
        <rect
          x={leftPad}
          y={topPad - 12}
          width={boardWidth}
          height={boardHeight + 24}
          rx={8}
          fill="#241b16"
          stroke="#3b2d24"
          strokeWidth={1.5}
        />

        {/* Position highlight window */}
        {viewMode === 'position' && (
          <rect
            x={Math.max(leftPad, leftPad + (positionStartFret - 1) * fretWidth)}
            y={topPad - 12}
            width={fretWidth * 5}
            height={boardHeight + 24}
            fill="rgba(245, 158, 11, 0.07)"
            stroke="rgba(245, 158, 11, 0.25)"
            strokeDasharray="4 4"
            rx={6}
          />
        )}

        {/* Involved frets light highlight in Acorde y Dedos mode */}
        {isFingerShapeMode &&
          chordFingering &&
          Array.from(
            new Set(
              chordFingering.frets.filter((f) => f >= displayStartFret && f <= displayEndFret)
            )
          ).map((fret) => (
            <rect
              key={`involved-fret-${fret}`}
              x={leftPad + (fret - displayStartFret) * fretWidth + 2}
              y={topPad - 10}
              width={fretWidth - 4}
              height={boardHeight + 20}
              fill="rgba(251, 191, 36, 0.12)"
              stroke="rgba(251, 191, 36, 0.28)"
              strokeWidth={1}
              rx={5}
            />
          ))}

        {/* Nut (shown when starting at fret 1) */}
        {displayStartFret === 1 && (
          <rect
            x={leftPad - 4}
            y={topPad - 12}
            width={6}
            height={boardHeight + 24}
            rx={2}
            fill="#e7dccb"
          />
        )}

        {/* Capo indicator */}
        {capo > 0 && capo >= displayStartFret && capo <= displayEndFret && (
          <g>
            <rect
              x={leftPad + (capo - displayStartFret + 0.35) * fretWidth}
              y={topPad - 18}
              width={10}
              height={boardHeight + 36}
              rx={5}
              fill="#f59e0b"
              opacity={0.85}
            />
            <text
              x={leftPad + (capo - displayStartFret + 0.35) * fretWidth + 5}
              y={topPad - 22}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="10"
              fontWeight="700"
            >
              CAPO {capo}
            </text>
          </g>
        )}

        {/* Fret wires & fret numbers */}
        {visibleFrets.map((fret) => {
          const x = leftPad + (fret - displayStartFret + 1) * fretWidth;
          return (
            <g key={`fret-${fret}`}>
              <line
                x1={x}
                y1={topPad - 10}
                x2={x}
                y2={topPad + boardHeight + 10}
                stroke="#57463a"
                strokeWidth={fret === 12 ? 2.5 : 1.5}
              />
              {INLAY_FRETS.has(fret) && (
                <>
                  {fret === 12 ? (
                    <>
                      <circle cx={getFretX(fret)} cy={topPad + stringSpacing * 1.5} r={5} fill="#44362c" />
                      <circle cx={getFretX(fret)} cy={topPad + stringSpacing * 3.5} r={5} fill="#44362c" />
                    </>
                  ) : (
                    <circle cx={getFretX(fret)} cy={topPad + boardHeight / 2} r={5} fill="#44362c" />
                  )}
                </>
              )}
              <text
                x={getFretX(fret)}
                y={height - 10}
                textAnchor="middle"
                fill={INLAY_FRETS.has(fret) ? '#d6c7b2' : '#78685a'}
                fontSize="13"
                fontWeight={INLAY_FRETS.has(fret) ? '700' : '500'}
              >
                {fret}
              </text>
            </g>
          );
        })}

        {/* Open fret label */}
        <text x={getFretX(0)} y={height - 10} textAnchor="middle" fill="#8f7d6c" fontSize="11" fontWeight="600">
          0
        </text>

        {/* Strings (with staggered strum vibration + live mic string vibration) */}
        {[0, 1, 2, 3, 4, 5].map((stringIdx) => {
          const y = getStringY(stringIdx);
          const thickness = 3.2 - stringIdx * 0.4;
          const openName = formatPitchClass(openMidi[stringIdx], notation, useFlats);
          const isStruck = Boolean(lastStrum && lastStrum.strings.includes(stringIdx));
          const isMicString = primaryDetected?.stringIdx === stringIdx;
          const vibDelayMs =
            isStruck && lastStrum
              ? lastStrum.direction === 'up'
                ? (5 - stringIdx) * 10
                : stringIdx * 10
              : 0;
          return (
            <g key={`string-${stringIdx}`}>
              <g
                key={
                  isMicString
                    ? `mic-vib-${stringIdx}`
                    : isStruck && lastStrum
                      ? `vib-${stringIdx}-${lastStrum.id}`
                      : `idle-${stringIdx}`
                }
                className={
                  isMicString
                    ? 'animate-string-vibrate-mic'
                    : isStruck
                      ? 'animate-string-vibrate'
                      : undefined
                }
                style={!isMicString && isStruck ? { animationDelay: `${vibDelayMs}ms` } : undefined}
              >
                <line
                  x1={leftPad - 28}
                  y1={y}
                  x2={width - 28}
                  y2={y}
                  stroke={isMicString ? '#4ade80' : isStruck ? '#fbbf24' : '#b89f82'}
                  strokeWidth={isMicString || isStruck ? thickness + 1.0 : thickness}
                  opacity={isMicString || isStruck ? 0.98 : 0.78}
                />
              </g>
              <text
                x={14}
                y={y + 4}
                textAnchor="middle"
                fill={isMicString ? '#4ade80' : '#a89886'}
                fontSize="12"
                fontWeight="700"
              >
                {openName}
              </text>
            </g>
          );
        })}

        {/* Acoustic Soundhole Arc + Animated Strumming Pick & Motion Trail */}
        <g>
          <path
            d={`M ${width - 14} ${topPad - 4} A 110 110 0 0 0 ${width - 14} ${topPad + boardHeight + 4}`}
            fill="none"
            stroke="#57463a"
            strokeWidth={3}
            opacity={0.5}
          />
          {lastStrum && (() => {
            const struck = lastStrum.strings.length > 0 ? lastStrum.strings : [0, 1, 2, 3, 4, 5];
            const minStr = Math.min(...struck);
            const maxStr = Math.max(...struck);
            const yLow = getStringY(minStr);
            const yHigh = getStringY(maxStr);
            const pickX = width - 42;
            const fromY =
              lastStrum.direction === 'down'
                ? yLow + 14
                : lastStrum.direction === 'up'
                  ? yHigh - 14
                  : yLow + 10;
            const toY =
              lastStrum.direction === 'down'
                ? yHigh - 14
                : lastStrum.direction === 'up'
                  ? yLow + 14
                  : yHigh - 8;
            const midY = (fromY + toY) / 2;

            return (
              <g key={`pick-fx-${lastStrum.id}`}>
                {/* Strum motion arc trail or bass pluck ring */}
                {lastStrum.direction === 'bass' ? (
                  <g transform={`translate(${pickX}, ${yLow})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={10}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2.2}
                      className="animate-bass-ring"
                    />
                    <path
                      d="M 18 -6 L 18 6 M 13 1 L 18 6 L 23 1"
                      fill="none"
                      stroke="#fef3c7"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-strum-arrows"
                    />
                  </g>
                ) : (
                  <>
                    <path
                      d={`M ${pickX} ${fromY} Q ${pickX - 10} ${midY} ${pickX} ${toY}`}
                      fill="none"
                      stroke={
                        lastStrum.direction === 'down'
                          ? 'url(#strumTrailDown)'
                          : 'url(#strumTrailUp)'
                      }
                      strokeWidth={5}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      className="animate-strum-trail"
                    />
                    {/* Trail tip arrowhead */}
                    <path
                      d={
                        toY < fromY
                          ? `M ${pickX - 7} ${toY + 9} L ${pickX} ${toY - 2} L ${pickX + 7} ${toY + 9}`
                          : `M ${pickX - 7} ${toY - 9} L ${pickX} ${toY + 2} L ${pickX + 7} ${toY - 9}`
                      }
                      fill="none"
                      stroke="#fef3c7"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-strum-arrows"
                    />
                    {/* Visible directional chevrons beside the sweep */}
                    {[0.25, 0.5, 0.75].map((t, idx) => {
                      const cy = fromY + (toY - fromY) * t;
                      const arrowX = pickX + 18;
                      const pointingUp = toY < fromY;
                      return (
                        <path
                          key={`arrow-${idx}`}
                          d={
                            pointingUp
                              ? `M ${arrowX - 6} ${cy + 4} L ${arrowX} ${cy - 4} L ${arrowX + 6} ${cy + 4}`
                              : `M ${arrowX - 6} ${cy - 4} L ${arrowX} ${cy + 4} L ${arrowX + 6} ${cy - 4}`
                          }
                          fill="none"
                          stroke={idx === 2 ? '#fef3c7' : '#fbbf24'}
                          strokeWidth={2.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-strum-arrows"
                          style={{ animationDelay: `${idx * 25}ms` }}
                        />
                      );
                    })}
                  </>
                )}

                {/* 3D Guitar Pick (Púa) */}
                <g transform={`translate(${pickX}, 0)`}>
                  <g
                    className={
                      lastStrum.direction === 'down'
                        ? 'animate-pick-down'
                        : lastStrum.direction === 'up'
                          ? 'animate-pick-up'
                          : 'animate-pick-bass'
                    }
                    style={
                      {
                        '--pick-from-y': `${fromY}px`,
                        '--pick-to-y': `${toY}px`,
                      } as React.CSSProperties
                    }
                    filter="url(#pickShadow)"
                  >
                    <path
                      d="M 0 -14 C 10 -14 14 -5 11 4 C 8 12 2.5 16 0 17 C -2.5 16 -8 12 -11 4 C -14 -5 -10 -14 0 -14 Z"
                      fill="url(#pickBodyGrad)"
                      stroke="#fef3c7"
                      strokeWidth={1.5}
                    />
                    {/* Glossy top-edge highlight & grip ridge */}
                    <path
                      d="M -6.5 -9.5 C -2.5 -11.5 2.5 -11.5 6.5 -9.5"
                      fill="none"
                      stroke="#fffbeb"
                      strokeWidth={1.3}
                      strokeLinecap="round"
                      opacity={0.75}
                    />
                    <text
                      x={0}
                      y={4.5}
                      textAnchor="middle"
                      fill="#1c140d"
                      fontSize="10.5"
                      fontWeight="900"
                    >
                      {lastStrum.direction === 'down' ? '↓' : lastStrum.direction === 'up' ? '↑' : 'B'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}
        </g>

        {/* Requinto connecting lines for Terceras / Sextas */}
        {isRequintoMode &&
          requintoPairs.map((pair, idx) => {
            const x1 = getFretX(pair.upperFret);
            const y1 = getStringY(pair.upperStringIndex);
            const x2 = getFretX(pair.lowerFret);
            const y2 = getStringY(pair.lowerStringIndex);
            const isMajorInterval = pair.intervalQuality.includes('Mayor');
            return (
              <g
                key={`pair-${idx}`}
                className="cursor-pointer"
                onClick={() => onPlayPair?.(pair.upperMidi, pair.lowerMidi)}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajorInterval ? '#f59e0b' : '#2dd4bf'}
                  strokeWidth={4}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              </g>
            );
          })}

        {/* Exact Chord Fingering / Scale / Requinto Dots */}
        {isFingerShapeMode && chordFingering ? (
          <g>
            {chordFingering.barre && (
              <rect
                x={getFretX(chordFingering.barre.fret) - 12}
                y={getStringY(chordFingering.barre.toString) - 12}
                width={24}
                height={
                  getStringY(chordFingering.barre.fromString) -
                  getStringY(chordFingering.barre.toString) +
                  24
                }
                rx={12}
                fill={FINGER_STYLES[chordFingering.barre.finger].fill}
                opacity={0.45}
                stroke={FINGER_STYLES[chordFingering.barre.finger].stroke}
                strokeWidth={1.5}
              />
            )}

            {chordFingering.frets.map((fret, stringIdx) => {
              const cy = getStringY(stringIdx);
              const fingerNum = chordFingering.fingers[stringIdx];

              if (fret === -1) {
                return (
                  <text
                    key={`mute-${stringIdx}`}
                    x={getFretX(0)}
                    y={cy + 5}
                    textAnchor="middle"
                    fill="#f87171"
                    fontSize="14"
                    fontWeight="800"
                  >
                    ✕
                  </text>
                );
              }

              if (fret === 0) {
                const isOpenDetected =
                  detectedPitchClass !== null &&
                  mod12(openMidi[stringIdx]) === mod12(detectedPitchClass);
                return (
                  <g
                    key={`open-${stringIdx}`}
                    className="cursor-pointer"
                    onClick={() => playAndFlashNote(openMidi[stringIdx])}
                  >
                    {isOpenDetected && (
                      <circle
                        cx={getFretX(0)}
                        cy={cy}
                        r={14}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        opacity={0.9}
                      />
                    )}
                    <circle
                      cx={getFretX(0)}
                      cy={cy}
                      r={9.5}
                      fill={isOpenDetected ? '#14532d' : '#181310'}
                      stroke={isOpenDetected ? '#4ade80' : '#5eead4'}
                      strokeWidth={2.2}
                    />
                  </g>
                );
              }

              const cx = getFretX(fret);
              const fStyle = FINGER_STYLES[fingerNum] || FINGER_STYLES[1];
              const midi = openMidi[stringIdx] + fret;
              const isFingerDetected =
                detectedPitchClass !== null && mod12(midi) === mod12(detectedPitchClass);

              return (
                <g
                  key={`chord-dot-${stringIdx}`}
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onMouseEnter={() => onHoverFinger?.(fingerNum)}
                  onMouseLeave={() => onHoverFinger?.(null)}
                  onClick={() => {
                    onHoverFinger?.(fingerNum);
                    playAndFlashNote(midi);
                  }}
                >
                  {isFingerDetected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={21}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={2.8}
                      opacity={0.95}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={18}
                    fill={fStyle.fill}
                    stroke={fStyle.stroke}
                    strokeWidth={2.4}
                  />
                  <text
                    x={cx}
                    y={cy + 5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="14.5"
                    fontWeight="800"
                  >
                    {fingerNum}
                  </text>
                </g>
              );
            })}
          </g>
        ) : !isRequintoMode ? (
          [0, 1, 2, 3, 4, 5].map((stringIdx) =>
            Array.from({ length: MAX_FRET + 1 }, (_, fret) => {
              const midi = openMidi[stringIdx] + fret;
              const pc = mod12(midi);
              const inScale = scalePcs.has(pc);
              if (!inScale) return null;

              if (viewMode === 'position') {
                const inWindow = fret >= positionStartFret && fret <= positionStartFret + 4;
                const isOpenAllowed = positionStartFret === 0 && fret === 0;
                if (!inWindow && !isOpenAllowed) return null;
              }

              const degree = getDegreeForPitchClass(pc, rootPc, scaleId) || '';
              const isScaleRoot = pc === mod12(rootPc);
              const chordRole = activeChordToneMap.get(pc);
              const isDetected = detectedPitchClass !== null && pc === mod12(detectedPitchClass);

              if (isScaleRoot && !showRoot) return null;
              if (!isScaleRoot && chordRole && !showChordTones) return null;
              if (!isScaleRoot && !chordRole && !showPassingNotes) return null;

              let fill = '#3d4754';
              let stroke = '#64748b';
              let textFill = '#e2e8f0';
              let radius = 13.5;

              if (isScaleRoot) {
                fill = '#d97706';
                stroke = '#fbbf24';
                textFill = '#fffbeb';
                radius = 15;
              } else if (chordRole === 'root') {
                fill = '#0f766e';
                stroke = '#5eead4';
                textFill = '#f0fdfa';
                radius = 15;
              } else if (chordRole === 'tone') {
                fill = '#0d9488';
                stroke = '#5eead4';
                textFill = '#f0fdfa';
                radius = 14;
              }

              const cx = getFretX(fret);
              const cy = getStringY(stringIdx);
              const label =
                labelMode === 'degrees'
                  ? degree
                  : formatPitchClass(pc, notation, useFlats);

              return (
                <g
                  key={`dot-${stringIdx}-${fret}`}
                  className="cursor-pointer transition-transform hover:scale-110"
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onClick={() => playAndFlashNote(midi)}
                >
                  {isDetected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius + 5}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={3}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize={label.length > 2 ? '10' : '11.5'}
                    fontWeight="700"
                  >
                    {label}
                  </text>
                </g>
              );
            })
          )
        ) : (
          requintoPairs.map((pair, idx) => {
            const upperCx = getFretX(pair.upperFret);
            const upperCy = getStringY(pair.upperStringIndex);
            const lowerCx = getFretX(pair.lowerFret);
            const lowerCy = getStringY(pair.lowerStringIndex);
            const isRoot = mod12(pair.upperMidi) === mod12(rootPc);
            const upperLabel =
              labelMode === 'degrees'
                ? pair.degreeLabel
                : formatPitchClass(pair.upperMidi, notation, useFlats);
            const lowerLabel =
              labelMode === 'degrees'
                ? getDegreeForPitchClass(pair.lowerMidi, rootPc, scaleId) || ''
                : formatPitchClass(pair.lowerMidi, notation, useFlats);

            return (
              <g
                key={`req-dots-${idx}`}
                className="cursor-pointer"
                onClick={() => onPlayPair?.(pair.upperMidi, pair.lowerMidi)}
              >
                <circle
                  cx={upperCx}
                  cy={upperCy}
                  r={isRoot ? 15 : 13.5}
                  fill={isRoot ? '#d97706' : '#0d9488'}
                  stroke={isRoot ? '#fbbf24' : '#5eead4'}
                  strokeWidth={2}
                />
                <text
                  x={upperCx}
                  y={upperCy + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={upperLabel.length > 2 ? '10' : '11.5'}
                  fontWeight="700"
                >
                  {upperLabel}
                </text>

                <circle
                  cx={lowerCx}
                  cy={lowerCy}
                  r={13}
                  fill="#1e293b"
                  stroke={pair.intervalQuality.includes('Mayor') ? '#fbbf24' : '#2dd4bf'}
                  strokeWidth={2}
                />
                <text
                  x={lowerCx}
                  y={lowerCy + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={lowerLabel.length > 2 ? '10' : '11'}
                  fontWeight="700"
                >
                  {lowerLabel}
                </text>
              </g>
            );
          })
        )}

        {/* Live Mic Detected String & Exact Fret Overlay */}
        {primaryDetected && (() => {
          const { stringIdx, fret } = primaryDetected;
          const cy = getStringY(stringIdx);
          const inVisibleRange =
            fret === 0 || (fret >= displayStartFret && fret <= displayEndFret);
          const cx = inVisibleRange ? getFretX(fret) : width - 64;
          const badgeText =
            fret === 0 ? 'Al aire' : inVisibleRange ? `Traste ${fret}` : `Traste ${fret} →`;
          const badgeY = cy < topPad + 30 ? cy + 28 : cy - 22;

          return (
            <g className="pointer-events-none">
              {inVisibleRange && (
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={20}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    opacity={0.85}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={13}
                    fill="#16a34a"
                    stroke="#bbf7d0"
                    strokeWidth={2.2}
                    opacity={0.92}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                  >
                    {fret === 0 ? '0' : `T${fret}`}
                  </text>
                </>
              )}
              <rect
                x={cx - 30}
                y={badgeY - 11}
                width={60}
                height={18}
                rx={9}
                fill="#052e16"
                stroke="#4ade80"
                strokeWidth={1.3}
              />
              <text
                x={cx}
                y={badgeY + 2}
                textAnchor="middle"
                fill="#86efac"
                fontSize="10.5"
                fontWeight="800"
              >
                {badgeText}
              </text>
            </g>
          );
        })()}

        {/* Big Light Center Note Blink Display */}
        {(playedNoteFlash || detectedMidi !== null) && (() => {
          const label =
            playedNoteFlash?.label ??
            (detectedMidi !== null ? formatPitchClass(detectedMidi, notation, useFlats) : '');
          const flashKey = playedNoteFlash
            ? `flash-${playedNoteFlash.id}`
            : `mic-${detectedMidi}`;
          const centerX = leftPad + boardWidth / 2;
          const centerY = topPad + boardHeight / 2 + 26;
          return (
            <g
              key={flashKey}
              className={`pointer-events-none ${playedNoteFlash ? 'animate-center-note-blink' : ''}`}
              style={{ transformOrigin: `${centerX}px ${centerY - 22}px` }}
            >
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                fill="#fef3c7"
                fillOpacity={playedNoteFlash ? 0.85 : 0.45}
                stroke="#181310"
                strokeWidth={4}
                paintOrder="stroke"
                fontSize="82"
                fontWeight="900"
                letterSpacing="2"
              >
                {label}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Interactive Layer Toggles / Chord Fingering Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        {isFingerShapeMode ? (
          <div className="flex flex-wrap items-center gap-4 text-stone-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">1</span>
              <span>Índice</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">2</span>
              <span>Medio</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
              <span>Anular</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">4</span>
              <span>Meñique</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-teal-300" />
              <span>Al aire</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold">
              <span>✕</span>
              <span className="font-normal text-stone-300">No tocar</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRoot((v) => !v)}
              aria-pressed={showRoot}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${showRoot
                ? 'border-amber-500/40 bg-amber-500/10 text-stone-100 hover:bg-amber-500/20'
                : 'border-stone-800 bg-stone-900/40 text-stone-500 line-through hover:text-stone-300'
                }`}
            >
              <span
                className={`h-3 w-3 rounded-full ${showRoot ? 'bg-amber-600 ring-2 ring-amber-400' : 'bg-stone-700'
                  }`}
              />
              <span>Tónica / Casa (1)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowChordTones((v) => !v)}
              aria-pressed={showChordTones}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${showChordTones
                ? 'border-teal-500/40 bg-teal-500/10 text-stone-100 hover:bg-teal-500/20'
                : 'border-stone-800 bg-stone-900/40 text-stone-500 line-through hover:text-stone-300'
                }`}
            >
              <span
                className={`h-3 w-3 rounded-full ${showChordTones ? 'bg-teal-600 ring-2 ring-teal-300' : 'bg-stone-700'
                  }`}
              />
              <span>{isRequintoMode ? 'Voz principal (Tercera/Sexta)' : 'Notas del Acorde Activo (3, 5)'}</span>
            </button>

            {!isRequintoMode && (
              <button
                type="button"
                onClick={() => setShowPassingNotes((v) => !v)}
                aria-pressed={showPassingNotes}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${showPassingNotes
                  ? 'border-slate-500/40 bg-slate-500/15 text-stone-100 hover:bg-slate-500/25'
                  : 'border-stone-800 bg-stone-900/40 text-stone-500 line-through hover:text-stone-300'
                  }`}
              >
                <span
                  className={`h-3 w-3 rounded-full ${showPassingNotes ? 'bg-slate-600 ring-1 ring-slate-400' : 'bg-stone-700'
                    }`}
                />
                <span>Notas de paso (2, 4, 6, 7)</span>
              </button>
            )}

            {detectedPitchClass !== null && (
              <span className="inline-flex items-center gap-1.5 px-2 text-green-400 font-medium">
                <span className="h-3 w-3 rounded-full border-2 border-green-400" />
                <span>Nota detectada en vivo</span>
              </span>
            )}
          </div>
        )}
        <span className="text-stone-400">
          {isFingerShapeMode
            ? 'Toca cualquier dedo o cuerda al aire para escucharlo'
            : 'Haz clic en los botones para mostrar/ocultar · o en cualquier nota para escucharla'}
        </span>
      </div>
    </div>
  );
}
