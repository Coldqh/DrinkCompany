import { useState } from 'react';
import type { GameController } from '../../app/useGameState';
import type { VersionGuard } from '../../app/useVersionGuard';
import { TodayView, type TodayTarget } from '../today/TodayView';
import { ProductionStudio } from '../production/ProductionStudio';
import { MarketWorld } from '../market/MarketWorld';
import { WorldHub } from '../world/WorldHub';
import { CompanyCenter } from '../company/CompanyCenter';
import { Icon } from '../../ui/Icon';
import { Modal } from '../../ui/MobileUI';

export type Tab = 'today' | 'production' | 'trade' | 'world';

const tabs: { id: Tab; label: string; icon: 'home' | 'factory' | 'market' | 'map' }[] = [
  { id: 'today', label: 'Сегодня', icon: 'home' },
  { id: 'production', label: 'Производство', icon: 'factory' },
  { id: 'trade', label: 'Торговля', icon: 'market' },
  { id: 'world', label: 'Мир', icon: 'map' },
];

export function GameShell({ game, version }: { game: GameController; version: VersionGuard }) {
  const [tab, setTab] = useState<Tab>('today');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [dayMessage, setDayMessage] = useState<string | null>(null);
  const activeOffers = game.state.world?.proposals.filter((proposal) => proposal.status === 'offer').length ?? 0;
  const activeOrders = game.state.world?.repeatOrders.filter((order) => order.status === 'pending').length ?? 0;
  const readyBatches = game.state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status)).length;

  function finishDay() {
    const result = game.nextDay();
    setDayMessage(result.message);
    setTab('today');
    window.setTimeout(() => setDayMessage(null), 2200);
  }

  function openTarget(target: TodayTarget) {
    if (target === 'company') setCompanyOpen(true);
    else setTab(target === 'trade' ? 'trade' : target);
  }

  return <div className="app-shell ux-shell">
    <header className="topbar ux-topbar">
      <button className="company-trigger" onClick={() => setCompanyOpen(true)}>
        <span className="brand-symbol">D</span>
        <span><small>День {game.state.day}</small><strong>{game.state.company.name}</strong></span>
        <Icon name="arrow" />
      </button>
      <div className="topbar-balance"><span>Баланс</span><strong>{formatMoney(game.state.finance.cash)}</strong></div>
    </header>

    <main className="content ux-content" key={tab}>
      {tab === 'today' && <TodayView state={game.state} onOpen={openTarget} />}
      {tab === 'production' && <ProductionStudio state={game.state} onBuyEquipment={game.buyEquipment} onSaveRecipe={game.saveRecipeDraft} onLaunchBatch={game.launchBatch} onTaste={game.tasteBatch} onPackage={game.packageBatch} onDiscard={game.discardBatch} onOrderSupply={game.orderSupply} onSignSupplier={game.signSupplier} onExpandRoom={game.expandRoom} onExpandUtility={game.expandUtility} onCleanFacility={game.cleanFacility} onServiceEquipment={game.serviceEquipment} onUpgradeEquipment={game.upgradeEquipment} onQueueRecipe={game.queueRecipe} onRemoveQueue={game.removeQueue} />}
      {tab === 'trade' && <MarketWorld state={game.state} onSendProposal={game.sendProposal} onAcceptOffer={game.acceptOffer} onDeclineOffer={game.declineOffer} onFulfillOrder={game.fulfillOrder} onCreateBrand={game.createBrand} onCreateRelease={game.createRelease} onLaunchCampaign={game.launchCampaign} />}
      {tab === 'world' && <WorldHub state={game.state} onAcquire={game.acquireAsset} onLease={game.leaseAsset} onInvest={game.investOrganization} onTakeover={game.takeoverOrganization} onInject={game.injectSubsidiaryCapital} onPolicy={game.setSubsidiaryPolicy} onTransfer={game.transferGroupAsset} onStock={game.stockWorldVenue} onClean={game.cleanWorldVenue} onUpgrade={game.upgradeWorldVenue} onStatus={game.setWorldVenueStatus} />}
    </main>

    {dayMessage && <div className="day-toast"><Icon name="check" />{dayMessage}</div>}

    <nav className="main-dock" aria-label="Основная навигация">
      {tabs.slice(0, 2).map((item) => <NavButton key={item.id} item={item} active={tab === item.id} badge={item.id === 'production' ? readyBatches : 0} onClick={() => setTab(item.id)} />)}
      <button className="next-day-control" onClick={finishDay} aria-label="Перейти к следующему дню"><Icon name="clock" /><span>День</span></button>
      {tabs.slice(2).map((item) => <NavButton key={item.id} item={item} active={tab === item.id} badge={item.id === 'trade' ? activeOffers + activeOrders : 0} onClick={() => setTab(item.id)} />)}
    </nav>

    {companyOpen && <Modal title={game.state.company.name} kicker={`День ${game.state.day} · ${game.state.mode === 'roguelike' ? 'рогалик' : 'стандарт'}`} onClose={() => setCompanyOpen(false)} wide><CompanyCenter game={game} version={version} /></Modal>}
  </div>;
}

function NavButton({ item, active, badge, onClick }: { item: { id: Tab; label: string; icon: 'home' | 'factory' | 'market' | 'map' }; active: boolean; badge: number; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><span><Icon name={item.icon} />{badge > 0 && <i>{badge}</i>}</span><small>{item.label}</small></button>;
}

function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
