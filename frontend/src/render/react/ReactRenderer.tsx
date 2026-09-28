import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GameController } from '../../core/engine';
import type { Renderer } from '../types';
import { App } from './App';
import { GameProvider } from './gameContext';
import './styles.css';

/** DOM renderer built with React components and emoji placeholder faces. */
export class ReactRenderer implements Renderer {
  private root: Root | null = null;

  mount(container: HTMLElement, game: GameController): void {
    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <GameProvider game={game}>
          <App />
        </GameProvider>
      </StrictMode>,
    );
  }

  destroy(): void {
    this.root?.unmount();
    this.root = null;
  }
}
