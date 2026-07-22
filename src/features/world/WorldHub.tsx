import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import {
  assetTypeLabel,
  controlledVenueStockLimit,
  controlledVenueStockUnits,
  controlledVenueUpgradeCost,
  controlledShare,
  isPlayerControlledAsset,
  organizationKindLabel,
  type OrganizationState,
  type SubsidiaryAutonomy,
  type TreasuryPolicy,
  type WorldAssetState,
} from '../../domain/ecosystem';
import { commodityName, inventoryQuantity, productFamilyLabel, type TradeProductState } from '../../domain/trade';
import type { RetailVenueStatus, RetailVenueType } from '../../domain/retail';
import { Icon } from '../../ui/Icon';
import { CompactHeader, EmptyState, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

type Section = 'city' | 'organizations' | 'flows' | 'group' | 'control' | 'deals';

interface WorldHubProps {
  state: GameState;
  onAcquire: (assetId: string) => ActionResult;
  onLease: (assetId: string, type: RetailVenueType, name: string) => ActionResult;
  onInvest: (organizationId: string, share: number) => ActionResult;
  onTakeover: (organizationId: string, targetShare: 51 | 75 | 100) => ActionResult;
  onInject: (organizationId: string, amount: number) => ActionResult;
  onPolicy: (organizationId: string, autonomy: SubsidiaryAutonomy, treasuryPolicy: TreasuryPolicy) => ActionResult;
  onTransfer: (assetId: string, targetOrganizationId: string) => ActionResult;
  onStock: (assetId: string, releaseId: string, units: number, price: number) => ActionResult;
  onClean: (assetId: string) => ActionResult;
  onUpgrade: (assetId: string) => ActionResult;
  onStatus: (assetId: string, status: RetailVenueStatus) => ActionResult;
}

export function WorldHub({ state, onAcquire, onLease, onInvest, onTakeover, onInject, onPolicy, onTransfer, onStock, onClean, onUpgrade, onStatus }: WorldHubProps) {
  const [section, setSection] = useState<Section>('city');
  const [assetModal, setAssetModal] = useState<WorldAssetState | null>(null);
  const [organizationModal, setOrganizationModal] = useState<OrganizationState | null>(null);
  const [stockAsset, setStockAsset] = useState<WorldAssetState | null>(null);
  const [productModal, setProductModal] = useState<TradeProductState | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const ecosystem = state.ecosystem;

  if (!ecosystem) return <EmptyState icon="map" title="Мир ещё не создан" text="Заверши создание компании, чтобы загрузить организации и недвижимость региона." />;

  const controlledAssets = ecosystem.assets.filter((asset) => isPlayerControlledAsset(ecosystem, asset));
  const subsidiaries = ecosystem.subsidiaries.map((control) => ({ control, organization: ecosystem.organizations.find((organization) => organization.id === control.organizationId) })).filter((item): item is { control: typeof ecosystem.subsidiaries[number]; organization: OrganizationState } => Boolean(item.organization));
  const commercialAssets = ecosystem.assets.filter((asset) => ['bar', 'shop', 'vacant_commercial', 'warehouse', 'laboratory'].includes(asset.type));
  const organizations = ecosystem.organizations.filter((organization) => organization.id !== ecosystem.playerOrganizationId);
  const saleAssets = commercialAssets.filter((asset) => asset.status === 'for_sale' || asset.status === 'vacant').length;
  const strainedOrganizations = organizations.filter((organization) => ['strained', 'insolvent'].includes(organization.status)).length;
  const activeShipments = ecosystem.trade.shipments.filter((shipment) => shipment.status === 'in_transit' || shipment.status === 'delayed').length;
  const bottlenecks = ecosystem.trade.contracts.filter((contract) => contract.failures > 0).length
    + ecosystem.trade.batches.filter((batch) => batch.status === 'blocked').length
    + ecosystem.trade.shelves.filter((listing) => listing.units <= 0).length;

  function act(result: ActionResult, close = true) {
    setFeedback(result);
    if (result.ok && close) {
      setAssetModal(null);
      setOrganizationModal(null);
      setStockAsset(null);
      setProductModal(null);
    }
    window.setTimeout(() => setFeedback(null), 3200);
  }

  return (
    <div className="world-hub compact-page">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <CompactHeader
        kicker="единая экосистема"
        title="Город и компании"
        meta="Все бары, магазины и производства имеют владельцев, деньги, долги и историю."
      />

      <section className="mini-stat-grid four">
        <MiniStat label="Организаций" value={String(organizations.length)} note={`${strainedOrganizations} под давлением`} />
        <MiniStat label="Продуктов" value={String(ecosystem.trade.products.filter((product) => product.status === 'active').length)} note={`${ecosystem.trade.shelves.length} мест на полках`} />
        <MiniStat label="В пути" value={String(activeShipments)} note={`${bottlenecks} узких мест`} />
        <MiniStat label="Под контролем" value={String(controlledAssets.length)} note={`${saleAssets} объектов доступны`} />
      </section>

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'city', label: 'Город', badge: saleAssets },
        { id: 'organizations', label: 'Компании', badge: strainedOrganizations },
        { id: 'flows', label: 'Цепочки', badge: bottlenecks },
        { id: 'group', label: 'Группа', badge: subsidiaries.length },
        { id: 'control', label: 'Контроль', badge: controlledAssets.length },
        { id: 'deals', label: 'Сделки' },
      ]} />

      {section === 'city' && (
        <section className="ecosystem-list">
          {commercialAssets
            .sort((a, b) => assetPriority(a) - assetPriority(b))
            .map((asset) => {
              const owner = ecosystem.organizations.find((organization) => organization.id === asset.ownerOrganizationId);
              const controlled = isPlayerControlledAsset(ecosystem, asset);
              return (
                <button key={asset.id} className={`ecosystem-row glass-card ${asset.status === 'for_sale' ? 'distressed' : ''}`} onClick={() => setAssetModal(asset)}>
                  <span className="ecosystem-glyph"><Icon name={asset.type === 'bar' ? 'beer' : asset.type === 'shop' ? 'store' : asset.type === 'vacant_commercial' ? 'map' : 'factory'} /></span>
                  <span className="ecosystem-copy">
                    <small>{asset.city} · {assetTypeLabel(asset.type)}</small>
                    <strong>{asset.name}</strong>
                    <em>{controlled ? 'Под твоим контролем' : asset.status === 'vacant' ? 'Свободное помещение' : owner?.name ?? 'Частный собственник'}</em>
                  </span>
                  <span className="ecosystem-value">
                    <b>{asset.status === 'vacant' ? `${formatMoney(asset.dailyRent)}/д` : formatMoney(asset.askingPrice)}</b>
                    <small>{asset.status === 'for_sale' ? 'продажа' : asset.status === 'vacant' ? 'аренда' : asset.status === 'closed' ? 'закрыто' : 'работает'}</small>
                  </span>
                </button>
              );
            })}
        </section>
      )}

      {section === 'organizations' && (
        <section className="ecosystem-list">
          {organizations
            .sort((a, b) => organizationPriority(a) - organizationPriority(b))
            .map((organization) => {
              const share = controlledShare(ecosystem, organization.id);
              return (
                <button key={organization.id} className={`ecosystem-row glass-card organization ${organization.status}`} onClick={() => setOrganizationModal(organization)}>
                  <span className="ecosystem-glyph"><Icon name={organization.kind === 'producer' ? 'factory' : organization.kind === 'hospitality' ? 'beer' : organization.kind === 'retailer' ? 'store' : 'handshake'} /></span>
                  <span className="ecosystem-copy">
                    <small>{organizationKindLabel(organization.kind)} · {organization.ownerLabel}</small>
                    <strong>{organization.name}</strong>
                    <em>{organization.strategy}</em>
                  </span>
                  <span className="ecosystem-value"><b>{formatMoney(organization.valuation)}</b><small>{share > 0 ? `твоя доля ${share}%` : statusLabel(organization.status)}</small></span>
                </button>
              );
            })}
        </section>
      )}

      {section === 'flows' && (
        <section className="trade-flow-stack">
          <article className="flow-block glass-card">
            <header><div><span>логистика</span><strong>Товары в пути</strong></div><b>{activeShipments}</b></header>
            {activeShipments === 0
              ? <EmptyState icon="contract" title="Нет активных перевозок" text="Следующие отправки появятся по действующим контрактам." />
              : ecosystem.trade.shipments
                  .filter((shipment) => shipment.status === 'in_transit' || shipment.status === 'delayed')
                  .sort((a, b) => a.arrivalDay - b.arrivalDay)
                  .slice(0, 8)
                  .map((shipment) => {
                    const seller = ecosystem.organizations.find((organization) => organization.id === shipment.sellerOrganizationId);
                    const buyer = ecosystem.organizations.find((organization) => organization.id === shipment.buyerOrganizationId);
                    return <div key={shipment.id} className="flow-row"><i className={shipment.status === 'delayed' ? 'bad' : ''} /><span><strong>{commodityName(ecosystem.trade, shipment.commodityKind, shipment.commodityId)}</strong><small>{seller?.name} → {buyer?.name} · прибытие день {shipment.arrivalDay}</small></span><b>{shipment.quantity}</b></div>;
                  })}
          </article>

          <article className="flow-block glass-card">
            <header><div><span>производство</span><strong>Продуктовые линии</strong></div><b>{ecosystem.trade.products.filter((product) => product.status === 'active').length}</b></header>
            {ecosystem.trade.products
              .filter((product) => product.status !== 'discontinued')
              .sort((a, b) => b.totalSold - a.totalSold)
              .slice(0, 10)
              .map((product) => {
                const producer = ecosystem.organizations.find((organization) => organization.id === product.producerOrganizationId);
                const stock = inventoryQuantity(ecosystem.trade, product.producerOrganizationId, 'product', product.id);
                const shelves = ecosystem.trade.shelves.filter((listing) => listing.productId === product.id);
                return <button key={product.id} className="product-flow-row" onClick={() => setProductModal(product)}><span className="product-flow-mark"><Icon name={product.family === 'cider' ? 'apple' : 'bottle'} /></span><span><small>{producer?.name} · {productFamilyLabel(product.family)}</small><strong>{product.name}</strong><em>{shelves.length} полок · склад {Math.round(stock)} · продано {product.totalSold}</em></span><b>{product.quality}</b></button>;
              })}
          </article>

          <article className="flow-block glass-card">
            <header><div><span>риски</span><strong>Узкие места</strong></div><b>{bottlenecks}</b></header>
            {bottlenecks === 0
              ? <EmptyState icon="market" title="Цепочки стабильны" text="Производство, поставки и полки сейчас не имеют критических разрывов." />
              : <>
                  {ecosystem.trade.batches.filter((batch) => batch.status === 'blocked').slice(0, 5).map((batch) => { const product = ecosystem.trade.products.find((item) => item.id === batch.productId); const producer = ecosystem.organizations.find((item) => item.id === batch.producerOrganizationId); return <div key={batch.id} className="flow-row warning"><i className="bad" /><span><strong>{producer?.name}: партия остановлена</strong><small>{product?.name} · {batch.issue}</small></span></div>; })}
                  {ecosystem.trade.contracts.filter((contract) => contract.failures > 0).slice(0, 5).map((contract) => { const seller = ecosystem.organizations.find((item) => item.id === contract.sellerOrganizationId); const buyer = ecosystem.organizations.find((item) => item.id === contract.buyerOrganizationId); return <div key={contract.id} className="flow-row warning"><i className="bad" /><span><strong>{commodityName(ecosystem.trade, contract.commodityKind, contract.commodityId)}</strong><small>{seller?.name} → {buyer?.name} · {contract.lastResult}</small></span><b>{contract.failures}</b></div>; })}
                  {ecosystem.trade.shelves.filter((listing) => listing.units <= 0).slice(0, 5).map((listing) => { const asset = ecosystem.assets.find((item) => item.id === listing.assetId); const product = ecosystem.trade.products.find((item) => item.id === listing.productId); return <div key={listing.id} className="flow-row warning"><i className="bad" /><span><strong>Пустая полка: {product?.name}</strong><small>{asset?.name} · {listing.stockoutDays} дн. без товара</small></span></div>; })}
                </>}
          </article>
        </section>
      )}

      {section === 'group' && (
        subsidiaries.length === 0
          ? <section className="glass-card"><EmptyState icon="handshake" title="Группа ещё не создана" text="Купи контрольный пакет работающей компании. Её активы, сотрудники, продукты и контракты останутся внутри мира." /></section>
          : <section className="controlled-assets">
              {subsidiaries.map(({ control, organization }) => {
                const assets = ecosystem.assets.filter((asset) => asset.ownerOrganizationId === organization.id);
                const products = ecosystem.trade.products.filter((product) => product.producerOrganizationId === organization.id && product.status === 'active');
                return <article key={organization.id} className="controlled-asset-card glass-card">
                  <header><div><span>дочерняя компания · {control.controlShare}%</span><strong>{organization.name}</strong></div><span className={`row-status ${organization.status === 'active' ? 'positive' : 'neutral'}`}>{statusLabel(organization.status)}</span></header>
                  <div className="detail-grid"><Detail label="Активы" value={String(assets.length)} /><Detail label="Продукты" value={String(products.length)} /><Detail label="Деньги" value={formatMoney(organization.cash)} /><Detail label="Долг" value={formatMoney(organization.debt)} /></div>
                  <div className="controlled-actions"><button className="button primary" onClick={() => setOrganizationModal(organization)}>Управление</button></div>
                </article>;
              })}
            </section>
      )}

      {section === 'control' && (
        controlledAssets.length === 0
          ? <section className="glass-card"><EmptyState icon="store" title="Нет объектов под контролем" text="Выкупи действующую точку или арендуй свободное помещение в городе." /></section>
          : <section className="controlled-assets">
              {controlledAssets.map((asset) => (
                <article key={asset.id} className="controlled-asset-card glass-card">
                  <header>
                    <div><span>{assetTypeLabel(asset.type)} · {asset.city}</span><strong>{asset.name}</strong></div>
                    <span className={`row-status ${asset.status === 'operating' ? 'positive' : 'neutral'}`}>{asset.status === 'operating' ? 'работает' : asset.status === 'closed' ? 'закрыто' : 'объект'}</span>
                  </header>
                  <div className="detail-grid">
                    <Detail label="Состояние" value={`${Math.round(asset.condition)}/100`} />
                    <Detail label="Поток" value={asset.footfall ? `${asset.footfall}/100` : '—'} />
                    <Detail label="Расход" value={`${formatMoney(asset.dailyOperatingCost + (asset.ownerOrganizationId === ecosystem.playerOrganizationId ? 0 : asset.dailyRent))}/д`} />
                    <Detail label="Полка" value={asset.venue ? `${controlledVenueStockUnits(asset)}/${controlledVenueStockLimit(asset)}` : '—'} />
                  </div>
                  {asset.venue && (
                    <div className="controlled-actions">
                      <button className="button primary" onClick={() => setStockAsset(asset)}>Полка</button>
                      <button className="button secondary" disabled={asset.venue.cleanliness >= 96} onClick={() => act(onClean(asset.id), false)}>Санитария</button>
                      <button className="button ghost" disabled={asset.venue.level >= 3 || state.finance.cash < controlledVenueUpgradeCost(asset)} onClick={() => act(onUpgrade(asset.id), false)}>Расширить</button>
                      <button className="button ghost" onClick={() => act(onStatus(asset.id, asset.venue?.status === 'open' ? 'closed' : 'open'), false)}>{asset.venue.status === 'open' ? 'Закрыть' : 'Открыть'}</button>
                    </div>
                  )}
                </article>
              ))}
            </section>
      )}

      {section === 'deals' && (
        ecosystem.transactions.length === 0
          ? <section className="glass-card"><EmptyState icon="contract" title="Сделок ещё не было" text="Выкуп, аренда, инвестиции, банкротства и поглощения появятся здесь." /></section>
          : <section className="transaction-list glass-card">
              {ecosystem.transactions.map((transaction) => (
                <article key={transaction.id}>
                  <i className={transaction.kind === 'bankruptcy' ? 'bad' : transaction.kind === 'npc_acquisition' ? 'neutral' : 'good'} />
                  <span><strong>{transaction.headline}</strong><small>День {transaction.day} · {transaction.detail}</small></span>
                  <b>{transaction.amount > 0 ? formatMoney(transaction.amount) : '—'}</b>
                </article>
              ))}
            </section>
      )}

      {assetModal && (
        <AssetModal
          asset={assetModal}
          owner={ecosystem.organizations.find((organization) => organization.id === assetModal.ownerOrganizationId)}
          ecosystem={ecosystem}
          cash={state.finance.cash}
          controlled={isPlayerControlledAsset(ecosystem, assetModal)}
          onClose={() => setAssetModal(null)}
          onAcquire={() => act(onAcquire(assetModal.id))}
          onLease={(type, name) => act(onLease(assetModal.id, type, name))}
        />
      )}
      {organizationModal && (
        <OrganizationModal
          organization={organizationModal}
          assets={ecosystem.assets.filter((asset) => organizationModal.assetIds.includes(asset.id))}
          ecosystem={ecosystem}
          currentShare={controlledShare(ecosystem, organizationModal.id)}
          cash={state.finance.cash}
          onClose={() => setOrganizationModal(null)}
          controlledOrganizations={[ecosystem.organizations.find((organization) => organization.id === ecosystem.playerOrganizationId)!, ...subsidiaries.map((item) => item.organization)]}
          onInvest={(share) => act(onInvest(organizationModal.id, share), false)}
          onTakeover={(targetShare) => act(onTakeover(organizationModal.id, targetShare), false)}
          onInject={(amount) => act(onInject(organizationModal.id, amount), false)}
          onPolicy={(autonomy, treasuryPolicy) => act(onPolicy(organizationModal.id, autonomy, treasuryPolicy), false)}
          onTransfer={(assetId, targetOrganizationId) => act(onTransfer(assetId, targetOrganizationId), false)}
        />
      )}
      {productModal && <ProductModal product={productModal} ecosystem={ecosystem} onClose={() => setProductModal(null)} />}
      {stockAsset && <StockModal state={state} asset={stockAsset} onClose={() => setStockAsset(null)} onSubmit={(releaseId, units, price) => act(onStock(stockAsset.id, releaseId, units, price))} />}
    </div>
  );
}

