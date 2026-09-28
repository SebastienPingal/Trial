import type { CaseSummary, CaseView, EvaluationRequest, EvaluationResult } from '../core/types';

/** Everything the game needs from the backend. Swap implementations in main.ts. */
export interface CourtApi {
  fetchCases(): Promise<CaseSummary[]>;
  fetchCase(caseId: string): Promise<CaseView>;
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;
}
