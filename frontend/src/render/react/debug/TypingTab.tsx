import { useGame } from '../gameContext';
import type { TabProps } from './DebugPanel';

export function TypingTab({ state }: TabProps) {
  const game = useGame();
  const answering = state.phase === 'answering';

  return (
    <div className="debug-section">
      <p className="debug-hint">
        Fires a typing event as if its plugin had detected it: same face overlay, same preview evaluation when the
        plugin asks for one, and it is reported to Jev with the answer.{' '}
        {!answering && <b>Only while answering a question.</b>}
      </p>
      <div className="debug-actions">
        {game.debug.typingEventKinds().map((kind) => (
          <button key={kind} type="button" disabled={!answering} onClick={() => game.debug.fireTypingEvent(kind)}>
            {kind}
          </button>
        ))}
      </div>
    </div>
  );
}
