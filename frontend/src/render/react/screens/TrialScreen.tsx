import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '../../../core/state';
import type { CaseView, Statement } from '../../../core/types';
import { AnswerInput } from '../components/AnswerInput';
import { Courtroom } from '../components/Courtroom';
import { EvidenceFile } from '../components/EvidenceFile';
import { ObjectionBanner } from '../components/ObjectionBanner';
import { useGame } from '../gameContext';

interface TrialScreenProps {
  state: GameState;
  caseView: CaseView;
}

export function TrialScreen({ state, caseView }: TrialScreenProps) {
  const game = useGame();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const { phase, action } = state;

  // The prosecutor brandishes the contradicted evidence: open the case file on it.
  useEffect(() => {
    setEvidenceOpen(action?.kind === 'objection-evidence');
  }, [action]);

  const history = useMemo<Statement[]>(
    () => state.turns.map(({ question, answer }) => ({ question, answer })),
    [state.turns],
  );
  const lastAnswer = state.turns[state.turns.length - 1]?.answer ?? '';

  return (
    <main className="screen trial-screen">
      <header className="trial-header">
        <h1>{caseView.title}</h1>
        <span>
          Question {state.questionIndex + 1} / {caseView.prosecutorQuestions.length}
        </span>
      </header>

      <Courtroom jurors={caseView.jurors} reaction={state.reaction} question={state.question ?? ''} />

      {phase === 'reacting' && action && (
        <ObjectionBanner action={action} evidence={caseView.evidence} history={history} />
      )}

      {phase === 'reacting' ? (
        <div className="submitted-answer">
          <p>
            <em>“{lastAnswer}”</em>
          </p>
          <button type="button" className="primary" onClick={() => game.next()}>
            {state.isLastQuestion ? 'The jury deliberates…' : 'Next question'}
          </button>
        </div>
      ) : (
        <AnswerInput
          value={state.answer}
          onChange={(text) => game.input(text)}
          onSubmit={() => void game.submit()}
          disabled={phase === 'evaluating'}
        />
      )}

      {state.error && <p className="error">{state.error}</p>}

      <EvidenceFile
        evidence={caseView.evidence}
        open={evidenceOpen}
        onToggle={() => setEvidenceOpen((o) => !o)}
        highlightId={action?.kind === 'objection-evidence' ? action.evidenceId : undefined}
      />
    </main>
  );
}
