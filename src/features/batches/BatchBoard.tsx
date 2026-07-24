import { useState, type ReactNode } from 'react';
import type { ActionResult } from '../../app/useGameState';
import {
  DEFAULT_PACKAGING,
  activeReleaseForBatch,
  inferTargetChannel,
  marketChannelLabel,
  positioningLabel,
  type BrandDraft,
  type BrandPositioning,
  type PackagingDesign,
  type ReleaseDraft,
} from '../../domain/brand';
import type { GameState } from '../../domain/game';
import type { MarketChannel } from '../../domain/market';
import { averageQuality, statusLabel, type BatchState } from '../../domain/production';
import { formatQuantity, getPackagingRequirement, inventoryQuantity } from '../../domain/supply';
import { recommendProcurement } from '../production/productionWorkflow';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal } from '../../ui/MobileUI';

interface BatchBoardProps {
  state: GameState;
  onTaste: (batchId: string) => ActionResult;
  onPackage: (batchId: string) => ActionResult;
  onDiscard: (batchId: string) => ActionResult;
  onOrderSupply: (offerId: string, quantity: number) => ActionResult;
  onCreateBrand: (draft: BrandDraft) => ActionResult;
  onCreateRelease: (draft: ReleaseDraft) => ActionResult;
  onOpenFacility: () => void;
  onOpenTrade: () => void;
}

