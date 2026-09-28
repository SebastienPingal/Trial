import { useCallback, useRef, useState } from 'react';
import { evaluate } from '../api';
import type { EvaluationRequest, EvaluationResult } from '../types';

/**
 * On-demand "preview" evaluations, fired by typing events (not on a timer).
 * Each request is numbered; responses older than the latest request are dropped
 * because the network doesn't guarantee ordering.
 */
export function useEventPreview() {
  const [preview, setPreview] = useState<EvaluationResult | null>(null);
  const requestId = useRef(0);

  const requestPreview = useCallback((request: Omit<EvaluationRequest, 'mode'>) => {
    const id = ++requestId.current;
    evaluate({ ...request, mode: 'preview' })
      .then((result) => {
        if (id === requestId.current) setPreview(result);
      })
      .catch(() => {
        // Previews are best-effort; ignore failures.
      });
  }, []);

  // Call before a final evaluation so a late preview can't overwrite it.
  const invalidate = useCallback(() => {
    requestId.current += 1;
    setPreview(null);
  }, []);

  return { preview, requestPreview, invalidate };
}
