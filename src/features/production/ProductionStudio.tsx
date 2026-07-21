import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { properties } from '../../data/catalog';
import { equipmentCatalog } from '../../data/productionCatalog';
import type { GameState } from '../../domain/game';
import {
  adaptDraftToStyle,
  createRecipeDraft,
  estimateRecipeCost,
  getStyle,
  getStylesForFamily,
  requiredEquipmentIds,
  type ProductFamily,
  type RecipeDraft,
} from '../../domain/production';
import { Icon } from '../../ui/Icon';

interface ProductionStudioProps {
  state: GameState;
  onBuyEquipment: (equipmentId: string) => ActionResult;
  onSaveRecipe: (draft: RecipeDraft) => ActionResult;
  onLaunchBatch: (draft: RecipeDraft) => ActionResult;
}

export function ProductionStudio({ state, onBuyEquipment, onSaveRecipe, onLaunchBatch }: ProductionStudioProps) {
  const [family, setFamily] = useState<ProductFamily>('beer');
  const [draft, setDraft] = useState<RecipeDraft>(() => createRecipeDraft('beer'));
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const style = getStyle(draft.styleId);
  const estimatedCost = estimateRecipeCost(draft);
  const required = requiredEquipmentIds(family);
  const ready = required.every((id) => state.production.equipmentIds.includes(id));
  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).length;
  const propertyCapacity = properties.find((item) => item.id === state.world?.propertyId)?.capacity ?? 1;
  const styleFit = useMemo(() => calculatePreviewFit(draft), [draft]);

  function switchFamily(nextFamily: ProductFamily) {
    setFamily(nextFamily);
    setDraft(createRecipeDraft(nextFamily));
    setFeedback(null);
  }

  function update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleResult(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3800);
  }

  return (
    <div className="production-layout">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <section className="studio-hero glass-card">
        <div>
          <span className="section-kicker">production studio</span>
          <h2>Собери линию. Настрой вкус. Запусти партию.</h2>
          <p>Каждое решение меняет себестоимость, риск дефектов, стиль и будущую реакцию рынка.</p>
        </div>
        <div className="studio-readout">
          <span>Свободно линий</span>
          <strong>{Math.max(0, propertyCapacity - activeBatches)}</strong>
          <small>{activeBatches} занято</small>
        </div>
      </section>

      <section className="equipment-section">
        <div className="section-title-row">
          <div><span className="section-kicker">оборудование</span><h3>Производственная линия</h3></div>
          <span className={`status-chip ${ready ? 'positive' : 'warning'}`}>{ready ? 'Линия готова' : 'Нужны модули'}</span>
        </div>
        <div className="equipment-rail">
          {equipmentCatalog.map((item) => {
            const owned = state.production.equipmentIds.includes(item.id);
            const relevant = item.family === family || item.family === 'shared';
            const requiredForFamily = required.includes(item.id);
            return (
              <article key={item.id} className={`equipment-card glass-card ${owned ? 'owned' : ''} ${!relevant ? 'dimmed' : ''}`}>
                <div className="equipment-visual"><Icon name={item.icon} /></div>
                <div className="equipment-tags"><span>{item.category}</span>{requiredForFamily && <b>обязательно</b>}</div>
                <h4>{item.name}</h4>
                <p>{item.summary}</p>
                <div className="equipment-meta"><span>Точность {item.precision}/5</span>{item.capacityLiters > 0 && <span>{item.capacityLiters} л</span>}</div>
                <button className={`button ${owned ? 'installed' : 'secondary'}`} disabled={owned} onClick={() => handleResult(onBuyEquipment(item.id))}>
                  {owned ? <><Icon name="check" /> Установлено</> : <>{formatMoney(item.cost)} <Icon name="arrow" /></>}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="recipe-studio glass-card">
        <div className="recipe-header">
          <div><span className="section-kicker">редактор рецептуры</span><h3>Новая партия</h3></div>
          <div className="family-switch">
            <button className={family === 'beer' ? 'active' : ''} onClick={() => switchFamily('beer')}><Icon name="beer" />Пиво</button>
            <button className={family === 'cider' ? 'active' : ''} onClick={() => switchFamily('cider')}><Icon name="apple" />Сидр</button>
          </div>
        </div>

        <div className="recipe-grid">
          <div className="recipe-controls">
            <label className="field rich-field">
              <span>Название рецепта</span>
              <input value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={36} />
            </label>

            <div className="style-picker">
              {getStylesForFamily(family).map((item) => (
                <button key={item.id} className={draft.styleId === item.id ? 'active' : ''} onClick={() => setDraft((current) => adaptDraftToStyle(current, item.id))}>
                  <i style={{ background: item.color }} />
                  <span><strong>{item.shortName}</strong><small>{item.description}</small></span>
                </button>
              ))}
            </div>

            <div className="control-group">
              <div className="control-group-title"><span>Вкусовой профиль</span><small>1 — низко · 5 — высоко</small></div>
              <RangeControl label="Сладость" value={draft.sweetness} min={1} max={5} onChange={(value) => update('sweetness', value)} />
              <RangeControl label="Кислотность" value={draft.acidity} min={1} max={5} onChange={(value) => update('acidity', value)} />
              <RangeControl label="Горечь / танины" value={draft.bitterness} min={1} max={5} onChange={(value) => update('bitterness', value)} />
              <RangeControl label="Тело" value={draft.body} min={1} max={5} onChange={(value) => update('body', value)} />
              <RangeControl label="Ароматика" value={draft.aroma} min={1} max={5} onChange={(value) => update('aroma', value)} />
              <RangeControl label="Оригинальность" value={draft.originality} min={1} max={5} onChange={(value) => update('originality', value)} />
            </div>

            <div className="control-group process-controls">
              <div className="control-group-title"><span>Технологический режим</span><small>точные решения</small></div>
              <RangeControl label="Объём" value={draft.volumeLiters} min={40} max={240} step={10} suffix=" л" onChange={(value) => update('volumeLiters', value)} />
              <RangeControl label="Температура ферментации" value={draft.processTemperature} min={style.processTemperatureRange[0]} max={style.processTemperatureRange[1]} suffix="°C" onChange={(value) => update('processTemperature', value)} />
              <RangeControl label="Основной этап" value={draft.primaryDays} min={style.primaryDaysRange[0]} max={style.primaryDaysRange[1]} suffix=" дн." onChange={(value) => update('primaryDays', value)} />
              <RangeControl label="Созревание" value={draft.conditioningDays} min={style.conditioningDaysRange[0]} max={style.conditioningDaysRange[1]} suffix=" дн." onChange={(value) => update('conditioningDays', value)} />
              <RangeControl label="Обработка и контроль" value={draft.treatment} min={1} max={5} onChange={(value) => update('treatment', value)} />
            </div>
          </div>

          <aside className="recipe-preview">
            <div className="liquid-preview" style={{ '--liquid-color': style.color } as React.CSSProperties}>
              <div className="glass-shape"><div className="preview-liquid"><span /><span /><span /></div></div>
              <div className="preview-title"><span>{family === 'beer' ? 'BATCH / BEER' : 'BATCH / CIDER'}</span><strong>{draft.name || 'Без названия'}</strong><small>{style.name}</small></div>
            </div>

            <div className="profile-board">
              <div className="profile-score"><span>Попадание в стиль</span><strong>{styleFit}%</strong></div>
              <ProfileLine label="Сладость" value={draft.sweetness} target={style.target.sweetness} />
              <ProfileLine label="Кислотность" value={draft.acidity} target={style.target.acidity} />
              <ProfileLine label="Горечь" value={draft.bitterness} target={style.target.bitterness} />
              <ProfileLine label="Тело" value={draft.body} target={style.target.body} />
              <ProfileLine label="Аромат" value={draft.aroma} target={style.target.aroma} />
            </div>

            <div className="recipe-economics">
              <div><span>Сырьё и запуск</span><strong>{formatMoney(estimatedCost)}</strong></div>
              <div><span>Готовность</span><strong>день {state.day + draft.primaryDays + draft.conditioningDays}</strong></div>
              <div><span>Ориентир себестоимости</span><strong>{(estimatedCost / Math.max(1, draft.volumeLiters / 0.5)).toFixed(2)} / бутылка</strong></div>
            </div>

            {!ready && (
              <div className="inline-warning"><Icon name="warning" /><span>Для запуска установи {family === 'beer' ? 'варочный порядок' : 'яблочный пресс'} и ферментеры.</span></div>
            )}

            <div className="recipe-actions">
              <button className="button ghost" onClick={() => handleResult(onSaveRecipe(draft))}>Сохранить версию</button>
              <button className="button primary glow" onClick={() => handleResult(onLaunchBatch(draft))} disabled={!ready || state.finance.cash < estimatedCost}>
                Запустить партию <Icon name="arrow" />
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function RangeControl({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <label className="range-control">
      <div><span>{label}</span><output>{value}{suffix}</output></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-progress': `${progress}%` } as React.CSSProperties} />
    </label>
  );
}

function ProfileLine({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div className="profile-line">
      <span>{label}</span>
      <div><i style={{ width: `${value * 20}%` }} /><b style={{ left: `${target * 20}%` }} /></div>
      <strong>{value}</strong>
    </div>
  );
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
