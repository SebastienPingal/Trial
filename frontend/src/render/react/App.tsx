import { useGameState } from './gameContext';
import { IntroScreen } from './screens/IntroScreen';
import { TrialScreen } from './screens/TrialScreen';
import { VerdictScreen } from './screens/VerdictScreen';

export function App() {
  const state = useGameState();
  const { caseView } = state;

  if (state.phase === 'error') return <main className="screen error">Could not reach the court: {state.error}</main>;
  if (state.phase === 'loading' || !caseView) return <main className="screen">Loading case…</main>;

  switch (state.phase) {
    case 'intro':
      return <IntroScreen caseView={caseView} />;
    case 'verdict':
      return <VerdictScreen state={state} />;
    default:
      return <TrialScreen state={state} caseView={caseView} />;
  }
}
