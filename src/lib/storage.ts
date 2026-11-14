import { APP_CONFIG } from './config';
import type { NoteNotation, TuningId } from './music/theory';

export interface SavedProgression {
  id: string;
  title: string;
  chordsText: string;
  createdAt: string;
}

export interface BohemiaUserState {
  notation: NoteNotation;
  tuningId: TuningId;
  capo: number;
  completedModules: string[];
  earHits: number;
  earStreak: number;
  micNoiseGate: number;
  speakerSafeMode: boolean;
  savedProgressions: SavedProgression[];
}

export const DEFAULT_USER_STATE: BohemiaUserState = {
  notation: 'doremi',
  tuningId: 'standard',
  capo: 0,
  completedModules: [],
  earHits: 0,
  earStreak: 0,
  micNoiseGate: 0.008,
  speakerSafeMode: true,
  savedProgressions: [],
};

export function loadUserState(): BohemiaUserState {
  if (typeof window === 'undefined') return DEFAULT_USER_STATE;
  try {
    const raw = window.localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return DEFAULT_USER_STATE;
    const parsed = JSON.parse(raw) as Partial<BohemiaUserState>;
    return {
      ...DEFAULT_USER_STATE,
      ...parsed,
      completedModules: Array.isArray(parsed.completedModules) ? parsed.completedModules : [],
      savedProgressions: Array.isArray(parsed.savedProgressions) ? parsed.savedProgressions : [],
    };
  } catch {
    return DEFAULT_USER_STATE;
  }
}

export function saveUserState(state: BohemiaUserState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage errors in private browsing or quota limits
  }
}

