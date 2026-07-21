import { Onboarding } from '../features/onboarding/Onboarding';
import { GameShell } from '../features/shell/GameShell';
import { VersionGate } from '../ui/VersionGate';
import { useGameState } from './useGameState';
import { useVersionGuard } from './useVersionGuard';

export function App() {
  const game = useGameState();
  const version = useVersionGuard();

  if (!game.isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-orb"><span>DC</span></div>
        <strong>Поднимаем производство</strong>
        <small>Читаем локальное сохранение…</small>
      </div>
    );
  }

  return (
    <>
      {game.state.phase === 'onboarding'
        ? <Onboarding onComplete={game.createCompany} />
        : <GameShell game={game} version={version} />}
      <VersionGate version={version} />
    </>
  );
}
