import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getEquipment } from '../../data/productionCatalog';
import { getSupplier, type IngredientCategory } from '../../data/supplyCatalog';
import type { BrandDraft, ReleaseDraft } from '../../domain/brand';
import type { FacilityRoomId, FacilityUtilityId } from '../../domain/facility';
import type { GameState } from '../../domain/game';
import { createRecipeDraft, getStyle, getStylesForFamily, type ProductFamily, type RecipeDraft, type SavedRecipe } from '../../domain/production';
import { formatQuantity, type IngredientRequirement, type SupplierOfferState } from '../../domain/supply';
import { BatchBoard } from '../batches/BatchBoard';
import { FacilityHub } from '../facility/FacilityHub';
import { SupplyHub } from '../supply/SupplyHub';
import { Icon } from '../../ui/Icon';
import { Modal } from '../../ui/MobileUI';
import { buildProductionWorkflow, recommendProcurement, type MaterialRequirementState } from './productionWorkflow';

interface ProductionStudioProps {
  state: GameState;
  onBuyEquipment: (equipmentId: string) => ActionResult;
  onSaveRecipe: (draft: RecipeDraft) => ActionResult;
  onLaunchBatch: (draft: RecipeDraft, selectedLots?: Partial<Record<IngredientCategory, string>>) => ActionResult;
  onTaste: (batchId: string) => ActionResult;
  onPackage: (batchId: string) => ActionResult;
  onDiscard: (batchId: string) => ActionResult;
  onOrderSupply: (offerId: string, quantity: number) => ActionResult;
  onSignSupplier: (supplierId: string) => ActionResult;
  onExpandRoom: (roomId: FacilityRoomId) => ActionResult;
  onExpandUtility: (utilityId: FacilityUtilityId) => ActionResult;
  onCleanFacility: () => ActionResult;
  onServiceEquipment: (equipmentId: string) => ActionResult;
  onUpgradeEquipment: (equipmentId: string) => ActionResult;
  onQueueRecipe: (recipeId: string) => ActionResult;
  onRemoveQueue: (queueId: string) => ActionResult;
  onCreateBrand: (draft: BrandDraft) => ActionResult;
  onCreateRelease: (draft: ReleaseDraft) => ActionResult;
  onOpenTrade: () => void;
  onFlowChange?: (open: boolean) => void;
}

type ProductionSection = 'overview' | 'batches' | 'inventory' | 'suppliers' | 'orders' | 'facility';
type FlowStep = 1 | 2 | 3 | 4;
interface ProcurementDraft { requirement: IngredientRequirement; offerId: string; quantity: number; }

