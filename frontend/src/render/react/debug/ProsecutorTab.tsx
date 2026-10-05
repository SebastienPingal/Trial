import { useState } from 'react';
import { useGame } from '../gameContext';
import type { TabProps } from './DebugPanel';

export function ProsecutorTab({ state }: TabProps) {
  const game = useGame();
  const evidence = state.caseView?.evidence ?? [];
  const [evidenceId, setEvidenceId] = useState(evidence[0]?.id ?? '');
  const [statementIndex, setStatementIndex] = useState(0);
  const inTrial = state.phase === 'answering' || state.phase === 'evaluating' || state.phase === 'reacting';

  return (
    <div className="debug-section">
      <p className="debug-hint">
        Triggers the action directly, without the backend: the trial switches to the reaction step (no turn is
        recorded). {!inTrial && <b>Start a question first (Flow tab).</b>}
      </p>

      <div className="debug-row">
        <span className="debug-label">Evidence</span>
        <select value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)}>
          {evidence.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} — {item.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!inTrial || !evidenceId}
          onClick={() => game.debug.triggerAction({ kind: 'objection-evidence', evidenceId })}
        >
          Objection!
        </button>
      </div>

      <div className="debug-row">
        <span className="debug-label">Statement</span>
        <select value={statementIndex} onChange={(e) => setStatementIndex(Number(e.target.value))}>
          {state.turns.length === 0 && <option value={0}>(no previous statement)</option>}
          {state.turns.map((turn, i) => (
            <option key={i} value={i}>
              S{i + 1} — {turn.answer.slice(0, 40)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!inTrial}
          onClick={() => game.debug.triggerAction({ kind: 'objection-statement', statementIndex })}
        >
          Objection!
        </button>
      </div>

      <div className="debug-actions">
        <button type="button" disabled={!inTrial} onClick={() => game.debug.triggerAction({ kind: 'answer-the-question' })}>
          Answer the question!
        </button>
        <button type="button" disabled={!inTrial} onClick={() => game.debug.triggerAction({ kind: 'none' })}>
          No action
        </button>
      </div>
    </div>
  );
}