function AssetModal({ asset, owner, ecosystem, cash, controlled, onClose, onAcquire, onLease }: { asset: WorldAssetState; owner?: OrganizationState; ecosystem: NonNullable<GameState['ecosystem']>; cash: number; controlled: boolean; onClose: () => void; onAcquire: () => void; onLease: (type: RetailVenueType, name: string) => void }) {
  const [type, setType] = useState<RetailVenueType>('bar');
  const [name, setName] = useState(asset.name);
  const acquisitionEstimate = asset.askingPrice * (owner?.status === 'insolvent' ? .68 : owner?.status === 'strained' ? .84 : asset.status === 'operating' ? 1.18 : 1);
  const leaseCost = asset.dailyRent * 30 + (type === 'bar' ? 18_000 : 13_500);
  return (
    <Modal title={asset.name} kicker={`${assetTypeLabel(asset.type)} · ${asset.city}`} onClose={onClose} footer={
      controlled ? <span className="status-chip positive">Уже под контролем</span>
        : asset.status === 'vacant'
          ? <button className="button primary" disabled={name.trim().length < 2 || cash < leaseCost} onClick={() => onLease(type, name)}>Арендовать · {formatMoney(leaseCost)}</button>
          : <button className="button primary" disabled={cash < acquisitionEstimate} onClick={onAcquire}>Выкупить · ≈{formatMoney(acquisitionEstimate)}</button>
    }>
      <div className="asset-identity"><span className="ecosystem-glyph large"><Icon name={asset.type === 'bar' ? 'beer' : asset.type === 'shop' ? 'store' : 'map'} /></span><div><strong>{asset.address}</strong><small>{asset.audience}</small></div></div>
      <div className="detail-grid"><Detail label="Владелец" value={owner?.name ?? 'Частный собственник'} /><Detail label="Статус владельца" value={owner ? statusLabel(owner.status) : 'частный'} /><Detail label="Состояние" value={`${Math.round(asset.condition)}/100`} /><Detail label="Поток" value={`${asset.footfall}/100`} /><Detail label="Аренда" value={`${formatMoney(asset.dailyRent)}/д`} /><Detail label="Оценка" value={formatMoney(asset.askingPrice)} /></div>
      {(asset.type === 'bar' || asset.type === 'shop') && <div className="organization-assets"><span>Товарный оборот</span>{ecosystem.trade.shelves.filter((listing) => listing.assetId === asset.id).length === 0 ? <small>На полках нет товаров экосистемы.</small> : ecosystem.trade.shelves.filter((listing) => listing.assetId === asset.id).map((listing) => { const product = ecosystem.trade.products.find((item) => item.id === listing.productId); return <div key={listing.id}><strong>{product?.name ?? 'Неизвестный продукт'}</strong><small>{listing.units} на полке · сегодня {listing.unitsSoldToday} · всего {listing.totalUnitsSold}</small></div>; })}{ecosystem.trade.shipments.filter((shipment) => shipment.buyerAssetId === asset.id && (shipment.status === 'in_transit' || shipment.status === 'delayed')).map((shipment) => <div key={shipment.id}><strong>В пути: {commodityName(ecosystem.trade, shipment.commodityKind, shipment.commodityId)}</strong><small>{shipment.quantity} ед. · прибытие день {shipment.arrivalDay}</small></div>)}</div>}
      {asset.status === 'vacant' && <div className="lease-builder"><span>Что открыть</span><div className="choice-pills"><button className={type === 'bar' ? 'active' : ''} onClick={() => setType('bar')}>Бар</button><button className={type === 'shop' ? 'active' : ''} onClick={() => setType('shop')}>Магазин</button></div><label className="field"><span>Название оператора</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={36} /></label><small>Ты арендуешь конкретное помещение. Собственник, депозит и ежедневная аренда остаются частью мира.</small></div>}
    </Modal>
  );
}

