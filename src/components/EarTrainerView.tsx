'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Ear,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  formatPitchClass,
  getScalePitchClasses,
  mod12,
  SCALES,
  shouldUseFlats,
  type NoteNotation,
  type ScaleId,
} from '@/lib/music/theory';
import { grooveEngine } from '@/lib/music/grooves';
import {
  GuitarMicMonitor,
  listAudioInputDevices,
  type AudioInputDevice,
  type MicPitchReading,
} from '@/lib/audio/micPitch';

export type EarDrillType = 'find-root' | 'target-tone' | 'call-response';

interface EarTrainerViewProps {
  notation: NoteNotation;
  rootPc: number;
  scaleId: ScaleId;
  initialDrillType?: EarDrillType;
  earHits: number;
  earStreak: number;
  micNoiseGate: number;
  speakerSafeMode: boolean;
  onUpdateAudioPrefs: (prefs: { micNoiseGate?: number; speakerSafeMode?: boolean }) => void;
  onRecordHit: () => void;
  onResetStreak: () => void;
}

interface Challenge {
  type: EarDrillType;
  prompt: string;
  hint: string;
  targetPcs: number[];
  targetDegrees: string[];
  playbackMidis: number[];
}

export function EarTrainerView({
  notation,
  rootPc,
  scaleId,
  initialDrillType = 'find-root',
  earHits,
  earStreak,
  micNoiseGate,
  speakerSafeMode,
  onUpdateAudioPrefs,
  onRecordHit,
  onResetStreak,
}: EarTrainerViewProps) {
  const [drillType, setDrillType] = useState<EarDrillType>(initialDrillType);
  const [selectedRootPc, setSelectedRootPc] = useState<number>(rootPc);
  const [showCalibration, setShowCalibration] = useState(false);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [micActive, setMicActive] = useState(false);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const [micReading, setMicReading] = useState<MicPitchReading | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const [stepProgress, setStepProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Enciende tu micrófono y presiona "Escuchar reto".'
  );
  const [justSucceeded, setJustSucceeded] = useState(false);

  const micRef = useRef<GuitarMicMonitor | null>(null);
  const lastMatchAtRef = useRef<number>(0);

  const useFlats = useMemo(
    () => shouldUseFlats(selectedRootPc, scaleId.includes('minor') ? 'minor' : 'major'),
    [selectedRootPc, scaleId]
  );

  const buildChallenge = (type: EarDrillType, tonic: number): Challenge => {
    const scalePcs = getScalePitchClasses(tonic, scaleId);
    const scaleDegrees = SCALES[scaleId].degreeLabels;
    const baseMidi = 55 + ((tonic - 7 + 12) % 12); // comfortable mid guitar register

    if (type === 'find-root') {
      return {
        type,
        prompt: 'Escucha el acorde y encuentra su nota "Casa" (Tónica) en tu guitarra.',
        hint: 'Prueba deslizar una nota en la cuerda 1 o 6 hasta que sientas que descansa por completo.',
        targetPcs: [mod12(tonic)],
        targetDegrees: ['1'],
        playbackMidis: [baseMidi, baseMidi + 4, baseMidi + 7, baseMidi],
      };
    }

    if (type === 'target-tone') {
      const thirdIdx = 2; // degree 3 (or b3)
      const thirdInterval = SCALES[scaleId].intervals[thirdIdx] ?? 4;
      return {
        type,
        prompt: `Escucha la base y aterriza específicamente en la ${scaleDegrees[thirdIdx]} (${thirdInterval === 4 ? '3ra Mayor alegre' : '3ra menor melancólica'}).`,
        hint: 'Primero encuentra la Tónica y sube 3 o 4 trastes (o cambia una cuerda abajo).',
        targetPcs: [scalePcs[thirdIdx]],
        targetDegrees: [scaleDegrees[thirdIdx]],
        playbackMidis: [baseMidi, baseMidi + 7, baseMidi + thirdInterval],
      };
    }

    // call-response: 3-note melodic phrase or classic adorno
    const patterns = [
      [0, 1, 2], // 1 - 2 - 3
      [2, 1, 0], // 3 - 2 - 1 (adorno clásico)
      [4, 2, 0], // 5 - 3 - 1
      [0, 2, 4], // 1 - 3 - 5
    ];
    const picked = patterns[Math.floor(Math.random() * patterns.length)];
    const intervals = SCALES[scaleId].intervals;

    return {
      type,
      prompt: 'Llama y Responde: repite esta frase de 3 notas de oído en tu guitarra.',
      hint: `Grados de la frase: ${picked.map((i) => scaleDegrees[i] || '1').join(' – ')}`,
      targetPcs: picked.map((i) => scalePcs[i] ?? mod12(tonic)),
      targetDegrees: picked.map((i) => scaleDegrees[i] || '1'),
      playbackMidis: picked.map((i) => baseMidi + (intervals[i] ?? 0)),
    };
  };

  const [challenge, setChallenge] = useState<Challenge>(() =>
    buildChallenge(initialDrillType, rootPc)
  );

  const playChallengeAudio = async (targetChallenge = challenge) => {
    setJustSucceeded(false);
    setStepProgress(0);
    setIsPlayingPrompt(true);
    setStatusMessage('Escucha con atención...');
    await grooveEngine.playSequence(targetChallenge.playbackMidis, 92);
    setIsPlayingPrompt(false);
    setStatusMessage(
      micActive
        ? 'Tu turno: tócalo en tu guitarra.'
        : 'Enciende el micrófono abajo para validar tu respuesta.'
    );
  };

  const nextChallenge = async (newType = drillType, newRoot = selectedRootPc) => {
    const next = buildChallenge(newType, newRoot);
    setChallenge(next);
    setStepProgress(0);
    setJustSucceeded(false);
    await playChallengeAudio(next);
  };

  const startMic = async (deviceId = selectedDeviceId, gate = micNoiseGate) => {
    setMicError(null);
    try {
      if (!micRef.current) micRef.current = new GuitarMicMonitor();
      await micRef.current.start({
        deviceId: deviceId || undefined,
        noiseGate: gate,
        onReading: (reading) => setMicReading(reading),
      });
      setMicActive(true);
      const list = await listAudioInputDevices();
      setDevices(list);
    } catch {
      setMicError('Permiso de micrófono denegado o no disponible en este navegador.');
    }
  };

  const toggleMic = async () => {
    if (micActive) {
      micRef.current?.stop();
      setMicActive(false);
      setMicReading(null);
      return;
    }
    await startMic();
  };

  // Evaluate live pitch against current challenge step
  useEffect(() => {
    if (!micActive || !micReading || justSucceeded) return;
    // Speaker-safe mode ignores mic while app is playing prompt audio
    if (speakerSafeMode && isPlayingPrompt) return;

    const now = Date.now();
    if (now - lastMatchAtRef.current < 420) return;

    const expectedPc = challenge.targetPcs[stepProgress];
    if (expectedPc === undefined) return;

    if (mod12(micReading.pitchClass) === mod12(expectedPc)) {
      lastMatchAtRef.current = now;
      const nextStep = stepProgress + 1;
      if (nextStep >= challenge.targetPcs.length) {
        setStepProgress(nextStep);
        setJustSucceeded(true);
        setStatusMessage('¡Exacto! Lo clavaste de oído.');
        onRecordHit();
      } else {
        setStepProgress(nextStep);
        setStatusMessage(`¡Bien! Nota ${nextStep}/${challenge.targetPcs.length} correcta, sigue...`);
      }
    }
  }, [
    micReading,
    micActive,
    isPlayingPrompt,
    speakerSafeMode,
    challenge,
    stepProgress,
    justSucceeded,
    onRecordHit,
  ]);

  useEffect(() => {
    return () => {
      micRef.current?.stop();
    };
  }, []);

  return (
    <div className="space-y-5">
      {/* Header Stats & Calibration Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-[#17120f] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {(
            [
              { id: 'find-root', label: '1. Encuentra la Casa' },
              { id: 'target-tone', label: '2. Aterriza en la 3ra' },
              { id: 'call-response', label: '3. Llama y Responde' },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setDrillType(d.id);
                void nextChallenge(d.id, selectedRootPc);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                drillType === d.id
                  ? 'bg-amber-600 text-stone-950'
                  : 'bg-[#221b16] text-stone-300 hover:bg-[#2c231c]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="font-semibold text-amber-200">Racha: {earStreak}</span>
            <span className="text-stone-400">· Total: {earHits}</span>
          </div>

          <button
            onClick={() => {
              setShowCalibration((v) => !v);
              void listAudioInputDevices().then(setDevices);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-700 bg-[#211a15] px-3 py-2 text-xs font-semibold text-stone-200 hover:border-stone-500"
          >
            <Settings2 className="h-4 w-4" />
            Calibrar Micrófono
          </button>
        </div>
      </div>

      {/* Calibration Drawer */}
      {showCalibration && (
        <div className="grid gap-4 rounded-2xl border border-amber-800/40 bg-[#1a1410] p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-amber-300">
              Entrada de Audio (Mic o Interfaz USB)
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (micActive) void startMic(e.target.value, micNoiseGate);
              }}
              className="w-full rounded-xl border border-stone-700 bg-[#221b16] px-3 py-2 text-xs text-stone-200"
            >
              <option value="">Entrada predeterminada del sistema</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-amber-300">
              Puerta de Ruido (Sensibilidad: {micNoiseGate.toFixed(3)})
            </label>
            <input
              type="range"
              min={0.005}
              max={0.06}
              step={0.003}
              value={micNoiseGate}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateAudioPrefs({ micNoiseGate: val });
                if (micActive) void startMic(selectedDeviceId, val);
              }}
              className="w-full accent-amber-500"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Súbelo si el ruido del cuarto dispara notas falsas.
            </p>
          </div>

          <div className="flex flex-col justify-between">
            <label className="flex items-start gap-2.5 text-xs text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={speakerSafeMode}
                onChange={(e) => onUpdateAudioPrefs({ speakerSafeMode: e.target.checked })}
                className="mt-0.5 accent-teal-500"
              />
              <span>
                <strong className="inline-flex items-center gap-1 text-teal-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Modo Altavoz Seguro
                </strong>
                <span className="block text-[11px] text-stone-400">
                  Pausa la detección mientras suena el reto para que tus bocinas no engañen al mic.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Main Drill Arena */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5 rounded-2xl border border-stone-800 bg-[#17120f] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-300">
              <Ear className="h-3.5 w-3.5" />
              Tono: {formatPitchClass(selectedRootPc, notation, useFlats)} · {SCALES[scaleId].shortName}
            </span>

            <button
              onClick={() => {
                const nextRoot = (selectedRootPc + 5) % 12;
                setSelectedRootPc(nextRoot);
                void nextChallenge(drillType, nextRoot);
              }}
              className="text-xs font-medium text-amber-300 hover:underline"
            >
              Cambiar a otro tono al azar
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-stone-50">{challenge.prompt}</h2>
            <p className="mt-1.5 text-xs text-stone-400">Pista: {challenge.hint}</p>
          </div>

          {/* Step indicators */}
          <div className="flex flex-wrap items-center gap-3">
            {challenge.targetPcs.map((pc, idx) => {
              const done = idx < stepProgress;
              const current = idx === stepProgress && !justSucceeded;
              return (
                <div
                  key={idx}
                  className={`flex h-14 w-20 flex-col items-center justify-center rounded-xl border text-center transition ${
                    done
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                      : current
                        ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                        : 'border-stone-800 bg-[#201915] text-stone-500'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">Nota {idx + 1}</span>
                  <span className="text-base font-bold">
                    {done
                      ? formatPitchClass(pc, notation, useFlats)
                      : `Grado ${challenge.targetDegrees[idx]}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status Banner */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
              justSucceeded
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                : 'border-stone-800 bg-[#1f1814] text-stone-200'
            }`}
          >
            {justSucceeded && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            <span>{statusMessage}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void playChallengeAudio()}
              disabled={isPlayingPrompt}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-amber-500 disabled:opacity-60"
            >
              <span className="inline-flex" aria-hidden="true">
                <Play className="h-4 w-4" />
              </span>
              <span>{isPlayingPrompt ? 'Sonando...' : 'Escuchar Reto'}</span>
            </button>

            <button
              onClick={() => void toggleMic()}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                micActive
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                  : 'border-stone-700 bg-[#221b16] text-stone-200 hover:border-stone-500'
              }`}
            >
              <span className="inline-flex" aria-hidden="true">
                {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </span>
              <span>{micActive ? 'Micrófono Activo' : 'Activar Micrófono'}</span>
            </button>

            <button
              onClick={() => {
                if (!justSucceeded && stepProgress > 0) onResetStreak();
                void nextChallenge();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#221b16] px-4 py-2.5 text-sm font-semibold text-stone-200 hover:border-amber-500/50"
            >
              <RefreshCw className="h-4 w-4" />
              Siguiente Reto
            </button>
          </div>

          {micError && (
            <p className="text-xs text-rose-400">{micError}</p>
          )}
        </div>

        {/* Live Guitar Tuner / Pitch Meter */}
        <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-[#14100d] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Afinador / Detector en Vivo
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Toca una cuerda limpia para verificar lo que escucha tu navegador.
            </p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-stone-800/80 bg-[#1a1410] py-8">
            <span className="text-5xl font-black tracking-tight text-amber-300">
              {micActive && micReading
                ? formatPitchClass(micReading.pitchClass, notation, useFlats)
                : '—'}
            </span>
            <span className="mt-2 text-xs font-mono text-stone-400">
              {micActive && micReading
                ? `${micReading.frequency.toFixed(1)} Hz · ${micReading.cents >= 0 ? '+' : ''}${micReading.cents} cents`
                : micActive
                  ? 'Esperando sonido de tu guitarra...'
                  : 'Micrófono apagado'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-stone-400">
            <p>• Toca una nota a la vez (sin rasguear varias cuerdas) para detección precisa.</p>
            <p>• Si estás sin audífonos, deja activo el <strong>Modo Altavoz Seguro</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

