import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getEquipment } from '../../data/productionCatalog';
import { getIngredient, getSupplier, type IngredientCategory } from '../../data/supplyCatalog';
import type { BrandDraft, ReleaseDraft } from '../../domain/brand';
import type { FacilityRoomId, FacilityUtilityId } from '../../domain/facility';
import type { GameState } from '../../domain/game';
import {
  createRecipeDraft,
  getStyle,
  getStylesForFamily,
  type ProductFamily,
  type RecipeDraft,
  type SavedRecipe,
} from '../../domain/production';
import { formatQuantity, type IngredientRequirement, type SupplierOfferState } from '../../domain/supply';
import { BatchBoard } from '../batches/BatchBoard';
import { FacilityHub } from '../facility/FacilityHub';
import { SupplyHub } from '../supply/SupplyHub';
import { EditorialVisual } from '../../ui/EditorialVisual';
import { Icon } from '../../ui/Icon';
import { Modal, SubTabs } from '../../ui/MobileUI';
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
}

type ProductionSection = 'plan' | 'batches' | 'supply' | 'facility';

interface ProcurementDraft {
  requirement: IngredientRequirement;
  offerId: string;
  quantity: number;
}

export function ProductionStudio(props: ProductionStudioProps) {
  const { state } = props;
  const [section, setSection] = useState<ProductionSection>('plan');
  const [family, setFamily] = useState<ProductFamily>('beer');
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [selectedLots, setSelectedLots] = useState<Partial<Record<IngredientCategory, string>>>({});
  const [selectingCategory, setSelectingCategory] = useState<IngredientCategory | null>(null);
  const [procurement, setProcurement] = useState<ProcurementDraft | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  const workflow = useMemo(() => buildProductionWorkflow(state, draft), [state, draft]);
  const active = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  const attention = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status));
  const packaged = state.production.batches.filter((batch) => batch.status === 'packaged').reduce((sum, batch) => sum + batch.availableUnits, 0);
  const categoryRequirement = workflow.materials.find((item) => item.requirement.category === selectingCategory)?.requirement ?? null;
  const categoryLots = categoryRequirement ? state.supply.inventory.filter((lot) => lot.ingredientId === categoryRequirement.ingredientId && lot.quantity > 0) : [];

  function show(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2800);
  }

  function switchFamily(next: ProductFamily) {
    setFamily(next);
    setDraft(createRecipeDraft(next));
    setSelectedLots({});
  }

  function loadRecipe(recipeId: string) {
    if (!recipeId) {
      switchFamily(family);
      return;
    }
    const recipe = state.production.recipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setFamily(recipe.family);
    setDraft(recipeDraftFromSaved(recipe));
    setSelectedLots({});
  }

  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === 'volumeLiters' || key === 'styleId') setSelectedLots({});
  }

  function launch() {
    const result = props.onLaunchBatch(draft, selectedLots);
    show(result);
    if (result.ok) setSection('batches');
  }

  function openProcurement(material: MaterialRequirementState) {
    const recommendation = recommendProcurement(state.supply.offers, material.requirement, material.uncovered);
    if (!recommendation) {
      show({ ok: false, message: `Для позиции «${material.requirement.label}» сейчас нет доступного предложения.` });
      return;
    }
    setProcurement({ requirement: material.requirement, offerId: recommendation.offer.id, quantity: recommendation.quantity });
  }

  function orderAllMissing() {
    let completed = 0;
    for (const item of workflow.recommendations) {
      const result = props.onOrderSupply(item.offer.id, item.quantity);
      if (!result.ok) {
        show({ ok: false, message: completed > 0 ? `Оформлено ${completed} заказов. Затем: ${result.message}` : result.message });
        return;
      }
      completed += 1;
    }
    show({ ok: true, message: `Оформлено заказов: ${completed}. Деньги на запуск партии сохранены в резерве.` });
  }

  function submitProcurement() {
    if (!procurement) return;
    const result = props.onOrderSupply(procurement.offerId, procurement.quantity);
    show(result);
    if (result.ok) setProcurement(null);
  }

  return <div className="screen-stack production-screen">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`} role="status">{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

    <EditorialVisual
      variant="production"
      eyebrow="Производственный цикл"
      title={attention.length > 0 ? `${attention.length} партии требуют решения` : active.length > 0 ? `${active.length} партии проходят цикл` : 'Спланируй следующий выпуск'}
      metric={`${packaged} бутылок готовы`}
      note={`Прогноз нового выпуска: день ${workflow.predictedReadyDay}`}
      action={<button className="button visual-button" onClick={() => setSection('plan')}>План выпуска<Icon name="arrow" /></button>}
    />

    <SubTabs value={section} onChange={setSection} label="Производственные разделы" options={[
      { id: 'plan', label: 'План выпуска' },
      { id: 'batches', label: 'Партии', badge: active.length },
      { id: 'supply', label: 'Склад', badge: state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status)).length },
      { id: 'facility', label: 'Объект' },
    ]} />

    {section === 'plan' && <ProductionPlan
      state={state}
      family={family}
      draft={draft}
      workflow={workflow}
      selectedLots={selectedLots}
      onFamily={switchFamily}
      onLoadRecipe={loadRecipe}
      onUpdate={update}
      onSelectLot={setSelectingCategory}
      onOpenProcurement={openProcurement}
      onOrderAll={orderAllMissing}
      onSave={() => show(props.onSaveRecipe(draft))}
      onBuyEquipment={(equipmentId) => show(props.onBuyEquipment(equipmentId))}
      onLaunch={launch}
    />}

    {section === 'batches' && <BatchBoard
      state={state}
      onTaste={props.onTaste}
      onPackage={props.onPackage}
      onDiscard={props.onDiscard}
      onOrderSupply={props.onOrderSupply}
      onCreateBrand={props.onCreateBrand}
      onCreateRelease={props.onCreateRelease}
      onOpenFacility={() => setSection('facility')}
      onOpenTrade={props.onOpenTrade}
    />}
    {section === 'supply' && <SupplyHub state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} />}
    {section === 'facility' && <FacilityHub state={state} onBuyEquipment={props.onBuyEquipment} onExpandRoom={props.onExpandRoom} onExpandUtility={props.onExpandUtility} onClean={props.onCleanFacility} onServiceEquipment={props.onServiceEquipment} onUpgradeEquipment={props.onUpgradeEquipment} onQueueRecipe={props.onQueueRecipe} onRemoveQueue={props.onRemoveQueue} />}

    {procurement && <ProcurementModal state={state} draft={procurement} onChange={setProcurement} onClose={() => setProcurement(null)} onSubmit={submitProcurement} />}

    {selectingCategory && categoryRequirement && <Modal title={categoryRequirement.label} kicker={`Нужно ${formatQuantity(categoryRequirement.quantity, categoryRequirement.unit)}`} onClose={() => setSelectingCategory(null)}>
      {categoryLots.length === 0
        ? <p className="quiet-copy">Подходящих лотов на складе нет.</p>
        : <div className="select-list">{categoryLots.map((lot) => <button key={lot.id} className={selectedLots[selectingCategory] === lot.id ? 'active' : ''} onClick={() => { setSelectedLots((current) => ({ ...current, [selectingCategory]: lot.id })); setSelectingCategory(null); }}><span><strong>{lot.variantName}</strong><small>{lot.origin} · {formatQuantity(lot.quantity, lot.unit)}</small></span><b>{lot.quality}/100</b></button>)}</div>}
      <button className="button secondary full-button" onClick={() => { setSelectedLots((current) => { const next = { ...current }; delete next[selectingCategory]; return next; }); setSelectingCategory(null); }}>Автовыбор склада</button>
    </Modal>}
  </div>;
}

function ProductionPlan({ state, family, draft, workflow, selectedLots, onFamily, onLoadRecipe, onUpdate, onSelectLot, onOpenProcurement, onOrderAll, onSave, onBuyEquipment, onLaunch }: {
  state: GameState;
  family: ProductFamily;
  draft: RecipeDraft;
  workflow: ReturnType<typeof buildProductionWorkflow>;
  selectedLots: Partial<Record<IngredientCategory, string>>;
  onFamily: (family: ProductFamily) => void;
  onLoadRecipe: (recipeId: string) => void;
  onUpdate: <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => void;
  onSelectLot: (category: IngredientCategory) => void;
  onOpenProcurement: (material: MaterialRequirementState) => void;
  onOrderAll: () => void;
  onSave: () => void;
  onBuyEquipment: (equipmentId: string) => void;
  onLaunch: () => void;
}) {
  const style = getStyle(draft.styleId);
  const selectedRecipe = state.production.recipes.find((item) => item.name === draft.name && item.styleId === draft.styleId && item.volumeLiters === draft.volumeLiters)?.id ?? '';
  const orderedCount = workflow.materials.filter((item) => ['in_transit', 'partial'].includes(item.status)).length;
  const readyCount = workflow.materials.filter((item) => item.status === 'ready').length;

  return <section className="release-planner plain-panel">
    <header className="release-planner-header">
      <span><b>План выпуска</b><small>Один путь от рецепта до готового продукта</small></span>
      <span className={`planner-state ${workflow.canLaunch ? 'ready' : 'blocked'}`}><Icon name={workflow.canLaunch ? 'check' : 'clock'} />{workflow.canLaunch ? 'Можно запускать' : `${workflow.blockers.length} блокировки`}</span>
    </header>

    <div className="production-timeline" aria-label="Этапы выпуска">
      <TimelineStep index="1" label="Продукт" state="done" detail={style.shortName} />
      <TimelineStep index="2" label="Снабжение" state={readyCount === workflow.materials.length ? 'done' : orderedCount > 0 ? 'active' : 'blocked'} detail={readyCount === workflow.materials.length ? 'готово' : orderedCount > 0 ? `в пути ${orderedCount}` : `не хватает ${workflow.materials.length - readyCount}`} />
      <TimelineStep index="3" label="Производство" state={workflow.canLaunch ? 'active' : 'waiting'} detail={`до дня ${workflow.predictedLaunchDay}`} />
      <TimelineStep index="4" label="Розлив" state="waiting" detail={`день ${workflow.predictedReadyDay}`} />
      <TimelineStep index="5" label="Релиз" state="waiting" detail="после розлива" />
    </div>

    <div className="planner-layout">
      <div className="planner-form">
        <div className="planner-form-head"><span><b>Продукт</b><small>Выбери сохранённый рецепт или настрой новый</small></span></div>
        <label className="field"><span>Сохранённый рецепт</span><select value={selectedRecipe} onChange={(event) => onLoadRecipe(event.target.value)}><option value="">Новый рецепт</option>{state.production.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · {getStyle(recipe.styleId).shortName}</option>)}</select></label>
        <div className="family-choice compact-family"><button className={family === 'beer' ? 'active' : ''} onClick={() => onFamily('beer')}><Icon name="beer" />Пиво</button><button className={family === 'cider' ? 'active' : ''} onClick={() => onFamily('cider')}><Icon name="apple" />Сидр</button></div>
        <label className="field"><span>Название</span><input value={draft.name} onChange={(event) => onUpdate('name', event.target.value)} maxLength={36} /></label>
        <label className="field"><span>Стиль</span><select value={draft.styleId} onChange={(event) => onUpdate('styleId', event.target.value)}>{getStylesForFamily(family).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select></label>
        <div className="planner-controls">
          <RangeControl label="Объём" value={draft.volumeLiters} min={40} max={240} step={10} suffix=" л" onChange={(value) => onUpdate('volumeLiters', value)} />
          <RangeControl label="Температура" value={draft.processTemperature} min={style.processTemperatureRange[0]} max={style.processTemperatureRange[1]} suffix="°C" onChange={(value) => onUpdate('processTemperature', value)} />
          <RangeControl label="Ферментация" value={draft.primaryDays} min={style.primaryDaysRange[0]} max={style.primaryDaysRange[1]} suffix=" дн." onChange={(value) => onUpdate('primaryDays', value)} />
          <RangeControl label="Созревание" value={draft.conditioningDays} min={style.conditioningDaysRange[0]} max={style.conditioningDaysRange[1]} suffix=" дн." onChange={(value) => onUpdate('conditioningDays', value)} />
        </div>
        <details className="recipe-profile-disclosure"><summary>Вкусовой профиль <Icon name="arrow" /></summary><div className="planner-controls"><RangeControl label="Сладость" value={draft.sweetness} min={1} max={5} onChange={(value) => onUpdate('sweetness', value)} /><RangeControl label="Кислотность" value={draft.acidity} min={1} max={5} onChange={(value) => onUpdate('acidity', value)} /><RangeControl label="Горечь / танины" value={draft.bitterness} min={1} max={5} onChange={(value) => onUpdate('bitterness', value)} /><RangeControl label="Тело" value={draft.body} min={1} max={5} onChange={(value) => onUpdate('body', value)} /><RangeControl label="Ароматика" value={draft.aroma} min={1} max={5} onChange={(value) => onUpdate('aroma', value)} /><RangeControl label="Оригинальность" value={draft.originality} min={1} max={5} onChange={(value) => onUpdate('originality', value)} /></div></details>
      </div>

      <aside className="planner-forecast">
        <span>Прогноз выпуска</span>
        <strong>день {workflow.predictedReadyDay}</strong>
        <div><span>Запуск</span><b>день {workflow.predictedLaunchDay}</b></div>
        <div><span>Объём</span><b>{draft.volumeLiters} л</b></div>
        <div><span>Ожидаемый розлив</span><b>≈ {Math.floor(draft.volumeLiters * .94 / .5)} бут.</b></div>
        <div><span>Сырьё со склада</span><b>{formatMoney(workflow.inventoryCost)}</b></div>
        <div><span>Новые закупки</span><b>{formatMoney(workflow.procurementCost)}</b></div>
        <div><span>Запуск процесса</span><b>{formatMoney(workflow.processCost)}</b></div>
        <div className="forecast-total"><span>Плановая себестоимость</span><b>{formatMoney(workflow.plannedCost)}</b></div>
      </aside>
    </div>

    <div className="requirements-ledger">
      <div className="ledger-heading"><span><b>Готовность запуска</b><small>Каждая проблема решается на месте</small></span>{workflow.recommendations.length > 0 && <button className="button primary" disabled={!workflow.canOrderAll} onClick={onOrderAll}>Заказать всё · {formatMoney(workflow.procurementCost)}</button>}</div>
      {workflow.materials.map((material) => <MaterialRow key={material.requirement.category} material={material} selectedLot={selectedLots[material.requirement.category]} onSelect={() => onSelectLot(material.requirement.category)} onBuy={() => onOpenProcurement(material)} />)}
      {workflow.missingEquipmentIds.map((equipmentId) => { const equipment = getEquipment(equipmentId); return <div className="requirement-row blocked" key={equipmentId}><span className="requirement-icon"><Icon name="factory" /></span><span><strong>{equipment.name}</strong><small>Обязательное оборудование не установлено</small></span><b>{formatMoney(equipment.cost)}</b><button className="button secondary" disabled={state.finance.cash < equipment.cost} onClick={() => onBuyEquipment(equipmentId)}>Купить</button></div>; })}
      {workflow.unavailableEquipmentIds.map((equipmentId) => <div className="requirement-row blocked" key={equipmentId}><span className="requirement-icon"><Icon name="warning" /></span><span><strong>{getEquipment(equipmentId).name}</strong><small>Установлено, но текущее состояние блокирует запуск. Обслуживание доступно в разделе «Объект».</small></span><b>сервис</b></div>)}
      <GateRow label="Производственная линия" detail={`${workflow.activeBatches}/${workflow.capacity} занято`} ok={workflow.capacityReady} />
      <GateRow label="Возможности объекта" detail={`${draft.volumeLiters} л запланировано`} ok={workflow.volumeReady} />
      <GateRow label="Деньги на запуск" detail={`${formatMoney(state.finance.cash)} доступно · ${formatMoney(workflow.processCost)} нужно после поставок`} ok={state.finance.cash >= workflow.processCost + workflow.procurementCost} />
    </div>

    <footer className="planner-actions">
      <button className="button secondary" onClick={onSave}>Сохранить рецепт</button>
      <span>{workflow.canLaunch ? 'Все требования выполнены.' : workflow.blockers[0] ?? 'Проверь требования.'}</span>
      <button className="button primary" disabled={!workflow.canLaunch} onClick={onLaunch}>Запустить партию · {formatMoney(workflow.processCost)}</button>
    </footer>
  </section>;
}

function TimelineStep({ index, label, state, detail }: { index: string; label: string; state: 'done' | 'active' | 'waiting' | 'blocked'; detail: string }) {
  return <div className={`timeline-step ${state}`}><span>{state === 'done' ? <Icon name="check" /> : index}</span><div><strong>{label}</strong><small>{detail}</small></div></div>;
}

function MaterialRow({ material, selectedLot, onSelect, onBuy }: { material: MaterialRequirementState; selectedLot?: string; onSelect: () => void; onBuy: () => void }) {
  const copy = material.status === 'ready'
    ? `${formatQuantity(material.available, material.requirement.unit)} на складе${selectedLot ? ' · лот выбран вручную' : ''}`
    : material.status === 'in_transit'
      ? `${formatQuantity(material.ordered, material.requirement.unit)} в пути · прибытие день ${material.expectedDay}`
      : material.status === 'partial'
        ? `${formatQuantity(material.ordered, material.requirement.unit)} заказано · ещё нужно ${formatQuantity(material.uncovered, material.requirement.unit)}`
        : `Нужно закупить ${formatQuantity(material.uncovered, material.requirement.unit)}`;
  return <div className={`requirement-row ${material.status}`}>
    <span className="requirement-icon"><Icon name={material.status === 'ready' ? 'check' : material.status === 'in_transit' ? 'clock' : 'warning'} /></span>
    <span><strong>{material.requirement.label}</strong><small>{copy}</small></span>
    <b>{formatQuantity(material.requirement.quantity, material.requirement.unit)}</b>
    {material.status === 'ready' ? <button className="button secondary" onClick={onSelect}>Выбрать лот</button> : material.status === 'in_transit' ? <span className="requirement-wait">ожидание</span> : <button className="button secondary" onClick={onBuy}>Закупить</button>}
  </div>;
}

function GateRow({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return <div className={`requirement-row gate ${ok ? 'ready' : 'blocked'}`}><span className="requirement-icon"><Icon name={ok ? 'check' : 'warning'} /></span><span><strong>{label}</strong><small>{detail}</small></span><b>{ok ? 'готово' : 'блокирует'}</b></div>;
}

function ProcurementModal({ state, draft, onChange, onClose, onSubmit }: { state: GameState; draft: ProcurementDraft; onChange: (next: ProcurementDraft) => void; onClose: () => void; onSubmit: () => void }) {
  const offers = offersForRequirement(state, draft.requirement);
  const selected = offers.find((offer) => offer.id === draft.offerId) ?? offers[0];
  const ingredient = getIngredient(draft.requirement.ingredientId);
  const total = (selected?.currentPrice ?? 0) * draft.quantity;
  return <Modal title={`Закупить: ${draft.requirement.label}`} kicker={`Потребность ${formatQuantity(draft.requirement.quantity, draft.requirement.unit)}`} onClose={onClose} wide footer={<button className="button primary" disabled={!selected || draft.quantity < selected.minimumOrder || draft.quantity > selected.availableQuantity || state.finance.cash < total} onClick={onSubmit}>Заказать · {formatMoney(total)}</button>}>
    <p className="modal-description">Все предложения показаны сразу. Рекомендация учитывает цену, качество и срок поставки.</p>
    <div className="procurement-offers">{offers.map((offer, index) => { const supplier = getSupplier(offer.supplierId); return <button key={offer.id} className={draft.offerId === offer.id ? 'active' : ''} onClick={() => onChange({ ...draft, offerId: offer.id, quantity: Math.max(offer.minimumOrder, Math.ceil(draft.requirement.quantity)) })}><span><strong>{offer.variantName}{index === 0 ? ' · рекомендовано' : ''}</strong><small>{supplier.name} · {offer.origin}</small></span><span><strong>{offer.currentPrice.toFixed(2)} / {ingredient.unit === 'kg' ? 'кг' : ingredient.unit === 'pack' ? 'уп.' : 'шт.'}</strong><small>качество {offer.qualityEstimate[0]}–{offer.qualityEstimate[1]} · {offer.currentLeadDays} дн.</small></span></button>; })}</div>
    {selected && <label className="order-quantity"><span>Количество</span><input type="number" min={selected.minimumOrder} max={selected.availableQuantity} step="1" value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: Number(event.target.value) })} /><small>Минимум {formatQuantity(selected.minimumOrder, ingredient.unit)} · доступно {formatQuantity(selected.availableQuantity, ingredient.unit)}</small></label>}
    {state.finance.cash < total && <div className="inline-warning"><Icon name="warning" /><span>Не хватает денег: нужно ещё {formatMoney(total - state.finance.cash)}.</span></div>}
  </Modal>;
}

function offersForRequirement(state: GameState, requirement: IngredientRequirement): SupplierOfferState[] {
  return state.supply.offers.filter((offer) => offer.ingredientId === requirement.ingredientId && offer.availableQuantity > 0).sort((a, b) => {
    const recommendedA = recommendProcurement([a], requirement)?.cost ?? Number.MAX_SAFE_INTEGER;
    const recommendedB = recommendProcurement([b], requirement)?.cost ?? Number.MAX_SAFE_INTEGER;
    return recommendedA - recommendedB || a.currentLeadDays - b.currentLeadDays || b.qualityEstimate[0] - a.qualityEstimate[0];
  });
}

function recipeDraftFromSaved(recipe: SavedRecipe): RecipeDraft {
  return { name: recipe.name, family: recipe.family, styleId: recipe.styleId, volumeLiters: recipe.volumeLiters, processTemperature: recipe.processTemperature, primaryDays: recipe.primaryDays, conditioningDays: recipe.conditioningDays, treatment: recipe.treatment, sweetness: recipe.sweetness, acidity: recipe.acidity, bitterness: recipe.bitterness, body: recipe.body, aroma: recipe.aroma, originality: recipe.originality };
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;
  return <label className="compact-range"><div><span>{label}</span><output>{value}{suffix}</output></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${progress}%` } as React.CSSProperties} /></label>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
