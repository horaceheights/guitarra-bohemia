export type NoteNotation = 'cde' | 'doremi';

export type TuningId = 'standard' | 'eb' | 'whole-down-d';

export type ScaleId =
  | 'major'
  | 'major-pentatonic'
  | 'natural-minor'
  | 'harmonic-minor'
  | 'phrygian-dominant';

export type FretboardViewMode = 'position' | 'finger-shape' | 'requinto-terceras' | 'requinto-sextas' | 'full';

export type ChordQuality = 'maj' | 'min' | 'dom7' | 'dim';

export interface TuningPreset {
  id: TuningId;
  name: string;
  shortLabel: string;
  description: string;
  /** Semitone offset relative to Standard EADGBE */
  offset: number;
  /** 6 strings from lowest pitch (string 6) to highest pitch (string 1) */
  baseMidi: [number, number, number, number, number, number];
}

export interface ScaleDefinition {
  id: ScaleId;
  name: string;
  shortName: string;
  subtitle: string;
  intervals: number[];
  degreeLabels: string[];
  genres: string[];
}

export interface ChordInfo {
  symbol: string;
  rootPc: number;
  quality: ChordQuality;
  intervals: number[];
  roman: string;
  mexicanRole?: string;
}

export interface ChordFingering {
  /** 6 elements from string 6 (index 0) to string 1 (index 5): fret number, or -1 for muted (X) */
  frets: [number, number, number, number, number, number];
  /** 6 elements: 0 = open, 1..4 = finger number, -1 = muted */
  fingers: [number, number, number, number, number, number];
  barre?: { fret: number; fromString: number; toString: number; finger: number };
  baseFret: number;
}

export interface RequintoPair {
  stepIndex: number;
  degreeLabel: string;
  upperStringIndex: number; // 0..5 (5 = high E)
  lowerStringIndex: number;
  upperFret: number;
  lowerFret: number;
  upperMidi: number;
  lowerMidi: number;
  intervalSemitones: number;
  intervalQuality: '3ra Mayor' | '3ra menor' | '6ta Mayor' | '6ta menor';
}

export interface ProgressionAnalysis {
  chords: ChordInfo[];
  keyRootPc: number;
  keyMode: 'major' | 'minor';
  keyDisplay: string;
  confidence: number;
  recommendedScale: ScaleId;
  secondaryNote?: string;
  capoSuggestions: Array<{
    capo: number;
    playAsKey: string;
    playAsChords: string[];
    reason: string;
  }>;
  summary: string;
}

const SHARP_CDE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_CDE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SHARP_DOREMI = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const FLAT_DOREMI = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// Major keys that naturally prefer flats: F(5), Bb(10), Eb(3), Ab(8), Db(1), Gb(6)
const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 6, 8, 10]);
// Minor keys that naturally prefer flats: Dm(2), Gm(7), Cm(0), Fm(5), Bbm(10), Ebm(3)
const FLAT_MINOR_ROOTS = new Set([0, 2, 3, 5, 7, 10]);

export const STANDARD_MIDI: [number, number, number, number, number, number] = [40, 45, 50, 55, 59, 64];

