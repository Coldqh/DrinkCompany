import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getIngredient, getSupplier, type IngredientCategory } from '../../data/supplyCatalog';
import { equipmentAvailable, maxActiveBatches, type FacilityRoomId, type FacilityUtilityId } from '../../domain/facility';
import type { GameState } from '../../domain/game';
import {
  adaptDraftToStyle,
  createRecipeDraft,
  estimateProcessCost,
  getStyle,
  getStylesForFamily,
  requiredEquipmentIds,
  statusLabel,
  type ProductFamily,
  type RecipeDraft,
  type SavedRecipe,
} from '../../domain/production';
import {
  buildSupplyPlan,
  formatQuantity,
  getRecipeRequirements,
  type IngredientRequirement,
  type SupplierOfferState,
} from '../../domain/supply';
import { SupplyHub } from '../supply/SupplyHub';
import { FacilityHub } from '../facility/FacilityHub';
import { BatchBoard } from '../batches/BatchBoard';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal, SubTabs } from '../../ui/MobileUI';
import { EditorialVisual } from '../../ui/EditorialVisual';

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
}

type ProductionSection = 'overview' | 'recipes' | 'batches' | 'bottling' | 'supply' | 'facility';
type RecipeStep = 1 | 2 | 3;

interface ProcurementDraft {
  requirement: IngredientRequirement;
  offerId: string;
  quantity: number;
}

