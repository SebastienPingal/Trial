import type { EvaluationResult, Juror } from './types';
import type { ProsecutorAction } from './reactions';

// A submitted answer with its full evaluation.
export interface TurnRecord {
  question: string;
  answer: string;
  result: EvaluationResult;
  action: ProsecutorAction;
}

export const INNOCENT_THRESHOLD = 3;
export const OBJECTION_PENALTY = 0.3;

export interface JurorTimelinePoint {
  turn: number;
  score: number;
  conviction: number; // running conviction after this turn
  objection: boolean;
}

export interface JurorVerdict {
  juror: Juror;
  conviction: number;
  votesInnocent: boolean;
  timeline: JurorTimelinePoint[];
  turningPoint: number | null; // turn with the biggest conviction swing
}

export interface Verdict {
  acquitted: boolean;
  jurors: JurorVerdict[];
}

/**
 * Weighted mean of a juror's scores, later answers weighing more,
 * minus a penalty for each successful prosecutor objection.
 */
function conviction(scores: number[], objections: number): number {
  if (scores.length === 0) return INNOCENT_THRESHOLD;
  let weighted = 0;
  let totalWeight = 0;
  scores.forEach((score, i) => {
    const weight = i + 1;
    weighted += score * weight;
    totalWeight += weight;
  });
  return weighted / totalWeight - objections * OBJECTION_PENALTY;
}

export function computeVerdict(jurors: Juror[], turns: TurnRecord[]): Verdict {
  const verdicts = jurors.map((juror): JurorVerdict => {
    const scores: number[] = [];
    let objections = 0;
    const timeline = turns.map((turn, i): JurorTimelinePoint => {
      const score = turn.result.jurors[juror.id]?.value ?? INNOCENT_THRESHOLD;
      const objection = turn.action.kind === 'objection-evidence' || turn.action.kind === 'objection-statement';
      scores.push(score);
      if (objection) objections += 1;
      return { turn: i, score, conviction: conviction(scores, objections), objection };
    });

    let turningPoint: number | null = null;
    let biggestSwing = 0;
    timeline.forEach((point, i) => {
      const previous = i === 0 ? INNOCENT_THRESHOLD : timeline[i - 1].conviction;
      const swing = Math.abs(point.conviction - previous);
      if (swing > biggestSwing) {
        biggestSwing = swing;
        turningPoint = i;
      }
    });

    const final = conviction(scores, objections);
    return {
      juror,
      conviction: final,
      votesInnocent: final > INNOCENT_THRESHOLD,
      timeline,
      turningPoint,
    };
  });

  const innocentVotes = verdicts.filter((v) => v.votesInnocent).length;
  return { acquitted: innocentVotes >= 2, jurors: verdicts };
}