export const TUNING_PRESETS: Record<TuningId, TuningPreset> = {
  standard: {
    id: 'standard',
    name: 'Estándar (EADGBE)',
    shortLabel: 'Estándar',
    description: 'Afinación clásica universal para pop acústico, country, bolero y guitarra.',
    offset: 0,
    baseMidi: [40, 45, 50, 55, 59, 64],
  },
  eb: {
    id: 'eb',
    name: 'Medio Tono Abajo (Eb)',
    shortLabel: 'Medio tono (Eb)',
    description: 'Muy usada para cantar más cómodo sin cambiar posiciones de acordes.',
    offset: -1,
    baseMidi: [39, 44, 49, 54, 58, 63],
  },
  'whole-down-d': {
    id: 'whole-down-d',
    name: 'Un Tono Abajo (DGCFAD)',
    shortLabel: '1 Tono Abajo (D)',
    description: 'Afinación clásica de docerola / sierreño para ese sonido grave y brillante.',
    offset: -2,
    baseMidi: [38, 43, 48, 53, 57, 62],
  },
};

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  major: {
    id: 'major',
    name: 'Escala Mayor',
    shortName: 'Mayor',
    subtitle: 'La base de casi toda la música mexicana, pop acústico y country.',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degreeLabels: ['1', '2', '3', '4', '5', '6', '7'],
    genres: ['Norteño', 'Sierreño', 'Pop Acústico', 'Country'],
  },
  'major-pentatonic': {
    id: 'major-pentatonic',
    name: 'Pentatónica Mayor',
    shortName: 'Pent. Mayor',
    subtitle: '5 notas "cero errores": quita la 4ta y la 7ma de la escala mayor.',
    intervals: [0, 2, 4, 7, 9],
    degreeLabels: ['1', '2', '3', '5', '6'],
    genres: ['Country', 'Pop Acústico', 'Sierreño'],
  },
  'natural-minor': {
    id: 'natural-minor',
    name: 'Menor Natural',
    shortName: 'Menor Natural',
    subtitle: 'Las mismas notas que su Mayor relativa, pero descansando en el 6to grado.',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degreeLabels: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    genres: ['Corridos', 'Baladas', 'Pop'],
  },
  'harmonic-minor': {
    id: 'harmonic-minor',
    name: 'Menor Armónica',
    shortName: 'Menor Armónica',
    subtitle: 'Sube 1 traste la 7ma nota para crear el giro dramático de bolero y guitarra española.',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degreeLabels: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    genres: ['Bolero', 'Guitarra Española', 'Corrido Tumbado'],
  },
  'phrygian-dominant': {
    id: 'phrygian-dominant',
    name: 'Frigia Dominante (Española)',
    shortName: 'Española / Frigia',
    subtitle: 'El sonido flamenco / andaluz clásico sobre el acorde V7 que resuelve a menor.',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    degreeLabels: ['1', 'b2', '3', '4', '5', 'b6', 'b7'],
    genres: ['Flamenco', 'Huapango', 'Bolero'],
  },
};

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function shouldUseFlats(rootPc: number, mode: 'major' | 'minor' = 'major'): boolean {
  return mode === 'major' ? FLAT_MAJOR_ROOTS.has(mod12(rootPc)) : FLAT_MINOR_ROOTS.has(mod12(rootPc));
}

export function formatPitchClass(
  pc: number,
  notation: NoteNotation,
  useFlats = false
): string {
  const idx = mod12(pc);
  if (notation === 'doremi') {
    return useFlats ? FLAT_DOREMI[idx] : SHARP_DOREMI[idx];
  }
  return useFlats ? FLAT_CDE[idx] : SHARP_CDE[idx];
}