function OrganizationModal({ organization, assets, ecosystem, currentShare, cash, controlledOrganizations, onClose, onInvest, onTakeover, onInject, onPolicy, onTransfer }: {
  organization: OrganizationState;
  assets: WorldAssetState[];
  ecosystem: NonNullable<GameState['ecosystem']>;
  currentShare: number;
  cash: number;
  controlledOrganizations: OrganizationState[];
  onClose: () => void;
  onInvest: (share: number) => void;
  onTakeover: (targetShare: 51 | 75 | 100) => void;
  onInject: (amount: number) => void;
  onPolicy: (autonomy: SubsidiaryAutonomy, treasuryPolicy: TreasuryPolicy) => void;
  onTransfer: (assetId: string, targetOrganizationId: string) => void;
}) {
  const [share, setShare] = useState(10);
  const [takeoverTarget, setTakeoverTarget] = useState<51 | 75 | 100>(51);
  const [injection, setInjection] = useState(10_000);
  const subsidiary = ecosystem.subsidiaries.find((item) => item.organizationId === organization.id);
  const [autonomy, setAutonomy] = useState<SubsidiaryAutonomy>(subsidiary?.autonomy ?? 'autonomous');
  const [treasuryPolicy, setTreasuryPolicy] = useState<TreasuryPolicy>(subsidiary?.treasuryPolicy ?? 'balanced');
  const statusMultiplier = organization.status === 'insolvent' ? .58 : organization.status === 'strained' ? .82 : 1.22;
  const investmentDiscount = organization.status === 'insolvent' ? .52 : organization.status === 'strained' ? .76 : 1;
  const investmentCost = organization.valuation * (share / 100) * investmentDiscount;
  const takeoverCost = organization.valuation * (Math.max(0, takeoverTarget - currentShare) / 100) * statusMultiplier * (takeoverTarget >= 75 ? 1.08 : 1);
  const controlled = currentShare >= 51;

  return (
    <Modal title={organization.name} kicker={`${organizationKindLabel(organization.kind)} · ${statusLabel(organization.status)}`} onClose={onClose}>
      <div className="detail-grid"><Detail label="Владелец" value={organization.ownerLabel} /><Detail label="Оценка" value={formatMoney(organization.valuation)} /><Detail label="Деньги" value={formatMoney(organization.cash)} /><Detail label="Долг" value={formatMoney(organization.debt)} /><Detail label="Выручка/д" value={formatMoney(organization.dailyRevenue)} /><Detail label="Расход/д" value={formatMoney(organization.dailyCosts)} /></div>
      <div className="organization-assets"><span>Объекты</span>{assets.length === 0 ? <small>Собственной недвижимости нет.</small> : assets.map((asset) => <div key={asset.id}><strong>{asset.name}</strong><small>{assetTypeLabel(asset.type)} · {asset.city} · {asset.status === 'for_sale' ? 'продаётся' : 'работает'}</small></div>)}</div>
      <div className="organization-assets"><span>Цепочка операций</span>{ecosystem.trade.products.filter((product) => product.producerOrganizationId === organization.id).map((product) => <div key={product.id}><strong>{product.name}</strong><small>{productFamilyLabel(product.family)} · склад {Math.round(inventoryQuantity(ecosystem.trade, organization.id, 'product', product.id))} · продано {product.totalSold}</small></div>)}{ecosystem.trade.contracts.filter((contract) => contract.buyerOrganizationId === organization.id || contract.sellerOrganizationId === organization.id).slice(0, 6).map((contract) => { const counterpartyId = contract.sellerOrganizationId === organization.id ? contract.buyerOrganizationId : contract.sellerOrganizationId; const counterparty = ecosystem.organizations.find((item) => item.id === counterpartyId); return <div key={contract.id}><strong>{contract.sellerOrganizationId === organization.id ? 'Поставляет' : 'Покупает'}: {commodityName(ecosystem.trade, contract.commodityKind, contract.commodityId)}</strong><small>{counterparty?.name} · каждые {contract.intervalDays} дн. · {contract.lastResult}</small></div>; })}</div>

      {!controlled && <>
        <div className="investment-control"><span>Миноритарная доля: сейчас {currentShare}%</span><div className="choice-pills">{[10, 25, 40].map((value) => <button key={value} className={share === value ? 'active' : ''} disabled={currentShare + value > 49} onClick={() => setShare(value)}>{value}%</button>)}</div><button className="button secondary" disabled={cash < investmentCost || currentShare + share > 49} onClick={() => onInvest(share)}>Купить долю · {formatMoney(investmentCost)}</button></div>
        <div className="investment-control"><span>Контрольная сделка</span><div className="choice-pills">{([51, 75, 100] as const).map((value) => <button key={value} className={takeoverTarget === value ? 'active' : ''} disabled={currentShare >= value} onClick={() => setTakeoverTarget(value)}>{value}%</button>)}</div><small>Компания сохранит сотрудников, объекты, продукты, контракты и собственный денежный поток.</small><button className="button primary" disabled={cash < takeoverCost || currentShare >= takeoverTarget} onClick={() => onTakeover(takeoverTarget)}>Получить контроль · {formatMoney(takeoverCost)}</button></div>
      </>}

      {controlled && subsidiary && <div className="investment-control"><span>Управление дочерней компанией · {currentShare}%</span>
        <label className="field"><span>Автономность</span><select value={autonomy} onChange={(event) => setAutonomy(event.target.value as SubsidiaryAutonomy)}><option value="autonomous">Автономная</option><option value="guided">Управляемая</option><option value="integrated">Интегрированная</option></select></label>
        <label className="field"><span>Казначейство</span><select value={treasuryPolicy} onChange={(event) => setTreasuryPolicy(event.target.value as TreasuryPolicy)}><option value="retain">Оставлять прибыль</option><option value="balanced">Баланс</option><option value="sweep">Изымать прибыль</option></select></label>
        <button className="button secondary" onClick={() => onPolicy(autonomy, treasuryPolicy)}>Применить политику</button>
        <label className="field"><span>Докапитализация</span><input type="number" min={5000} step={5000} value={injection} onChange={(event) => setInjection(Number(event.target.value))} /></label>
        <button className="button primary" disabled={cash < injection || injection < 5000} onClick={() => onInject(injection)}>Внести {formatMoney(injection)}</button>
        {assets.length > 0 && controlledOrganizations.length > 1 && <div className="organization-assets"><span>Передача активов внутри группы</span>{assets.map((asset) => <AssetTransferRow key={asset.id} asset={asset} organizations={controlledOrganizations.filter((item) => item.id !== organization.id)} onTransfer={onTransfer} />)}</div>}
      </div>}
    </Modal>
  );
}

