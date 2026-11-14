import type * as ToneType from 'tone';
import { getChordIntervals, mod12, parseChordToken, splitProgressionTokens, type ChordInfo, type ChordQuality } from './theory';

export type GrooveStyle = '4/4' | '3/4' | '2/4' | '6/8' | 'cumbia';
export type GuitarTimbre = 'steel' | 'nylon';

export interface StrumEvent {
  id: number;
  direction: 'down' | 'up' | 'bass';
  strings: number[]; // string indices 0 (low E) .. 5 (high E)
  stepInBar?: number;
}

export interface GroovePatternSlot {
  step: number;
  type: 'down' | 'up' | 'bass' | 'rest';
  label: string;
}

export const GROOVE_PATTERNS: Record<GrooveStyle, GroovePatternSlot[]> = {
  '4/4': [
    { step: 0, type: 'down', label: '↓' },
    { step: 1, type: 'rest', label: '·' },
    { step: 2, type: 'down', label: '↓' },
    { step: 3, type: 'up', label: '↑' },
    { step: 4, type: 'rest', label: '·' },
    { step: 5, type: 'up', label: '↑' },
    { step: 6, type: 'down', label: '↓' },
    { step: 7, type: 'up', label: '↑' },
  ],
  '3/4': [
    { step: 0, type: 'bass', label: 'B' },
    { step: 1, type: 'rest', label: '·' },
    { step: 2, type: 'down', label: '↓' },
    { step: 3, type: 'rest', label: '·' },
    { step: 4, type: 'down', label: '↓' },
    { step: 5, type: 'up', label: '↑' },
  ],
  '2/4': [
    { step: 0, type: 'bass', label: 'B' },
    { step: 1, type: 'down', label: '↓' },
    { step: 2, type: 'bass', label: 'B₂' },
    { step: 3, type: 'down', label: '↓' },
  ],
  '6/8': [
    { step: 0, type: 'bass', label: 'B' },
    { step: 1, type: 'rest', label: '·' },
    { step: 2, type: 'down', label: '↓' },
    { step: 3, type: 'bass', label: 'B₂' },
    { step: 4, type: 'down', label: '↓' },
    { step: 5, type: 'up', label: '↑' },
  ],
  cumbia: [
    { step: 0, type: 'bass', label: 'B' },
    { step: 1, type: 'rest', label: '·' },
    { step: 2, type: 'down', label: '↓' },
    { step: 3, type: 'up', label: '↑' },
    { step: 4, type: 'bass', label: 'B₂' },
    { step: 5, type: 'rest', label: '·' },
    { step: 6, type: 'down', label: '↓' },
    { step: 7, type: 'up', label: '↑' },
  ],
};

export const GROOVE_STYLES: Array<{
  id: GrooveStyle;
  name: string;
  feel: string;
  defaultBpm: number;
}> = [
  { id: '4/4', name: '4/4 Balada / Pop', feel: 'Rasgueo clásico ↓ ↓↑ ↑↓↑', defaultBpm: 90 },
  { id: '3/4', name: '3/4 Ranchera / Vals', feel: 'Bajeo + rasgueos Un-dos-tres', defaultBpm: 100 },
  { id: '2/4', name: '2/4 Norteño / Polka', feel: 'Bajeo alternado + rasgueo corto', defaultBpm: 118 },
  { id: '6/8', name: '6/8 Sierreño / Corrido', feel: 'Bajeo + rasgueo sierreño', defaultBpm: 106 },
  { id: 'cumbia', name: '4/4 Cumbia', feel: 'Bajeo + contratiempo B · ↓↑ B₂ · ↓↑', defaultBpm: 96 },
];

const GUITAR_SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.mp3',
  G2: 'G2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  D3: 'D3.mp3',
  F3: 'F3.mp3',
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  B3: 'B3.mp3',
  D4: 'D4.mp3',
  E4: 'E4.mp3',
  G4: 'G4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
};

