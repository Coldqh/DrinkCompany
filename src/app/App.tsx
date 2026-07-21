import { Onboarding } from '../features/onboarding/Onboarding';
import { GameShell } from '../features/shell/GameShell';
import { useGameState } from './useGameState';

export function App() {
  const game = useGameState();

  if (!game.isReady) {
    return <div className="loading-screen"><div className="brand-mark">DC</div><span>Загрузка компании…</span></div>;
  }

  if (game.state.phase === 'onboarding') {
    return <Onboarding onComplete={game.createCompany} />;
  }

  return (
    <GameShell
      state={game.state}
      saveStatus={game.saveStatus}
      onNextDay={game.nextDay}
      onReset={game.reset}
      onExport={game.exportSave}
      onImport={game.importSave}
    />
  );
}