function AssetTransferRow({ asset, organizations, onTransfer }: { asset: WorldAssetState; organizations: OrganizationState[]; onTransfer: (assetId: string, targetOrganizationId: string) => void }) {
  const [target, setTarget] = useState(organizations[0]?.id ?? '');
  return <div><span><strong>{asset.name}</strong><small>{assetTypeLabel(asset.type)} · {asset.city}</small></span><select value={target} onChange={(event) => setTarget(event.target.value)}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select><button className="button ghost compact-button" disabled={!target} onClick={() => onTransfer(asset.id, target)}>Передать</button></div>;
}

function ProductModal({ product, ecosystem, onClose }: { product: TradeProductState; ecosystem: NonNullable<GameState['ecosystem']>; onClose: () => void }) {
  const producer = ecosystem.organizations.find((organization) => organization.id === product.producerOrganizationId);
  const stock = inventoryQuantity(ecosystem.trade, product.producerOrganizationId, 'product', product.id);
  const batches = ecosystem.trade.batches.filter((batch) => batch.productId === product.id).slice(-4).reverse();
  const shelves = ecosystem.trade.shelves.filter((listing) => listing.productId === product.id);
  const contracts = ecosystem.trade.contracts.filter((contract) => contract.commodityKind === 'product' && contract.commodityId === product.id);
  return <Modal title={product.name} kicker={`${producer?.name ?? 'Производитель'} · ${productFamilyLabel(product.family)}`} onClose={onClose}>
    <div className="detail-grid"><Detail label="Качество" value={`${product.quality}/100`} /><Detail label="Склад" value={`${Math.round(stock)} бут.`} /><Detail label="Опт" value={formatMoney(product.wholesalePrice)} /><Detail label="Розница" value={formatMoney(product.recommendedRetailPrice)} /><Detail label="Произведено" value={String(product.totalProduced)} /><Detail label="Продано" value={String(product.totalSold)} /></div>
    <div className="organization-assets"><span>Где продаётся</span>{shelves.length === 0 ? <small>Продукт ещё не попал на полки.</small> : shelves.map((listing) => { const asset = ecosystem.assets.find((item) => item.id === listing.assetId); return <div key={listing.id}><strong>{asset?.name ?? listing.assetId}</strong><small>{listing.units} осталось · сегодня {listing.unitsSoldToday} · цена {formatMoney(listing.retailPrice)}</small></div>; })}</div>
    <div className="organization-assets"><span>Контракты и партии</span>{contracts.map((contract) => { const buyer = ecosystem.organizations.find((item) => item.id === contract.buyerOrganizationId); return <div key={contract.id}><strong>{buyer?.name}</strong><small>{contract.quantity} ед. каждые {contract.intervalDays} дн. · {contract.lastResult}</small></div>; })}{batches.map((batch) => <div key={batch.id}><strong>{batch.status === 'ready' ? 'Готовая партия' : batch.status === 'blocked' ? 'Заблокирована' : 'В производстве'}</strong><small>{batch.producedUnits || batch.plannedUnits} ед. · {batch.issue ?? `день готовности ${batch.readyDay}`}</small></div>)}</div>
  </Modal>;
}

