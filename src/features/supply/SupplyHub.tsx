import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getIngredient, getSupplier, suppliers, type SupplierDefinition } from '../../data/supplyCatalog';
import type { GameState } from '../../domain/game';
import { formatQuantity, inventoryValue, type InventoryLot, type SupplierOfferState } from '../../domain/supply';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal, SubTabs } from '../../ui/MobileUI';

interface SupplyHubProps {
  state: GameState;
  onOrder: (offerId: string, quantity: number) => ActionResult;
  onSignSupplier: (supplierId: string) => ActionResult;
}

type SupplySection = 'inventory' | 'suppliers' | 'orders';

export function SupplyHub({ state, onOrder, onSignSupplier }: SupplyHubProps) {
  const [section, setSection] = useState<SupplySection>('inventory');
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDefinition | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SupplierOfferState | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const inventory = state.supply.inventory.filter((lot) => lot.quantity > 0);
  const pending = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));
  const delivered = state.supply.purchaseOrders.filter((order) => order.status === 'delivered');

  const supplierStats = useMemo(() => suppliers.map((supplier) => {
    const relation = state.supply.relationships.find((item) => item.supplierId === supplier.id);
    const offers = state.supply.offers.filter((offer) => offer.supplierId === supplier.id);
    return { supplier, relation, offers };
  }), [state.supply]);

  function show(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3000);
  }

  function openOffer(offer: SupplierOfferState) {
    setSelectedSupplier(null);
    setSelectedOffer(offer);
    setQuantity(offer.defaultOrder);
  }

  function submitOrder() {
    if (!selectedOffer) return;
    const result = onOrder(selectedOffer.id, quantity);
    show(result);
    if (result.ok) {
      setSelectedOffer(null);
      setSelectedSupplier(null);
      setSection('orders');
    }
  }

  return (
    <div className="supply-hub">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <div className="supply-summary">
        <div><span>Склад</span><strong>{formatMoney(inventoryValue(inventory))}</strong><small>{inventory.length} активных лотов</small></div>
        <div><span>В пути</span><strong>{pending.length}</strong><small>{pending.reduce((sum, order) => sum + order.totalCost, 0).toFixed(0)} оплачено</small></div>
        <div><span>Договоры</span><strong>{state.supply.relationships.filter((item) => item.agreement).length}</strong><small>постоянных</small></div>
      </div>

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'inventory', label: 'Склад', badge: inventory.length },
        { id: 'suppliers', label: 'Поставщики' },
        { id: 'orders', label: 'Заказы', badge: pending.length },
      ]} />

      {section === 'inventory' && (
        inventory.length === 0 ? (
          <section className="glass-card"><EmptyState icon="archive" title="Склад пуст" text="Закажи сырьё у поставщика. После доставки оно появится здесь." action={<button className="button primary" onClick={() => setSection('suppliers')}>Открыть поставщиков</button>} /></section>
        ) : (
          <section className="compact-list glass-card">
            {inventory.map((lot) => {
              const ingredient = getIngredient(lot.ingredientId);
              const freshness = Math.max(0, lot.expiresDay - state.day);
              return (
                <button key={lot.id} className="compact-list-row supply-lot-row" onClick={() => setSelectedLot(lot)}>
                  <span className={`quality-orb q-${qualityBand(lot.quality)}`}>{lot.quality}</span>
                  <span><strong>{lot.variantName}</strong><small>{lot.origin} · ещё {freshness} дн.</small></span>
                  <span className="row-status positive">{formatQuantity(lot.quantity, ingredient.unit)}</span>
                </button>
              );
            })}
          </section>
        )
      )}

      {section === 'suppliers' && (
        <section className="compact-list glass-card">
          {supplierStats.map(({ supplier, relation, offers }) => (
            <button key={supplier.id} className="compact-list-row supplier-row" onClick={() => setSelectedSupplier(supplier)}>
              <span className="row-icon"><Icon name="store" /></span>
              <span><strong>{supplier.name}</strong><small>{supplier.region}, {supplier.country} · {offers.length} позиций</small></span>
              <span className={`row-status ${relation?.agreement ? 'positive' : ''}`}>{relation?.agreement ? 'договор' : `${relation?.relationship ?? 0}/100`}</span>
            </button>
          ))}
        </section>
      )}

      {section === 'orders' && (
        state.supply.purchaseOrders.length === 0 ? (
          <section className="glass-card"><EmptyState icon="handshake" title="Закупок пока нет" text="Оформленные заказы будут двигаться по дням и могут задерживаться." action={<button className="button primary" onClick={() => setSection('suppliers')}>Сделать заказ</button>} /></section>
        ) : (
          <section className="compact-list glass-card">
            {[...pending, ...delivered, ...state.supply.purchaseOrders.filter((order) => !['pending', 'delayed', 'delivered'].includes(order.status))].map((order) => {
              const offer = state.supply.offers.find((item) => item.id === order.offerId);
              return (
                <div key={order.id} className="compact-list-row order-row static-row">
                  <span className={`row-icon order-${order.status}`}><Icon name={order.status === 'delivered' ? 'check' : order.status === 'delayed' ? 'warning' : 'clock'} /></span>
                  <span><strong>{offer?.variantName ?? order.ingredientId}</strong><small>{formatQuantity(order.quantity, order.unit)} · {order.note}</small></span>
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

      {selectedSupplier && (
        <Modal
          title={selectedSupplier.name}
          kicker={`${selectedSupplier.region} · ${selectedSupplier.country}`}
          onClose={() => setSelectedSupplier(null)}
          footer={supplierFooter(state, selectedSupplier, onSignSupplier, show)}
        >
          <p className="modal-description">{selectedSupplier.summary}</p>
          <div className="supplier-focus"><span>Специализация</span><strong>{selectedSupplier.focus}</strong><small>Надёжность {selectedSupplier.reliability}/100</small></div>
          <div className="supplier-offers">
            {state.supply.offers.filter((offer) => offer.supplierId === selectedSupplier.id).map((offer) => (
              <button key={offer.id} onClick={() => openOffer(offer)}>
                <span><strong>{offer.variantName}</strong><small>{offer.origin} · качество {offer.qualityEstimate[0]}–{offer.qualityEstimate[1]}</small></span>
                <span><b>{offer.currentPrice.toFixed(2)}</b><small>за {unitShort(getIngredient(offer.ingredientId).unit)}</small></span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {selectedOffer && (
        <Modal title={selectedOffer.variantName} kicker={getSupplier(selectedOffer.supplierId).name} onClose={() => setSelectedOffer(null)} footer={<button className="button primary" onClick={submitOrder}>Заказать за {formatMoney(selectedOffer.currentPrice * quantity)}</button>}>
          <div className="detail-grid">
            <div><span>Цена</span><strong>{selectedOffer.currentPrice.toFixed(2)} / {unitShort(getIngredient(selectedOffer.ingredientId).unit)}</strong></div>
            <div><span>Качество</span><strong>{selectedOffer.qualityEstimate[0]}–{selectedOffer.qualityEstimate[1]}</strong></div>
            <div><span>Доставка</span><strong>{selectedOffer.currentLeadDays} дн.</strong></div>
            <div><span>Доступно</span><strong>{formatQuantity(selectedOffer.availableQuantity, getIngredient(selectedOffer.ingredientId).unit)}</strong></div>
          </div>
          <label className="order-quantity"><span>Количество</span><input type="number" min={selectedOffer.minimumOrder} max={selectedOffer.availableQuantity} step={getIngredient(selectedOffer.ingredientId).unit === 'kg' ? 1 : 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><small>Минимум {formatQuantity(selectedOffer.minimumOrder, getIngredient(selectedOffer.ingredientId).unit)}</small></label>
          <div className={`price-trend ${selectedOffer.trend}`}><Icon name={selectedOffer.trend === 'expensive' ? 'warning' : selectedOffer.trend === 'cheaper' ? 'check' : 'market'} /><span>{selectedOffer.trend === 'expensive' ? 'Цена выше обычной' : selectedOffer.trend === 'cheaper' ? 'Цена сейчас выгодная' : 'Цена стабильна'}</span></div>
        </Modal>
      )}
    </div>
  );
}

function supplierFooter(state: GameState, supplier: SupplierDefinition, onSignSupplier: (supplierId: string) => ActionResult, show: (result: ActionResult) => void) {
  const relation = state.supply.relationships.find((item) => item.supplierId === supplier.id);
  if (relation?.agreement) return <button className="button installed" disabled><Icon name="check" />Постоянный договор</button>;
  return <button className="button secondary" onClick={() => show(onSignSupplier(supplier.id))} disabled={(relation?.relationship ?? 0) < 35}>Договор · 350</button>;
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
