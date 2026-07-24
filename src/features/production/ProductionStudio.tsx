import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { getEquipment } from '../../data/productionCatalog';
import { getIngredient, type IngredientCategory } from '../../data/supplyCatalog';
import { DEFAULT_PACKAGING, type BrandDraft, type PackagingDesign, type ReleaseDraft } from '../../domain/brand';
import type { FacilityRoomId, FacilityUtilityId } from '../../domain/facility';
import type { GameState } from '../../domain/game';
import { createRecipeDraft, getStyle, getStylesForFamily, statusLabel, type ProductFamily, type RecipeDraft, type SavedRecipe } from '../../domain/production';
import { formatQuantity, type IngredientRequirement } from '../../domain/supply';
import { BatchBoard } from '../batches/BatchBoard';
import { FacilityHub } from '../facility/FacilityHub';
import { SupplyHub } from '../supply/SupplyHub';
import { BottlePreview } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';
import { Modal } from '../../ui/MobileUI';
import { BottleDesigner } from './BottleDesigner';
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

type ProductionSection = 'overview' | 'batches' | 'inventory' | 'suppliers' | 'facility' | 'bottle';
type FlowStep = 1 | 2 | 3 | 4;
interface ProcurementDraft { requirement: IngredientRequirement; offerId: string; quantity: number; }

const productionTabs: Array<[ProductionSection, string]> = [
  ['overview', 'Обзор'], ['batches', 'Партии'], ['inventory', 'Склад'], ['suppliers', 'Поставщики'], ['facility', 'Объект'],
];

