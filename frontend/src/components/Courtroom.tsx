import { NEUTRAL_EXPRESSION, type CourtReaction } from '../game/reactions';
import type { Juror } from '../types';
import { Character } from './Character';

interface CourtroomProps {
  jurors: Juror[];
  reaction: CourtReaction | null;
  question: string;
}

export function Courtroom({ jurors, reaction, question }: CourtroomProps) {
  const prosecutor = reaction?.prosecutor ?? { expression: 'impassive', intensity: 0 };
  const lawyer = reaction?.lawyer ?? { expression: 'neutral', intensity: 0 };

  return (
    <section className="courtroom">
      <div className="jury-box">
        {jurors.map((juror) => {
          const r = reaction?.jurors[juror.id] ?? NEUTRAL_EXPRESSION;
          return (
            <Character
              key={juror.id}
              name={juror.name}
              role="Juror"
              portrait={juror.portrait}
              expression={r.expression}
              intensity={r.intensity}
            />
          );
        })}
      </div>

      <div className="bench">
        <Character
          name="Prosecutor"
          role="Prosecution"
          portrait="🧑‍⚖️"
          expression={prosecutor.expression}
          intensity={prosecutor.intensity}
          caption={question}
        />
        <Character
          name="Your lawyer"
          role="Defense"
          portrait="👨‍💼"
          expression={lawyer.expression}
          intensity={lawyer.intensity}
        />
      </div>
    </section>
  );
}
