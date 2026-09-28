import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluate } from '../api';
import type { EvaluationRequest, EvaluationResult } from '../types';

const DEBOUNCE_MS = 800;
const MIN_LENGTH = 15;

/**
 * Evaluates the answer in "preview" mode after the player stops typing.
 * Each request is numbered; responses older than the latest request are dropped
 * because the network doesn't guarantee ordering.
 */
export function useLivePreview(
  base: Omit<EvaluationRequest, 'answer' | 'mode'>,
  answer: string,
  enabled: boolean,
) {
  const [preview, setPreview] = useState<EvaluationResult | null>(null);
  const requestId = useRef(0);
  const lastEvaluated = useRef('');

  // Call before a final evaluation so a late preview can't overwrite it.
  const invalidate = useCallback(() => {
    requestId.current += 1;
    lastEvaluated.current = '';
    setPreview(null);
  }, []);

  const { caseId, history, questionIndex } = base;

  useEffect(() => {
    const text = answer.trim();
    if (!enabled || text.length < MIN_LENGTH || text === lastEvaluated.current) return;

    const timer = window.setTimeout(() => {
      const id = ++requestId.current;
      lastEvaluated.current = text;
      evaluate({ caseId, history, questionIndex, answer: text, mode: 'preview' })
        .then((result) => {
          if (id === requestId.current) setPreview(result);
        })
        .catch(() => {
          // Previews are best-effort; ignore failures.
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [answer, enabled, caseId, history, questionIndex]);

  return { preview, invalidate };
}
