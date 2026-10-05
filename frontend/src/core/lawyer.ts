import { THRESHOLDS, type ProsecutorAction } from './reactions';
import type { EvaluationResult, Juror } from './types';
import { INNOCENT_THRESHOLD, type TurnRecord } from './verdict';

// The lawyer whispers what they read on the other faces, only when something notable happened.

type Leaning = 'doubt' | 'neutral' | 'convinced';

function leaning(score: number): Leaning {
  if (score <= THRESHOLDS.jurorDoubt) return 'doubt';
  if (score >= THRESHOLDS.jurorConvinced) return 'convinced';
  return 'neutral';
}

const RANK: Record<Leaning, number> = { doubt: 0, neutral: 1, convinced: 2 };

export const LAWYER_LINES = {
  hurtsDefense: [
    'Why would you tell them that?!',
    "Careful… that doesn't help us at all.",
    "Please, stop giving the prosecutor ideas.",
  ],
  won: ['I think that answer got through to {name}.', '{name} seems to be on our side now.'],
  lost: ["You lost {name} there…", "{name} isn't buying it."],
  recovered: ['{name} is coming back around.', '{name} looks less skeptical.'],
  cooled: ['{name} seems less sure of you.', '{name} is starting to wonder…'],
  juryWon: ['The whole jury is with you on this one.'],
  juryLost: ['Nobody on the jury believed that…'],
  nearObjection: ['Phew… the prosecutor almost had you there.', 'The prosecutor was this close to objecting.'],
} as const;

function pick(lines: readonly string[], turn: number, name = ''): string {
  return lines[turn % lines.length].replace('{name}', name);
}

interface JurorShift {
  juror: Juror;
  from: Leaning;
  to: Leaning;
  delta: number;
}

function jurorShifts(jurors: Juror[], previous: TurnRecord | undefined, result: EvaluationResult): JurorShift[] {
  return jurors
    .map((juror) => {
      const before = previous?.result.jurors[juror.id]?.value ?? INNOCENT_THRESHOLD;
      const after = result.jurors[juror.id]?.value ?? INNOCENT_THRESHOLD;
      return { juror, from: leaning(before), to: leaning(after), delta: after - before };
    })
    .filter((shift) => shift.from !== shift.to);
}

/**
 * What the lawyer whispers after a submitted answer, or null when nothing is worth a hint.
 * Priority: an answer that hurts the defense, then the biggest juror swing, then a near objection.
 */
export function lawyerHint(
  result: EvaluationResult,
  action: ProsecutorAction,
  jurors: Juror[],
  previousTurns: TurnRecord[],
): string | null {
  const turn = previousTurns.length;

  if (result.hurtsDefense.probability > THRESHOLDS.lawyerPanic) return pick(LAWYER_LINES.hurtsDefense, turn);

  const shifts = jurorShifts(jurors, previousTurns[turn - 1], result);
  if (jurors.length > 1 && shifts.length === jurors.length) {
    if (shifts.every((s) => s.to === 'convinced')) return pick(LAWYER_LINES.juryWon, turn);
    if (shifts.every((s) => s.to === 'doubt')) return pick(LAWYER_LINES.juryLost, turn);
  }
  if (shifts.length > 0) {
    const shift = shifts.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a));
    const up = RANK[shift.to] > RANK[shift.from];
    const lines =
      shift.to === 'convinced' ? LAWYER_LINES.won
      : shift.to === 'doubt' ? LAWYER_LINES.lost
      : up ? LAWYER_LINES.recovered
      : LAWYER_LINES.cooled;
    return pick(lines, turn, shift.juror.name);
  }

  const contradiction = Math.max(result.evidenceContradiction.probability, result.statementContradiction.probability);
  if (action.kind === 'none' && contradiction > THRESHOLDS.lawyerNearObjection) return pick(LAWYER_LINES.nearObjection, turn);

  return null;
}
