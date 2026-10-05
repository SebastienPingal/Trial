import { useEffect, useState } from 'react';
import type { EventBus } from '../../../core/eventBus';
import type { GameEvents } from '../../../core/state';

const MAX_ENTRIES = 100;
// state:changed fires on every keystroke: too noisy to log.
const LOGGED: (keyof GameEvents)[] = ['typing:event', 'evaluation:received', 'prosecutor:action', 'lawyer:hint', 'verdict'];

interface Entry {
  id: number;
  at: string;
  type: string;
  payload: unknown;
}

let nextId = 0;

export function EventLog({ bus, hidden }: { bus: EventBus<GameEvents>; hidden: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const unsubscribers = LOGGED.map((type) =>
      bus.on(type, (payload) => {
        const entry = { id: nextId++, at: new Date().toLocaleTimeString(), type, payload };
        setEntries((list) => [entry, ...list].slice(0, MAX_ENTRIES));
      }),
    );
    return () => unsubscribers.forEach((off) => off());
  }, [bus]);

  if (hidden) return null;

  return (
    <div className="debug-section">
      <div className="debug-actions">
        <button type="button" onClick={() => setEntries([])}>
          Clear
        </button>
      </div>
      {entries.length === 0 && <p className="debug-hint">No event yet.</p>}
      <ul className="debug-log">
        {entries.map((e) => (
          <li key={e.id}>
            <details>
              <summary>
                <span className="debug-value">{e.at}</span> {e.type}
              </summary>
              <pre>{JSON.stringify(e.payload, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
