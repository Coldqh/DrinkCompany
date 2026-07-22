import { useState } from 'react';
import { properties, regions } from '../../data/catalog';
import { equipmentCatalog } from '../../data/productionCatalog';
import type { GameState } from '../../domain/game';
import { statusLabel } from '../../domain/production';
import { Icon } from '../../ui/Icon';
import { CompactHeader, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

interface CompanyDashboardProps {
  state: GameState;
  onOpenProduction: () => void;
  onOpenBatches: () => void;
  onOpenMarket: () => void;
  onOpenTeam: () => void;
  onDismissTutorial: () => void;
}

type DashboardSection = 'today' | 'base' | 'guide';
type DetailModal = 'finance' | 'facility' | 'market' | null;

const tutorialSteps = [
  { id: 'equipment', title: 'Собрать линию', text: 'Купить профильное оборудование и ферментеры.' },
  { id: 'supply', title: 'Закупить сырьё', text: 'Выбрать поставщиков и дождаться поставки на склад.' },
  { id: 'recipe', title: 'Создать рецепт', text: 'Настроить вкус, температуру и длительность.' },
  { id: 'batch', title: 'Запустить партию', text: 'Закупить сырьё и начать производство.' },
  { id: 'tasting', title: 'Провести дегустацию', text: 'Получить реальные сильные и слабые стороны.' },
  { id: 'packaging', title: 'Разлить продукт', text: 'Подготовить бутылки к переговорам с рынком.' },
  { id: 'market-contact', title: 'Найти покупателя', text: 'Отправить образец или встретиться с закупщиком.' },
  { id: 'first-sale', title: 'Закрыть поставку', text: 'Принять оффер и получить первую выручку.' },
];

export function CompanyDashboard({ state, onOpenProduction, onOpenBatches, onOpenMarket, onOpenTeam, onDismissTutorial }: CompanyDashboardProps) {
  const [section, setSection] = useState<DashboardSection>('today');
  const [detail, setDetail] = useState<DetailModal>(null);
  const property = properties.find((item) => item.id === state.world?.propertyId);
  const region = regions.find((item) => item.id === state.world?.regionId);
  const activeBatch = state.production.batches.find((batch) => !['packaged', 'discarded'].includes(batch.status));
  const readyCount = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status)).length;
  const stockUnits = state.production.batches.filter((batch) => batch.status === 'packaged').reduce((sum, batch) => sum + batch.availableUnits, 0);
  const installedValue = equipmentCatalog.filter((item) => state.production.equipmentIds.includes(item.id)).reduce((sum, item) => sum + item.cost, 0);
  const tutorialDone = tutorialSteps.filter((step) => state.tutorial.completedSteps.includes(step.id)).length;
  const currentStep = tutorialSteps.find((step) => !state.tutorial.completedSteps.includes(step.id));
  const latestPulse = state.world?.pulse[0];
  const activeOffers = state.world?.proposals.filter((proposal) => proposal.status === 'offer').length ?? 0;

  return (
    <div className="screen-stack dashboard-compact">
      <CompactHeader
        kicker="Операционный центр"
        title={activeBatch ? `${activeBatch.code} · ${statusLabel(activeBatch.status)}` : 'Компания готова к запуску'}
        meta={activeBatch ? `${activeBatch.progress}% · готовность на ${activeBatch.readyDay}-й день` : 'Выбери следующий шаг и развивай производство без лишней суеты.'}
        action={<button className="round-action" onClick={activeBatch ? onOpenBatches : onOpenProduction}><Icon name={activeBatch ? 'batch' : 'factory'} /></button>}
      />

      <section className="mini-stat-grid">
        <button onClick={() => setDetail('finance')}><MiniStat label="Баланс" value={formatMoney(state.finance.cash)} note={`−${formatMoney(state.finance.dailyFixedCost)}/день`} tone="warm" /></button>
        <button onClick={() => setDetail('facility')}><MiniStat label="Объект" value={`ур. ${state.facility?.tier ?? 1}`} note={`${Math.round(state.facility?.sanitation ?? 0)}% чистота`} tone="warm" /></button>
        <button onClick={onOpenBatches}><MiniStat label="Склад" value={`${stockUnits}`} note={`${readyCount} ждут решения`} tone="warm" /></button>
        <button onClick={() => setDetail('market')}><MiniStat label="Выручка" value={formatMoney(state.finance.salesRevenue)} note={`${state.finance.unitsSold} продано`} /></button>
      </section>

      <SubTabs
        value={section}
        onChange={setSection}
        label="Разделы компании"
        options={[
          { id: 'today', label: 'Сегодня', badge: activeOffers },
          { id: 'base', label: 'База' },
          { id: 'guide', label: 'Путь', badge: currentStep ? 1 : 0 },
        ]}
      />

      {section === 'today' && (
        <section className="focus-card glass-card">
          <div className="focus-card-head">
            <div className={`focus-orb ${activeBatch ? 'working' : 'idle'}`}><Icon name={activeBatch ? 'tank' : 'factory'} /></div>
            <div>
              <span>{activeBatch ? 'Сейчас в работе' : 'Главная задача'}</span>
              <h3>{activeBatch ? activeBatch.recipe.name : 'Запустить первую партию'}</h3>
              <p>{activeBatch ? `${activeBatch.recipe.volumeLiters} л · ${statusLabel(activeBatch.status)} · ${activeBatch.progress}%` : 'Собери минимальную линию и создай рецепт пива или сидра.'}</p>
            </div>
          </div>
          {activeBatch && <div className="compact-progress"><i style={{ width: `${activeBatch.progress}%` }} /></div>}
          <div className="focus-actions">
            <button className="button primary" onClick={activeBatch ? onOpenBatches : onOpenProduction}>{activeBatch ? 'Открыть партию' : 'Перейти в цех'}<Icon name="arrow" /></button>
            {stockUnits > 0 && <button className="button ghost" onClick={onOpenMarket}>Найти покупателя</button>}
          </div>
        </section>
      )}

      {section === 'base' && (
        <section className="compact-list glass-card">
          <button className="compact-list-row" onClick={() => setDetail('facility')}>
            <span className="row-icon"><Icon name="factory" /></span>
            <span><strong>{property?.name ?? 'Производственная база'}</strong><small>{region?.name ?? 'Регион'} · вместимость {property?.capacity ?? 0}</small></span>
            <Icon name="arrow" />
          </button>
          <button className="compact-list-row" onClick={onOpenProduction}>
            <span className="row-icon"><Icon name="kettle" /></span>
            <span><strong>Оборудование</strong><small>{state.production.equipmentIds.length} модулей установлено</small></span>
            <Icon name="arrow" />
          </button>
          <button className="compact-list-row" onClick={onOpenMarket}>
            <span className="row-icon"><Icon name="market" /></span>
            <span><strong>Рыночная сеть</strong><small>{state.world?.outlets.length ?? 0} точек · {activeOffers} офферов</small></span>
            <Icon name="arrow" />
          </button>
          <button className="compact-list-row" onClick={onOpenTeam}>
            <span className="row-icon"><Icon name="team" /></span>
            <span><strong>Команда</strong><small>{state.team.employees.length} сотрудников · {state.team.candidates.length} кандидатов</small></span>
            <Icon name="arrow" />
          </button>
          {latestPulse && (
            <div className="compact-signal">
              <span>День {latestPulse.day}</span>
              <strong>{latestPulse.title}</strong>
              <p>{latestPulse.detail}</p>
            </div>
          )}
        </section>
      )}

      {section === 'guide' && (
        <section className="guide-card glass-card">
          <div className="guide-head">
            <div><span>Первый цикл</span><strong>{tutorialDone}/{tutorialSteps.length}</strong></div>
            <button className="icon-button" onClick={onDismissTutorial} aria-label="Скрыть обучение"><Icon name="close" /></button>
          </div>
          <div className="compact-progress"><i style={{ width: `${(tutorialDone / tutorialSteps.length) * 100}%` }} /></div>
          {currentStep ? (
            <div className="next-step">
              <span className="step-number">{tutorialDone + 1}</span>
              <div><small>Следующий шаг</small><strong>{currentStep.title}</strong><p>{currentStep.text}</p></div>
            </div>
          ) : <div className="guide-complete"><Icon name="check" /><strong>Первый цикл завершён</strong></div>}
          <button className="button secondary" onClick={() => setDetail('market')}>Показать весь путь</button>
        </section>
      )}

      {detail === 'finance' && (
        <Modal title="Финансы компании" kicker="Сводка" onClose={() => setDetail(null)}>
          <div className="detail-grid">
            <Detail label="Свободные деньги" value={formatMoney(state.finance.cash)} />
            <Detail label="Ежедневные расходы" value={formatMoney(state.finance.dailyFixedCost)} />
            <Detail label="Оборудование" value={formatMoney(state.finance.equipmentSpend)} />
            <Detail label="Производство" value={formatMoney(state.finance.productionSpend)} />
            <Detail label="Расширение" value={formatMoney(state.finance.facilitySpend)} />
            <Detail label="Обслуживание" value={formatMoney(state.finance.maintenanceSpend)} />
            <Detail label="Команда" value={formatMoney(state.finance.teamSpend)} />
            <Detail label="Выручка" value={formatMoney(state.finance.salesRevenue)} />
            <Detail label="Товарный запас" value={formatMoney(state.finance.packagedInventoryValue)} />
          </div>
        </Modal>
      )}

      {detail === 'facility' && (
        <Modal title={property?.name ?? 'Производственная база'} kicker={region?.name ?? 'Регион'} onClose={() => setDetail(null)} footer={<button className="button primary" onClick={() => { setDetail(null); onOpenProduction(); }}>Открыть цех</button>}>
          <div className="detail-grid">
            <Detail label="Активные линии" value={`${state.facility?.rooms.fermentation ?? property?.capacity ?? 0}`} />
            <Detail label="Расходы в день" value={formatMoney(state.finance.dailyFixedCost)} />
            <Detail label="Установлено" value={`${state.production.equipmentIds.length} модулей`} />
            <Detail label="Стоимость линии" value={formatMoney(installedValue)} />
            <Detail label="Площадь" value={`${state.facility?.areaSquareMeters ?? 0} м²`} />
            <Detail label="Чистота" value={`${Math.round(state.facility?.sanitation ?? 0)}/100`} />
          </div>
          <div className="modal-list">
            {equipmentCatalog.map((item) => <div key={item.id}><span>{item.name}</span><b>{state.production.equipmentIds.includes(item.id) ? 'установлено' : 'не куплено'}</b></div>)}
          </div>
        </Modal>
      )}

      {detail === 'market' && (
        <Modal title="Путь компании" kicker="Развитие" onClose={() => setDetail(null)} footer={<button className="button primary" onClick={() => { setDetail(null); onOpenMarket(); }}>Открыть рынок</button>}>
          <div className="modal-list steps-list">
            {tutorialSteps.map((step, index) => {
              const done = state.tutorial.completedSteps.includes(step.id);
              return <div key={step.id} className={done ? 'done' : ''}><i>{done ? <Icon name="check" /> : index + 1}</i><span><strong>{step.title}</strong><small>{step.text}</small></span></div>;
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
