import type { CaseSummary, CaseView, EvaluationRequest, EvaluationResult } from '../core/types';
import type { CourtApi } from './types';

/** Talks to the FastAPI backend (which holds the Jev key). */
export class HttpCourtApi implements CourtApi {
  constructor(private readonly baseUrl = '/api') {}

  fetchCases(): Promise<CaseSummary[]> {
    return this.request('/cases');
  }

  fetchCase(caseId: string): Promise<CaseView> {
    return this.request(`/cases/${encodeURIComponent(caseId)}`);
  }

  evaluate(body: EvaluationRequest): Promise<EvaluationResult> {
    return this.request('/evaluate', { method: 'POST', body: JSON.stringify(body) });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) {
      // FastAPI puts the reason in `detail` (e.g. a Jev error relayed by the backend).
      const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      const detail = typeof body?.detail === 'string' ? `: ${body.detail}` : '';
      throw new Error(`API ${path} failed (${response.status})${detail}`);
    }
    return response.json() as Promise<T>;
  }
}