export function ProductionStudio(props: ProductionStudioProps) {
  const { state } = props;
  const [section, setSection] = useState<ProductionSection>('overview');
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [family, setFamily] = useState<ProductFamily>('beer');
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [recipeStep, setRecipeStep] = useState<RecipeStep>(1);
  const [selectedLots, setSelectedLots] = useState<Partial<Record<IngredientCategory, string>>>({});
  const [selectingCategory, setSelectingCategory] = useState<IngredientCategory | null>(null);
  const [procurement, setProcurement] = useState<ProcurementDraft | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  const style = getStyle(draft.styleId);
  const requirements = useMemo(() => getRecipeRequirements(draft), [draft]);
  const supplyPlan = useMemo(() => buildSupplyPlan(state.supply.inventory, requirements, selectedLots), [requirements, selectedLots, state.supply.inventory]);
  const processCost = estimateProcessCost(draft);
  const required = requiredEquipmentIds(family);
  const lineReady = required.every((id) => state.production.equipmentIds.includes(id) && (!state.facility || equipmentAvailable(state.facility, id)));
  const active = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  const waiting = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status));
  const packaged = state.production.batches.filter((batch) => batch.status === 'packaged').reduce((sum, batch) => sum + batch.availableUnits, 0);
  const capacity = state.facility ? maxActiveBatches(state.facility) : 1;
  const categoryRequirement = requirements.find((item) => item.category === selectingCategory) ?? null;
  const categoryLots = categoryRequirement ? state.supply.inventory.filter((lot) => lot.ingredientId === categoryRequirement.ingredientId && lot.quantity > 0) : [];

  function show(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2600);
  }

  function openNewBatch(saved?: SavedRecipe) {
    if (saved) {
      setFamily(saved.family);
      setDraft(recipeDraftFromSaved(saved));
      setRecipeStep(3);
    } else {
      setFamily('beer');
      setDraft(createRecipeDraft('beer'));
      setRecipeStep(1);
    }
    setSelectedLots({});
    setRecipeOpen(true);
  }

  function switchFamily(next: ProductFamily) {
    setFamily(next);
    setDraft(createRecipeDraft(next));
    setSelectedLots({});
    setRecipeStep(1);
  }

  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function launch() {
    const result = props.onLaunchBatch(draft, selectedLots);
    show(result);
    if (result.ok) {
      setRecipeOpen(false);
      setDraft(createRecipeDraft(family));
      setSelectedLots({});
      setRecipeStep(1);
      setSection('batches');
    }
  }

  function openProcurement(requirement: IngredientRequirement) {
    const offers = offersForRequirement(state, requirement);
    const offer = offers[0];
    if (!offer) {
      show({ ok: false, message: `Для позиции «${requirement.label}» сейчас нет предложений.` });
      return;
    }
    setProcurement({
      requirement,
      offerId: offer.id,
      quantity: Math.max(offer.minimumOrder, Math.ceil(requirement.quantity)),
    });
  }

  function submitProcurement() {
    if (!procurement) return;
    const result = props.onOrderSupply(procurement.offerId, procurement.quantity);
    show(result);
    if (result.ok) setProcurement(null);
  }

  return <div className="screen-stack production-screen">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

    <EditorialVisual
      variant="production"
      eyebrow="Производственная база"
      title={active.length > 0 ? `${active.length} партии проходят цикл` : 'Линии готовы к новому запуску'}
      metric={`${Math.max(0, capacity - active.length)} свободных линий`}
      note={`${packaged} бутылок готовы к торговле`}
      action={<button className="button visual-button" onClick={() => openNewBatch()}>Новая партия<Icon name="arrow" /></button>}
    />

    <SubTabs value={section} onChange={setSection} label="Производственные разделы" options={[
      { id: 'overview', label: 'Сводка' },
      { id: 'recipes', label: 'Рецепты', badge: state.production.recipes.length },
      { id: 'batches', label: 'Партии', badge: active.length },
      { id: 'bottling', label: 'Розлив', badge: waiting.length },
      { id: 'supply', label: 'Склад', badge: state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status)).length },
      { id: 'facility', label: 'Объект' },
    ]} />

    {section === 'overview' && <ProductionOverview state={state} activeCount={active.length} waitingCount={waiting.length} packaged={packaged} capacity={capacity} lineReady={lineReady} />}

    {section === 'recipes' && (
      state.production.recipes.length === 0
        ? <section className="plain-panel"><EmptyState icon="archive" title="Сохранённых рецептов нет" text="Новый рецепт появится здесь после сохранения в мастере партии." /></section>
        : <section className="recipe-library plain-panel">
            {state.production.recipes.map((recipe) => {
              const recipeRequirements = getRecipeRequirements(recipe);
              const plan = buildSupplyPlan(state.supply.inventory, recipeRequirements);
              return <article key={recipe.id} className="recipe-library-row">
                <span className="recipe-family-mark"><Icon name={recipe.family === 'beer' ? 'beer' : 'apple'} /></span>
                <span className="recipe-library-copy"><strong>{recipe.name}</strong><small>{getStyle(recipe.styleId).shortName} · {recipe.volumeLiters} л · версия {recipe.version}</small></span>
                <span className={`recipe-readiness ${plan.missing.length === 0 ? 'ready' : 'missing'}`}>{plan.missing.length === 0 ? 'сырьё готово' : `не хватает ${plan.missing.length}`}</span>
                <span className="recipe-row-actions">
                  <button className="button secondary" onClick={() => show(props.onQueueRecipe(recipe.id))}>В очередь</button>
                  <button className="button primary" onClick={() => openNewBatch(recipe)}>Требования</button>
                </span>
              </article>;
            })}
          </section>
    )}

    {section === 'batches' && <BatchBoard state={state} onTaste={props.onTaste} onPackage={props.onPackage} onDiscard={props.onDiscard} mode="active" />}
    {section === 'bottling' && <BatchBoard state={state} onTaste={props.onTaste} onPackage={props.onPackage} onDiscard={props.onDiscard} mode="bottling" />}
    {section === 'supply' && <SupplyHub state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} />}
    {section === 'facility' && <FacilityHub state={state} onBuyEquipment={props.onBuyEquipment} onExpandRoom={props.onExpandRoom} onExpandUtility={props.onExpandUtility} onClean={props.onCleanFacility} onServiceEquipment={props.onServiceEquipment} onUpgradeEquipment={props.onUpgradeEquipment} onQueueRecipe={props.onQueueRecipe} onRemoveQueue={props.onRemoveQueue} />}

    {recipeOpen && !procurement && <Modal title="Новая партия" kicker={`Шаг ${recipeStep} из 3`} onClose={() => setRecipeOpen(false)} wide footer={<div className="wizard-footer">{recipeStep > 1 && <button className="button secondary" onClick={() => setRecipeStep((recipeStep - 1) as RecipeStep)}>Назад</button>}{recipeStep < 3 ? <button className="button primary" onClick={() => setRecipeStep((recipeStep + 1) as RecipeStep)}>Дальше</button> : <button className="button primary" disabled={!lineReady || supplyPlan.missing.length > 0 || state.finance.cash < processCost} onClick={launch}>Запустить · {formatMoney(supplyPlan.totalCost + processCost)}</button>}</div>}>
      <div className="wizard-steps"><i className={recipeStep >= 1 ? 'active' : ''} /><i className={recipeStep >= 2 ? 'active' : ''} /><i className={recipeStep >= 3 ? 'active' : ''} /></div>
      {recipeStep === 1 && <div className="wizard-pane">
        <div className="family-choice"><button className={family === 'beer' ? 'active' : ''} onClick={() => switchFamily('beer')}><Icon name="beer" />Пиво</button><button className={family === 'cider' ? 'active' : ''} onClick={() => switchFamily('cider')}><Icon name="apple" />Сидр</button></div>
        <label className="field"><span>Название рецепта</span><input value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={36} /></label>
        <div className="select-list">{getStylesForFamily(family).map((item) => <button key={item.id} className={draft.styleId === item.id ? 'active' : ''} onClick={() => { setDraft((current) => adaptDraftToStyle(current, item.id)); setSelectedLots({}); }}><span><strong>{item.shortName}</strong><small>{item.description}</small></span>{draft.styleId === item.id && <Icon name="check" />}</button>)}</div>
      </div>}
      {recipeStep === 2 && <div className="wizard-pane compact-controls">
        <RangeControl label="Сладость" value={draft.sweetness} min={1} max={5} onChange={(value) => update('sweetness', value)} />
        <RangeControl label="Кислотность" value={draft.acidity} min={1} max={5} onChange={(value) => update('acidity', value)} />
        <RangeControl label="Горечь / танины" value={draft.bitterness} min={1} max={5} onChange={(value) => update('bitterness', value)} />
        <RangeControl label="Тело" value={draft.body} min={1} max={5} onChange={(value) => update('body', value)} />
        <RangeControl label="Ароматика" value={draft.aroma} min={1} max={5} onChange={(value) => update('aroma', value)} />
        <RangeControl label="Оригинальность" value={draft.originality} min={1} max={5} onChange={(value) => update('originality', value)} />
      </div>}
      {recipeStep === 3 && <div className="wizard-pane">
        <div className="compact-controls"><RangeControl label="Объём" value={draft.volumeLiters} min={40} max={240} step={10} suffix=" л" onChange={(value) => { update('volumeLiters', value); setSelectedLots({}); }} /><RangeControl label="Температура" value={draft.processTemperature} min={style.processTemperatureRange[0]} max={style.processTemperatureRange[1]} suffix="°C" onChange={(value) => update('processTemperature', value)} /><RangeControl label="Основной этап" value={draft.primaryDays} min={style.primaryDaysRange[0]} max={style.primaryDaysRange[1]} suffix=" дн." onChange={(value) => update('primaryDays', value)} /><RangeControl label="Созревание" value={draft.conditioningDays} min={style.conditioningDaysRange[0]} max={style.conditioningDaysRange[1]} suffix=" дн." onChange={(value) => update('conditioningDays', value)} /></div>
        <div className="material-summary">
          <div><span>Требования партии</span><strong>{supplyPlan.missing.length === 0 ? `Склад готов · качество ${supplyPlan.qualityScore}/100` : `Нужно закупить ${supplyPlan.missing.length} позиций`}</strong></div>
          {requirements.map((requirement) => {
            const uses = supplyPlan.uses.filter((use) => use.ingredientId === requirement.ingredientId);
            const missing = supplyPlan.missing.find((item) => item.ingredientId === requirement.ingredientId);
            const pendingOrders = state.supply.purchaseOrders.filter((order) => order.ingredientId === requirement.ingredientId && ['pending', 'delayed'].includes(order.status));
            return <div key={requirement.category} className={`material-requirement ${missing ? 'missing' : 'ready'}`}>
              <button className="material-main" onClick={() => missing ? openProcurement(missing) : setSelectingCategory(requirement.category)}>
                <span><strong>{requirement.label}</strong><small>{uses.map((use) => use.variantName).join(' + ') || (pendingOrders.length > 0 ? `Заказано · прибытие день ${Math.min(...pendingOrders.map((order) => order.expectedDay))}` : 'Нет на складе')}</small></span>
                <b>{formatQuantity(requirement.quantity, requirement.unit)}</b>
              </button>
              {missing && <button className="material-buy" onClick={() => openProcurement(missing)}>Закупить</button>}
            </div>;
          })}
        </div>
        {!lineReady && <div className="inline-warning"><Icon name="warning" /><span>Линия не готова. Проверь раздел «Объект».</span></div>}
        <button className="button secondary full-button" onClick={() => show(props.onSaveRecipe(draft))}>Сохранить рецепт</button>
      </div>}
    </Modal>}

    {procurement && <ProcurementModal state={state} draft={procurement} onChange={setProcurement} onClose={() => setProcurement(null)} onSubmit={submitProcurement} />}

    {selectingCategory && categoryRequirement && <Modal title={categoryRequirement.label} kicker={`Нужно ${formatQuantity(categoryRequirement.quantity, categoryRequirement.unit)}`} onClose={() => setSelectingCategory(null)}>{categoryLots.length === 0 ? <p className="quiet-copy">На складе нет подходящих лотов.</p> : <div className="select-list">{categoryLots.map((lot) => <button key={lot.id} className={selectedLots[selectingCategory] === lot.id ? 'active' : ''} onClick={() => { setSelectedLots((current) => ({ ...current, [selectingCategory]: lot.id })); setSelectingCategory(null); }}><span><strong>{lot.variantName}</strong><small>{lot.origin} · {formatQuantity(lot.quantity, lot.unit)}</small></span><b>{lot.quality}/100</b></button>)}</div>}<button className="button secondary full-button" onClick={() => { setSelectedLots((current) => { const next = { ...current }; delete next[selectingCategory]; return next; }); setSelectingCategory(null); }}>Автовыбор</button></Modal>}
  </div>;
}

