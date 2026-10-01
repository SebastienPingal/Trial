import type { ReactNode } from 'react';

interface PlaceholderProps {
  label: string;
  className?: string;
  children?: ReactNode;
}

/** Stand-in for a piece of art. Its CSS class gives it the size the final image will have. */
export function Placeholder({ label, className = '', children }: PlaceholderProps) {
  return (
    <div className={`placeholder ${className}`}>
      <span className="placeholder-label">{label}</span>
      {children}
    </div>
  );
}
