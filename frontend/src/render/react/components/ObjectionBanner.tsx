import type { ProsecutorAction } from '../../../core/reactions';
import type { Evidence, Statement } from '../../../core/types';

interface ObjectionBannerProps {
  action: ProsecutorAction;
  evidence: Evidence[];
  history: Statement[];
}

export function ObjectionBanner({ action, evidence, history }: ObjectionBannerProps) {
  if (action.kind === 'none') return null;

  if (action.kind === 'answer-the-question') {
    return (
      <div className="objection-banner warning">
        <h2>Answer the question!</h2>
      </div>
    );
  }

  if (action.kind === 'objection-evidence') {
    const item = evidence.find((e) => e.id === action.evidenceId);
    return (
      <div className="objection-banner">
        <h2>Objection!</h2>
        {item && (
          <p>
            Exhibit {item.id} — <strong>{item.name}</strong>: {item.description}
          </p>
        )}
      </div>
    );
  }

  const statement = history[action.statementIndex];
  return (
    <div className="objection-banner">
      <h2>Objection!</h2>
      {statement && (
        <p>
          Earlier, when asked “{statement.question}”, you said: <em>“{statement.answer}”</em>
        </p>
      )}
    </div>
  );
}
