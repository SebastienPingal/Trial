import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { GameController } from '../../core/engine';
import type { GameState } from '../../core/state';

const GameContext = createContext<GameController | null>(null);

export function GameProvider({ game, children }: { game: GameController; children: ReactNode }) {
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

export function useGame(): GameController {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame must be used inside a GameProvider');
  return game;
}

/** Subscribes a component to the engine state. */
export function useGameState(): GameState {
  const game = useGame();
  const subscribe = useCallback((onChange: () => void) => game.bus.on('state:changed', onChange), [game]);
  return useSyncExternalStore(subscribe, () => game.getState());
}
