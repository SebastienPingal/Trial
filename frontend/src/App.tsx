import { useEffect, useState } from 'react';
import { fetchCase, fetchCases } from './api';
import type { TurnRecord } from './game/verdict';
import { IntroScreen } from './screens/IntroScreen';
import { TrialScreen } from './screens/TrialScreen';
import { VerdictScreen } from './screens/VerdictScreen';
import type { CaseView } from './types';

type Screen = { name: 'intro' } | { name: 'trial' } | { name: 'verdict'; turns: TurnRecord[] };

export function App() {
  const [caseView, setCaseView] = useState<CaseView | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'intro' });
  const [error, setError] = useState<string | null>(null);
  // Bumped on restart so the trial screen remounts with fresh state.
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    // Only one case for now: load the first available.
    fetchCases()
      .then((cases) => {
        if (cases.length === 0) throw new Error('No case available');
        return fetchCase(cases[0].id);
      })
      .then(setCaseView)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load case'));
  }, []);

  if (error) return <main className="screen error">Could not reach the court: {error}</main>;
  if (!caseView) return <main className="screen">Loading case…</main>;

  switch (screen.name) {
    case 'intro':
      return <IntroScreen caseView={caseView} onStart={() => setScreen({ name: 'trial' })} />;
    case 'trial':
      return (
        <TrialScreen key={runId} caseView={caseView} onFinish={(turns) => setScreen({ name: 'verdict', turns })} />
      );
    case 'verdict':
      return (
        <VerdictScreen
          caseView={caseView}
          turns={screen.turns}
          onRestart={() => {
            setRunId((id) => id + 1);
            setScreen({ name: 'intro' });
          }}
        />
      );
  }
}
