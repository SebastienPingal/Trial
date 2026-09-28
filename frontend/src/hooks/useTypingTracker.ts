import { useCallback, useEffect, useRef } from 'react';
import { TYPING_THRESHOLDS, type TypingEvent, type TypingEventKind, type TypingSummary } from '../game/typingEvents';

const IDLE_CHECK_MS = 500;

interface TrackerState {
  shownAt: number;
  firstKeyAt: number | null;
  lastKeyAt: number | null;
  previousText: string;
  charsTyped: number;
  charsDeleted: number;
  deleteBurst: number;
  longestPauseMs: number;
  hesitationFired: boolean; // reset on the next keystroke
  rushingFired: boolean; // once per answer
  events: TypingEventKind[];
}

const freshState = (): TrackerState => ({
  shownAt: Date.now(),
  firstKeyAt: null,
  lastKeyAt: null,
  previousText: '',
  charsTyped: 0,
  charsDeleted: 0,
  deleteBurst: 0,
  longestPauseMs: 0,
  hesitationFired: false,
  rushingFired: false,
  events: [],
});

/**
 * Watches how the player types (deleting, pausing, speed) and emits typing events.
 * Call `track(text)` on every change of the answer and `reset()` for each new question.
 */
export function useTypingTracker(enabled: boolean, onEvent: (event: TypingEvent) => void) {
  const state = useRef<TrackerState>(freshState());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = useCallback((kind: TypingEventKind, now: number) => {
    const s = state.current;
    s.events.push(kind);
    onEventRef.current({ kind, atMs: now - s.shownAt, text: s.previousText });
  }, []);

  const track = useCallback(
    (text: string) => {
      const s = state.current;
      const now = Date.now();
      const delta = text.length - s.previousText.length;

      if (s.lastKeyAt !== null) s.longestPauseMs = Math.max(s.longestPauseMs, now - s.lastKeyAt);
      s.firstKeyAt ??= now;
      s.lastKeyAt = now;
      s.hesitationFired = false;
      s.previousText = text;

      if (delta < 0) {
        s.charsDeleted -= delta;
        s.deleteBurst -= delta;
        if (s.deleteBurst >= TYPING_THRESHOLDS.heavyDeleteBurst) {
          s.deleteBurst = 0;
          emit('heavy-deleting', now);
        }
        return;
      }

      s.deleteBurst = 0;
      s.charsTyped += delta;
      const seconds = (now - s.firstKeyAt) / 1000;
      if (
        !s.rushingFired &&
        s.charsTyped >= TYPING_THRESHOLDS.rushingMinChars &&
        seconds > 0 &&
        s.charsTyped / seconds > TYPING_THRESHOLDS.rushingCharsPerSecond
      ) {
        s.rushingFired = true;
        emit('rushing', now);
      }
    },
    [emit],
  );

  // Hesitation is the absence of keystrokes, so it needs a timer.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const s = state.current;
      if (s.hesitationFired) return;
      const now = Date.now();
      const idle = now - (s.lastKeyAt ?? s.shownAt);
      const limit =
        s.firstKeyAt === null ? TYPING_THRESHOLDS.hesitationBeforeStartMs : TYPING_THRESHOLDS.hesitationMs;
      if (idle >= limit) {
        s.hesitationFired = true;
        emit('long-hesitation', now);
      }
    }, IDLE_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [enabled, emit]);

  const reset = useCallback(() => {
    state.current = freshState();
  }, []);

  const getSummary = useCallback((): TypingSummary => {
    const s = state.current;
    const now = Date.now();
    const activeSeconds = s.firstKeyAt === null ? 0 : (now - s.firstKeyAt) / 1000;
    return {
      durationMs: now - s.shownAt,
      timeToFirstKeyMs: s.firstKeyAt === null ? null : s.firstKeyAt - s.shownAt,
      charsTyped: s.charsTyped,
      charsDeleted: s.charsDeleted,
      longestPauseMs: s.longestPauseMs,
      charsPerSecond: activeSeconds > 0 ? Math.round((s.charsTyped / activeSeconds) * 10) / 10 : 0,
      events: [...s.events],
    };
  }, []);

  return { track, reset, getSummary };
}
