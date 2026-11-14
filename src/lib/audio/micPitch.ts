import { PitchDetector } from 'pitchy';

export interface MicPitchReading {
  frequency: number;
  midi: number;
  pitchClass: number;
  cents: number;
  clarity: number;
  volume: number;
}

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === 'audioinput')
    .map((d, idx) => ({
      deviceId: d.deviceId,
      label: d.label || `Micrófono / Entrada ${idx + 1}`,
    }));
}

export class GuitarMicMonitor {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private detector: PitchDetector<Float32Array> | null = null;
  private recentMidis: number[] = [];

  async start(options: {
    deviceId?: string;
    noiseGate?: number; // RMS 0.005 .. 0.08
    clarityThreshold?: number;
    onReading: (reading: MicPitchReading | null) => void;
  }) {
    this.stop();

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    const source = this.audioCtx.createMediaStreamSource(this.stream);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 4096;

    // Gentle bass boost on the analyser path so laptop/headset mics don't lose low E2 (82 Hz)
    const bassBoost = this.audioCtx.createBiquadFilter();
    bassBoost.type = 'lowshelf';
    bassBoost.frequency.value = 140;
    bassBoost.gain.value = 6;
    source.connect(bassBoost);
    bassBoost.connect(this.analyser);

    this.buffer = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
    this.recentMidis = [];

    const noiseGate = Math.min(options.noiseGate ?? 0.008, 0.012);
    const clarityThreshold = options.clarityThreshold ?? 0.78;
    const HOLD_MS = 550;
    let lastValidAt = 0;
    let hasActiveReading = false;

    const clearIfExpired = (now: number) => {
      if (hasActiveReading && now - lastValidAt >= HOLD_MS) {
        hasActiveReading = false;
        this.recentMidis = [];
        options.onReading(null);
      }
    };

    const tick = () => {
      if (!this.analyser || !this.buffer || !this.detector || !this.audioCtx) return;

      const now = performance.now();
      this.analyser.getFloatTimeDomainData(this.buffer);

      // Compute RMS level for noise gate
      let sumSq = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        sumSq += this.buffer[i] * this.buffer[i];
      }
      const rms = Math.sqrt(sumSq / this.buffer.length);

      if (rms < noiseGate) {
        clearIfExpired(now);
        this.rafId = requestAnimationFrame(tick);
        return;
      }

      const [frequency, clarity] = this.detector.findPitch(
        this.buffer,
        this.audioCtx.sampleRate
      );

      // Guitar range ~65Hz (low C#/D/E2 ~82Hz) to ~1350Hz (high frets)
      const requiredClarity = frequency < 150 ? Math.min(clarityThreshold, 0.68) : clarityThreshold;
      if (clarity >= requiredClarity && frequency >= 65 && frequency <= 1350) {
        const exactMidi = 69 + 12 * Math.log2(frequency / 440);
        const roundedMidi = Math.round(exactMidi);
        const cents = Math.round((exactMidi - roundedMidi) * 100);

        this.recentMidis.push(roundedMidi);
        if (this.recentMidis.length > 5) this.recentMidis.shift();

        // Require simple consistency across last 2+ frames to suppress octave glitches
        const stableCount = this.recentMidis.filter((m) => m === roundedMidi).length;
        if (stableCount >= 2) {
          lastValidAt = now;
          hasActiveReading = true;
          options.onReading({
            frequency,
            midi: roundedMidi,
            pitchClass: ((roundedMidi % 12) + 12) % 12,
            cents,
            clarity,
            volume: rms,
          });
        }
      } else {
        clearIfExpired(now);
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.analyser = null;
    this.detector = null;
    this.buffer = null;
    this.recentMidis = [];
  }
}