function StockModal({ state, asset, onClose, onSubmit }: { state: GameState; asset: WorldAssetState; onClose: () => void; onSubmit: (releaseId: string, units: number, price: number) => void }) {
  const releases = useMemo(() => state.brand.releases.filter((release) => release.status === 'active' && (state.production.batches.find((batch) => batch.id === release.batchId)?.availableUnits ?? 0) >= 6), [state.brand.releases, state.production.batches]);
  const [releaseId, setReleaseId] = useState(releases[0]?.id ?? '');
  const release = releases.find((item) => item.id === releaseId);
  const batch = state.production.batches.find((item) => item.id === release?.batchId);
  const [units, setUnits] = useState(12);
  const [price, setPrice] = useState(release?.retailPrice ?? 4);
  const maxUnits = Math.max(0, Math.min(batch?.availableUnits ?? 0, controlledVenueStockLimit(asset) - controlledVenueStockUnits(asset)));
  return (
    <Modal title={`Полка: ${asset.name}`} kicker="операционный контроль" onClose={onClose} footer={<button className="button primary" disabled={!release || units < 6 || units > maxUnits || price <= (release?.wholesalePrice ?? 0)} onClick={() => onSubmit(releaseId, units, price)}>Передать {units} бутылок</button>}>
      {releases.length === 0 ? <EmptyState icon="bottle" title="Нет готовых релизов" text="Нужен активный брендированный релиз и минимум 6 свободных бутылок." /> : <>
        <div className="release-choice-list">{releases.map((item) => { const itemBatch = state.production.batches.find((entry) => entry.id === item.batchId); return <button key={item.id} className={releaseId === item.id ? 'active' : ''} onClick={() => { setReleaseId(item.id); setPrice(item.retailPrice); }}><span className="release-bottle-mark"><i /></span><span><strong>{item.name}</strong><small>Доступно {itemBatch?.availableUnits ?? 0}</small></span><b>{formatMoney(item.retailPrice)}</b></button>; })}</div>
        <div className="retail-stock-form"><label><span>Количество</span><input type="number" min={6} max={maxUnits} value={units} onChange={(event) => setUnits(Number(event.target.value))} /></label><label><span>Цена</span><input type="number" min={(release?.wholesalePrice ?? 0) + .01} step="0.1" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label></div>
      </>}
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
function statusLabel(status: OrganizationState['status']): string { return status === 'active' ? 'устойчива' : status === 'strained' ? 'под давлением' : status === 'insolvent' ? 'неплатёжеспособна' : 'поглощена'; }
function assetPriority(asset: WorldAssetState): number { return asset.status === 'for_sale' ? 0 : asset.status === 'vacant' ? 1 : asset.status === 'closed' ? 2 : 3; }
function organizationPriority(organization: OrganizationState): number { return organization.status === 'insolvent' ? 0 : organization.status === 'strained' ? 1 : 2; }
