import { Onboarding } from '../features/onboarding/Onboarding';
import { GameShell } from '../features/shell/GameShell';
import { AppErrorBoundary, AppSkeleton } from '../ui/FeedbackStates';
import { VersionGate } from '../ui/VersionGate';
import { useGameState } from './useGameState';
import { useVersionGuard } from './useVersionGuard';

export function App() {
  const game = useGameState();
  const version = useVersionGuard();

  if (!game.isReady) return <AppSkeleton />;

  return (
    <AppErrorBoundary>
      {game.state.phase === 'onboarding'
        ? <Onboarding onComplete={game.createCompany} />
        : <GameShell game={game} version={version} />}
      <VersionGate version={version} />
    </AppErrorBoundary>
  );
}
