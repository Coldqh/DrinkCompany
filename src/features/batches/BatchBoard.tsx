import { useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import { averageQuality, statusLabel, type BatchState } from '../../domain/production';
import { getPackagingRequirement, inventoryQuantity, formatQuantity } from '../../domain/supply';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal } from '../../ui/MobileUI';

interface BatchBoardProps {
  state: GameState;
  onTaste: (batchId: string) => ActionResult;
  onPackage: (batchId: string) => ActionResult;
  onDiscard: (batchId: string) => ActionResult;
  onOpenProduction: () => void;
}

export function BatchBoard({ state, onTaste, onPackage, onDiscard, onOpenProduction }: BatchBoardProps) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchState | null>(null);
  const batches = [...state.production.batches].sort((a, b) => b.startedDay - a.startedDay);
  const hasBottler = state.production.equipmentIds.includes('compact-bottler');

  function handle(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2600);
    if (result.ok) setSelectedBatch(null);
  }

  return <div className="simple-hub">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
    {batches.length === 0 ? <div className="plain-panel"><EmptyState icon="batch" title="Партий пока нет" text="Создай рецепт и запусти производство." action={<button className="button primary" onClick={onOpenProduction}>Новая партия</button>} /></div> : <div className="simple-list plain-panel">
      {batches.map((batch) => <button key={batch.id} onClick={() => setSelectedBatch(batch)}>
        <span className="batch-status-mark"><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><small>{batch.status === 'packaged' ? 'бут.' : '%'}</small></span>
        <span><strong>{batch.recipe.name}</strong><small>{batch.code} · {statusLabel(batch.status)} · {batch.recipe.volumeLiters} л</small></span>
        <b>{batch.tasting ? `${averageQuality(batch.quality)}` : batch.status === 'ready' ? 'готово' : `день ${batch.readyDay}`}</b>
      </button>)}
    </div>}
    {selectedBatch && <BatchModal batch={selectedBatch} currentDay={state.day} hasBottler={hasBottler} bottleStock={inventoryQuantity(state.supply.inventory, 'bottles')} onClose={() => setSelectedBatch(null)} onTaste={() => handle(onTaste(selectedBatch.id))} onPackage={() => handle(onPackage(selectedBatch.id))} onDiscard={() => handle(onDiscard(selectedBatch.id))} />}
  </div>;
}
function BatchModal({ batch, currentDay, hasBottler, bottleStock, onClose, onTaste, onPackage, onDiscard }: { batch: BatchState; currentDay: number; hasBottler: boolean; bottleStock: number; onClose: () => void; onTaste: () => void; onPackage: () => void; onDiscard: () => void }) {
  const quality = averageQuality(batch.quality);
  const daysLeft = Math.max(0, batch.readyDay - currentDay);
  const isTerminal = ['packaged', 'discarded'].includes(batch.status);
  const bottlesNeeded = getPackagingRequirement(batch.recipe.volumeLiters).quantity;
  const canPackage = hasBottler && bottleStock >= bottlesNeeded;

  return (
    <Modal
      title={batch.recipe.name}
      kicker={`${batch.code} · ${statusLabel(batch.status)}`}
      onClose={onClose}
      footer={!isTerminal ? <div className="modal-actions">
        {batch.status === 'ready' && <button className="button primary" onClick={onTaste}><Icon name="lab" />Дегустация</button>}
        {batch.status === 'tasted' && <button className="button primary" onClick={onPackage} disabled={!canPackage}><Icon name="bottle" />{!hasBottler ? 'Нужен розлив' : bottleStock < bottlesNeeded ? 'Нет бутылок' : 'Разлить'}</button>}
        <button className="button danger" onClick={onDiscard}>Списать</button>
      </div> : undefined}
    >
      <div className="batch-modal-hero">
        <div className={`large-batch-ring status-${batch.status}`}><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><span>{batch.status === 'packaged' ? 'бутылок' : '%'}</span></div>
        <div><span>{batch.recipe.family === 'beer' ? 'Пиво' : 'Сидр'} · версия {batch.recipe.version}</span><strong>{batch.recipe.volumeLiters} л</strong><small>{daysLeft > 0 ? `готовность через ${daysLeft} дн.` : `готовность: день ${batch.readyDay}`}</small></div>
      </div>

      <div className="detail-grid">
        <div><span>Старт</span><strong>день {batch.startedDay}</strong></div>
        <div><span>Процесс</span><strong>{batch.recipe.processTemperature}°C</strong></div>
        <div><span>Основной этап</span><strong>{batch.recipe.primaryDays} дн.</strong></div>
        <div><span>Созревание</span><strong>{batch.recipe.conditioningDays} дн.</strong></div>
      </div>


      <section className="batch-materials">
        <div className="batch-materials-head"><span>Сырьё партии</span><strong>{batch.supplyQuality}/100</strong></div>
        {batch.rawMaterials.map((material) => <div key={`${material.lotId}-${material.ingredientId}`}><span><strong>{material.variantName}</strong><small>{material.origin}</small></span><span><b>{formatQuantity(material.quantity, material.unit)}</b><small>{material.totalCost.toFixed(2)}</small></span></div>)}
        {batch.rawMaterials.length === 0 && <p>Старая партия без детализации сырья.</p>}
      </section>

      {batch.tasting ? (
        <section className="compact-report">
          <div><span>Профиль</span><strong>{quality}/100</strong></div>
          <h4>{batch.tasting.headline}</h4>
          <p>{batch.tasting.notes.join(' ')}</p>
          <div className="tag-cloud">{batch.tasting.strengths.map((item) => <span className="positive" key={item}>+ {item}</span>)}{batch.tasting.weaknesses.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="market-hint"><Icon name="market" /><span>{batch.tasting.marketHint}</span></div>
        </section>
      ) : (
        <div className="sensor-list">
          <Sensor label="Техническая чистота" value={batch.quality.technicalPurity} />
          <Sensor label="Баланс" value={batch.quality.balance} />
          <Sensor label="Риск дефектов" value={batch.quality.defectRisk} danger />
        </div>
      )}

      {batch.status === 'packaged' && <div className="compact-banner positive"><Icon name="check" /><span><strong>{batch.availableUnits} бутылок доступны</strong><small>{batch.packagedUnits - batch.availableUnits} уже использовано или продано.</small></span></div>}
      {batch.status === 'discarded' && <div className="compact-banner danger"><Icon name="warning" /><span><strong>Партия списана</strong><small>Производственные расходы не возвращаются.</small></span></div>}
    </Modal>
  );
}

function Sensor({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  const display = danger ? Math.max(0, 100 - value) : value;
  return <div className="sensor-row"><span>{label}</span><div><i className={danger ? 'danger' : ''} style={{ width: `${display}%` }} /></div><strong>{value}</strong></div>;
}