function ProductionOverview({ state, activeCount, waitingCount, packaged, capacity, lineReady }: { state: GameState; activeCount: number; waitingCount: number; packaged: number; capacity: number; lineReady: boolean }) {
  const pending = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status)).length;
  const queue = state.production.queue.length;
  return <div className="production-overview-grid consolidated-overview">
    <section className="plain-panel production-status-board">
      <div className="section-heading"><span>Состояние линии</span><b>{activeCount}/{capacity}</b></div>
      <div className="production-status-grid">
        <div><span>Активные партии</span><strong>{activeCount}</strong><small>{waitingCount} требуют решения</small></div>
        <div><span>Готовый запас</span><strong>{packaged}</strong><small>бутылок для торговли</small></div>
        <div><span>Снабжение</span><strong>{pending}</strong><small>заказов в пути</small></div>
        <div><span>Очередь</span><strong>{queue}</strong><small>запланированных партий</small></div>
      </div>
      <div className={`readiness-line ${lineReady ? 'ready' : 'blocked'}`}><Icon name={lineReady ? 'check' : 'warning'} /><span>{lineReady ? 'Оборудование готово к запуску.' : 'Для выбранной производственной линии не хватает оборудования или исправных модулей.'}</span></div>
    </section>
    <section className="plain-panel current-work">
      <div className="section-heading"><span>Сейчас в работе</span><b>{activeCount}</b></div>
      {state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).slice(0, 5).map((batch) => <div className="current-work-row" key={batch.id}><span><strong>{batch.code} · {batch.recipe.name}</strong><small>{statusLabel(batch.status)} · готовность день {batch.readyDay}</small></span><b>{batch.progress}%</b></div>)}
      {activeCount === 0 && <p className="quiet-copy">Линии свободны. Запуск выполняется только через кнопку «Новая партия».</p>}
    </section>
  </div>;
}

