import type { GameState } from '../../../core/state';
import { INNOCENT_THRESHOLD, type JurorVerdict } from '../../../core/verdict';
import { useGame } from '../gameContext';

interface VerdictScreenProps {
  state: GameState;
}

const CHART_WIDTH = 240;
const CHART_HEIGHT = 60;

// Small line of the juror's running conviction (1..5) with the "not guilty" threshold.
function ConvictionChart({ verdict }: { verdict: JurorVerdict }) {
  const points = verdict.timeline;
  const x = (i: number) => (points.length <= 1 ? CHART_WIDTH / 2 : (i / (points.length - 1)) * CHART_WIDTH);
  const y = (v: number) => CHART_HEIGHT - ((Math.min(5, Math.max(1, v)) - 1) / 4) * CHART_HEIGHT;
  const path = points.map((p, i) => `${x(i)},${y(p.conviction)}`).join(' ');

  return (
    <svg className="conviction-chart" viewBox={`-4 -4 ${CHART_WIDTH + 8} ${CHART_HEIGHT + 8}`}>
      <line className="threshold" x1={0} x2={CHART_WIDTH} y1={y(INNOCENT_THRESHOLD)} y2={y(INNOCENT_THRESHOLD)} />
      <polyline points={path} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.conviction)}
          r={i === verdict.turningPoint ? 4 : 2.5}
          className={p.objection ? 'objection' : i === verdict.turningPoint ? 'turning-point' : ''}
        />
      ))}
    </svg>
  );
}

export function VerdictScreen({ state }: VerdictScreenProps) {
  const game = useGame();
  const { verdict, turns } = state;
  if (!verdict) return null;

  return (
    <main className="screen verdict-screen">
      <h1 className={verdict.acquitted ? 'acquitted' : 'convicted'}>
        {verdict.acquitted ? 'Not guilty' : 'Guilty'}
      </h1>

      <div className="juror-verdicts">
        {verdict.jurors.map((v) => {
          const turning = v.turningPoint !== null ? turns[v.turningPoint] : null;
          return (
            <article key={v.juror.id} className="juror-verdict">
              <h2>
                {v.juror.portrait} {v.juror.name}
              </h2>
              <p className="vote">
                Votes <strong>{v.votesInnocent ? 'not guilty' : 'guilty'}</strong> (conviction{' '}
                {v.conviction.toFixed(2)})
              </p>
              <ConvictionChart verdict={v} />
              {turning && (
                <p className="turning-point-text">
                  Turning point — “{turning.question}”: <em>“{turning.answer}”</em>
                </p>
              )}
            </article>
          );
        })}
      </div>

      <button type="button" className="primary" onClick={() => game.restart()}>
        New trial
      </button>
    </main>
  );
}
