import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getIngredient, getSupplier, suppliers } from '../../data/supplyCatalog';
import type { GameState } from '../../domain/game';
import { formatQuantity, inventoryValue, type InventoryLot, type SupplierOfferState } from '../../domain/supply';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal, SubTabs } from '../../ui/MobileUI';

interface SupplyHubProps {
  state: GameState;
  initialSection?: SupplySection;
  onOrder: (offerId: string, quantity: number) => ActionResult;
  onSignSupplier: (supplierId: string) => ActionResult;
}

type SupplySection = 'inventory' | 'suppliers' | 'orders';

export function SupplyHub({ state, onOrder, onSignSupplier, initialSection = 'inventory' }: SupplyHubProps) {
  const [section, setSection] = useState<SupplySection>(initialSection);
  const [search, setSearch] = useState('');
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SupplierOfferState | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const inventory = state.supply.inventory.filter((lot) => lot.quantity > 0);
  const pending = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));
  const delivered = state.supply.purchaseOrders.filter((order) => order.status === 'delivered');
  const query = search.trim().toLocaleLowerCase('ru-RU');

  const supplierStats = useMemo(() => suppliers.map((supplier) => {
    const relation = state.supply.relationships.find((item) => item.supplierId === supplier.id);
    const offers = state.supply.offers.filter((offer) => offer.supplierId === supplier.id);
    return { supplier, relation, offers };
  }).filter(({ supplier, offers }) => !query || `${supplier.name} ${supplier.focus} ${supplier.region} ${offers.map((offer) => `${offer.variantName} ${getIngredient(offer.ingredientId).name}`).join(' ')}`.toLocaleLowerCase('ru-RU').includes(query)), [query, state.supply]);

  function show(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3000);
  }

  function openOffer(offer: SupplierOfferState) {
    setSelectedOffer(offer);
    setQuantity(offer.defaultOrder);
  }

  function submitOrder() {
    if (!selectedOffer) return;
    const result = onOrder(selectedOffer.id, quantity);
    show(result);
    if (result.ok) {
      setSelectedOffer(null);
      setSection('orders');
    }
  }

  return (
    <div className="supply-hub">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <div className="supply-summary">
        <div><span>Склад</span><strong>{formatMoney(inventoryValue(inventory))}</strong><small>{inventory.length} активных лотов</small></div>
        <div><span>В пути</span><strong>{pending.length}</strong><small>{formatMoney(pending.reduce((sum, order) => sum + order.totalCost, 0))} оплачено</small></div>
        <div><span>Договоры</span><strong>{state.supply.relationships.filter((item) => item.agreement).length}</strong><small>постоянных</small></div>
      </div>

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'inventory', label: 'Склад', badge: inventory.length },
        { id: 'suppliers', label: 'Поставщики' },
        { id: 'orders', label: 'Заказы', badge: pending.length },
      ]} />

      {section === 'inventory' && (
        inventory.length === 0 ? (
          <section className="plain-panel"><EmptyState icon="archive" title="Склад пуст" text="Закупка выполняется из требований новой партии или в разделе поставщиков." /></section>
        ) : (
          <section className="compact-list plain-panel">
            {inventory.map((lot) => {
              const ingredient = getIngredient(lot.ingredientId);
              const freshness = Math.max(0, lot.expiresDay - state.day);
              return (
                <button key={lot.id} className="compact-list-row supply-lot-row" onClick={() => setSelectedLot(lot)}>
                  <span className={`quality-orb q-${qualityBand(lot.quality)}`}>{lot.quality}</span>
                  <span><strong>{lot.variantName}</strong><small>{ingredient.name} · {lot.origin} · ещё {freshness} дн.</small></span>
                  <span className="row-status positive">{formatQuantity(lot.quantity, ingredient.unit)}</span>
                </button>
              );
            })}
          </section>
        )
      )}

      {section === 'suppliers' && <>
        <div className="content-toolbar supply-toolbar">
          <label className="search-field"><Icon name="search" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Сырьё, товар или поставщик" aria-label="Поиск предложений поставщиков" /></label>
          <span>{supplierStats.reduce((sum, item) => sum + item.offers.length, 0)} предложений</span>
        </div>
        <section className="supplier-catalog">
          {supplierStats.map(({ supplier, relation, offers }) => (
            <article key={supplier.id} className="supplier-catalog-card plain-panel">
              <header>
                <span><strong>{supplier.name}</strong><small>{supplier.region}, {supplier.country} · надёжность {supplier.reliability}/100</small></span>
                <span className={`row-status ${relation?.agreement ? 'positive' : ''}`}>{relation?.agreement ? 'договор' : `отношения ${relation?.relationship ?? 0}`}</span>
              </header>
              <p>{supplier.focus}. {supplier.summary}</p>
              <div className="supplier-catalog-offers">
                {offers.map((offer) => {
                  const ingredient = getIngredient(offer.ingredientId);
                  return <button key={offer.id} onClick={() => openOffer(offer)}>
                    <span><strong>{offer.variantName}</strong><small>{ingredient.name} · {offer.origin}</small></span>
                    <span><strong>{offer.currentPrice.toFixed(2)} / {unitShort(ingredient.unit)}</strong><small>{offer.qualityEstimate[0]}–{offer.qualityEstimate[1]} качество · {offer.currentLeadDays} дн.</small></span>
                  </button>;
                })}
              </div>
              {!relation?.agreement && <button className="supplier-contract-action" onClick={() => show(onSignSupplier(supplier.id))} disabled={(relation?.relationship ?? 0) < 35}>Постоянный договор · 350</button>}
            </article>
          ))}
          {supplierStats.length === 0 && <section className="plain-panel"><EmptyState icon="store" title="Ничего не найдено" text="Измени запрос: поиск работает по сырью, товару и названию поставщика." /></section>}
        </section>
      </>}

      {section === 'orders' && (
        state.supply.purchaseOrders.length === 0 ? (
          <section className="plain-panel"><EmptyState icon="handshake" title="Закупок пока нет" text="Заказы появятся здесь после покупки из требований партии или каталога поставщиков." /></section>
        ) : (
          <section className="compact-list plain-panel">
            {[...pending, ...delivered, ...state.supply.purchaseOrders.filter((order) => !['pending', 'delayed', 'delivered'].includes(order.status))].map((order) => {
              const offer = state.supply.offers.find((item) => item.id === order.offerId);
              return (
                <div key={order.id} className="compact-list-row order-row static-row">
                  <span className={`row-icon order-${order.status}`}><Icon name={order.status === 'delivered' ? 'check' : order.status === 'delayed' ? 'warning' : 'clock'} /></span>
                  <span><strong>{offer?.variantName ?? order.ingredientId}</strong><small>{getSupplier(order.supplierId).name} · {formatQuantity(order.quantity, order.unit)} · {order.note}</small></span>
                  <span className={`row-status ${order.status === 'delivered' ? 'positive' : order.status === 'delayed' ? 'required' : ''}`}>{order.status === 'delivered' ? `день ${order.deliveredDay}` : `до ${order.expectedDay}`}</span>
                </div>
              );
            })}
          </section>
        )
      )}

      {selectedLot && (
        <Modal title={selectedLot.variantName} kicker={getIngredient(selectedLot.ingredientId).name} onClose={() => setSelectedLot(null)}>
          <div className="lot-quality"><strong>{selectedLot.quality}</strong><span>качество лота</span></div>
          <div className="detail-grid">
            <div><span>Остаток</span><strong>{formatQuantity(selectedLot.quantity, selectedLot.unit)}</strong></div>
            <div><span>Цена</span><strong>{selectedLot.unitCost.toFixed(2)} / {unitShort(selectedLot.unit)}</strong></div>
            <div><span>Происхождение</span><strong>{selectedLot.origin}</strong></div>
            <div><span>Годен до</span><strong>день {selectedLot.expiresDay}</strong></div>
          </div>
          <p className="modal-description">Поставщик: {getSupplier(selectedLot.supplierId).name}. Исходный объём — {formatQuantity(selectedLot.initialQuantity, selectedLot.unit)}.</p>
        </Modal>
      )}

      {selectedOffer && (
        <Modal title={selectedOffer.variantName} kicker={`${getSupplier(selectedOffer.supplierId).name} · ${getIngredient(selectedOffer.ingredientId).name}`} onClose={() => setSelectedOffer(null)} footer={<button className="button primary" disabled={quantity < selectedOffer.minimumOrder || quantity > selectedOffer.availableQuantity} onClick={submitOrder}>Заказать · {formatMoney(selectedOffer.currentPrice * quantity)}</button>}>
          <div className="detail-grid">
            <div><span>Цена</span><strong>{selectedOffer.currentPrice.toFixed(2)} / {unitShort(getIngredient(selectedOffer.ingredientId).unit)}</strong></div>
            <div><span>Качество</span><strong>{selectedOffer.qualityEstimate[0]}–{selectedOffer.qualityEstimate[1]}</strong></div>
            <div><span>Доставка</span><strong>{selectedOffer.currentLeadDays} дн.</strong></div>
            <div><span>Доступно</span><strong>{formatQuantity(selectedOffer.availableQuantity, getIngredient(selectedOffer.ingredientId).unit)}</strong></div>
          </div>
          <label className="order-quantity"><span>Количество</span><input type="number" min={selectedOffer.minimumOrder} max={selectedOffer.availableQuantity} step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><small>Минимум {formatQuantity(selectedOffer.minimumOrder, getIngredient(selectedOffer.ingredientId).unit)}</small></label>
          <div className={`price-trend ${selectedOffer.trend}`}><Icon name={selectedOffer.trend === 'expensive' ? 'warning' : selectedOffer.trend === 'cheaper' ? 'check' : 'market'} /><span>{selectedOffer.trend === 'expensive' ? 'Цена выше обычной' : selectedOffer.trend === 'cheaper' ? 'Цена сейчас выгодная' : 'Цена стабильна'}</span></div>
        </Modal>
      )}
    </div>
  );
}

function qualityBand(value: number) {
  return value >= 90 ? 'top' : value >= 80 ? 'good' : value >= 70 ? 'mid' : 'low';
}

function unitShort(unit: 'kg' | 'pack' | 'unit') {
  return unit === 'kg' ? 'кг' : unit === 'pack' ? 'уп.' : 'шт.';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
