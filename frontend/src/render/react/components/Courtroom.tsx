import { NEUTRAL_EXPRESSION, type CourtReaction, type ProsecutorAction } from '../../../core/reactions';
import type { Juror } from '../../../core/types';
import { Character } from './Character';
import { Placeholder } from './Placeholder';

interface CourtroomProps {
  jurors: Juror[];
  reaction: CourtReaction | null;
  interruption: ProsecutorAction | null; // shown as a burst above the prosecutor
}

export function Courtroom({ jurors, reaction, interruption }: CourtroomProps) {
  const prosecutor = reaction?.prosecutor ?? { expression: 'impassive', intensity: 0 };
  const lawyer = reaction?.lawyer ?? { expression: 'neutral', intensity: 0 };

  const burst = interruption && interruption.kind !== 'none' && (
    <div className={`objection-burst ${interruption.kind === 'answer-the-question' ? 'warning' : ''}`}>
      {interruption.kind === 'answer-the-question' ? 'Answer the question!' : 'Objection!'}
    </div>
  );

  return (
    <section className="courtroom">
      <div className="bench-row">
        {jurors.map((juror) => {
          const r = reaction?.jurors[juror.id] ?? NEUTRAL_EXPRESSION;
          return <Character key={juror.id} name={juror.name} expression={r.expression} intensity={r.intensity} />;
        })}
        <Character
          name="Prosecutor"
          expression={prosecutor.expression}
          intensity={prosecutor.intensity}
          overlay={burst}
        />
        <Character name="Your lawyer" expression={lawyer.expression} intensity={lawyer.intensity} />
      </div>
      <Placeholder className="bench" label="Bench" />
    </section>
  );
}
