import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getIngredient, getSupplier, suppliers, type IngredientUnit } from '../../data/supplyCatalog';
import type { GameState } from '../../domain/game';
import { formatQuantity, type InventoryLot, type SupplierOfferState } from '../../domain/supply';
import { IngredientArt, RatingStars, type IngredientVisualVariant } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal } from '../../ui/MobileUI';

interface SupplyHubProps {
  state: GameState;
  initialSection?: SupplySection;
  onOrder: (offerId: string, quantity: number) => ActionResult;
  onSignSupplier: (supplierId: string) => ActionResult;
  onBack?: () => void;
}

export type SupplySection = 'inventory' | 'suppliers' | 'contracts' | 'orders';
type SortMode = 'recommended' | 'price' | 'quality' | 'delivery';

export function SupplyHub({ state, onOrder, onSignSupplier, initialSection = 'suppliers', onBack }: SupplyHubProps) {
  const [section, setSection] = useState<SupplySection>(initialSection);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('recommended');
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SupplierOfferState | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const inventory = state.supply.inventory.filter((lot) => lot.quantity > 0);
  const pending = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));
  const agreements = state.supply.relationships.filter((item) => item.agreement);
  const query = search.trim().toLocaleLowerCase('ru-RU');

  const offers = useMemo(() => state.supply.offers
    .filter((offer) => {
      const ingredient = getIngredient(offer.ingredientId);
      const supplier = getSupplier(offer.supplierId);
      return !query || `${ingredient.name} ${offer.variantName} ${supplier.name} ${offer.origin}`.toLocaleLowerCase('ru-RU').includes(query);
    })
    .sort((left, right) => {
      if (sort === 'price') return left.currentPrice - right.currentPrice;
      if (sort === 'quality') return right.qualityEstimate[1] - left.qualityEstimate[1];
      if (sort === 'delivery') return left.currentLeadDays - right.currentLeadDays;
      return recommendationScore(right) - recommendationScore(left);
    }), [query, sort, state.supply.offers]);

  const supplierStats = useMemo(() => suppliers.map((supplier) => {
    const relation = state.supply.relationships.find((item) => item.supplierId === supplier.id);
    const supplierOffers = offers.filter((offer) => offer.supplierId === supplier.id);
    return { supplier, relation, offers: supplierOffers };
  }).filter((item) => item.offers.length > 0), [offers, state.supply.relationships]);

  const critical = state.supply.offers
    .filter((offer) => !inventory.some((lot) => lot.ingredientId === offer.ingredientId && lot.quantity > offer.minimumOrder))
    .filter((offer, index, all) => all.findIndex((item) => item.ingredientId === offer.ingredientId) === index)
    .slice(0, 3);
  const best = offers[0] ?? null;
  const nextOrder = [...pending].sort((left, right) => left.expectedDay - right.expectedDay)[0] ?? null;

  function show(result: ActionResult) { setFeedback(result); window.setTimeout(() => setFeedback(null), 2800); }
  function openOffer(offer: SupplierOfferState) { setSelectedOffer(offer); setQuantity(offer.defaultOrder); }
  function submitOrder() { if (!selectedOffer) return; const result = onOrder(selectedOffer.id, quantity); show(result); if (result.ok) { setSelectedOffer(null); setSection('orders'); } }

  return (
    <div className="lux-screen lux-market-screen">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}><Icon name={feedback.ok ? 'check' : 'warning'} />{feedback.message}</div>}
      <header className="lux-screen-header lux-market-header">
        {onBack && <button className="lux-icon-button" onClick={onBack} aria-label="Назад в производство"><Icon name="arrow" /></button>}
        <div className="lux-screen-title"><span>Снабжение и закупки</span><h1>Рынок ингредиентов</h1><p>Сравнивай предложения и закупай лучшее сырьё.</p></div>
        <span className="lux-market-balance"><small>Предложения</small><strong>{state.supply.offers.length}</strong></span>
      </header>

      <nav className="lux-tabs lux-market-tabs" aria-label="Разделы рынка ингредиентов">
        {([['inventory', 'Сырьё'], ['suppliers', 'Поставщики'], ['contracts', 'Контракты'], ['orders', 'Заказы']] as Array<[SupplySection, string]>).map(([id, label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}{id === 'orders' && pending.length > 0 && <i>{pending.length}</i>}</button>)}
      </nav>

      {(section === 'inventory' || section === 'suppliers') && <div className="lux-market-toolbar"><label><Icon name="search" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ингредиент или поставщик" /></label><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Сортировка"><option value="recommended">Рекомендуемое</option><option value="price">Цена</option><option value="quality">Качество</option><option value="delivery">Доставка</option></select></div>}

      {section === 'suppliers' && <>
        <section className="lux-market-summary">
          <article><header>Нужно докупить</header>{critical.length ? critical.map((offer) => <p key={offer.ingredientId}><Icon name="warning" />{getIngredient(offer.ingredientId).name}</p>) : <p><Icon name="check" />Критичных дефицитов нет</p>}<button onClick={() => setSection('inventory')}>Смотреть склад <Icon name="arrow" /></button></article>
          <article><header>Лучшее предложение</header>{best ? <><strong>{getIngredient(best.ingredientId).name}</strong><span>{getSupplier(best.supplierId).name}</span><b>{formatPrice(best.currentPrice, getIngredient(best.ingredientId).unit)}</b><RatingStars value={best.qualityEstimate[1] / 20} /><small>Поставка: {best.currentLeadDays} дн.</small></> : <p>Нет предложений</p>}</article>
          <article><header>Прибудет скоро</header><span className="market-truck"><Icon name="market" /></span><strong>{nextOrder ? `День ${nextOrder.expectedDay}` : 'Нет поставок'}</strong><small>{nextOrder ? `${formatQuantity(nextOrder.quantity, nextOrder.unit)} · ${getSupplier(nextOrder.supplierId).name}` : 'Оформи заказ на рынке'}</small></article>
        </section>

        <section className="lux-offer-section"><header><span>Предложения на рынке</span><small>{offers.length} доступно</small></header><div className="lux-offer-list">{offers.slice(0, 12).map((offer, index) => <OfferRow key={offer.id} offer={offer} rank={index + 1} best={offer.id === best?.id} onOpen={() => openOffer(offer)} />)}</div>{offers.length === 0 && <EmptyState icon="store" title="Ничего не найдено" text="Измени поисковый запрос." />}</section>

        <section className="lux-market-footer-stats"><article><span>Рыночная ситуация</span><strong className="success">Стабильная</strong><small>Цены без резких изменений</small></article><article><span>Доставки</span><strong>{pending.length}</strong><small>в пути на склад</small></article><article><span>Контракты</span><strong>{agreements.length}</strong><small>активных соглашений</small></article></section>
      </>}

      {section === 'inventory' && <InventorySection inventory={inventory} onOpen={setSelectedLot} />}
      {section === 'contracts' && <ContractsSection state={state} supplierStats={supplierStats} onSign={(supplierId) => show(onSignSupplier(supplierId))} />}
      {section === 'orders' && <OrdersSection state={state} />}

      {selectedLot && <Modal title={selectedLot.variantName} kicker={getIngredient(selectedLot.ingredientId).name} onClose={() => setSelectedLot(null)}><div className="lot-quality"><strong>{selectedLot.quality}</strong><span>качество лота</span></div><div className="detail-grid"><div><span>Остаток</span><strong>{formatQuantity(selectedLot.quantity, selectedLot.unit)}</strong></div><div><span>Цена</span><strong>{formatPrice(selectedLot.unitCost, selectedLot.unit)}</strong></div><div><span>Происхождение</span><strong>{selectedLot.origin}</strong></div><div><span>Годен до</span><strong>день {selectedLot.expiresDay}</strong></div></div></Modal>}
      {selectedOffer && <Modal title={getIngredient(selectedOffer.ingredientId).name} kicker={`${selectedOffer.variantName} · ${getSupplier(selectedOffer.supplierId).name}`} onClose={() => setSelectedOffer(null)} footer={<button className="button primary" disabled={quantity < selectedOffer.minimumOrder || quantity > selectedOffer.availableQuantity} onClick={submitOrder}>Заказать · {formatMoney(selectedOffer.currentPrice * quantity)} ₽</button>}><div className="lux-order-preview"><IngredientArt variant={ingredientVisual(selectedOffer.ingredientId)} /><div><strong>{formatPrice(selectedOffer.currentPrice, getIngredient(selectedOffer.ingredientId).unit)}</strong><RatingStars value={selectedOffer.qualityEstimate[1] / 20} /><small>{selectedOffer.origin} · {selectedOffer.currentLeadDays} дн.</small></div></div><label className="order-quantity"><span>Количество</span><input type="number" min={selectedOffer.minimumOrder} max={selectedOffer.availableQuantity} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><small>Минимум {formatQuantity(selectedOffer.minimumOrder, getIngredient(selectedOffer.ingredientId).unit)}</small></label></Modal>}
    </div>
  );
}