export function ProductionStudio(props: ProductionStudioProps) {
  const { state } = props;
  const [section, setSection] = useState<ProductionSection>('overview');
  const [flowOpen, setFlowOpen] = useState(false);
  const [step, setStep] = useState<FlowStep>(1);
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [selectedLots, setSelectedLots] = useState<Partial<Record<IngredientCategory, string>>>({});
  const [procurement, setProcurement] = useState<ProcurementDraft | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [bottleDesign, setBottleDesign] = useState<PackagingDesign>(state.brand.releases[0]?.packaging ?? DEFAULT_PACKAGING);
  const workflow = useMemo(() => buildProductionWorkflow(state, draft), [state, draft]);
  const active = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  const ready = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status));
  const pendingOrders = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));

  function show(result: ActionResult) { setFeedback(result); window.setTimeout(() => setFeedback(null), 2800); }
  function openFlow() { setStep(1); setFlowOpen(true); props.onFlowChange?.(true); }
  function closeFlow() { setFlowOpen(false); props.onFlowChange?.(false); }
  function switchFamily(family: ProductFamily) { setDraft(createRecipeDraft(family)); setSelectedLots({}); }
  function loadRecipe(recipeId: string) { const recipe = state.production.recipes.find((item) => item.id === recipeId); if (recipe) { setDraft(recipeDraftFromSaved(recipe)); setSelectedLots({}); } }
  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); if (key === 'volumeLiters' || key === 'styleId') setSelectedLots({}); }
  function openProcurement(material: MaterialRequirementState) { const recommendation = recommendProcurement(state.supply.offers, material.requirement, material.uncovered); if (!recommendation) return show({ ok: false, message: `Для «${material.requirement.label}» нет предложения.` }); setProcurement({ requirement: material.requirement, offerId: recommendation.offer.id, quantity: recommendation.quantity }); }
  function submitProcurement() { if (!procurement) return; const result = props.onOrderSupply(procurement.offerId, procurement.quantity); show(result); if (result.ok) setProcurement(null); }
  function orderAllMissing() { let completed = 0; for (const item of workflow.recommendations) { const result = props.onOrderSupply(item.offer.id, item.quantity); if (!result.ok) return show({ ok: false, message: completed ? `Оформлено ${completed}. ${result.message}` : result.message }); completed += 1; } show({ ok: true, message: completed ? `Оформлено заказов: ${completed}.` : 'Всё сырьё уже обеспечено.' }); }
  function launch() { const result = props.onLaunchBatch(draft, selectedLots); show(result); if (result.ok) { closeFlow(); setSection('batches'); } }

  if (section === 'inventory' || section === 'suppliers') return <SupplyHub key={section} initialSection={section} state={state} onOrder={props.onOrderSupply} onSignSupplier={props.onSignSupplier} onBack={() => setSection('overview')} />;
  if (section === 'bottle') return <BottleDesigner initial={bottleDesign} onClose={() => setSection('overview')} onSave={(design) => { setBottleDesign(design); show({ ok: true, message: 'Дизайн бутылки сохранён в рабочем проекте.' }); }} />;

  return (
    <div className="lux-screen production-lux-screen">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`} role="status"><Icon name={feedback.ok ? 'check' : 'warning'} />{feedback.message}</div>}
      <header className="lux-screen-header production-lux-header">
        <div className="lux-screen-title"><span>Производственный центр</span><h1>Производство</h1><p>Контролируй партии, склад, поставки и состояние объекта.</p></div>
        <button className="lux-primary production-new-release" onClick={openFlow}>Новый выпуск</button>
      </header>

      <nav className="lux-tabs production-lux-tabs" aria-label="Разделы производства">
        {productionTabs.map(([id, label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}{id === 'batches' && active.length > 0 && <i>{active.length}</i>}</button>)}
      </nav>

      {section === 'overview' && <ProductionOverview state={state} active={active} readyCount={ready.length} orders={pendingOrders.length} bottle={bottleDesign} onOpen={setSection} />}
      {section === 'batches' && <BatchBoard state={state} onTaste={props.onTaste} onPackage={props.onPackage} onDiscard={props.onDiscard} onOrderSupply={props.onOrderSupply} onCreateBrand={props.onCreateBrand} onCreateRelease={props.onCreateRelease} onOpenFacility={() => setSection('facility')} onOpenTrade={props.onOpenTrade} />}
      {section === 'facility' && <FacilityHub state={state} onBuyEquipment={props.onBuyEquipment} onExpandRoom={props.onExpandRoom} onExpandUtility={props.onExpandUtility} onClean={props.onCleanFacility} onServiceEquipment={props.onServiceEquipment} onUpgradeEquipment={props.onUpgradeEquipment} onQueueRecipe={props.onQueueRecipe} onRemoveQueue={props.onRemoveQueue} />}

      {flowOpen && <ReleaseFlow state={state} step={step} draft={draft} workflow={workflow} onClose={closeFlow} onStep={setStep} onFamily={switchFamily} onLoadRecipe={loadRecipe} onUpdate={update} onBuy={openProcurement} onOrderAll={orderAllMissing} onBuyEquipment={(id) => show(props.onBuyEquipment(id))} onSave={() => show(props.onSaveRecipe(draft))} onLaunch={launch} />}
      {procurement && <ProcurementModal state={state} draft={procurement} onChange={setProcurement} onClose={() => setProcurement(null)} onSubmit={submitProcurement} />}
    </div>
  );
}

function ProductionOverview({ state, active, readyCount, orders, bottle, onOpen }: { state: GameState; active: GameState['production']['batches']; readyCount: number; orders: number; bottle: PackagingDesign; onOpen: (section: ProductionSection) => void }) {
  const problemCount = readyCount + (state.facility && state.facility.sanitation < 45 ? 1 : 0) + state.supply.purchaseOrders.filter((order) => order.status === 'delayed').length;
  const nextBatch = [...active].sort((left, right) => left.readyDay - right.readyDay)[0];
  const nextOrder = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status)).sort((left, right) => left.expectedDay - right.expectedDay)[0];
  const lowLots = state.supply.inventory.filter((lot) => lot.quantity > 0 && lot.quantity <= Math.max(3, lot.initialQuantity * .18)).slice(0, 2);
  const equipmentCondition = state.facility ? Object.values(state.facility.equipmentCondition) : [];
  const averageCondition = equipmentCondition.length ? Math.round(equipmentCondition.reduce((sum, value) => sum + value, 0) / equipmentCondition.length) : 100;
  return <main className="production-lux-overview">
    <section className="production-key-section"><header>Ключевое за день</header><div className="production-key-grid">
      <KeyCard icon="building" label="Состояние компании" value={problemCount ? 'Внимание' : 'Стабильно'} note={`Репутация: ${state.company.reputation}`} tone={problemCount ? 'warning' : 'success'} progress={state.company.reputation} />
      <KeyCard icon="warning" label="Текущие проблемы" value={String(problemCount)} note={problemCount ? 'Нужно принять решения' : 'Критичных проблем нет'} tone="accent" onClick={() => onOpen(problemCount ? 'batches' : 'facility')} />
      <KeyCard icon="factory" label="Активные процессы" value={String(active.length + orders)} note={`${countLabel(active.length, 'партия', 'партии', 'партий')} · ${countLabel(orders, 'поставка', 'поставки', 'поставок')}`} onClick={() => onOpen('batches')} />
      <KeyCard icon="clock" label="Ближайшее событие" value={nextBatch ? `День ${nextBatch.readyDay}` : nextOrder ? `День ${nextOrder.expectedDay}` : 'Свободно'} note={nextBatch ? `Розлив ${nextBatch.recipe.name}` : nextOrder ? 'Прибытие сырья' : 'Можно запускать цикл'} onClick={() => onOpen(nextBatch ? 'batches' : 'suppliers')} />
    </div></section>

    <section className="production-batches-panel"><header><span>Активные партии</span><button onClick={() => onOpen('batches')}>{active.length} в работе <Icon name="arrow" /></button></header><div>{active.length ? active.slice(0, 4).map((batch) => <article key={batch.id}><BottlePreview design={state.brand.releases.find((release) => release.batchId === batch.id)?.packaging ?? bottle} compact label={batch.recipe.name} /><div><strong>{batch.recipe.name}</strong><span>{statusLabel(batch.status)}</span><i><b style={{ width: `${Math.max(3, batch.progress)}%` }} /></i></div><aside><small>День {Math.max(1, state.day - batch.startedDay + 1)} из {Math.max(1, batch.readyDay - batch.startedDay)}</small><strong>{Math.round(batch.progress)}%</strong></aside></article>) : <p className="production-empty-line"><Icon name="factory" />Линии свободны — запусти новый выпуск.</p>}</div></section>

    <section className="production-support-grid">
      <article className="production-shortages"><header><Icon name="warning" />Критические недостатки</header>{lowLots.length ? lowLots.map((lot) => <p key={lot.id}><span>{getIngredient(lot.ingredientId).name}</span><strong>Осталось {formatQuantity(lot.quantity, lot.unit)}</strong></p>) : <p><span>Сырьё обеспечено</span><strong className="success">Дефицитов нет</strong></p>}<button onClick={() => onOpen('suppliers')}>Открыть рынок <Icon name="arrow" /></button></article>
      <article className="production-delivery"><header><Icon name="market" />Входящая поставка</header>{nextOrder ? <><strong>{state.supply.offers.find((item) => item.id === nextOrder.offerId)?.variantName ?? getIngredient(nextOrder.ingredientId).name}</strong><span>{nextOrder.status === 'delayed' ? 'Задерживается' : nextOrder.expectedDay <= state.day + 1 ? 'Прибудет завтра' : `Прибудет на день ${nextOrder.expectedDay}`}</span><small>{formatQuantity(nextOrder.quantity, nextOrder.unit)} · {nextOrder.note}</small></> : <><strong>Поставок нет</strong><span>Склад работает автономно</span></>}<button onClick={() => onOpen('suppliers')}>Все поставщики <Icon name="arrow" /></button></article>
    </section>

    <section className="production-facility-state"><header><Icon name="building" />Состояние объекта</header><div><article><span>Чистота объекта</span><strong>{Math.round(state.facility?.sanitation ?? 0)}/100</strong><i><b style={{ width: `${state.facility?.sanitation ?? 0}%` }} /></i><small>{(state.facility?.sanitation ?? 0) >= 70 ? 'На уровне' : 'Нужна санитарная смена'}</small></article><article><span>Оборудование</span><strong className={averageCondition >= 70 ? 'success' : 'warning'}>{averageCondition >= 85 ? 'Отличное' : averageCondition >= 70 ? 'Хорошее' : 'Требует внимания'}</strong><small>{equipmentCondition.filter((value) => value < 65).length} единицы требуют внимания</small><button onClick={() => onOpen('facility')}><Icon name="arrow" /></button></article><article className="production-package-shortcut"><BottlePreview design={bottle} compact /><span><strong>Дизайн бутылки</strong><small>{bottle.volumeMl} мл · {bottle.form}</small></span><button onClick={() => onOpen('bottle')}><Icon name="arrow" /></button></article></div></section>
  </main>;
}

function KeyCard({ icon, label, value, note, tone, progress, onClick }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string; note: string; tone?: 'success' | 'warning' | 'accent'; progress?: number; onClick?: () => void }) { const content = <><Icon name={icon} /><span>{label}</span><strong className={tone ?? ''}>{value}</strong><small>{note}</small>{progress !== undefined && <i><b style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></i>}{onClick && <Icon name="arrow" />}</>; return onClick ? <button className={tone ?? ''} onClick={onClick}>{content}</button> : <article className={tone ?? ''}>{content}</article>; }

function ReleaseFlow({ state, step, draft, workflow, onClose, onStep, onFamily, onLoadRecipe, onUpdate, onBuy, onOrderAll, onBuyEquipment, onSave, onLaunch }: { state: GameState; step: FlowStep; draft: RecipeDraft; workflow: ReturnType<typeof buildProductionWorkflow>; onClose: () => void; onStep: (step: FlowStep) => void; onFamily: (family: ProductFamily) => void; onLoadRecipe: (id: string) => void; onUpdate: <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => void; onBuy: (material: MaterialRequirementState) => void; onOrderAll: () => void; onBuyEquipment: (id: string) => void; onSave: () => void; onLaunch: () => void }) {
  const style = getStyle(draft.styleId);
  return <div className="release-flow lux-release-flow" role="dialog" aria-modal="true" aria-label="Новый выпуск">
    <header><button className="flow-back" onClick={step === 1 ? onClose : () => onStep((step - 1) as FlowStep)}><Icon name="arrow" /></button><div><h2>Новый выпуск</h2><span>Шаг {step} из 4 · {['Продукт', 'Объём и процесс', 'Требования', 'Подтверждение'][step - 1]}</span></div><button className="flow-exit" onClick={onClose}>Выйти</button></header><div className="flow-progress"><i style={{ width: `${step * 25}%` }} /></div>
    <main>
      {step === 1 && <section className="flow-step"><h1>Выбери продукт</h1><p>Начни с сохранённого рецепта или создай новый профиль напитка.</p><label className="field"><span>Сохранённый рецепт</span><select value="" onChange={(event) => onLoadRecipe(event.target.value)}><option value="">Новый рецепт</option>{state.production.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label><div className="family-selector">{(['beer', 'cider'] as ProductFamily[]).map((family) => <button key={family} className={draft.family === family ? 'active' : ''} onClick={() => onFamily(family)}>{family === 'beer' ? 'Пиво' : 'Сидр'}</button>)}</div><label className="field"><span>Стиль</span><select value={draft.styleId} onChange={(event) => onUpdate('styleId', event.target.value)}>{getStylesForFamily(draft.family).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Название</span><input value={draft.name} onChange={(event) => onUpdate('name', event.target.value)} /></label></section>}
      {step === 2 && <section className="flow-step"><h1>Объём и процесс</h1><p>{style.description}</p><div className="flow-control-grid"><label className="field"><span>Объём, л</span><input type="number" min="20" max="500" value={draft.volumeLiters} onChange={(event) => onUpdate('volumeLiters', Number(event.target.value))} /></label><label className="field"><span>Температура, °C</span><input type="number" value={draft.processTemperature} onChange={(event) => onUpdate('processTemperature', Number(event.target.value))} /></label><label className="field"><span>Основной этап, дней</span><input type="number" value={draft.primaryDays} onChange={(event) => onUpdate('primaryDays', Number(event.target.value))} /></label><label className="field"><span>Выдержка, дней</span><input type="number" value={draft.conditioningDays} onChange={(event) => onUpdate('conditioningDays', Number(event.target.value))} /></label></div><div className="flow-forecast"><span><small>Запуск</small><strong>День {workflow.predictedLaunchDay}</strong></span><span><small>Готовность</small><strong>День {workflow.predictedReadyDay}</strong></span><span><small>Плановая стоимость</small><strong>{formatMoney(workflow.plannedCost)} ₽</strong></span></div></section>}
      {step === 3 && <section className="flow-step"><h1>Проверь требования</h1><p>Все блокировки и закупки собраны в одном месте.</p><div className="requirement-list">{workflow.materials.map((material) => <article key={material.requirement.ingredientId} className={material.status}><Icon name={material.status === 'ready' ? 'check' : material.status === 'in_transit' ? 'clock' : 'warning'} /><span><strong>{material.requirement.label}</strong><small>Нужно {formatQuantity(material.requirement.quantity, material.requirement.unit)} · на складе {formatQuantity(material.available, material.requirement.unit)}</small></span><b>{material.status === 'ready' ? 'Готово' : material.status === 'in_transit' ? `В пути до дня ${material.expectedDay}` : `Не хватает ${formatQuantity(material.uncovered, material.requirement.unit)}`}</b>{material.uncovered > 0 && <button onClick={() => onBuy(material)}>Купить</button>}</article>)}{workflow.missingEquipmentIds.map((id) => <article key={id} className="missing"><Icon name="factory" /><span><strong>{getEquipment(id).name}</strong><small>Оборудование обязательно для этого продукта</small></span><b>{formatMoney(getEquipment(id).cost)} ₽</b><button onClick={() => onBuyEquipment(id)}>Купить</button></article>)}</div>{workflow.canOrderAll && <button className="lux-primary flow-order-all" onClick={onOrderAll}>Заказать всё недостающее · {formatMoney(workflow.procurementCost)} ₽</button>}</section>}
      {step === 4 && <section className="flow-step"><h1>Подтверди запуск</h1><p>Система не запустит партию, пока условия не выполнены.</p><div className="flow-confirm-card"><span><small>Продукт</small><strong>{draft.name}</strong></span><span><small>Объём</small><strong>{draft.volumeLiters} л</strong></span><span><small>Готовность</small><strong>День {workflow.predictedReadyDay}</strong></span><span><small>Себестоимость</small><strong>{formatMoney(workflow.plannedCost)} ₽</strong></span></div>{workflow.blockers.length > 0 && <div className="flow-blockers"><strong>{workflow.blockers.length} блокировки</strong>{workflow.blockers.map((blocker) => <p key={blocker}><Icon name="warning" />{blocker}</p>)}</div>}<button className="button ghost" onClick={onSave}>Сохранить рецепт</button></section>}
    </main><footer><button className="button ghost" onClick={step === 1 ? onClose : () => onStep((step - 1) as FlowStep)}>Назад</button>{step < 4 ? <button className="button primary" onClick={() => onStep((step + 1) as FlowStep)}>Далее</button> : <button className="button primary" disabled={!workflow.canLaunch} onClick={onLaunch}>Запустить партию</button>}</footer>
  </div>;
}

function ProcurementModal({ state, draft, onChange, onClose, onSubmit }: { state: GameState; draft: ProcurementDraft; onChange: (value: ProcurementDraft) => void; onClose: () => void; onSubmit: () => void }) { const offers = state.supply.offers.filter((offer) => offer.ingredientId === draft.requirement.ingredientId && offer.availableQuantity >= Math.max(offer.minimumOrder, draft.quantity)).sort((left, right) => left.currentPrice - right.currentPrice); const selected = offers.find((offer) => offer.id === draft.offerId) ?? offers[0]; if (!selected) return null; return <Modal title={draft.requirement.label} kicker={`Нужно закрыть ${formatQuantity(draft.requirement.quantity, draft.requirement.unit)}`} onClose={onClose} footer={<button className="button primary" onClick={onSubmit}>Заказать · {formatMoney(selected.currentPrice * draft.quantity)} ₽</button>}><div className="select-list">{offers.map((offer) => <button key={offer.id} className={selected.id === offer.id ? 'active' : ''} onClick={() => onChange({ ...draft, offerId: offer.id, quantity: Math.max(offer.minimumOrder, Math.ceil(draft.quantity)) })}><span><strong>{offer.variantName}</strong><small>{offer.origin} · {offer.currentLeadDays} дн.</small></span><b>{offer.currentPrice.toFixed(2)} ₽</b></button>)}</div><label className="order-quantity"><span>Количество</span><input type="number" min={selected.minimumOrder} max={selected.availableQuantity} value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: Number(event.target.value) })} /></label></Modal>; }
function recipeDraftFromSaved(recipe: SavedRecipe): RecipeDraft { const { id: _id, version: _version, createdDay: _createdDay, estimatedCost: _estimatedCost, ...draft } = recipe; return draft; }
function countLabel(value: number, one: string, few: string, many: string) { const mod10 = value % 10; const mod100 = value % 100; const noun = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many; return `${value} ${noun}`; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