export function formatMidiNote(
  midi: number,
  notation: NoteNotation,
  useFlats = false
): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${formatPitchClass(midi, notation, useFlats)}${octave}`;
}

export function getEffectiveOpenMidi(
  tuningId: TuningId,
  capo = 0
): [number, number, number, number, number, number] {
  const base = TUNING_PRESETS[tuningId].baseMidi;
  return [
    base[0] + capo,
    base[1] + capo,
    base[2] + capo,
    base[3] + capo,
    base[4] + capo,
    base[5] + capo,
  ];
}

export function getScalePitchClasses(rootPc: number, scaleId: ScaleId): number[] {
  return SCALES[scaleId].intervals.map((interval) => mod12(rootPc + interval));
}

export function getDegreeForPitchClass(
  pc: number,
  rootPc: number,
  scaleId: ScaleId
): string | null {
  const diff = mod12(pc - rootPc);
  const scale = SCALES[scaleId];
  const idx = scale.intervals.indexOf(diff);
  return idx >= 0 ? scale.degreeLabels[idx] : null;
}

export function getChordIntervals(quality: ChordQuality): number[] {
  switch (quality) {
    case 'maj':
      return [0, 4, 7];
    case 'min':
      return [0, 3, 7];
    case 'dom7':
      return [0, 4, 7, 10];
    case 'dim':
      return [0, 3, 6];
  }
}

export function formatChordSymbol(
  rootPc: number,
  quality: ChordQuality,
  notation: NoteNotation,
  useFlats = false
): string {
  const root = formatPitchClass(rootPc, notation, useFlats);
  switch (quality) {
    case 'maj':
      return root;
    case 'min':
      return `${root}m`;
    case 'dom7':
      return `${root}7`;
    case 'dim':
      return `${root}°`;
  }
}

export function getDiatonicChords(
  rootPc: number,
  mode: 'major' | 'minor',
  notation: NoteNotation
): ChordInfo[] {
  const useFlats = shouldUseFlats(rootPc, mode);
  if (mode === 'major') {
    const steps: Array<{ offset: number; quality: ChordQuality; roman: string; role?: string }> = [
      { offset: 0, quality: 'maj', roman: 'I', role: 'Primera (Casa)' },
      { offset: 2, quality: 'min', roman: 'ii' },
      { offset: 4, quality: 'min', roman: 'iii' },
      { offset: 5, quality: 'maj', roman: 'IV', role: 'Tercera' },
      { offset: 7, quality: 'dom7', roman: 'V7', role: 'Segunda (Tensión)' },
      { offset: 9, quality: 'min', roman: 'vi', role: 'Relativa Menor' },
      { offset: 11, quality: 'dim', roman: 'vii°' },
    ];
    return steps.map((s) => {
      const chordRoot = mod12(rootPc + s.offset);
      return {
        symbol: formatChordSymbol(chordRoot, s.quality, notation, useFlats),
        rootPc: chordRoot,
        quality: s.quality,
        intervals: getChordIntervals(s.quality),
        roman: s.roman,
        mexicanRole: s.role,
      };
    });
  }

  const steps: Array<{ offset: number; quality: ChordQuality; roman: string; role?: string }> = [
    { offset: 0, quality: 'min', roman: 'i', role: 'Primera menor (Casa)' },
    { offset: 2, quality: 'dim', roman: 'ii°' },
    { offset: 3, quality: 'maj', roman: 'III', role: 'Relativa Mayor' },
    { offset: 5, quality: 'min', roman: 'iv', role: 'Tercera menor' },
    { offset: 7, quality: 'dom7', roman: 'V7', role: 'Segunda (Giro Armónico)' },
    { offset: 8, quality: 'maj', roman: 'VI' },
    { offset: 10, quality: 'maj', roman: 'VII' },
  ];
  return steps.map((s) => {
    const chordRoot = mod12(rootPc + s.offset);
    return {
      symbol: formatChordSymbol(chordRoot, s.quality, notation, useFlats),
      rootPc: chordRoot,
      quality: s.quality,
      intervals: getChordIntervals(s.quality),
      roman: s.roman,
      mexicanRole: s.role,
    };
  });
}

/**
 * Computes horizontal 2-string Terceras or Sextas pairs along frets 0..15
 * for Requinto / Sierreño / Norteño playing.
 */
export function getRequintoPairs(
  rootPc: number,
  scaleId: ScaleId,
  tuningId: TuningId,
  capo: number,
  mode: 'terceras' | 'sextas',
  upperStringIndex = 5, // 5 = 1st string (high E), 4 = 2nd string (B)
  maxFret = 15
): RequintoPair[] {
  const openMidi = getEffectiveOpenMidi(tuningId, capo);
  const scale = SCALES[scaleId];
  const scaleLen = scale.intervals.length;
  const lowerStringIndex = mode === 'terceras' ? Math.max(0, upperStringIndex - 1) : Math.max(0, upperStringIndex - 2);
  const upperOpen = openMidi[upperStringIndex];
  const lowerOpen = openMidi[lowerStringIndex];

  const pairs: RequintoPair[] = [];
  const stepDistance = mode === 'terceras' ? 2 : 5; // 2 scale steps = 3rd, 5 scale steps = 6th

  for (let fret = 0; fret <= maxFret; fret++) {
    const upperMidi = upperOpen + fret;
    const diffFromRoot = mod12(upperMidi - rootPc);
    const stepIdx = scale.intervals.indexOf(diffFromRoot);
    if (stepIdx === -1) continue;

    // Lower harmony note is 2 scale degrees below (for 3rds) or 5 scale degrees below (for 6ths)
    const lowerStepIdx = ((stepIdx - stepDistance) % scaleLen + scaleLen) % scaleLen;
    const upperDegreeInterval = scale.intervals[stepIdx];
    const lowerDegreeInterval = scale.intervals[lowerStepIdx];
    let semitoneSpan = upperDegreeInterval - lowerDegreeInterval;
    if (semitoneSpan <= 0) semitoneSpan += 12;

    const targetLowerMidi = upperMidi - semitoneSpan;
    const lowerFret = targetLowerMidi - lowerOpen;

    if (lowerFret < 0 || lowerFret > maxFret + 2) continue;
    if (Math.abs(lowerFret - fret) > 4) continue;

    let intervalQuality: RequintoPair['intervalQuality'] = '3ra Mayor';
    if (mode === 'terceras') {
      intervalQuality = semitoneSpan === 4 ? '3ra Mayor' : '3ra menor';
    } else {
      intervalQuality = semitoneSpan === 9 ? '6ta Mayor' : '6ta menor';
    }

    pairs.push({
      stepIndex: stepIdx,
      degreeLabel: scale.degreeLabels[stepIdx],
      upperStringIndex,
      lowerStringIndex,
      upperFret: fret,
      lowerFret,
      upperMidi,
      lowerMidi: targetLowerMidi,
      intervalSemitones: semitoneSpan,
      intervalQuality,
    });
  }

  return pairs;
}

const TOKEN_NOTE_MAP: Record<string, number> = {
  c: 0,
  do: 0,
  'c#': 1,
  'do#': 1,
  db: 1,
  reb: 1,
  d: 2,
  re: 2,
  'd#': 3,
  're#': 3,
  eb: 3,
  mib: 3,
  e: 4,
  mi: 4,
  f: 5,
  fa: 5,
  'f#': 6,
  'fa#': 6,
  gb: 6,
  solb: 6,
  g: 7,
  sol: 7,
  'g#': 8,
  'sol#': 8,
  ab: 8,
  lab: 8,
  a: 9,
  la: 9,
  'a#': 10,
  'la#': 10,
  bb: 10,
  sib: 10,
  b: 11,
  si: 11,
};

export function parseChordToken(raw: string): Omit<ChordInfo, 'roman'> | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const match = cleaned.match(
    /^(do#|reb|do|re#|mib|re|mi|fa#|solb|fa|sol#|lab|sol|la#|sib|la|si|[a-gA-G][#b]?)(.*)$/i
  );
  if (!match) return null;

  const rootStr = match[1].toLowerCase();
  const suffix = match[2].toLowerCase().trim();
  const rootPc = TOKEN_NOTE_MAP[rootStr];
  if (rootPc === undefined) return null;

  let quality: ChordQuality = 'maj';
  if (suffix.startsWith('dim') || suffix.includes('°')) {
    quality = 'dim';
  } else if (
    (suffix.startsWith('m') && !suffix.startsWith('maj')) ||
    suffix.startsWith('min')
  ) {
    quality = 'min';
  } else if (suffix.includes('7') && !suffix.includes('maj7')) {
    quality = 'dom7';
  }

  return {
    symbol: cleaned,
    rootPc,
    quality,
    intervals: getChordIntervals(quality),
  };
}

export function splitProgressionTokens(input: string): string[] {
  const chunks = input
    .split(/[\s,\-|–—>]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const tokens: string[] = [];
  const chordPattern =
    /(?:do#|reb|do|re#|mib|re|mi|fa#|solb|fa|sol#|lab|sol|la#|sib|la|si|[A-Ga-g][#b]?)(?:maj7|maj|min|dim|aug|sus[24]?|add9|m7b5|m7|m|7|6|9|°)?/gi;

  for (const chunk of chunks) {
    const matches = chunk.match(chordPattern);
    if (matches && matches.length > 0 && matches.join('').length === chunk.length) {
      tokens.push(...matches);
    } else {
      tokens.push(chunk);
    }
  }
  return tokens;
}

export function formatProgressionNotation(
  input: string,
  notation: NoteNotation,
  useFlats = false
): string {
  return splitProgressionTokens(input)
    .map((t) => {
      const parsed = parseChordToken(t);
      return parsed ? formatChordSymbol(parsed.rootPc, parsed.quality, notation, useFlats) : t;
    })
    .join(' ');
}

export function analyzeProgression(
  input: string,
  notation: NoteNotation
): ProgressionAnalysis | null {
  const tokens = splitProgressionTokens(input);

  const parsed = tokens.map(parseChordToken).filter((c): c is Omit<ChordInfo, 'roman'> => c !== null);
  if (parsed.length === 0) return null;

  let bestScore = -999;
  let bestRoot = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (let root = 0; root < 12; root++) {
    for (const mode of ['major', 'minor'] as const) {
      const diatonic = getDiatonicChords(root, mode, notation);
      let score = 0;

      for (const ch of parsed) {
        const match = diatonic.find((d) => d.rootPc === ch.rootPc);
        if (!match) {
          score -= 2;
          continue;
        }
        if (match.quality === ch.quality) {
          score += 4;
        } else if (
          (match.quality === 'dom7' && ch.quality === 'maj') ||
          (match.quality === 'maj' && ch.quality === 'dom7')
        ) {
          score += 3;
        } else {
          score += 1;
        }
      }

      // Bonus if first or last chord is tonic
      if (parsed[0].rootPc === root) score += 2.5;
      if (parsed[parsed.length - 1].rootPc === root) score += 2;
      if (mode === 'major') score += 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestMode = mode;
      }
    }
  }

  const diatonic = getDiatonicChords(bestRoot, bestMode, notation);
  const useFlats = shouldUseFlats(bestRoot, bestMode);

  const enrichedChords: ChordInfo[] = parsed.map((ch) => {
    const match = diatonic.find((d) => d.rootPc === ch.rootPc);
    return {
      ...ch,
      symbol: formatChordSymbol(ch.rootPc, ch.quality, notation, useFlats),
      roman: match ? match.roman : 'Prestado',
      mexicanRole: match?.mexicanRole,
    };
  });

  // Detect harmonic minor V7 in minor key (e.g., E7 -> Am)
  const hasMinorDomV =
    bestMode === 'minor' &&
    parsed.some((c) => c.rootPc === mod12(bestRoot + 7) && (c.quality === 'dom7' || c.quality === 'maj'));

  const recommendedScale: ScaleId =
    bestMode === 'major' ? 'major' : hasMinorDomV ? 'harmonic-minor' : 'natural-minor';

  const keyDisplay = `${formatPitchClass(bestRoot, notation, useFlats)} ${
    bestMode === 'major' ? 'Mayor' : 'menor'
  }`;

  // Capo suggestions for friendly open guitar shapes (C=0, D=2, E=4, G=7, A=9)
  const friendlyMajorKeys = [0, 2, 4, 7, 9];
  const friendlyMinorKeys = [9, 4, 2]; // Am, Em, Dm
  const targetFriendly = bestMode === 'major' ? friendlyMajorKeys : friendlyMinorKeys;

  const capoSuggestions: ProgressionAnalysis['capoSuggestions'] = [];
  for (const friendlyRoot of targetFriendly) {
    const capo = mod12(bestRoot - friendlyRoot);
    if (capo >= 1 && capo <= 7) {
      const shapeKey = `${formatPitchClass(friendlyRoot, notation, false)} ${
        bestMode === 'major' ? 'Mayor' : 'menor'
      }`;
      const shapeChords = enrichedChords.map((c) =>
        formatChordSymbol(mod12(c.rootPc - capo), c.quality, notation, false)
      );
      capoSuggestions.push({
        capo,
        playAsKey: shapeKey,
        playAsChords: shapeChords,
        reason: `Usa formas abiertas de ${shapeKey} sin cejillas pesadas.`,
      });
    }
  }
  capoSuggestions.sort((a, b) => a.capo - b.capo);

  const maxPossible = parsed.length * 4 + 4.8;
  const confidence = Math.max(45, Math.min(99, Math.round((bestScore / maxPossible) * 100)));

  const secondaryNote = hasMinorDomV
    ? 'Se detectó acorde V7 dominante en tonalidad menor: al pasar por ese acorde, usa la Escala Menor Armónica (sube 1 traste la 7ma) para lograr el giro clásico de bolero/español.'
    : bestMode === 'major'
      ? 'Todos estos acordes nacen de la misma Escala Mayor. Puedes improvisar con Pentatónica Mayor para ir seguro o usar Terceras en las cuerdas 1 y 2 para requintear.'
      : 'Puedes tocar la Escala Menor Natural sobre toda la base o pensar en su Mayor relativa para tus frases.';

  return {
    chords: enrichedChords,
    keyRootPc: bestRoot,
    keyMode: bestMode,
    keyDisplay,
    confidence,
    recommendedScale,
    secondaryNote,
    capoSuggestions: capoSuggestions.slice(0, 3),
    summary: `Esta progresión vive en ${keyDisplay} (${enrichedChords.map((c) => c.roman).join(' – ')}).`,
  };
}

const OPEN_CHORD_FINGERINGS: Record<string, ChordFingering> = {
  '0-maj': { frets: [-1, 3, 2, 0, 1, 0], fingers: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
  '0-dom7': { frets: [-1, 3, 2, 3, 1, 0], fingers: [-1, 3, 2, 4, 1, 0], baseFret: 1 },
  '2-maj': { frets: [-1, -1, 0, 2, 3, 2], fingers: [-1, -1, 0, 1, 3, 2], baseFret: 1 },
  '2-min': { frets: [-1, -1, 0, 2, 3, 1], fingers: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
  '2-dom7': { frets: [-1, -1, 0, 2, 1, 2], fingers: [-1, -1, 0, 2, 1, 3], baseFret: 1 },
  '4-maj': { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
  '4-min': { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1 },
  '4-dom7': { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  '7-maj': { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
  '7-dom7': { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  '9-maj': { frets: [-1, 0, 2, 2, 2, 0], fingers: [-1, 0, 1, 2, 3, 0], baseFret: 1 },
  '9-min': { frets: [-1, 0, 2, 2, 1, 0], fingers: [-1, 0, 2, 3, 1, 0], baseFret: 1 },
  '9-dom7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [-1, 0, 2, 0, 3, 0], baseFret: 1 },
};

/**
 * Returns the exact playable guitar chord fingering (open shape when available,
 * otherwise the lowest-fret movable E-shape or A-shape barre chord).
 */
export function getChordFingering(rootPc: number, quality: ChordQuality): ChordFingering {
  const pc = mod12(rootPc);
  const openKey = `${pc}-${quality}`;
  if (OPEN_CHORD_FINGERINGS[openKey]) {
    return OPEN_CHORD_FINGERINGS[openKey];
  }

  // Compare E-shape barre fret vs A-shape barre fret
  const eFret = mod12(pc - 4) === 0 ? 12 : mod12(pc - 4);
  const aFret = mod12(pc - 9) === 0 ? 12 : mod12(pc - 9);

  if (quality === 'dim') {
    const f = Math.min(eFret, aFret);
    return {
      frets: [-1, f, f + 1, f + 2, f + 1, -1],
      fingers: [-1, 1, 2, 4, 3, -1],
      baseFret: f,
    };
  }

  if (eFret <= aFret) {
    const f = eFret;
    if (quality === 'maj') {
      return {
        frets: [f, f + 2, f + 2, f + 1, f, f],
        fingers: [1, 3, 4, 2, 1, 1],
        barre: { fret: f, fromString: 0, toString: 5, finger: 1 },
        baseFret: f,
      };
    }
    if (quality === 'min') {
      return {
        frets: [f, f + 2, f + 2, f, f, f],
        fingers: [1, 3, 4, 1, 1, 1],
        barre: { fret: f, fromString: 0, toString: 5, finger: 1 },
        baseFret: f,
      };
    }
    return {
      frets: [f, f + 2, f, f + 1, f, f],
      fingers: [1, 3, 1, 2, 1, 1],
      barre: { fret: f, fromString: 0, toString: 5, finger: 1 },
      baseFret: f,
    };
  }

  const f = aFret;
  if (quality === 'maj') {
    return {
      frets: [-1, f, f + 2, f + 2, f + 2, f],
      fingers: [-1, 1, 2, 3, 4, 1],
      barre: { fret: f, fromString: 1, toString: 5, finger: 1 },
      baseFret: f,
    };
  }
  if (quality === 'min') {
    return {
      frets: [-1, f, f + 2, f + 2, f + 1, f],
      fingers: [-1, 1, 3, 4, 2, 1],
      barre: { fret: f, fromString: 1, toString: 5, finger: 1 },
      baseFret: f,
    };
  }
  return {
    frets: [-1, f, f + 2, f, f + 2, f],
    fingers: [-1, 1, 3, 1, 4, 1],
    barre: { fret: f, fromString: 1, toString: 5, finger: 1 },
    baseFret: f,
  };
}

