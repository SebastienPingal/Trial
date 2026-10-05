import { lazy, StrictMode, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GameController } from '../../core/engine';
import type { Renderer } from '../types';
import { App } from './App';
import { GameProvider } from './gameContext';
import './styles.css';

// Debug tools: always on in dev, opt-in with ?debug in production. Loaded on demand, so players never download them.
const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
const DebugPanel = debugEnabled
  ? lazy(() => import('./debug/DebugPanel').then((m) => ({ default: m.DebugPanel })))
  : null;

/** DOM renderer built with React components, with placeholder boxes until the art exists. */
export class ReactRenderer implements Renderer {
  private root: Root | null = null;

  mount(container: HTMLElement, game: GameController): void {
    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <GameProvider game={game}>
          <App />
          {DebugPanel && (
            <Suspense fallback={null}>
              <DebugPanel />
            </Suspense>
          )}
        </GameProvider>
      </StrictMode>,
    );
  }

  destroy(): void {
    this.root?.unmount();
    this.root = null;
  }
}
