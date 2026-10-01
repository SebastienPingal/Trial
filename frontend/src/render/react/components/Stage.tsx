import { useEffect, useState, type ReactNode } from 'react';

// Fixed design resolutions: the scene is laid out in these units, then scaled to fit the window (letterboxed).
const LAYOUTS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 440, height: 956 },
} as const;

export type Layout = keyof typeof LAYOUTS;

function measure() {
  const layout: Layout = window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
  const { width, height } = LAYOUTS[layout];
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
  return { layout, scale };
}

interface StageProps {
  className?: string;
  children: (layout: Layout) => ReactNode;
}

/** Game viewport: picks a landscape or portrait scene and scales it to the window like a game canvas. */
export function Stage({ className = '', children }: StageProps) {
  const [{ layout, scale }, setFit] = useState(measure);

  useEffect(() => {
    const onResize = () => setFit(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { width, height } = LAYOUTS[layout];
  const transform = `translate(-50%, -50%) scale(${scale})`;
  return (
    <div className="stage-viewport">
      <div className={`stage stage-${layout} ${className}`} style={{ width, height, transform }}>
        {children(layout)}
      </div>
    </div>
  );
}
