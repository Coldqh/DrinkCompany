import { useState } from 'react';
import type { GameController } from '../../app/useGameState';
import { ArchiveView } from '../archive/ArchiveView';
import { BatchBoard } from '../batches/BatchBoard';
import { CompanyDashboard } from '../dashboard/CompanyDashboard';
import { MarketWorld } from '../market/MarketWorld';
import { ProductionStudio } from '../production/ProductionStudio';
import { Icon } from '../../ui/Icon';
import type { VersionGuard } from '../../app/useVersionGuard';

export type Tab = 'company' | 'production' | 'batches' | 'market' | 'archive';

const tabs: { id: Tab; label: string; icon: 'home' | 'factory' | 'batch' | 'market' | 'archive' }[] = [
  { id: 'company', label: 'Компания', icon: 'home' },
  { id: 'production', label: 'Цех', icon: 'factory' },
  { id: 'batches', label: 'Партии', icon: 'batch' },
  { id: 'market', label: 'Рынок', icon: 'market' },
  { id: 'archive', label: 'Архив', icon: 'archive' },
];

export function GameShell({ game, version }: { game: GameController; version: VersionGuard }) {
  const [tab, setTab] = useState<Tab>('company');
  const [dayMessage, setDayMessage] = useState<string | null>(null);
  const activeBatches = game.state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).length;
  const activeOffers = game.state.world?.proposals.filter((proposal) => proposal.status === 'offer').length ?? 0;
  const activeOrders = game.state.world?.repeatOrders.filter((order) => order.status === 'pending').length ?? 0;

  function finishDay() {
    const result = game.nextDay();
    setDayMessage(result.message);
    window.setTimeout(() => setDayMessage(null), 2400);
  }

  return (
    <div className="app-shell compact-shell">
      <header className="topbar compact-topbar">
        <div className="topbar-brand">
          <div className="brand-symbol"><span>D</span><i /></div>
          <div>
            <span className="topbar-overline">День {game.state.day} · {game.state.mode === 'roguelike' ? 'рогалик' : 'стандарт'}</span>
            <h1>{game.state.company.name}</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="cash-display"><span>баланс</span><strong>{formatMoney(game.state.finance.cash)}</strong></div>
          <div className={`save-indicator ${game.saveStatus}`} title={game.saveStatus === 'error' ? 'Ошибка сохранения' : 'Автосохранение'}><i /></div>
        </div>
      </header>

      <main className="content compact-content" key={tab}>
        {tab === 'company' && (
          <CompanyDashboard
            state={game.state}
            onOpenProduction={() => setTab('production')}
            onOpenBatches={() => setTab('batches')}
            onOpenMarket={() => setTab('market')}
            onDismissTutorial={game.hideTutorial}
          />
        )}
        {tab === 'production' && (
          <ProductionStudio
            state={game.state}
            onBuyEquipment={game.buyEquipment}
            onSaveRecipe={game.saveRecipeDraft}
            onLaunchBatch={game.launchBatch}
            onOrderSupply={game.orderSupply}
            onSignSupplier={game.signSupplier}
          />
        )}
        {tab === 'batches' && (
          <BatchBoard
            state={game.state}
            onTaste={game.tasteBatch}
            onPackage={game.packageBatch}
            onDiscard={game.discardBatch}
            onOpenProduction={() => setTab('production')}
          />
        )}
        {tab === 'market' && <MarketWorld state={game.state} onSendProposal={game.sendProposal} onAcceptOffer={game.acceptOffer} onDeclineOffer={game.declineOffer} onFulfillOrder={game.fulfillOrder} />}
        {tab === 'archive' && <ArchiveView state={game.state} version={version} onExport={game.exportSave} onImport={game.importSave} onReset={game.reset} />}
      </main>

      {dayMessage && <div className="day-toast"><Icon name="check" />{dayMessage}</div>}

      <button className="compact-day-button" onClick={finishDay}>
        <span><Icon name="clock" /><b>Следующий день</b></span>
        <small>−{formatMoney(game.state.finance.dailyFixedCost)}{activeBatches > 0 ? ` · ${activeBatches} в работе` : ''}</small>
        <Icon name="arrow" />
      </button>

      <nav className="bottom-nav compact-bottom-nav" aria-label="Основная навигация">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <span className="nav-icon"><Icon name={item.icon} />{item.id === 'batches' && activeBatches > 0 && <i>{activeBatches}</i>}{item.id === 'market' && activeOffers + activeOrders > 0 && <i>{activeOffers + activeOrders}</i>}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
