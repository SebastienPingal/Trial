import type { ProsecutorAction } from '../../../core/reactions';
import type { Evidence, Statement } from '../../../core/types';
import { Placeholder } from './Placeholder';

interface ObjectionCardProps {
  action: ProsecutorAction;
  evidence: Evidence[];
  history: Statement[];
}

function WarningIcon() {
  return (
    <svg className="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2zm1 15h-2v2h2v-2zm0-7h-2v5h2v-5z" />
    </svg>
  );
}

/** The prosecutor's interruption after a submitted answer, with the proof they point to. */
export function ObjectionCard({ action, evidence, history }: ObjectionCardProps) {
  if (action.kind === 'none') return null;

  if (action.kind === 'answer-the-question') {
    return (
      <div className="objection-card hud-panel warning">
        <h2>
          <WarningIcon /> Answer the question!
        </h2>
        <p>You are dodging the question. The court expects a straight answer.</p>
      </div>
    );
  }

  if (action.kind === 'objection-evidence') {
    const item = evidence.find((e) => e.id === action.evidenceId);
    return (
      <div className="objection-card hud-panel">
        <h2>
          <WarningIcon /> Objection!
        </h2>
        {item && (
          <>
            <p>
              This contradicts exhibit {item.id}, {item.name.toLowerCase()}. {item.description}
            </p>
            <Placeholder className="objection-exhibit" label={item.name}>
              <span className="exhibit-badge">{item.id}</span>
            </Placeholder>
          </>
        )}
      </div>
    );
  }

  const statement = history[action.statementIndex];
  return (
    <div className="objection-card hud-panel">
      <h2>
        <WarningIcon /> Objection!
      </h2>
      {statement && (
        <>
          <p>This contradicts what you said earlier, when asked “{statement.question}”</p>
          <blockquote>
            “{statement.answer}”<span className="exhibit-badge">Q{action.statementIndex + 1}</span>
          </blockquote>
        </>
      )}
    </div>
  );
}
