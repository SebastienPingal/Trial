import { useMemo, useState } from 'react';
import type { GameState } from '../../../core/state';
import type { CaseView, Statement } from '../../../core/types';
import { AnswerInput } from '../components/AnswerInput';
import { CaseFile } from '../components/CaseFile';
import { Courtroom } from '../components/Courtroom';
import { ObjectionCard } from '../components/ObjectionCard';
import { Placeholder } from '../components/Placeholder';
import { Stage } from '../components/Stage';
import { useGame } from '../gameContext';

interface TrialScreenProps {
  state: GameState;
  caseView: CaseView;
}

export function TrialScreen({ state, caseView }: TrialScreenProps) {
  const game = useGame();
  const [caseFileOpen, setCaseFileOpen] = useState(false); // portrait only: the case file is an overlay
  const { phase, action } = state;

  const history = useMemo<Statement[]>(
    () => state.turns.map(({ question, answer }) => ({ question, answer })),
    [state.turns],
  );

  const reacting = phase === 'reacting';
  const interruption = reacting && action && action.kind !== 'none' ? action : null;
  const isObjection = interruption?.kind === 'objection-evidence' || interruption?.kind === 'objection-statement';
  const lastAnswer = state.turns[state.turns.length - 1]?.answer ?? '';

  const caseFile = (
    <CaseFile
      title={caseView.title}
      evidence={caseView.evidence}
      statements={history}
      highlightEvidenceId={interruption?.kind === 'objection-evidence' ? interruption.evidenceId : undefined}
      highlightStatementIndex={interruption?.kind === 'objection-statement' ? interruption.statementIndex : undefined}
    />
  );

  return (
    <Stage className={isObjection ? 'shake' : ''}>
      {(layout) => (
        <main className={`trial trial-${layout}`}>
          <Placeholder className="trial-background" label="Courtroom background" />
          <Courtroom
            jurors={caseView.jurors}
            reaction={state.reaction}
            interruption={interruption}
            lawyerHint={reacting ? state.lawyerHint : null}
          />

          {layout === 'landscape' ? (
            caseFile
          ) : (
            <>
              <button type="button" className="case-file-toggle hud-button" onClick={() => setCaseFileOpen(true)}>
                Case file
              </button>
              {caseFileOpen && (
                <div className="case-file-overlay" onClick={() => setCaseFileOpen(false)}>
                  <div onClick={(e) => e.stopPropagation()}>{caseFile}</div>
                </div>
              )}
            </>
          )}

          {!(layout === 'portrait' && interruption) && (
            <Placeholder className="player-back" label="Defendant (back view)" />
          )}

          <div className="trial-hud">
            <section className="question-box hud-panel">
              <span className="question-progress">
                Question {state.questionIndex + 1} / {caseView.prosecutorQuestions.length}
              </span>
              <h2 className="question-text">{state.question}</h2>
              <AnswerInput
                value={reacting ? lastAnswer : state.answer}
                onChange={(text) => game.input(text)}
                onSubmit={() => void game.submit()}
                locked={phase !== 'answering'}
              />
              {state.error && <p className="error">{state.error}</p>}
            </section>

            {interruption && <ObjectionCard action={interruption} evidence={caseView.evidence} history={history} />}

            {reacting && (
              <button type="button" className="next-button hud-button" onClick={() => game.next()}>
                {state.isLastQuestion ? 'The jury deliberates' : 'Next question'} ›
              </button>
            )}
          </div>
        </main>
      )}
    </Stage>
  );
}