export function BatchBoard({ state, onTaste, onPackage, onDiscard, onOrderSupply, onCreateBrand, onCreateRelease, onOpenFacility, onOpenTrade }: BatchBoardProps) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [brandBatchId, setBrandBatchId] = useState<string | null>(null);
  const [releaseBatchId, setReleaseBatchId] = useState<string | null>(null);
  const batches = [...state.production.batches].sort((a, b) => b.startedDay - a.startedDay);
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const brandBatch = batches.find((batch) => batch.id === brandBatchId) ?? null;
  const releaseBatch = batches.find((batch) => batch.id === releaseBatchId) ?? null;
  const hasBottler = state.production.equipmentIds.includes('compact-bottler');

  function handle(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2800);
  }

  function buyBottles(batch: BatchState) {
    const requirement = getPackagingRequirement(batch.recipe.volumeLiters);
    const missing = Math.max(0, requirement.quantity - inventoryQuantity(state.supply.inventory, 'bottles'));
    const recommendation = recommendProcurement(state.supply.offers, requirement, missing);
    if (!recommendation) return handle({ ok: false, message: 'Сейчас нет доступных предложений бутылок.' });
    handle(onOrderSupply(recommendation.offer.id, recommendation.quantity));
  }

  return <div className="simple-hub batch-workflow-board">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`} role="status">{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
    {batches.length === 0
      ? <div className="plain-panel"><EmptyState icon="batch" title="Партий пока нет" text="Сначала собери план выпуска и выполни требования запуска." /></div>
      : <div className="batch-pipeline-list plain-panel">{batches.map((batch) => {
          const release = activeReleaseForBatch(state.brand, batch.id);
          return <button key={batch.id} onClick={() => setSelectedBatchId(batch.id)}>
            <span className={`batch-status-mark status-${batch.status}`}><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><small>{batch.status === 'packaged' ? 'бут.' : '%'}</small></span>
            <span className="batch-list-copy"><strong>{batch.recipe.name}</strong><small>{batch.code} · {statusLabel(batch.status)} · готовность день {batch.readyDay}</small></span>
            <span className="batch-mini-pipeline" aria-label="Этапы партии"><i className="done" /><i className={['conditioning','ready','tasted','packaged'].includes(batch.status) ? 'done' : 'active'} /><i className={['ready','tasted','packaged'].includes(batch.status) ? 'done' : ''} /><i className={batch.status === 'packaged' ? 'done' : batch.status === 'tasted' ? 'active' : ''} /><i className={release ? 'done' : batch.status === 'packaged' ? 'active' : ''} /></span>
            <b>{release ? release.name : batch.status === 'packaged' ? 'нужен релиз' : batch.status === 'ready' ? 'дегустация' : batch.status === 'tasted' ? 'розлив' : `день ${batch.readyDay}`}</b>
          </button>;
        })}</div>}

    {selectedBatch && <BatchModal
      state={state}
      batch={selectedBatch}
      hasBottler={hasBottler}
      onClose={() => setSelectedBatchId(null)}
      onTaste={() => handle(onTaste(selectedBatch.id))}
      onPackage={() => handle(onPackage(selectedBatch.id))}
      onDiscard={() => handle(onDiscard(selectedBatch.id))}
      onBuyBottles={() => buyBottles(selectedBatch)}
      onOpenFacility={() => { setSelectedBatchId(null); onOpenFacility(); }}
      onCreateBrand={() => setBrandBatchId(selectedBatch.id)}
      onCreateRelease={() => setReleaseBatchId(selectedBatch.id)}
      onOpenTrade={onOpenTrade}
    />}

    {brandBatch && <QuickBrandModal batch={brandBatch} onClose={() => setBrandBatchId(null)} onCreate={(draft) => { const result = onCreateBrand(draft); handle(result); if (result.ok) { setBrandBatchId(null); setReleaseBatchId(brandBatch.id); } }} />}
    {releaseBatch && <QuickReleaseModal state={state} batch={releaseBatch} onClose={() => setReleaseBatchId(null)} onCreate={(draft) => { const result = onCreateRelease(draft); handle(result); if (result.ok) { setReleaseBatchId(null); setSelectedBatchId(releaseBatch.id); } }} />}
  </div>;
}

function BatchModal({ state, batch, hasBottler, onClose, onTaste, onPackage, onDiscard, onBuyBottles, onOpenFacility, onCreateBrand, onCreateRelease, onOpenTrade }: {
  state: GameState;
  batch: BatchState;
  hasBottler: boolean;
  onClose: () => void;
  onTaste: () => void;
  onPackage: () => void;
  onDiscard: () => void;
  onBuyBottles: () => void;
  onOpenFacility: () => void;
  onCreateBrand: () => void;
  onCreateRelease: () => void;
  onOpenTrade: () => void;
}) {
  const quality = averageQuality(batch.quality);
  const daysLeft = Math.max(0, batch.readyDay - state.day);
  const isTerminal = ['packaged', 'discarded'].includes(batch.status);
  const bottlesNeeded = getPackagingRequirement(batch.recipe.volumeLiters).quantity;
  const bottleStock = inventoryQuantity(state.supply.inventory, 'bottles');
  const release = activeReleaseForBatch(state.brand, batch.id);
  const bottleOrders = state.supply.purchaseOrders.filter((order) => order.ingredientId === 'bottles' && ['pending', 'delayed'].includes(order.status));
  const bottlesInTransit = bottleOrders.reduce((sum, order) => sum + order.quantity, 0);
  const bottleExpectedDay = bottleOrders.reduce((latest, order) => Math.max(latest, order.expectedDay), 0);
  const bottleShortage = Math.max(0, bottlesNeeded - bottleStock);
  const bottleOrderCoversShortage = bottlesInTransit >= bottleShortage && bottleShortage > 0;
  const canPackage = hasBottler && bottleStock >= bottlesNeeded;

  let primaryAction: ReactNode = null;
  if (batch.status === 'ready') primaryAction = <button className="button primary" onClick={onTaste}><Icon name="lab" />Провести дегустацию</button>;
  if (batch.status === 'tasted' && !hasBottler) primaryAction = <button className="button primary" onClick={onOpenFacility}><Icon name="factory" />Установить линию розлива</button>;
  if (batch.status === 'tasted' && hasBottler && bottleStock < bottlesNeeded && bottleOrderCoversShortage) primaryAction = <button className="button primary" disabled><Icon name="clock" />Бутылки прибудут: день {bottleExpectedDay}</button>;
  if (batch.status === 'tasted' && hasBottler && bottleStock < bottlesNeeded && !bottleOrderCoversShortage) primaryAction = <button className="button primary" onClick={onBuyBottles}><Icon name="bottle" />Закупить бутылки</button>;
  if (batch.status === 'tasted' && canPackage) primaryAction = <button className="button primary" onClick={onPackage}><Icon name="bottle" />Разлить {bottlesNeeded} бутылок</button>;
  if (batch.status === 'packaged' && !release && state.brand.brands.length === 0) primaryAction = <button className="button primary" onClick={onCreateBrand}><Icon name="spark" />Создать бренд</button>;
  if (batch.status === 'packaged' && !release && state.brand.brands.length > 0) primaryAction = <button className="button primary" onClick={onCreateRelease}><Icon name="bottle" />Выпустить продукт</button>;
  if (release) primaryAction = <button className="button primary" onClick={onOpenTrade}><Icon name="market" />Отправить в продажу</button>;

  return <Modal
    title={batch.recipe.name}
    kicker={`${batch.code} · ${statusLabel(batch.status)}`}
    onClose={onClose}
    footer={<div className="modal-actions">{primaryAction}{!isTerminal && <button className="button danger" onClick={onDiscard}>Списать</button>}</div>}
  >
    <div className="batch-lifecycle"><LifecycleNode label="Сырьё" done /><LifecycleNode label="Производство" done={batch.progress >= 100} active={batch.progress < 100} /><LifecycleNode label="Дегустация" done={['tasted','packaged'].includes(batch.status)} active={batch.status === 'ready'} /><LifecycleNode label="Розлив" done={batch.status === 'packaged'} active={batch.status === 'tasted'} /><LifecycleNode label="Релиз" done={Boolean(release)} active={batch.status === 'packaged' && !release} /></div>

    <div className="batch-modal-hero">
      <div className={`large-batch-ring status-${batch.status}`}><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><span>{batch.status === 'packaged' ? 'бутылок' : '%'}</span></div>
      <div><span>{batch.recipe.family === 'beer' ? 'Пиво' : 'Сидр'} · версия {batch.recipe.version}</span><strong>{batch.recipe.volumeLiters} л</strong><small>{daysLeft > 0 ? `готовность через ${daysLeft} дн.` : `готовность: день ${batch.readyDay}`}</small></div>
    </div>

    <div className="detail-grid"><div><span>Старт</span><strong>день {batch.startedDay}</strong></div><div><span>Процесс</span><strong>{batch.recipe.processTemperature}°C</strong></div><div><span>Основной этап</span><strong>{batch.recipe.primaryDays} дн.</strong></div><div><span>Созревание</span><strong>{batch.recipe.conditioningDays} дн.</strong></div></div>

    {batch.status === 'tasted' && <section className={`bottling-readiness ${canPackage ? 'ready' : 'blocked'}`}><span><Icon name={canPackage ? 'check' : 'warning'} /></span><div><strong>{canPackage ? 'Розлив готов' : !hasBottler ? 'Нет линии розлива' : bottleOrderCoversShortage ? 'Бутылки уже заказаны' : 'Не хватает бутылок'}</strong><small>{hasBottler ? `${formatQuantity(bottleStock, 'unit')} на складе · ${formatQuantity(bottlesInTransit, 'unit')} в пути · ${formatQuantity(bottlesNeeded, 'unit')} требуется` : 'Установи компактную линию в объекте'}</small></div></section>}

    <section className="batch-materials"><div className="batch-materials-head"><span>Сырьё партии</span><strong>{batch.supplyQuality}/100</strong></div>{batch.rawMaterials.map((material) => <div key={`${material.lotId}-${material.ingredientId}`}><span><strong>{material.variantName}</strong><small>{material.origin}</small></span><span><b>{formatQuantity(material.quantity, material.unit)}</b><small>{material.totalCost.toFixed(2)}</small></span></div>)}{batch.rawMaterials.length === 0 && <p>Старая партия без детализации сырья.</p>}</section>

    {batch.tasting ? <section className="compact-report"><div><span>Профиль</span><strong>{quality}/100</strong></div><h4>{batch.tasting.headline}</h4><p>{batch.tasting.notes.join(' ')}</p><div className="tag-cloud">{batch.tasting.strengths.map((item) => <span className="positive" key={item}>+ {item}</span>)}{batch.tasting.weaknesses.map((item) => <span key={item}>{item}</span>)}</div><div className="market-hint"><Icon name="market" /><span>{batch.tasting.marketHint}</span></div></section> : <div className="sensor-list"><Sensor label="Техническая чистота" value={batch.quality.technicalPurity} /><Sensor label="Баланс" value={batch.quality.balance} /><Sensor label="Риск дефектов" value={batch.quality.defectRisk} danger /></div>}

    {release && <div className="compact-banner positive"><Icon name="check" /><span><strong>{release.name} выпущен</strong><small>{marketChannelLabel(release.targetChannel ?? inferTargetChannel(release.positioning))} · опт {release.wholesalePrice.toFixed(2)} · розница {release.retailPrice.toFixed(2)}</small></span></div>}
    {batch.status === 'packaged' && !release && <div className="compact-banner"><Icon name="bottle" /><span><strong>{batch.availableUnits} бутылок ждут оформления</strong><small>Выбери бренд, упаковку, цену и первый канал продаж.</small></span></div>}
    {batch.status === 'discarded' && <div className="compact-banner danger"><Icon name="warning" /><span><strong>Партия списана</strong><small>Производственные расходы не возвращаются.</small></span></div>}
  </Modal>;
}

function QuickBrandModal({ batch, onClose, onCreate }: { batch: BatchState; onClose: () => void; onCreate: (draft: BrandDraft) => void }) {
  const [draft, setDraft] = useState<BrandDraft>({ name: batch.recipe.name, tagline: 'Собственное производство', positioning: 'premium', story: `Первый бренд для партии ${batch.code}.` });
  return <Modal title="Создать бренд" kicker={`${batch.code} · перед выпуском продукта`} onClose={onClose} footer={<button className="button primary" onClick={() => onCreate(draft)}>Создать и продолжить</button>}><div className="modal-form"><label><span>Название бренда</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={32} /></label><label><span>Позиционирование</span><select value={draft.positioning} onChange={(event) => setDraft({ ...draft, positioning: event.target.value as BrandPositioning })}>{(['mass','local','premium','experimental','bar'] as BrandPositioning[]).map((value) => <option key={value} value={value}>{positioningLabel(value)}</option>)}</select></label><label><span>Короткая фраза</span><input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} maxLength={72} /></label></div></Modal>;
}

function QuickReleaseModal({ state, batch, onClose, onCreate }: { state: GameState; batch: BatchState; onClose: () => void; onCreate: (draft: ReleaseDraft) => void }) {
  const firstBrand = state.brand.brands[0];
  const [brandId, setBrandId] = useState(firstBrand?.id ?? '');
  const [name, setName] = useState(batch.recipe.name);
  const [positioning, setPositioning] = useState<BrandPositioning>(firstBrand?.positioning ?? 'premium');
  const [packaging, setPackaging] = useState<PackagingDesign>({ ...DEFAULT_PACKAGING });
  const [targetChannel, setTargetChannel] = useState<MarketChannel>('specialty');
  const [wholesalePrice, setWholesalePrice] = useState(3.2);
  const [retailPrice, setRetailPrice] = useState(6.4);
  return <Modal title="Выпустить продукт" kicker={`${batch.code} · ${batch.availableUnits} бутылок`} onClose={onClose} wide footer={<button className="button primary" disabled={!brandId} onClick={() => onCreate({ brandId, batchId: batch.id, name, positioning, packaging, wholesalePrice, retailPrice, targetChannel })}>Запустить релиз</button>}>
    <div className="release-workflow-form"><div className="modal-form"><label><span>Бренд</span><select value={brandId} onChange={(event) => setBrandId(event.target.value)}>{state.brand.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label><span>Название продукта</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Позиционирование</span><select value={positioning} onChange={(event) => setPositioning(event.target.value as BrandPositioning)}>{(['mass','local','premium','experimental','bar'] as BrandPositioning[]).map((value) => <option key={value} value={value}>{positioningLabel(value)}</option>)}</select></label><label><span>Первый канал продаж</span><select value={targetChannel} onChange={(event) => setTargetChannel(event.target.value as MarketChannel)}>{(['bar','store','specialty'] as MarketChannel[]).map((channel) => <option key={channel} value={channel}>{marketChannelLabel(channel)}</option>)}</select></label></div>
    <div className="package-editor"><SelectLine label="Форма" value={packaging.form} options={[["stubby","Короткая"],["longneck","Longneck"],["wine","Винная"]]} onChange={(value) => setPackaging({ ...packaging, form: value as PackagingDesign['form'] })} /><SelectLine label="Стекло" value={packaging.glass} options={[["black","Чёрное"],["smoke","Дымчатое"],["clear","Прозрачное"]]} onChange={(value) => setPackaging({ ...packaging, glass: value as PackagingDesign['glass'] })} /><SelectLine label="Этикетка" value={packaging.label} options={[["minimal","Минимализм"],["editorial","Редакционная"],["industrial","Индустриальная"],["heritage","Наследие"]]} onChange={(value) => setPackaging({ ...packaging, label: value as PackagingDesign['label'] })} /><SelectLine label="Объём" value={`${packaging.volumeMl}`} options={[["330","330 мл"],["500","500 мл"],["750","750 мл"]]} onChange={(value) => setPackaging({ ...packaging, volumeMl: Number(value) as PackagingDesign['volumeMl'] })} /></div></div>
    <div className="detail-grid"><label><span>Оптовая цена</span><input type="number" step="0.1" value={wholesalePrice} onChange={(event) => setWholesalePrice(Number(event.target.value))} /></label><label><span>Розничная цена</span><input type="number" step="0.1" value={retailPrice} onChange={(event) => setRetailPrice(Number(event.target.value))} /></label></div>
  </Modal>;
}

function LifecycleNode({ label, done = false, active = false }: { label: string; done?: boolean; active?: boolean }) { return <span className={done ? 'done' : active ? 'active' : ''}><i>{done ? <Icon name="check" /> : ''}</i><small>{label}</small></span>; }
function Sensor({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { const display = danger ? Math.max(0, 100 - value) : value; return <div className="sensor-row"><span>{label}</span><div><i className={danger ? 'danger' : ''} style={{ width: `${display}%` }} /></div><strong>{value}</strong></div>; }
function SelectLine({ label, value, options, onChange }: { label: string; value: string; options: [string,string][]; onChange: (value: string) => void }) { return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
