import type { CaseSummary, CaseView, EvaluationRequest, EvaluationResult } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const fetchCases = () => request<CaseSummary[]>('/cases');

export const fetchCase = (caseId: string) => request<CaseView>(`/cases/${encodeURIComponent(caseId)}`);

export const evaluate = (body: EvaluationRequest, signal?: AbortSignal) =>
  request<EvaluationResult>('/evaluate', { method: 'POST', body: JSON.stringify(body), signal });