function ProcurementModal({ state, draft, onChange, onClose, onSubmit }: { state: GameState; draft: ProcurementDraft; onChange: (next: ProcurementDraft) => void; onClose: () => void; onSubmit: () => void }) {
  const offers = offersForRequirement(state, draft.requirement);
  const selected = offers.find((offer) => offer.id === draft.offerId) ?? offers[0];
  const ingredient = getIngredient(draft.requirement.ingredientId);
  return <Modal title={`Закупить: ${draft.requirement.label}`} kicker={`Не хватает ${formatQuantity(draft.requirement.quantity, draft.requirement.unit)}`} onClose={onClose} wide footer={<button className="button primary" disabled={!selected || draft.quantity < selected.minimumOrder || draft.quantity > selected.availableQuantity} onClick={onSubmit}>Заказать · {formatMoney((selected?.currentPrice ?? 0) * draft.quantity)}</button>}>
    <p className="modal-description">Предложения показаны сразу. Сравни цену, качество и срок, не открывая карточки поставщиков.</p>
    <div className="procurement-offers">
      {offers.map((offer) => {
        const supplier = getSupplier(offer.supplierId);
        return <button key={offer.id} className={draft.offerId === offer.id ? 'active' : ''} onClick={() => onChange({ ...draft, offerId: offer.id, quantity: Math.max(offer.minimumOrder, Math.ceil(draft.requirement.quantity)) })}>
          <span><strong>{offer.variantName}</strong><small>{supplier.name} · {offer.origin}</small></span>
          <span><strong>{offer.currentPrice.toFixed(2)} / {ingredient.unit === 'kg' ? 'кг' : ingredient.unit === 'pack' ? 'уп.' : 'шт.'}</strong><small>качество {offer.qualityEstimate[0]}–{offer.qualityEstimate[1]} · {offer.currentLeadDays} дн.</small></span>
        </button>;
      })}
    </div>
    {selected && <label className="order-quantity"><span>Количество</span><input type="number" min={selected.minimumOrder} max={selected.availableQuantity} step="1" value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: Number(event.target.value) })} /><small>Минимум {formatQuantity(selected.minimumOrder, ingredient.unit)} · доступно {formatQuantity(selected.availableQuantity, ingredient.unit)}</small></label>}
  </Modal>;
}

function offersForRequirement(state: GameState, requirement: IngredientRequirement): SupplierOfferState[] {
  return state.supply.offers
    .filter((offer) => offer.ingredientId === requirement.ingredientId && offer.availableQuantity > 0)
    .sort((a, b) => a.currentPrice - b.currentPrice || b.qualityEstimate[0] - a.qualityEstimate[0]);
}

function recipeDraftFromSaved(recipe: SavedRecipe): RecipeDraft {
  return {
    name: recipe.name,
    family: recipe.family,
    styleId: recipe.styleId,
    volumeLiters: recipe.volumeLiters,
    processTemperature: recipe.processTemperature,
    primaryDays: recipe.primaryDays,
    conditioningDays: recipe.conditioningDays,
    treatment: recipe.treatment,
    sweetness: recipe.sweetness,
    acidity: recipe.acidity,
    bitterness: recipe.bitterness,
    body: recipe.body,
    aroma: recipe.aroma,
    originality: recipe.originality,
  };
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;
  return <label className="compact-range"><div><span>{label}</span><output>{value}{suffix}</output></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${progress}%` } as React.CSSProperties} /></label>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
