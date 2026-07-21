import { properties, regions } from '../../data/catalog';
import { equipmentCatalog } from '../../data/productionCatalog';
import type { GameState } from '../../domain/game';
import { averageQuality, statusLabel } from '../../domain/production';
import { Icon } from '../../ui/Icon';

interface CompanyDashboardProps {
  state: GameState;
  onOpenProduction: () => void;
  onOpenBatches: () => void;
  onDismissTutorial: () => void;
}

const tutorialSteps = [
  { id: 'equipment', title: 'Собрать линию', text: 'Купить профильное оборудование и ферментеры.' },
  { id: 'recipe', title: 'Создать рецепт', text: 'Настроить вкус, температуру и длительность.' },
  { id: 'batch', title: 'Запустить партию', text: 'Закупить сырьё и начать производство.' },
  { id: 'tasting', title: 'Провести дегустацию', text: 'Получить реальные сильные и слабые стороны.' },
  { id: 'packaging', title: 'Разлить продукт', text: 'Подготовить бутылки к переговорам с рынком.' },
];

export function CompanyDashboard({ state, onOpenProduction, onOpenBatches, onDismissTutorial }: CompanyDashboardProps) {
  const property = properties.find((item) => item.id === state.world?.propertyId);
  const region = regions.find((item) => item.id === state.world?.regionId);
  const activeBatch = state.production.batches.find((batch) => !['packaged', 'discarded'].includes(batch.status));
  const readyCount = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status)).length;
  const installedValue = equipmentCatalog
    .filter((item) => state.production.equipmentIds.includes(item.id))
    .reduce((sum, item) => sum + item.cost, 0);
  const tutorialDone = tutorialSteps.filter((step) => state.tutorial.completedSteps.includes(step.id)).length;
  const latestPulse = state.world?.pulse[0];

  return (
    <div className="dashboard-grid">
      <section className="command-card glass-card">
        <div className="command-copy">
          <span className="section-kicker">операционный центр</span>
          <h2>{activeBatch ? `${activeBatch.code} в работе` : 'Производство ждёт первого запуска'}</h2>
          <p>
            {activeBatch
              ? `${statusLabel(activeBatch.status)} · ${activeBatch.progress}% · готовность на ${activeBatch.readyDay}-й день.`
              : 'Собери линию, создай рецепт и запусти первую коммерческую партию.'}
          </p>
          <div className="command-actions">
            <button className="button primary glow" onClick={onOpenProduction}>
              <Icon name="factory" />
              {activeBatch ? 'Открыть производство' : 'Собрать линию'}
            </button>
            {state.production.batches.length > 0 && (
              <button className="button ghost" onClick={onOpenBatches}>
                Партии <Icon name="arrow" />
              </button>
            )}
          </div>
        </div>
        <div className="brew-machine" aria-hidden="true">
          <div className="machine-halo" />
          <div className="machine-top" />
          <div className="machine-body">
            <div className="liquid-level" style={{ height: `${activeBatch ? Math.max(22, activeBatch.progress) : 18}%` }} />
            <div className="machine-scale"><span /><span /><span /><span /></div>
          </div>
          <div className="machine-legs"><span /><span /></div>
          <div className="machine-status"><i /> {activeBatch ? statusLabel(activeBatch.status) : 'standby'}</div>
        </div>
      </section>

      <section className="metric-strip">
        <Metric icon="wallet" label="Свободные деньги" value={formatMoney(state.finance.cash)} meta={`−${formatMoney(state.finance.dailyFixedCost)} / день`} />
        <Metric icon="factory" label="Оборудование" value={formatMoney(installedValue)} meta={`${state.production.equipmentIds.length} модулей`} />
        <Metric icon="batch" label="Готово к решению" value={String(readyCount)} meta={`${state.production.batches.length} партий всего`} />
        <Metric icon="spark" label="Репутация" value={`${state.company.reputation}/100`} meta={`${state.company.completedBatches} релизов`} />
      </section>

      {!state.tutorial.dismissed && (
        <section className="mission-card glass-card">
          <div className="mission-header">
            <div>
              <span className="section-kicker">первый производственный цикл</span>
              <h3>{tutorialDone} из {tutorialSteps.length} этапов</h3>
            </div>
            <button className="icon-button" onClick={onDismissTutorial} aria-label="Скрыть обучение"><Icon name="close" /></button>
          </div>
          <div className="mission-progress"><span style={{ width: `${(tutorialDone / tutorialSteps.length) * 100}%` }} /></div>
          <div className="mission-list">
            {tutorialSteps.map((step, index) => {
              const done = state.tutorial.completedSteps.includes(step.id);
              const current = !done && tutorialSteps.slice(0, index).every((previous) => state.tutorial.completedSteps.includes(previous.id));
              return (
                <div key={step.id} className={`mission-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                  <div className="step-node">{done ? <Icon name="check" /> : index + 1}</div>
                  <div><strong>{step.title}</strong><span>{step.text}</span></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="facility-card glass-card">
        <div className="card-heading">
          <div><span className="section-kicker">производственная база</span><h3>{property?.name}</h3></div>
          <span className="status-chip neutral">{region?.name}</span>
        </div>
        <div className="facility-map">
          <div className="facility-room main-room"><Icon name="factory" /><span>Основной цех</span></div>
          <div className="facility-room"><Icon name="tank" /><span>Ферментация</span></div>
          <div className="facility-room"><Icon name="archive" /><span>Хранение</span></div>
          <div className="facility-room empty"><span>+</span><small>место для роста</small></div>
        </div>
        <div className="facility-stats">
          <span>Мощность <b>{property?.capacity}/5</b></span>
          <span>Хранение <b>{property?.storageQuality}/5</b></span>
          <span>Доступ к рынку <b>{property?.marketAccess}/5</b></span>
        </div>
      </section>

      <section className="pulse-card glass-card">
        <div className="card-heading"><div><span className="section-kicker">мир живёт</span><h3>Рыночный импульс</h3></div><Icon name="market" className="heading-icon" /></div>
        {latestPulse && (
          <div className={`pulse-feature ${latestPulse.tone}`}>
            <span>День {latestPulse.day}</span>
            <strong>{latestPulse.title}</strong>
            <p>{latestPulse.detail}</p>
          </div>
        )}
        <div className="company-ticker">
          {state.world?.companies.slice(0, 4).map((company) => (
            <div key={company.id}>
              <span className={`momentum-dot ${company.status}`} />
              <div><strong>{company.name}</strong><small>{company.activeRelease}</small></div>
              <b>{company.momentum}</b>
            </div>
          ))}
        </div>
      </section>

      {activeBatch?.tasting && (
        <section className="tasting-highlight glass-card">
          <div className="score-orbit"><strong>{averageQuality(activeBatch.quality)}</strong><span>профиль</span></div>
          <div><span className="section-kicker">последняя дегустация</span><h3>{activeBatch.tasting.headline}</h3><p>{activeBatch.tasting.marketHint}</p></div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon, label, value, meta }: { icon: 'wallet' | 'factory' | 'batch' | 'spark'; label: string; value: string; meta: string }) {
  return (
    <article className="metric-card glass-card">
      <div className="metric-icon"><Icon name={icon} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </article>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