const BASS_SAMPLE_URLS: Record<string, string> = {
  E1: 'E1.mp3',
  G1: 'G1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  D2: 'D2.mp3',
  F2: 'F2.mp3',
  G2: 'G2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
};

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[mod12(midi)]}${octave}`;
}

/**
 * Exact open/barre guitar voicings (MIDI, low string to high string)
 * so strums sound like real fretboard shapes rather than keyboard triads.
 */
const OPEN_VOICINGS: Record<string, number[]> = {
  '0-maj': [48, 52, 55, 60, 64], // C
  '2-maj': [50, 57, 62, 66], // D
  '2-dom7': [50, 57, 60, 66], // D7
  '2-min': [50, 57, 62, 65], // Dm
  '4-maj': [40, 47, 52, 56, 59, 64], // E
  '4-min': [40, 47, 52, 55, 59, 64], // Em
  '4-dom7': [40, 47, 50, 56, 59, 64], // E7
  '5-maj': [41, 48, 53, 57, 60, 65], // F
  '7-maj': [43, 47, 50, 55, 59, 67], // G
  '7-dom7': [43, 47, 50, 55, 59, 65], // G7
  '9-maj': [45, 52, 57, 61, 64], // A
  '9-min': [45, 52, 57, 60, 64], // Am
  '9-dom7': [45, 52, 55, 61, 64], // A7
};

function getGuitarChordVoicing(rootPc: number, quality: ChordQuality): number[] {
  const key = `${mod12(rootPc)}-${quality}`;
  if (OPEN_VOICINGS[key]) return OPEN_VOICINGS[key];

  let bass = 40 + mod12(rootPc - 4);
  if (bass > 51) bass -= 12;
  const isLowRoot = bass <= 44;

  switch (quality) {
    case 'maj':
      return isLowRoot
        ? [bass, bass + 7, bass + 12, bass + 16, bass + 19, bass + 24]
        : [bass, bass + 7, bass + 12, bass + 16, bass + 19];
    case 'min':
      return isLowRoot
        ? [bass, bass + 7, bass + 12, bass + 15, bass + 19, bass + 24]
        : [bass, bass + 7, bass + 12, bass + 15, bass + 19];
    case 'dom7':
      return isLowRoot
        ? [bass, bass + 7, bass + 10, bass + 16, bass + 19, bass + 24]
        : [bass, bass + 7, bass + 10, bass + 16, bass + 19];
    case 'dim':
      return [bass, bass + 6, bass + 12, bass + 15, bass + 21];
  }
}

function getBassMidi(rootPc: number, alternateFifth = false): number {
  const pc = alternateFifth ? mod12(rootPc + 7) : mod12(rootPc);
  // Acoustic bass / tololoche sweet spot: E1(28)..Eb2(39) or E2(40)
  let midi = 28 + mod12(pc - 4);
  if (midi < 28) midi += 12;
  if (midi > 41) midi -= 12;
  return midi;
}

class GrooveEngine {
  private Tone: typeof ToneType | null = null;
  private steelSampler: ToneType.Sampler | null = null;
  private nylonSampler: ToneType.Sampler | null = null;
  private bassSampler: ToneType.Sampler | null = null;
  private chuckSynth: ToneType.NoiseSynth | null = null;
  private kickSynth: ToneType.MembraneSynth | null = null;
  private loop: ToneType.Loop | null = null;
  private isPlaying = false;
  private stepCount = 0;
  private guitarTimbre: GuitarTimbre = 'steel';
  private initPromise: Promise<typeof ToneType> | null = null;

  setGuitarTimbre(timbre: GuitarTimbre) {
    this.guitarTimbre = timbre;
  }

  getGuitarTimbre(): GuitarTimbre {
    return this.guitarTimbre;
  }

  private async ensureReady(): Promise<typeof ToneType> {
    if (!this.Tone) {
      this.Tone = await import('tone');
    }
    const Tone = this.Tone;
    await Tone.start();

    if (!this.initPromise) {
      this.initPromise = (async () => {
        const compressor = new Tone.Compressor(-18, 3).toDestination();
        const room = new Tone.Freeverb({
          roomSize: 0.24,
          dampening: 3200,
          wet: 0.14,
        }).connect(compressor);

        this.steelSampler = new Tone.Sampler({
          urls: GUITAR_SAMPLE_URLS,
          baseUrl: '/samples/steel/',
          release: 1.1,
          volume: -1,
        }).connect(room);

        this.nylonSampler = new Tone.Sampler({
          urls: GUITAR_SAMPLE_URLS,
          baseUrl: '/samples/nylon/',
          release: 1.2,
          volume: -1,
        }).connect(room);

        this.bassSampler = new Tone.Sampler({
          urls: BASS_SAMPLE_URLS,
          baseUrl: '/samples/bass/',
          release: 0.5,
          volume: -3,
        }).connect(compressor);

        const chuckFilter = new Tone.Filter(1700, 'bandpass').connect(room);
        this.chuckSynth = new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.002, decay: 0.035, sustain: 0 },
          volume: -20,
        }).connect(chuckFilter);

        this.kickSynth = new Tone.MembraneSynth({
          pitchDecay: 0.025,
          octaves: 2.2,
          envelope: { attack: 0.004, decay: 0.12, sustain: 0, release: 0.04 },
          volume: -19,
        }).connect(compressor);

        await Tone.loaded();
        return Tone;
      })();
    }

    return this.initPromise;
  }

  private getActiveGuitar(): ToneType.Sampler | null {
    return this.guitarTimbre === 'nylon' ? this.nylonSampler : this.steelSampler;
  }

  private strumChord(
    voicing: number[],
    direction: 'down' | 'up',
    time: number,
    spreadSec: number,
    durationSec: number,
    baseVelocity = 0.82
  ) {
    const guitar = this.getActiveGuitar();
    if (!guitar) return;

    if (direction === 'down') {
      voicing.forEach((midi, idx) => {
        const jitter = (Math.random() - 0.5) * 0.004;
        const t = Math.max(time, time + idx * spreadSec + jitter);
        const vel = Math.max(0.35, Math.min(1, baseVelocity - idx * 0.045));
        guitar.triggerAttackRelease(midiToNoteName(midi), durationSec, t, vel);
      });
    } else {
      const topStrings = voicing.slice(Math.max(0, voicing.length - 4));
      for (let i = topStrings.length - 1, step = 0; i >= 0; i--, step++) {
        const jitter = (Math.random() - 0.5) * 0.003;
        const t = Math.max(time, time + step * (spreadSec * 0.78) + jitter);
        const vel = Math.max(0.3, Math.min(0.85, baseVelocity * 0.78 - step * 0.04));
        guitar.triggerAttackRelease(midiToNoteName(topStrings[i]), durationSec * 0.85, t, vel);
      }
    }
  }

  async playNote(midi: number) {
    const Tone = await this.ensureReady();
    this.getActiveGuitar()?.triggerAttackRelease(midiToNoteName(midi), 1.4, Tone.now() + 0.01, 0.85);
  }

  async playChordStrum(rootPc: number, quality: ChordQuality, direction: 'down' | 'up' = 'down') {
    const Tone = await this.ensureReady();
    const voicing = getGuitarChordVoicing(rootPc, quality);
    this.strumChord(voicing, direction, Tone.now() + 0.01, 0.024, 1.5, 0.88);
  }

  async playPair(midiA: number, midiB: number) {
    const Tone = await this.ensureReady();
    const now = Tone.now() + 0.01;
    const guitar = this.getActiveGuitar();
    guitar?.triggerAttackRelease(midiToNoteName(midiA), 1.4, now, 0.85);
    guitar?.triggerAttackRelease(midiToNoteName(midiB), 1.4, now + 0.016, 0.82);
  }

  async playSequence(
    midis: number[],
    bpm = 96,
    onStep?: (index: number) => void
  ): Promise<void> {
    const Tone = await this.ensureReady();
    const stepSeconds = 60 / bpm;
    const now = Tone.now() + 0.05;
    const guitar = this.getActiveGuitar();

    midis.forEach((midi, idx) => {
      const t = now + idx * stepSeconds;
      guitar?.triggerAttackRelease(midiToNoteName(midi), stepSeconds * 1.1, t, 0.85);
      if (onStep) {
        setTimeout(() => onStep(idx), idx * stepSeconds * 1000);
      }
    });

    return new Promise((resolve) => {
      setTimeout(resolve, midis.length * stepSeconds * 1000 + 240);
    });
  }

  async startGroove(params: {
    progressionText: string;
    style: GrooveStyle;
    bpm: number;
    onChordChange?: (index: number, chord: ChordInfo) => void;
    onBeat?: (beatInBar: number) => void;
    onStrum?: (event: StrumEvent) => void;
  }) {
    const Tone = await this.ensureReady();
    this.stopGroove();

    const tokens = splitProgressionTokens(params.progressionText);

    const parsedChords: ChordInfo[] = tokens
      .map(parseChordToken)
      .filter((c): c is Omit<ChordInfo, 'roman'> => c !== null)
      .map((c) => ({ ...c, roman: '' }));

    const chords: ChordInfo[] =
      parsedChords.length > 0
        ? parsedChords
        : [{ symbol: 'G', rootPc: 7, quality: 'maj', intervals: getChordIntervals('maj'), roman: 'I' }];

    Tone.getTransport().bpm.value = params.bpm;
    this.stepCount = 0;

    const stepsPerBar =
      params.style === '3/4' ? 6 : params.style === '2/4' ? 4 : params.style === '6/8' ? 6 : 8;
    const eighthSec = 30 / params.bpm;

    this.loop = new Tone.Loop((time) => {
      const barIndex = Math.floor(this.stepCount / stepsPerBar);
      const stepInBar = this.stepCount % stepsPerBar;
      const chordIndex = barIndex % chords.length;
      const chord = chords[chordIndex];

      if (stepInBar === 0 && params.onChordChange) {
        Tone.getDraw().schedule(() => {
          params.onChordChange?.(chordIndex, chord);
        }, time);
      }
      if (stepInBar % 2 === 0 && params.onBeat) {
        Tone.getDraw().schedule(() => {
          params.onBeat?.(Math.floor(stepInBar / 2));
        }, time);
      }

      const voicing = getGuitarChordVoicing(chord.rootPc, chord.quality);
      const guitar = this.getActiveGuitar();

      const emitStrum = (direction: StrumEvent['direction'], strings: number[]) => {
        if (!params.onStrum) return;
        const id = this.stepCount * 10 + (direction === 'down' ? 1 : direction === 'up' ? 2 : 3);
        Tone.getDraw().schedule(() => {
          params.onStrum?.({ id, direction, strings, stepInBar });
        }, time);
      };

      if (params.style === '4/4') {
        // Classic acoustic strum: D . D U . U D U
        if (stepInBar === 0) {
          this.strumChord(voicing, 'down', time, 0.021, eighthSec * 2.2, 0.9);
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, false)), eighthSec * 2.2, time, 0.72);
          this.kickSynth?.triggerAttackRelease('C2', '8n', time);
          emitStrum('down', [0, 1, 2, 3, 4, 5]);
        } else if (stepInBar === 2) {
          this.strumChord(voicing, 'down', time, 0.015, eighthSec * 1.2, 0.78);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [0, 1, 2, 3, 4, 5]);
        } else if (stepInBar === 3 || stepInBar === 5) {
          this.strumChord(voicing, 'up', time, 0.013, eighthSec * 1.4, 0.7);
          emitStrum('up', [2, 3, 4, 5]);
        } else if (stepInBar === 6) {
          this.strumChord(voicing, 'down', time, 0.016, eighthSec * 1.2, 0.8);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [0, 1, 2, 3, 4, 5]);
        } else if (stepInBar === 7) {
          this.strumChord(voicing, 'up', time, 0.012, eighthSec * 1.0, 0.65);
          emitStrum('up', [2, 3, 4, 5]);
        }
      } else if (params.style === '3/4') {
        // Ranchera / Vals: Root Bass + Guitar Bass Note -> Down/Up strums on 2 & 3
        if (stepInBar === 0) {
          guitar?.triggerAttackRelease(midiToNoteName(voicing[0]), eighthSec * 2.1, time, 0.9);
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, false)), eighthSec * 2.0, time, 0.78);
          this.kickSynth?.triggerAttackRelease('C2', '8n', time);
          emitStrum('bass', [0]);
        } else if (stepInBar === 2 || stepInBar === 4) {
          this.strumChord(voicing.slice(1), 'down', time, 0.014, eighthSec * 1.4, 0.82);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [1, 2, 3, 4, 5]);
        } else if (stepInBar === 5) {
          this.strumChord(voicing, 'up', time, 0.012, eighthSec * 0.9, 0.58);
          emitStrum('up', [2, 3, 4, 5]);
        }
      } else if (params.style === '2/4') {
        // Norteño: Root Bass -> Crisp Strum -> 5th Bass -> Crisp Strum
        if (stepInBar === 0) {
          guitar?.triggerAttackRelease(midiToNoteName(voicing[0]), eighthSec * 1.1, time, 0.92);
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, false)), eighthSec * 1.2, time, 0.82);
          this.kickSynth?.triggerAttackRelease('C2', '16n', time);
          emitStrum('bass', [0]);
        } else if (stepInBar === 1 || stepInBar === 3) {
          this.strumChord(voicing.slice(1), 'down', time, 0.011, eighthSec * 0.9, 0.82);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [1, 2, 3, 4, 5]);
        } else if (stepInBar === 2) {
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, true)), eighthSec * 1.1, time, 0.75);
          emitStrum('bass', [0, 1]);
        }
      } else if (params.style === 'cumbia') {
        // Cumbia: Root Bass -> Chop Down/Up -> 5th Bass -> Chop Down/Up (tum-chaka tum-chaka)
        if (stepInBar === 0) {
          guitar?.triggerAttackRelease(midiToNoteName(voicing[0]), eighthSec * 1.6, time, 0.9);
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, false)), eighthSec * 1.7, time, 0.82);
          this.kickSynth?.triggerAttackRelease('C2', '16n', time);
          emitStrum('bass', [0]);
        } else if (stepInBar === 2 || stepInBar === 6) {
          this.strumChord(voicing.slice(1), 'down', time, 0.01, eighthSec * 0.75, 0.85);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [1, 2, 3, 4, 5]);
        } else if (stepInBar === 3 || stepInBar === 7) {
          this.strumChord(voicing, 'up', time, 0.01, eighthSec * 0.65, 0.68);
          emitStrum('up', [2, 3, 4, 5]);
        } else if (stepInBar === 4) {
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, true)), eighthSec * 1.6, time, 0.76);
          this.kickSynth?.triggerAttackRelease('C2', '16n', time);
          emitStrum('bass', [0, 1]);
        }
      } else {
        // 6/8 Sierreño: Root Bass -> Down -> Down -> 5th Bass -> Down -> Up
        if (stepInBar === 0) {
          guitar?.triggerAttackRelease(midiToNoteName(voicing[0]), eighthSec * 1.8, time, 0.92);
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, false)), eighthSec * 1.8, time, 0.8);
          this.kickSynth?.triggerAttackRelease('C2', '16n', time);
          emitStrum('bass', [0]);
        } else if (stepInBar === 2 || stepInBar === 4) {
          this.strumChord(voicing.slice(1), 'down', time, 0.013, eighthSec * 1.2, 0.82);
          this.chuckSynth?.triggerAttackRelease('16n', time);
          emitStrum('down', [1, 2, 3, 4, 5]);
        } else if (stepInBar === 3) {
          this.bassSampler?.triggerAttackRelease(midiToNoteName(getBassMidi(chord.rootPc, true)), eighthSec * 1.5, time, 0.74);
          emitStrum('bass', [0, 1]);
        } else if (stepInBar === 5) {
          this.strumChord(voicing, 'up', time, 0.011, eighthSec * 0.9, 0.62);
          emitStrum('up', [2, 3, 4, 5]);
        }
      }

      this.stepCount++;
    }, '8n');

    this.loop.start(0);
    Tone.getTransport().start();
    this.isPlaying = true;
  }

  setBpm(bpm: number) {
    if (this.Tone && this.isPlaying) {
      this.Tone.getTransport().bpm.value = bpm;
    }
  }

  stopGroove() {
    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }
    if (this.Tone) {
      this.Tone.getTransport().stop();
    }
    this.isPlaying = false;
  }
}

export const grooveEngine = new GrooveEngine();
