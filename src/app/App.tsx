import { Onboarding } from '../features/onboarding/Onboarding';
import { GameShell } from '../features/shell/GameShell';
import { useGameState } from './useGameState';

export function App() {
  const game = useGameState();

  if (!game.isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-orb"><span>DC</span></div>
        <strong>Поднимаем производство</strong>
        <small>Читаем локальное сохранение…</small>
      </div>
    );
  }

  if (game.state.phase === 'onboarding') {
    return <Onboarding onComplete={game.createCompany} />;
  }

  return <GameShell game={game} />;
}
