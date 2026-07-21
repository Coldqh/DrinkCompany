import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import { averageQuality, statusLabel, type BatchState } from '../../domain/production';
import { Icon } from '../../ui/Icon';
import { CompactHeader, EmptyState, Modal, SubTabs } from '../../ui/MobileUI';

interface BatchBoardProps {
  state: GameState;
  onTaste: (batchId: string) => ActionResult;
  onPackage: (batchId: string) => ActionResult;
  onDiscard: (batchId: string) => ActionResult;
  onOpenProduction: () => void;
}

type BatchSection = 'active' | 'ready' | 'history';

export function BatchBoard({ state, onTaste, onPackage, onDiscard, onOpenProduction }: BatchBoardProps) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [section, setSection] = useState<BatchSection>('active');
  const [selectedBatch, setSelectedBatch] = useState<BatchState | null>(null);
  const batches = state.production.batches;
  const hasBottler = state.production.equipmentIds.includes('compact-bottler');

  const filtered = useMemo(() => batches.filter((batch) => {
    if (section === 'active') return ['fermenting', 'conditioning'].includes(batch.status);
    if (section === 'ready') return ['ready', 'tasted'].includes(batch.status);
    return ['packaged', 'discarded'].includes(batch.status);
  }), [batches, section]);

  const counts = {
    active: batches.filter((batch) => ['fermenting', 'conditioning'].includes(batch.status)).length,
    ready: batches.filter((batch) => ['ready', 'tasted'].includes(batch.status)).length,
    history: batches.filter((batch) => ['packaged', 'discarded'].includes(batch.status)).length,
  };

  function handle(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3200);
    if (result.ok) setSelectedBatch(null);
  }

  return (
    <div className="screen-stack batch-compact">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <CompactHeader
        kicker="Партии"
        title="Производственная очередь"
        meta={`${counts.active} в работе · ${counts.ready} ждут решения · ${counts.history} завершено`}
        action={<button className="round-action" onClick={onOpenProduction}><Icon name="factory" /></button>}
      />

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'active', label: 'В работе', badge: counts.active },
        { id: 'ready', label: 'Решения', badge: counts.ready },
        { id: 'history', label: 'История', badge: counts.history },
      ]} />

      {filtered.length === 0 ? (
        <section className="glass-card"><EmptyState icon="batch" title={section === 'active' ? 'Нет активных партий' : section === 'ready' ? 'Нечего дегустировать' : 'История пока пустая'} text={section === 'active' ? 'Создай рецепт и запусти новую партию.' : 'Нужные партии появятся здесь автоматически.'} action={section === 'active' ? <button className="button primary" onClick={onOpenProduction}>Новая партия</button> : undefined} /></section>
      ) : (
        <section className="compact-list glass-card">
          {filtered.map((batch) => (
            <button key={batch.id} className="batch-row compact-list-row" onClick={() => setSelectedBatch(batch)}>
              <div className={`batch-ring status-${batch.status}`}><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><small>{batch.status === 'packaged' ? 'бут.' : '%'}</small></div>
              <span><strong>{batch.recipe.name}</strong><small>{batch.code} · {statusLabel(batch.status)} · {batch.recipe.volumeLiters} л</small></span>
              <span className="batch-row-meta">{batch.tasting ? `${averageQuality(batch.quality)}/100` : batch.status === 'ready' ? 'готово' : `день ${batch.readyDay}`}</span>
            </button>
          ))}
        </section>
      )}

      {selectedBatch && (
        <BatchModal
          batch={selectedBatch}
          currentDay={state.day}
          hasBottler={hasBottler}
          onClose={() => setSelectedBatch(null)}
          onTaste={() => handle(onTaste(selectedBatch.id))}
          onPackage={() => handle(onPackage(selectedBatch.id))}
          onDiscard={() => handle(onDiscard(selectedBatch.id))}
        />
      )}
    </div>
  );
}

function BatchModal({ batch, currentDay, hasBottler, onClose, onTaste, onPackage, onDiscard }: { batch: BatchState; currentDay: number; hasBottler: boolean; onClose: () => void; onTaste: () => void; onPackage: () => void; onDiscard: () => void }) {
  const quality = averageQuality(batch.quality);
  const daysLeft = Math.max(0, batch.readyDay - currentDay);
  const isTerminal = ['packaged', 'discarded'].includes(batch.status);

  return (
    <Modal
      title={batch.recipe.name}
      kicker={`${batch.code} · ${statusLabel(batch.status)}`}
      onClose={onClose}
      footer={!isTerminal ? <div className="modal-actions">
        {batch.status === 'ready' && <button className="button primary" onClick={onTaste}><Icon name="lab" />Дегустация</button>}
        {batch.status === 'tasted' && <button className="button primary" onClick={onPackage} disabled={!hasBottler}><Icon name="bottle" />{hasBottler ? 'Разлить' : 'Нужен розлив'}</button>}
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
