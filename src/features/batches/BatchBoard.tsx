import { useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import { averageQuality, statusLabel, type BatchState } from '../../domain/production';
import { Icon } from '../../ui/Icon';

interface BatchBoardProps {
  state: GameState;
  onTaste: (batchId: string) => ActionResult;
  onPackage: (batchId: string) => ActionResult;
  onDiscard: (batchId: string) => ActionResult;
  onOpenProduction: () => void;
}

export function BatchBoard({ state, onTaste, onPackage, onDiscard, onOpenProduction }: BatchBoardProps) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const batches = state.production.batches;

  function handle(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3600);
  }

  if (batches.length === 0) {
    return (
      <section className="empty-workspace glass-card">
        <div className="empty-illustration"><Icon name="tank" /><span /></div>
        <span className="section-kicker">партии</span>
        <h2>Танки пока пусты</h2>
        <p>Создай рецепт и запусти первую партию. После запуска здесь появятся стадии, сроки, риски и дегустация.</p>
        <button className="button primary" onClick={onOpenProduction}>Перейти в производство <Icon name="arrow" /></button>
      </section>
    );
  }

  return (
    <div className="batch-board">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
      <section className="section-title-row">
        <div><span className="section-kicker">production queue</span><h2>Партии и решения</h2></div>
        <button className="button ghost compact-button" onClick={onOpenProduction}>Новая партия <Icon name="arrow" /></button>
      </section>

      <div className="batch-list">
        {batches.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            currentDay={state.day}
            hasBottler={state.production.equipmentIds.includes('compact-bottler')}
            onTaste={() => handle(onTaste(batch.id))}
            onPackage={() => handle(onPackage(batch.id))}
            onDiscard={() => handle(onDiscard(batch.id))}
          />
        ))}
      </div>
    </div>
  );
}

function BatchCard({ batch, currentDay, hasBottler, onTaste, onPackage, onDiscard }: { batch: BatchState; currentDay: number; hasBottler: boolean; onTaste: () => void; onPackage: () => void; onDiscard: () => void }) {
  const quality = averageQuality(batch.quality);
  const daysLeft = Math.max(0, batch.readyDay - currentDay);
  const isTerminal = ['packaged', 'discarded'].includes(batch.status);

  return (
    <article className={`batch-card glass-card status-${batch.status}`}>
      <div className="batch-main">
        <div className="batch-progress" style={{ '--batch-progress': `${batch.progress * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{batch.status === 'packaged' ? batch.availableUnits : batch.progress}</strong><span>{batch.status === 'packaged' ? 'бут.' : '%'}</span></div>
        </div>
        <div className="batch-copy">
          <div className="batch-labels"><span className="status-chip">{statusLabel(batch.status)}</span><b>{batch.code}</b></div>
          <h3>{batch.recipe.name}</h3>
          <p>{batch.recipe.family === 'beer' ? 'Пиво' : 'Сидр'} · {batch.recipe.volumeLiters} л · версия {batch.recipe.version}</p>
          <div className="batch-timeline">
            <div className="active"><i /><span>Старт<small>день {batch.startedDay}</small></span></div>
            <div className={batch.status !== 'fermenting' ? 'active' : ''}><i /><span>Созревание<small>{batch.recipe.conditioningDays} дн.</small></span></div>
            <div className={['ready', 'tasted', 'packaged'].includes(batch.status) ? 'active' : ''}><i /><span>Готовность<small>{daysLeft > 0 ? `через ${daysLeft}` : `день ${batch.readyDay}`}</small></span></div>
          </div>
        </div>
      </div>

      {batch.tasting ? (
        <div className="tasting-report">
          <div className="report-score"><strong>{quality}</strong><span>профиль</span></div>
          <div className="report-content">
            <span className="section-kicker">дегустация · уверенность {batch.tasting.confidence}%</span>
            <h4>{batch.tasting.headline}</h4>
            <p>{batch.tasting.notes[0]}</p>
            <div className="taste-tags positive-tags">{batch.tasting.strengths.map((item) => <span key={item}>+ {item}</span>)}</div>
            <div className="taste-tags warning-tags">{batch.tasting.weaknesses.map((item) => <span key={item}>{item}</span>)}</div>
            <div className="market-hint"><Icon name="market" /><span>{batch.tasting.marketHint}</span></div>
          </div>
        </div>
      ) : (
        <div className="batch-sensors">
          <Sensor label="Температура" value={`${batch.recipe.processTemperature}°C`} level={Math.min(100, batch.progress + 10)} />
          <Sensor label="Ход процесса" value={`${batch.progress}%`} level={batch.progress} />
          <Sensor label="Наблюдение" value={observationLabel(batch)} level={observationLevel(batch)} danger={batch.quality.defectRisk >= 38} />
        </div>
      )}

      {!isTerminal && (
        <div className="batch-actions">
          {batch.status === 'ready' && <button className="button primary" onClick={onTaste}><Icon name="lab" /> Провести дегустацию</button>}
          {batch.status === 'tasted' && <button className="button primary" onClick={onPackage} disabled={!hasBottler}><Icon name="bottle" /> {hasBottler ? 'Разлить партию' : 'Нужна линия розлива'}</button>}
          <button className="button danger subtle" onClick={onDiscard}>Списать</button>
        </div>
      )}
      {batch.status === 'packaged' && <div className="packaged-banner"><Icon name="check" /><span><strong>{batch.availableUnits} из {batch.packagedUnits} бутылок на складе</strong><small>Остаток уменьшается после образцов и подтверждённых поставок.</small></span></div>}
      {batch.status === 'discarded' && <div className="discarded-banner">Партия списана. Производственные затраты не возвращаются.</div>}
    </article>
  );
}

function observationLabel(batch: BatchState): string {
  if (batch.progress < 18) return 'данных мало';
  if (batch.quality.defectRisk >= 48) return 'нестабильно';
  if (batch.quality.defectRisk >= 30) return 'нужен контроль';
  return 'ровный процесс';
}

function observationLevel(batch: BatchState): number {
  if (batch.progress < 18) return 22;
  return Math.max(20, Math.min(100, 100 - batch.quality.defectRisk));
}

function Sensor({ label, value, level, danger = false }: { label: string; value: string; level: number; danger?: boolean }) {
  return (
    <div className="sensor-item">
      <div><span>{label}</span><strong>{value}</strong></div>
      <div className={`sensor-track ${danger ? 'danger' : ''}`}><i style={{ width: `${level}%` }} /></div>
    </div>
  );
}