function OfferRow({ offer, rank, best, onOpen }: { offer: SupplierOfferState; rank: number; best: boolean; onOpen: () => void }) {
  const ingredient = getIngredient(offer.ingredientId); const supplier = getSupplier(offer.supplierId);
  return <article className={best ? 'best' : ''}><span className="offer-rank">{rank}</span><IngredientArt variant={ingredientVisual(offer.ingredientId)} /><div className="offer-copy"><strong>{ingredient.name}</strong><span>{supplier.name}</span><small>{offer.origin} · {offer.currentLeadDays} дн. · мин. {formatQuantity(offer.minimumOrder, ingredient.unit)}</small></div><div className="offer-quality"><span>Качество</span><RatingStars value={offer.qualityEstimate[1] / 20} /></div><div className="offer-price"><strong>{formatPrice(offer.currentPrice, ingredient.unit)}</strong><button onClick={onOpen}>{best ? 'Лучшее' : 'Выбрать'}</button></div></article>;
}
function InventorySection({ inventory, onOpen }: { inventory: InventoryLot[]; onOpen: (lot: InventoryLot) => void }) { return <section className="lux-inventory-section"><header><span>Склад сырья</span><small>{inventory.length} активных лотов</small></header>{inventory.length === 0 ? <EmptyState icon="archive" title="Склад пуст" text="Открой поставщиков и выбери предложение." /> : <div>{inventory.map((lot) => <button key={lot.id} onClick={() => onOpen(lot)}><IngredientArt variant={ingredientVisual(lot.ingredientId)} /><span><strong>{lot.variantName}</strong><small>{getIngredient(lot.ingredientId).name} · {lot.origin}</small></span><b>{formatQuantity(lot.quantity, lot.unit)}</b><em>качество {lot.quality} · до дня {lot.expiresDay}</em></button>)}</div>}</section>; }
function ContractsSection({ state, supplierStats, onSign }: { state: GameState; supplierStats: Array<{ supplier: (typeof suppliers)[number]; relation: GameState['supply']['relationships'][number] | undefined; offers: SupplierOfferState[] }>; onSign: (id: string) => void }) { return <section className="lux-contract-section"><header><span>Поставщики и договоры</span><small>{state.supply.relationships.filter((item) => item.agreement).length} активных</small></header><div>{supplierStats.map(({ supplier, relation, offers }) => <article key={supplier.id}><div><strong>{supplier.name}</strong><span>{supplier.region}, {supplier.country}</span><small>{supplier.focus} · надёжность {supplier.reliability}/100</small></div><b>{offers.length} предложений</b><button disabled={relation?.agreement || (relation?.relationship ?? 0) < 35} onClick={() => onSign(supplier.id)}>{relation?.agreement ? 'Договор активен' : `Заключить · отношения ${relation?.relationship ?? 0}`}</button></article>)}</div></section>; }
function OrdersSection({ state }: { state: GameState }) { const orders = state.supply.purchaseOrders; return <section className="lux-orders-section"><header><span>Заказы и поставки</span><small>{orders.length} всего</small></header>{orders.length === 0 ? <EmptyState icon="handshake" title="Заказов пока нет" text="Выбери предложение поставщика." /> : <div>{orders.map((order) => <article key={order.id}><Icon name={order.status === 'delivered' ? 'check' : order.status === 'delayed' ? 'warning' : 'clock'} /><span><strong>{state.supply.offers.find((item) => item.id === order.offerId)?.variantName ?? order.ingredientId}</strong><small>{getSupplier(order.supplierId).name} · {formatQuantity(order.quantity, order.unit)}</small></span><b>{order.status === 'delivered' ? `Принято, день ${order.deliveredDay}` : order.status === 'delayed' ? `Задержка до дня ${order.expectedDay}` : `Прибудет, день ${order.expectedDay}`}</b></article>)}</div>}</section>; }
function recommendationScore(offer: SupplierOfferState) { return offer.qualityEstimate[1] * 1.4 - offer.currentPrice * 2 - offer.currentLeadDays * 3 + (offer.trend === 'cheaper' ? 10 : offer.trend === 'expensive' ? -6 : 0); }
function ingredientVisual(id: string): IngredientVisualVariant { const value = id.toLowerCase(); if (value.includes('citrus')) return 'citrus'; if (value.includes('agave')) return 'agave'; if (value.includes('coffee')) return 'coffee'; if (value.includes('tonic') || value.includes('mixer')) return 'tonic'; if (value.includes('orange')) return 'orange'; if (value.includes('mint') || value.includes('botanical')) return 'mint'; if (value.includes('ginger')) return 'ginger'; return 'generic'; }
function unitShort(unit: IngredientUnit) { return unit === 'kg' ? 'кг' : unit === 'pack' ? 'уп.' : 'шт.'; }
function formatPrice(value: number, unit: IngredientUnit) { return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} ₽ / ${unitShort(unit)}`; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
