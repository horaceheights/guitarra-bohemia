'use client';

import React, { useEffect, useState } from 'react';
import { Compass, Ear, Guitar, Sparkles } from 'lucide-react';
import { BohemiaLogo } from './BohemiaLogo';
import {
  formatProgressionNotation,
  shouldUseFlats,
  TUNING_PRESETS,
  type FretboardViewMode,
  type ScaleId,
  type TuningId,
} from '@/lib/music/theory';
import { type GrooveStyle } from '@/lib/music/grooves';
import {
  DEFAULT_USER_STATE,
  loadUserState,
  saveUserState,
  type BohemiaUserState,
} from '@/lib/storage';
import { ElCaminoView } from './ElCaminoView';
import { FretboardLabView } from './FretboardLabView';
import { EarTrainerView, type EarDrillType } from './EarTrainerView';
import { ProgressionAnalyzerView } from './ProgressionAnalyzerView';

type AppTab = 'camino' | 'lab' | 'oido' | 'analizador';

export function BohemiaApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('camino');
  const [userState, setUserState] = useState<BohemiaUserState>(DEFAULT_USER_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Shared musical playground state
  const [rootPc, setRootPc] = useState<number>(7); // G / Sol default
  const [scaleId, setScaleId] = useState<ScaleId>('major');
  const [viewMode, setViewMode] = useState<FretboardViewMode>('finger-shape');
  const [grooveStyle, setGrooveStyle] = useState<GrooveStyle>('6/8');
  const [bpm, setBpm] = useState<number>(106);
  const [progressionText, setProgressionText] = useState<string>('G D7 C G');
  const [earDrillType, setEarDrillType] = useState<EarDrillType>('find-root');

  useEffect(() => {
    const loaded = loadUserState();
    setUserState(loaded);
    const keyMode = scaleId.includes('minor') ? 'minor' : 'major';
    setProgressionText((prev) =>
      formatProgressionNotation(prev, loaded.notation, shouldUseFlats(rootPc, keyMode))
    );
    setHydrated(true);
  }, []);

  const updateUserState = (updater: (prev: BohemiaUserState) => BohemiaUserState) => {
    setUserState((prev) => {
      const next = updater(prev);
      saveUserState(next);
      return next;
    });
  };

  const tabs: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
    { id: 'camino', label: 'El Camino', icon: <Compass className="h-4 w-4" /> },
    { id: 'lab', label: 'Diapasón y Base', icon: <Guitar className="h-4 w-4" /> },
    { id: 'oido', label: 'Oído y Micrófono', icon: <Ear className="h-4 w-4" /> },
    { id: 'analizador', label: 'Analizador + IA', icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      {/* Studio Top Bar */}
      <header className="mb-3 sm:mb-4 flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-stone-800/90 bg-[#17120f]/95 px-4 py-3 sm:px-5 sm:py-3.5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <BohemiaLogo />

        {/* Global Guitar Controls: Notation, Tuning, Capo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-stone-800 bg-[#211a15] p-0.5 text-xs">
            <button
              onClick={() => {
                updateUserState((s) => ({ ...s, notation: 'doremi' }));
                const keyMode = scaleId.includes('minor') ? 'minor' : 'major';
                setProgressionText((prev) =>
                  formatProgressionNotation(prev, 'doremi', shouldUseFlats(rootPc, keyMode))
                );
              }}
              className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                userState.notation === 'doremi'
                  ? 'bg-amber-600 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Do-Re-Mi
            </button>
            <button
              onClick={() => {
                updateUserState((s) => ({ ...s, notation: 'cde' }));
                const keyMode = scaleId.includes('minor') ? 'minor' : 'major';
                setProgressionText((prev) =>
                  formatProgressionNotation(prev, 'cde', shouldUseFlats(rootPc, keyMode))
                );
              }}
              className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                userState.notation === 'cde'
                  ? 'bg-amber-600 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              C-D-E
            </button>
          </div>

          <select
            aria-label="Afinación de guitarra"
            value={userState.tuningId}
            onChange={(e) =>
              updateUserState((s) => ({ ...s, tuningId: e.target.value as TuningId }))
            }
            className="rounded-xl border border-stone-800 bg-[#211a15] px-3 py-1.5 text-xs font-semibold text-stone-200"
          >
            {Object.values(TUNING_PRESETS).map((t) => (
              <option key={t.id} value={t.id}>
                Afinación: {t.shortLabel}
              </option>
            ))}
          </select>

          <select
            aria-label="Capotraste"
            value={userState.capo}
            onChange={(e) => updateUserState((s) => ({ ...s, capo: Number(e.target.value) }))}
            className="rounded-xl border border-stone-800 bg-[#211a15] px-3 py-1.5 text-xs font-semibold text-stone-200"
          >
            {Array.from({ length: 8 }, (_, c) => (
              <option key={c} value={c}>
                {c === 0 ? 'Sin Capo' : `Capo Traste ${c}`}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="mb-4 sm:mb-5 flex flex-wrap gap-2 sm:gap-2.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border px-3.5 py-2 sm:px-5 sm:py-3 text-xs sm:text-base font-bold transition ${
                active
                  ? 'border-amber-500/70 bg-amber-600 text-stone-950 shadow-md shadow-amber-950/30'
                  : 'border-stone-800 bg-[#181310] text-stone-300 hover:border-stone-700 hover:text-stone-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Active Workspace */}
      <main className="flex-1">
        {!hydrated ? (
          <div className="rounded-2xl border border-stone-800 bg-[#17120f] p-8 text-center text-sm text-stone-400">
            Cargando tu estudio...
          </div>
        ) : activeTab === 'camino' ? (
          <ElCaminoView
            notation={userState.notation}
            completedModules={userState.completedModules}
            onToggleComplete={(modId) =>
              updateUserState((s) => {
                const exists = s.completedModules.includes(modId);
                return {
                  ...s,
                  completedModules: exists
                    ? s.completedModules.filter((id) => id !== modId)
                    : [...s.completedModules, modId],
                };
              })
            }
            onOpenInLab={(preset) => {
              setRootPc(preset.rootPc);
              setScaleId(preset.scaleId);
              setViewMode(preset.viewMode);
              setGrooveStyle(preset.groove);
              setBpm(preset.bpm);
              setProgressionText(preset.progression);
              setActiveTab('lab');
            }}
            onOpenEarDrill={(drillType, preset) => {
              setRootPc(preset.rootPc);
              setScaleId(preset.scaleId);
              setEarDrillType(drillType);
              setActiveTab('oido');
            }}
          />
        ) : activeTab === 'lab' ? (
          <FretboardLabView
            notation={userState.notation}
            tuningId={userState.tuningId}
            capo={userState.capo}
            rootPc={rootPc}
            onChangeRootPc={setRootPc}
            scaleId={scaleId}
            onChangeScaleId={setScaleId}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            grooveStyle={grooveStyle}
            onChangeGrooveStyle={setGrooveStyle}
            bpm={bpm}
            onChangeBpm={setBpm}
            progressionText={progressionText}
            onChangeProgressionText={setProgressionText}
            micNoiseGate={userState.micNoiseGate}
          />
        ) : activeTab === 'oido' ? (
          <EarTrainerView
            notation={userState.notation}
            rootPc={rootPc}
            scaleId={scaleId}
            initialDrillType={earDrillType}
            earHits={userState.earHits}
            earStreak={userState.earStreak}
            micNoiseGate={userState.micNoiseGate}
            speakerSafeMode={userState.speakerSafeMode}
            onUpdateAudioPrefs={(prefs) =>
              updateUserState((s) => ({
                ...s,
                ...prefs,
              }))
            }
            onRecordHit={() =>
              updateUserState((s) => ({
                ...s,
                earHits: s.earHits + 1,
                earStreak: s.earStreak + 1,
              }))
            }
            onResetStreak={() =>
              updateUserState((s) => ({
                ...s,
                earStreak: 0,
              }))
            }
          />
        ) : (
          <ProgressionAnalyzerView
            notation={userState.notation}
            savedProgressions={userState.savedProgressions}
            onSaveProgression={(title, chordsText) =>
              updateUserState((s) => ({
                ...s,
                savedProgressions: [
                  {
                    id: `${Date.now()}`,
                    title,
                    chordsText,
                    createdAt: new Date().toISOString(),
                  },
                  ...s.savedProgressions,
                ],
              }))
            }
            onDeleteProgression={(id) =>
              updateUserState((s) => ({
                ...s,
                savedProgressions: s.savedProgressions.filter((p) => p.id !== id),
              }))
            }
            onSendToLab={(params) => {
              setRootPc(params.rootPc);
              setScaleId(params.scaleId);
              setViewMode(params.viewMode);
              setGrooveStyle(params.groove);
              setBpm(params.bpm);
              setProgressionText(params.progression);
              setActiveTab('lab');
            }}
          />
        )}
      </main>
    </div>
  );
}