export function ProductionStudio(props: ProductionStudioProps) {
  const { state } = props;
  const [section, setSection] = useState<ProductionSection>('overview');
  const [flowOpen, setFlowOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>(1);
  const [family, setFamily] = useState<ProductFamily>('beer');
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [selectedLots, setSelectedLots] = useState<Partial<Record<IngredientCategory, string>>>({});
  const [selectingCategory, setSelectingCategory] = useState<IngredientCategory | null>(null);
  const [procurement, setProcurement] = useState<ProcurementDraft | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const workflow = useMemo(() => buildProductionWorkflow(state, draft), [state, draft]);
  const active = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  const ready = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status));
  const pendingOrders = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));
  const inventory = state.supply.inventory.filter((lot) => lot.quantity > 0);
  const categoryRequirement = workflow.materials.find((item) => item.requirement.category === selectingCategory)?.requirement ?? null;
  const categoryLots = categoryRequirement ? inventory.filter((lot) => lot.ingredientId === categoryRequirement.ingredientId) : [];

  function show(result: ActionResult) { setFeedback(result); window.setTimeout(() => setFeedback(null), 2800); }
  function openFlow() { setStep(1); setFlowOpen(true); props.onFlowChange?.(true); }
  function closeFlow() { setFlowOpen(false); props.onFlowChange?.(false); }
  function switchFamily(next: ProductFamily) { setFamily(next); setDraft(createRecipeDraft(next)); setSelectedLots({}); }
  function loadRecipe(recipeId: string) { const recipe = state.production.recipes.find((item) => item.id === recipeId); if (!recipe) return; setFamily(recipe.family); setDraft(recipeDraftFromSaved(recipe)); setSelectedLots({}); }
  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); if (key === 'volumeLiters' || key === 'styleId') setSelectedLots({}); }
  function openProcurement(material: MaterialRequirementState) { const recommendation = recommendProcurement(state.supply.offers, material.requirement, material.uncovered); if (!recommendation) return show({ ok: false, message: `Для позиции «${material.requirement.label}» нет предложения.` }); setProcurement({ requirement: material.requirement, offerId: recommendation.offer.id, quantity: recommendation.quantity }); }
  function submitProcurement() { if (!procurement) return; const result = props.onOrderSupply(procurement.offerId, procurement.quantity); show(result); if (result.ok) setProcurement(null); }
  function orderAllMissing() { let completed = 0; for (const item of workflow.recommendations) { const result = props.onOrderSupply(item.offer.id, item.quantity); if (!result.ok) return show({ ok: false, message: completed ? `Оформлено ${completed}. Затем: ${result.message}` : result.message }); completed += 1; } show({ ok: true, message: `Оформлено заказов: ${completed}.` }); }
  function launch() { const result = props.onLaunchBatch(draft, selectedLots); show(result); if (result.ok) { closeFlow(); setSection('batches'); } }

  return <div className="production-rebuild">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`} role="status">{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
    <header className="production-page-head"><div><h1>Производство</h1><p>Партии, сырьё, поставщики и состояние объекта.</p></div><button className="button primary production-start" onClick={openFlow}>Новый выпуск</button></header>
    <div className="production-workspace">
      <aside className="production-side-nav" aria-label="Разделы производства">
        <div className="production-status"><strong>{active.length ? `${active.length} партий в работе` : 'Производство свободно'}</strong><small>{ready.length ? `${ready.length} требуют решения` : `${inventory.length} складских лотов`}</small></div>
        <ProductionNav id="overview" code="OVR" label="Обзор" active={section === 'overview'} onClick={setSection} />
        <ProductionNav id="batches" code="BAT" label="Партии" meta={String(active.length)} active={section === 'batches'} onClick={setSection} />
        <ProductionNav id="inventory" code="STK" label="Склад" meta={String(inventory.length)} active={section === 'inventory'} onClick={setSection} />
        <ProductionNav id="suppliers" code="SUP" label="Поставщики" active={section === 'suppliers'} onClick={setSection} />
        <ProductionNav id="orders" code="ORD" label="Заказы" meta={String(pendingOrders.length)} active={section === 'orders'} onClick={setSection} />
        <ProductionNav id="facility" code="FAC" label="Объект" active={section === 'facility'} onClick={setSection} />
      </aside>
      <section className="production-section-content">
        {section === 'overview' && <ProductionOverview state={state} active={active.length} ready={ready.length} inventory={inventory.length} orders={pendingOrders.length} onOpen={setSection} />}
        {section === 'batches' && <BatchBoard state={state} onTaste={props.onTaste} onPackage={props.onPackage} onDiscard={props.onDiscard} onOrderSupply={props.onOrderSupply} onCreateBrand={props.onCreateBrand} onCreateRelease={props.onCreateRelease} onOpenFacility={() => setSection('facility')} onOpenTrade={props.onOpenTrade} />}
        {section === 'inventory' && <SupplyHub key="inventory" initialSection="inventory" state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} />}
        {section === 'suppliers' && <SupplyHub key="suppliers" initialSection="suppliers" state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} />}
        {section === 'orders' && <SupplyHub key="orders" initialSection="orders" state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} />}
        {section === 'facility' && <FacilityHub state={state} onBuyEquipment={props.onBuyEquipment} onExpandRoom={props.onExpandRoom} onExpandUtility={props.onExpandUtility} onClean={props.onCleanFacility} onServiceEquipment={props.onServiceEquipment} onUpgradeEquipment={props.onUpgradeEquipment} onQueueRecipe={props.onQueueRecipe} onRemoveQueue={props.onRemoveQueue} />}
      </section>
    </div>
    {flowOpen && <ReleaseFlow state={state} step={step} family={family} draft={draft} workflow={workflow} selectedLots={selectedLots} onClose={closeFlow} onStep={setStep} onFamily={switchFamily} onLoadRecipe={loadRecipe} onUpdate={update} onSelectLot={setSelectingCategory} onBuy={openProcurement} onOrderAll={orderAllMissing} onBuyEquipment={(id) => show(props.onBuyEquipment(id))} onSave={() => show(props.onSaveRecipe(draft))} onLaunch={launch} />}
    {procurement && <ProcurementModal state={state} draft={procurement} onChange={setProcurement} onClose={() => setProcurement(null)} onSubmit={submitProcurement} />}
    {selectingCategory && categoryRequirement && <Modal title={categoryRequirement.label} kicker={`Нужно ${formatQuantity(categoryRequirement.quantity, categoryRequirement.unit)}`} onClose={() => setSelectingCategory(null)}>{categoryLots.length === 0 ? <p className="quiet-copy">Подходящих лотов нет.</p> : <div className="select-list">{categoryLots.map((lot) => <button key={lot.id} onClick={() => { setSelectedLots((current) => ({ ...current, [selectingCategory]: lot.id })); setSelectingCategory(null); }}><span><strong>{lot.variantName}</strong><small>{lot.origin} · {formatQuantity(lot.quantity, lot.unit)}</small></span><b>{lot.quality}/100</b></button>)}</div>}</Modal>}
  </div>;
}

function ProductionNav({ id, code, label, meta, active, onClick }: { id: ProductionSection; code: string; label: string; meta?: string; active: boolean; onClick: (id: ProductionSection) => void }) { return <button className={active ? 'active' : ''} onClick={() => onClick(id)}><span>{code}</span><strong>{label}</strong>{meta && <small>{meta}</small>}</button>; }
function ProductionOverview({ state, active, ready, inventory, orders, onOpen }: { state: GameState; active: number; ready: number; inventory: number; orders: number; onOpen: (id: ProductionSection) => void }) { return <div className="production-overview"><section className="production-current"><div><h2>{active ? `${active} партий проходят цикл` : 'Линии свободны'}</h2><p>{ready ? `${ready} партий требуют решения.` : 'Можно спланировать следующий выпуск.'}</p></div></section><div className="production-overview-grid"><button onClick={() => onOpen('batches')}><span>Партии</span><strong>{active}</strong><small>в активном цикле</small></button><button onClick={() => onOpen('inventory')}><span>Склад</span><strong>{inventory}</strong><small>активных лотов</small></button><button onClick={() => onOpen('orders')}><span>Заказы</span><strong>{orders}</strong><small>ожидают поставки</small></button><button onClick={() => onOpen('facility')}><span>Чистота</span><strong>{state.facility?.sanitation ?? 0}</strong><small>{state.facility ? 'из 100' : 'объект не выбран'}</small></button></div></div>; }

function ReleaseFlow({ state, step, family, draft, workflow, selectedLots, onClose, onStep, onFamily, onLoadRecipe, onUpdate, onSelectLot, onBuy, onOrderAll, onBuyEquipment, onSave, onLaunch }: { state: GameState; step: FlowStep; family: ProductFamily; draft: RecipeDraft; workflow: ReturnType<typeof buildProductionWorkflow>; selectedLots: Partial<Record<IngredientCategory, string>>; onClose: () => void; onStep: (step: FlowStep) => void; onFamily: (family: ProductFamily) => void; onLoadRecipe: (id: string) => void; onUpdate: <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => void; onSelectLot: (category: IngredientCategory) => void; onBuy: (material: MaterialRequirementState) => void; onOrderAll: () => void; onBuyEquipment: (id: string) => void; onSave: () => void; onLaunch: () => void }) {
  const style = getStyle(draft.styleId); const saved = state.production.recipes.find((item) => item.name === draft.name && item.styleId === draft.styleId)?.id ?? '';
  return <div className="release-flow" role="dialog" aria-modal="true" aria-label="Новый выпуск"><header><button className="flow-back" onClick={step === 1 ? onClose : () => onStep((step - 1) as FlowStep)}><Icon name="arrow" /></button><div><h2>Новый выпуск</h2><span>Шаг {step} из 4 · {['Продукт','Объём и процесс','Требования','Подтверждение'][step-1]}</span></div><button className="flow-exit" onClick={onClose}>Выйти</button></header><div className="flow-progress"><i style={{ width: `${step * 25}%` }} /></div><main>
    {step === 1 && <section className="flow-step"><h1>Выбери продукт</h1><p>Сохранённый рецепт или новый профиль. На этом шаге нет закупок и запуска.</p><label className="field"><span>Сохранённый рецепт</span><select value={saved} onChange={(e) => onLoadRecipe(e.target.value)}><option value="">Новый рецепт</option>{state.production.recipes.map((r) => <option key={r.id} value={r.id}>{r.name} · {getStyle(r.styleId).shortName}</option>)}</select></label><div className="flow-choice"><button className={family === 'beer' ? 'active' : ''} onClick={() => onFamily('beer')}>Пиво</button><button className={family === 'cider' ? 'active' : ''} onClick={() => onFamily('cider')}>Сидр</button></div><label className="field"><span>Название</span><input value={draft.name} onChange={(e) => onUpdate('name', e.target.value)} /></label><label className="field"><span>Стиль</span><select value={draft.styleId} onChange={(e) => onUpdate('styleId', e.target.value)}>{getStylesForFamily(family).map((x) => <option key={x.id} value={x.id}>{x.shortName}</option>)}</select></label></section>}
    {step === 2 && <section className="flow-step"><h1>Настрой объём и процесс</h1><p>Параметры сразу пересчитывают сырьё, стоимость и дату готовности.</p><div className="flow-control-grid"><RangeControl label="Объём" value={draft.volumeLiters} min={40} max={240} step={10} suffix=" л" onChange={(v) => onUpdate('volumeLiters', v)} /><RangeControl label="Температура" value={draft.processTemperature} min={style.processTemperatureRange[0]} max={style.processTemperatureRange[1]} suffix="°C" onChange={(v) => onUpdate('processTemperature', v)} /><RangeControl label="Ферментация" value={draft.primaryDays} min={style.primaryDaysRange[0]} max={style.primaryDaysRange[1]} suffix=" дн." onChange={(v) => onUpdate('primaryDays', v)} /><RangeControl label="Созревание" value={draft.conditioningDays} min={style.conditioningDaysRange[0]} max={style.conditioningDaysRange[1]} suffix=" дн." onChange={(v) => onUpdate('conditioningDays', v)} /></div><aside className="flow-forecast"><div><span>Готовность</span><strong>день {workflow.predictedReadyDay}</strong></div><div><span>Ожидаемый розлив</span><strong>≈ {Math.floor(draft.volumeLiters * .94 / .5)} бут.</strong></div><div><span>Плановая стоимость</span><strong>{formatMoney(workflow.plannedCost)}</strong></div></aside></section>}
    {step === 3 && <section className="flow-step"><div className="flow-step-head"><div><h1>Закрой требования</h1><p>Покупай дефицит прямо здесь. Заказанное повторно не оформляется.</p></div>{workflow.recommendations.length > 0 && <button className="button primary" disabled={!workflow.canOrderAll} onClick={onOrderAll}>Заказать всё</button>}</div><div className="flow-requirements">{workflow.materials.map((m) => <MaterialRow key={m.requirement.category} material={m} selectedLot={selectedLots[m.requirement.category]} onSelect={() => onSelectLot(m.requirement.category)} onBuy={() => onBuy(m)} />)}{workflow.missingEquipmentIds.map((id) => <div className="flow-requirement blocked" key={id}><span><strong>{getEquipment(id).name}</strong><small>Обязательное оборудование</small></span><button className="button secondary" onClick={() => onBuyEquipment(id)}>Купить</button></div>)}</div></section>}
    {step === 4 && <section className="flow-step"><h1>Проверь план</h1><p>После подтверждения будет создана реальная партия и списана стоимость запуска.</p><div className="flow-review"><div><span>Продукт</span><strong>{draft.name}</strong></div><div><span>Стиль</span><strong>{style.shortName}</strong></div><div><span>Объём</span><strong>{draft.volumeLiters} л</strong></div><div><span>Готовность</span><strong>день {workflow.predictedReadyDay}</strong></div><div><span>Себестоимость</span><strong>{formatMoney(workflow.plannedCost)}</strong></div><div><span>Статус</span><strong>{workflow.canLaunch ? 'готово' : workflow.blockers[0]}</strong></div></div><button className="button secondary" onClick={onSave}>Сохранить рецепт</button></section>}
  </main><footer><button className="button secondary" onClick={step === 1 ? onClose : () => onStep((step - 1) as FlowStep)}>{step === 1 ? 'Отмена' : 'Назад'}</button>{step < 4 ? <button className="button primary" onClick={() => onStep((step + 1) as FlowStep)}>Далее</button> : <button className="button primary" disabled={!workflow.canLaunch} onClick={onLaunch}>Запустить · {formatMoney(workflow.processCost)}</button>}</footer></div>;
}

function MaterialRow({ material, selectedLot, onSelect, onBuy }: { material: MaterialRequirementState; selectedLot?: string; onSelect: () => void; onBuy: () => void }) { const copy = material.status === 'ready' ? `${formatQuantity(material.available, material.requirement.unit)} на складе${selectedLot ? ' · лот выбран' : ''}` : material.status === 'in_transit' ? `${formatQuantity(material.ordered, material.requirement.unit)} в пути · день ${material.expectedDay}` : material.status === 'partial' ? `${formatQuantity(material.ordered, material.requirement.unit)} заказано · дефицит ${formatQuantity(material.uncovered, material.requirement.unit)}` : `Нужно ${formatQuantity(material.uncovered, material.requirement.unit)}`; return <div className={`flow-requirement ${material.status}`}><span><strong>{material.requirement.label}</strong><small>{copy}</small></span><b>{formatQuantity(material.requirement.quantity, material.requirement.unit)}</b>{material.status === 'ready' ? <button className="button secondary" onClick={onSelect}>Лот</button> : material.status === 'in_transit' ? <em>ожидание</em> : <button className="button primary" onClick={onBuy}>Предложения</button>}</div>; }
function ProcurementModal({ state, draft, onChange, onClose, onSubmit }: { state: GameState; draft: ProcurementDraft; onChange: (next: ProcurementDraft) => void; onClose: () => void; onSubmit: () => void }) { const offers = offersForRequirement(state, draft.requirement); const selected = offers.find((o) => o.id === draft.offerId) ?? offers[0]; const total = (selected?.currentPrice ?? 0) * draft.quantity; return <Modal title={`Закупить: ${draft.requirement.label}`} kicker="Сравнение предложений" onClose={onClose} wide footer={<button className="button primary" disabled={!selected || state.finance.cash < total} onClick={onSubmit}>Заказать · {formatMoney(total)}</button>}><div className="procurement-offers">{offers.map((o) => <button key={o.id} className={draft.offerId === o.id ? 'active' : ''} onClick={() => onChange({ ...draft, offerId: o.id, quantity: Math.max(o.minimumOrder, Math.ceil(draft.requirement.quantity)) })}><span><strong>{o.variantName}</strong><small>{getSupplier(o.supplierId).name} · {o.origin}</small></span><span><strong>{o.currentPrice.toFixed(2)}</strong><small>качество {o.qualityEstimate[0]}–{o.qualityEstimate[1]} · {o.currentLeadDays} дн.</small></span></button>)}</div>{selected && <label className="order-quantity"><span>Количество</span><input type="number" min={selected.minimumOrder} max={selected.availableQuantity} value={draft.quantity} onChange={(e) => onChange({ ...draft, quantity: Number(e.target.value) })} /></label>}</Modal>; }
function offersForRequirement(state: GameState, requirement: IngredientRequirement): SupplierOfferState[] { return state.supply.offers.filter((o) => o.ingredientId === requirement.ingredientId && o.availableQuantity > 0).sort((a,b) => a.currentPrice - b.currentPrice || a.currentLeadDays - b.currentLeadDays); }
function recipeDraftFromSaved(recipe: SavedRecipe): RecipeDraft { return { name: recipe.name, family: recipe.family, styleId: recipe.styleId, volumeLiters: recipe.volumeLiters, processTemperature: recipe.processTemperature, primaryDays: recipe.primaryDays, conditioningDays: recipe.conditioningDays, treatment: recipe.treatment, sweetness: recipe.sweetness, acidity: recipe.acidity, bitterness: recipe.bitterness, body: recipe.body, aroma: recipe.aroma, originality: recipe.originality }; }
function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) { return <label className="flow-range"><div><span>{label}</span><output>{value}{suffix}</output></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
