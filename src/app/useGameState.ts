import { useCallback, useEffect, useState } from 'react';
import { advanceDay, createInitialState, startCompany, type GameState, type NewGameSelection } from '../domain/game';
import { loadGameState, parseGameState, saveGameState, serializeGameState } from '../infrastructure/gameStateRepository';

export interface GameController {
  state: GameState;
  isReady: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  createCompany: (selection: NewGameSelection) => void;
  nextDay: () => void;
  reset: () => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<void>;
}

export function useGameState(): GameController {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [isReady, setIsReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<GameController['saveStatus']>('idle');

  useEffect(() => {
    let active = true;
    void loadGameState()
      .then((loaded) => {
        if (active) setState(loaded);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void saveGameState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isReady, state]);

  const createCompany = useCallback((selection: NewGameSelection) => {
    setState(startCompany(selection));
  }, []);

  const nextDay = useCallback(() => setState((current) => advanceDay(current)), []);
  const reset = useCallback(() => setState(createInitialState()), []);

  const exportSave = useCallback(() => {
    const blob = new Blob([serializeGameState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `drink-company-day-${state.day}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importSave = useCallback(async (file: File) => {
    const serialized = await file.text();
    setState(parseGameState(serialized));
  }, []);

  return { state, isReady, saveStatus, createCompany, nextDay, reset, exportSave, importSave };
}
