import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { properties } from '../../data/catalog';
import { getIngredient, type IngredientCategory } from '../../data/supplyCatalog';
import { equipmentCatalog } from '../../data/productionCatalog';
import type { GameState } from '../../domain/game';
import {
  adaptDraftToStyle,
  createRecipeDraft,
  estimateProcessCost,
  getStyle,
  getStylesForFamily,
  requiredEquipmentIds,
  type EquipmentDefinition,
  type ProductFamily,
  type RecipeDraft,
} from '../../domain/production';
import { buildSupplyPlan, formatQuantity, getRecipeRequirements } from '../../domain/supply';
import { SupplyHub } from '../supply/SupplyHub';
import { Icon } from '../../ui/Icon';
import { CompactHeader, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

interface ProductionStudioProps {
  state: GameState;
  onBuyEquipment: (equipmentId: string) => ActionResult;
  onSaveRecipe: (draft: RecipeDraft) => ActionResult;
  onLaunchBatch: (draft: RecipeDraft, selectedLots?: Partial<Record<IngredientCategory, string>>) => ActionResult;
  onOrderSupply: (offerId: string, quantity: number) => ActionResult;
  onSignSupplier: (supplierId: string) => ActionResult;
}

type ProductionSection = 'line' | 'recipe' | 'supply' | 'launch';
type RecipeSection = 'identity' | 'profile' | 'process';

export function ProductionStudio({ state, onBuyEquipment, onSaveRecipe, onLaunchBatch, onOrderSupply, onSignSupplier }: ProductionStudioProps) {
  const [family, setFamily] = useState<ProductFamily>('beer');
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [section, setSection] = useState<ProductionSection>('line');
  const [recipeSection, setRecipeSection] = useState<RecipeSection>('identity');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDefinition | null>(null);
  const [selectedLots, setSelectedLots] = useState<Partial<Record<IngredientCategory, string>>>({});
  const [selectingCategory, setSelectingCategory] = useState<IngredientCategory | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const style = getStyle(draft.styleId);
  const requirements = useMemo(() => getRecipeRequirements(draft), [draft]);
  const supplyPlan = useMemo(() => buildSupplyPlan(state.supply.inventory, requirements, selectedLots), [requirements, selectedLots, state.supply.inventory]);
  const processCost = estimateProcessCost(draft);
  const estimatedCost = supplyPlan.totalCost + processCost;
  const required = requiredEquipmentIds(family);
  const ready = required.every((id) => state.production.equipmentIds.includes(id));
  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).length;
  const propertyCapacity = properties.find((item) => item.id === state.world?.propertyId)?.capacity ?? 1;
  const styleFit = useMemo(() => calculatePreviewFit(draft), [draft]);
  const supplyReady = supplyPlan.missing.length === 0;
  const categoryRequirement = requirements.find((item) => item.category === selectingCategory) ?? null;
  const categoryLots = categoryRequirement
    ? state.supply.inventory.filter((lot) => lot.ingredientId === categoryRequirement.ingredientId && lot.quantity > 0)
    : [];

  function switchFamily(nextFamily: ProductFamily) {
    setFamily(nextFamily);
    setDraft(createRecipeDraft(nextFamily));
    setSelectedLots({});
    setRecipeSection('identity');
    setFeedback(null);
  }

  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleResult(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3200);
  }

  function buySelected() {
    if (!selectedEquipment) return;
    const result = onBuyEquipment(selectedEquipment.id);
    handleResult(result);
    if (result.ok) setSelectedEquipment(null);
  }

  function launch() {
    const result = onLaunchBatch(draft, selectedLots);
    handleResult(result);
    if (result.ok) {
      setDraft(createRecipeDraft(family));
      setSelectedLots({});
      setSection('line');
    }
  }

  return (
    <div className="screen-stack production-compact">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <CompactHeader
        kicker="Производственная студия"
        title={family === 'beer' ? 'Пивная линия' : 'Сидровая линия'}
        meta={`${Math.max(0, propertyCapacity - activeBatches)} свободных места · ${ready ? 'линия готова' : 'не хватает оборудования'}`}
        action={<div className="family-toggle"><button className={family === 'beer' ? 'active' : ''} onClick={() => switchFamily('beer')}><Icon name="beer" /></button><button className={family === 'cider' ? 'active' : ''} onClick={() => switchFamily('cider')}><Icon name="apple" /></button></div>}
      />

      <section className="mini-stat-grid three">
        <MiniStat label="Сырьё" value={supplyReady ? `${supplyPlan.qualityScore}/100` : `${supplyPlan.missing.length} дефицита`} note={supplyReady ? formatMoney(supplyPlan.totalCost) : 'нужна закупка'} tone={supplyReady ? 'green' : 'warm'} />
        <MiniStat label="Запуск" value={formatMoney(estimatedCost)} note={`${draft.volumeLiters} л`} tone="blue" />
        <MiniStat label="Готовность" value={`День ${state.day + draft.primaryDays + draft.conditioningDays}`} note={`${draft.primaryDays + draft.conditioningDays} дней`} tone="green" />
      </section>

      <SubTabs value={section} onChange={setSection} options={[{ id: 'line', label: 'Линия' }, { id: 'recipe', label: 'Рецепт' }, { id: 'supply', label: 'Снабжение', badge: state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status)).length }, { id: 'launch', label: 'Запуск' }]} />

      {section === 'line' && (
        <section className="compact-list glass-card">
          {equipmentCatalog.filter((item) => item.family === family || item.family === 'shared').map((item) => {
            const owned = state.production.equipmentIds.includes(item.id);
            const requiredForFamily = required.includes(item.id);
            return (
              <button key={item.id} className="equipment-row compact-list-row" onClick={() => setSelectedEquipment(item)}>
                <span className={`row-icon ${owned ? 'owned' : ''}`}><Icon name={item.icon} /></span>
                <span><strong>{item.name}</strong><small>{item.category} · {item.capacityLiters > 0 ? `${item.capacityLiters} л` : 'контроль качества'}</small></span>
                <span className={`row-status ${owned ? 'positive' : requiredForFamily ? 'required' : ''}`}>{owned ? 'готово' : requiredForFamily ? formatMoney(item.cost) : 'опция'}</span>
              </button>
            );
          })}
          <div className={`line-readiness ${ready ? 'ready' : ''}`}><Icon name={ready ? 'check' : 'warning'} /><span><strong>{ready ? 'Можно запускать партию' : 'Линия ещё не собрана'}</strong><small>{ready ? 'Основные производственные модули установлены.' : 'Открой обязательные модули и купи недостающее оборудование.'}</small></span></div>
        </section>
      )}

      {section === 'recipe' && (
        <section className="recipe-workspace glass-card">
          <SubTabs value={recipeSection} onChange={setRecipeSection} options={[{ id: 'identity', label: 'Основа' }, { id: 'profile', label: 'Вкус' }, { id: 'process', label: 'Процесс' }]} />

          {recipeSection === 'identity' && (
            <div className="recipe-pane">
              <label className="field rich-field"><span>Название рецепта</span><input value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={36} /></label>
              <div className="compact-style-list">
                {getStylesForFamily(family).map((item) => (
                  <button key={item.id} className={draft.styleId === item.id ? 'active' : ''} onClick={() => { setDraft((current) => adaptDraftToStyle(current, item.id)); setSelectedLots({}); }}>
                    <i style={{ background: item.color }} />
                    <span><strong>{item.shortName}</strong><small>{item.description}</small></span>
                    {draft.styleId === item.id && <Icon name="check" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recipeSection === 'profile' && (
            <div className="recipe-pane compact-controls">
              <RangeControl label="Сладость" value={draft.sweetness} min={1} max={5} onChange={(value) => update('sweetness', value)} />
              <RangeControl label="Кислотность" value={draft.acidity} min={1} max={5} onChange={(value) => update('acidity', value)} />
              <RangeControl label="Горечь / танины" value={draft.bitterness} min={1} max={5} onChange={(value) => update('bitterness', value)} />
              <RangeControl label="Тело" value={draft.body} min={1} max={5} onChange={(value) => update('body', value)} />
              <RangeControl label="Ароматика" value={draft.aroma} min={1} max={5} onChange={(value) => update('aroma', value)} />
              <RangeControl label="Оригинальность" value={draft.originality} min={1} max={5} onChange={(value) => update('originality', value)} />
            </div>
          )}

          {recipeSection === 'process' && (
            <div className="recipe-pane compact-controls">
              <RangeControl label="Объём" value={draft.volumeLiters} min={40} max={240} step={10} suffix=" л" onChange={(value) => { update('volumeLiters', value); setSelectedLots({}); }} />
              <RangeControl label="Температура" value={draft.processTemperature} min={style.processTemperatureRange[0]} max={style.processTemperatureRange[1]} suffix="°C" onChange={(value) => update('processTemperature', value)} />
              <RangeControl label="Основной этап" value={draft.primaryDays} min={style.primaryDaysRange[0]} max={style.primaryDaysRange[1]} suffix=" дн." onChange={(value) => update('primaryDays', value)} />
              <RangeControl label="Созревание" value={draft.conditioningDays} min={style.conditioningDaysRange[0]} max={style.conditioningDaysRange[1]} suffix=" дн." onChange={(value) => update('conditioningDays', value)} />
              <RangeControl label="Контроль и обработка" value={draft.treatment} min={1} max={5} onChange={(value) => update('treatment', value)} />
            </div>
          )}
        </section>
      )}

      {section === 'supply' && <SupplyHub state={state} onOrder={onOrderSupply} onSignSupplier={onSignSupplier} />}

      {section === 'launch' && (
        <section className="launch-card glass-card">
          <div className="launch-visual" style={{ '--drink-color': style.color } as React.CSSProperties}><div><i /><i /><i /></div><span>{family === 'beer' ? 'BEER' : 'CIDER'}</span></div>
          <div className="launch-copy"><span>{style.name}</span><h3>{draft.name || 'Без названия'}</h3><p>{draft.volumeLiters} л · {draft.primaryDays + draft.conditioningDays} дней · {styleFit}% попадание в стиль</p></div>

          <div className="material-plan">
            <div className="material-plan-head"><span>Сырьё партии</span><strong>{supplyReady ? `${supplyPlan.qualityScore}/100` : 'не готово'}</strong></div>
            {requirements.map((requirement) => {
              const uses = supplyPlan.uses.filter((use) => use.ingredientId === requirement.ingredientId);
              const missing = supplyPlan.missing.find((item) => item.ingredientId === requirement.ingredientId);
              const selected = selectedLots[requirement.category];
              return (
                <button key={requirement.category} className={`material-row ${missing ? 'missing' : ''}`} onClick={() => setSelectingCategory(requirement.category)}>
                  <span><strong>{requirement.label}</strong><small>{uses.length > 0 ? uses.map((use) => use.variantName).join(' + ') : 'нет подходящего лота'}</small></span>
                  <span><b>{formatQuantity(requirement.quantity, requirement.unit)}</b><small>{selected ? 'выбрано' : 'авто'}</small></span>
                </button>
              );
            })}
          </div>

          <div className="launch-numbers">
            <div><span>Сырьё</span><strong>{formatMoney(supplyPlan.totalCost)}</strong></div>
            <div><span>Процесс</span><strong>{formatMoney(processCost)}</strong></div>
            <div><span>Итого</span><strong>{formatMoney(estimatedCost)}</strong></div>
          </div>
          {!ready && <div className="inline-warning"><Icon name="warning" /><span>Сначала собери обязательную линию во вкладке «Линия».</span></div>}
          {!supplyReady && <div className="inline-warning"><Icon name="warning" /><span>Не хватает сырья. Перейди в «Снабжение» и оформи закупку.</span></div>}
          <div className="stacked-actions">
            <button className="button secondary" onClick={() => handleResult(onSaveRecipe(draft))}>Сохранить версию</button>
            <button className="button primary glow" onClick={launch} disabled={!ready || !supplyReady || state.finance.cash < processCost}>Запустить партию <Icon name="arrow" /></button>
          </div>
        </section>
      )}

      {selectedEquipment && (
        <Modal title={selectedEquipment.name} kicker={selectedEquipment.category} onClose={() => setSelectedEquipment(null)} footer={state.production.equipmentIds.includes(selectedEquipment.id) ? <button className="button installed" disabled><Icon name="check" />Установлено</button> : <button className="button primary" onClick={buySelected}>Купить за {formatMoney(selectedEquipment.cost)}</button>}>
          <div className="equipment-modal-visual"><Icon name={selectedEquipment.icon} /></div>
          <p className="modal-description">{selectedEquipment.summary}</p>
          <div className="detail-grid"><div><span>Точность</span><strong>{selectedEquipment.precision}/5</strong></div><div><span>Вместимость</span><strong>{selectedEquipment.capacityLiters > 0 ? `${selectedEquipment.capacityLiters} л` : '—'}</strong></div><div><span>Назначение</span><strong>{selectedEquipment.benefit}</strong></div><div><span>Статус</span><strong>{required.includes(selectedEquipment.id) ? 'обязательно' : 'улучшение'}</strong></div></div>
        </Modal>
      )}

      {selectingCategory && categoryRequirement && (
        <Modal title={categoryRequirement.label} kicker={`Нужно ${formatQuantity(categoryRequirement.quantity, categoryRequirement.unit)}`} onClose={() => setSelectingCategory(null)} footer={<button className="button secondary" onClick={() => { setSelectedLots((current) => { const next = { ...current }; delete next[selectingCategory]; return next; }); setSelectingCategory(null); }}>Автовыбор по сроку</button>}>
          {categoryLots.length === 0 ? <p className="modal-description">На складе нет подходящих лотов. Оформи заказ во вкладке «Снабжение».</p> : <div className="lot-choice-list">{categoryLots.map((lot) => <button key={lot.id} className={selectedLots[selectingCategory] === lot.id ? 'active' : ''} onClick={() => { setSelectedLots((current) => ({ ...current, [selectingCategory]: lot.id })); setSelectingCategory(null); }}><span><strong>{lot.variantName}</strong><small>{lot.origin} · {formatQuantity(lot.quantity, lot.unit)}</small></span><span><b>{lot.quality}/100</b><small>{lot.unitCost.toFixed(2)} / {getIngredient(lot.ingredientId).unit === 'kg' ? 'кг' : getIngredient(lot.ingredientId).unit === 'pack' ? 'уп.' : 'шт.'}</small></span></button>)}</div>}
        </Modal>
      )}
    </div>
  );
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;
  return <label className="compact-range"><div><span>{label}</span><output>{value}{suffix}</output></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${progress}%` } as React.CSSProperties} /></label>;
}

function calculatePreviewFit(draft: RecipeDraft): number {
  const style = getStyle(draft.styleId);
  const values = [draft.sweetness, draft.acidity, draft.bitterness, draft.body, draft.aroma];
  const targets = [style.target.sweetness, style.target.acidity, style.target.bitterness, style.target.body, style.target.aroma];
  const distance = values.reduce((sum, value, index) => sum + Math.abs(value - (targets[index] ?? 0)), 0);
  const temperaturePenalty = Math.abs(draft.processTemperature - style.defaultProcessTemperature) * 3;
  return Math.max(15, Math.round(100 - distance * 5 - temperaturePenalty));
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
