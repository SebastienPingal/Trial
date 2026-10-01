import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  locked: boolean; // while evaluating, and once the answer is on the record
}

function LockIcon() {
  return (
    <svg className="lock-icon" viewBox="0 0 24 24" aria-label="Locked">
      <path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h6V7a3 3 0 0 0-6 0v3z" />
    </svg>
  );
}

export function AnswerInput({ value, onChange, onSubmit, locked }: AnswerInputProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Give the focus back as soon as the player can answer again.
  useEffect(() => {
    if (!locked) textarea.current?.focus();
  }, [locked]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!locked && value.trim()) onSubmit();
  };

  // Enter submits, Shift+Enter adds a new line.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) handleSubmit(event);
  };

  return (
    <form className={`answer-input ${locked ? 'locked' : ''}`} onSubmit={handleSubmit}>
      <textarea
        ref={textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your answer…"
        readOnly={locked}
        spellCheck={false}
      />
      {locked ? (
        <LockIcon />
      ) : (
        <button type="submit" className="answer-submit" disabled={!value.trim()}>
          (Enter to submit)
        </button>
      )}
    </form>
  );
}
