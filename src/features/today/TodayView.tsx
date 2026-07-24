import type { GameState } from '../../domain/game';
import { statusLabel } from '../../domain/production';
import { Icon } from '../../ui/Icon';

export type TodayTarget = 'production' | 'trade' | 'world' | 'company';

interface TodayViewProps {
  state: GameState;
  onOpen: (target: TodayTarget) => void;
}

interface DecisionItem {
  id: string;
  title: string;
  detail: string;
  target: TodayTarget;
  urgent?: boolean;
  icon: 'batch' | 'contract' | 'warning' | 'factory' | 'team' | 'market';
}

interface TimelineItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  target: TodayTarget;
  day: number;
}

export function TodayView({ state, onOpen }: TodayViewProps) {
  const decisions = buildDecisions(state);
  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  const shipments = state.supply.purchaseOrders.filter((order) => ['pending', 'delayed'].includes(order.status));
  const freight = state.ecosystem?.trade.shipments.filter((shipment) => ['awaiting_transport', 'in_transit', 'delayed', 'customs_hold'].includes(shipment.status)) ?? [];
  const cashDays = state.finance.dailyFixedCost > 0 ? Math.floor(state.finance.cash / state.finance.dailyFixedCost) : 999;
  const timeline = buildTimeline(state);
  const activeCount = timeline.length;
  const nextEvent = timeline[0];
  const companyState = decisions.some((item) => item.urgent) ? 'Требуется вмешательство' : activeCount > 0 ? 'Работа идёт по плану' : 'Готова к новому циклу';

  return (
    <div className="today-screen-v2">
      <header className="page-heading-v2">
        <div>
          <h1>Сегодня</h1>
          <p>День {state.day} · {companyState}</p>
        </div>
        <span className={decisions.some((item) => item.urgent) ? 'status-chip danger' : 'status-chip success'}>
          {decisions.length ? problemCountLabel(decisions.length) : 'Стабильно'}
        </span>
      </header>

      <section className="company-state-v2" aria-label="Состояние компании">
        <div>
          <span>Финансовый запас</span>
          <strong>{cashDays > 90 ? '90+' : cashDays}</strong>
          <small>дней работы</small>
        </div>
        <div>
          <span>Чистота объекта</span>
          <strong>{Math.round(state.facility?.sanitation ?? 0)}</strong>
          <small>из 100</small>
        </div>
        <div>
          <span>Команда</span>
          <strong>{state.team.employees.length}</strong>
          <small>сотрудников</small>
        </div>
      </section>

      <section className="today-section-v2" aria-labelledby="problems-title">
        <header>
          <h2 id="problems-title">Текущие проблемы</h2>
          <span>{decisions.length}</span>
        </header>
        <div className="today-list-v2">
          {decisions.length === 0 ? (
            <div className="today-empty-v2"><Icon name="check" /><span><strong>Срочных решений нет</strong><small>Системы продолжают работу автономно</small></span></div>
          ) : decisions.slice(0, 2).map((item) => (
            <button key={item.id} className={item.urgent ? 'urgent' : ''} onClick={() => onOpen(item.target)}>
              <span className="today-row-icon"><Icon name={item.icon} /></span>
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              <Icon name="arrow" />
            </button>
          ))}
        </div>
      </section>

      <section className="today-section-v2" aria-labelledby="processes-title">
        <header>
          <h2 id="processes-title">Активные процессы</h2>
          <span>{activeCount}</span>
        </header>
        <div className="today-list-v2">
          {timeline.slice(0, 2).map((item) => (
            <button key={item.id} onClick={() => onOpen(item.target)}>
              <span className="today-row-icon"><Icon name={item.target === 'production' ? 'factory' : item.target === 'trade' ? 'market' : 'map'} /></span>
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              <b>{item.value}</b>
            </button>
          ))}
          {activeCount === 0 && <div className="today-empty-v2"><Icon name="archive" /><span><strong>Процессов нет</strong><small>Производственные линии и поставки свободны</small></span></div>}
        </div>
      </section>

      <section className="next-event-v2" aria-labelledby="next-event-title">
        <div>
          <span>Ближайшее важное событие</span>
          <h2 id="next-event-title">{nextEvent?.title ?? 'Новых событий не запланировано'}</h2>
          <p>{nextEvent?.detail ?? 'Запусти партию или оформи поставку, чтобы создать следующий этап работы.'}</p>
        </div>
        {nextEvent && <button onClick={() => onOpen(nextEvent.target)} aria-label="Открыть событие"><span>{nextEvent.day <= state.day ? 'Сегодня' : `День ${nextEvent.day}`}</span><Icon name="arrow" /></button>}
      </section>
    </div>
  );
}

function buildTimeline(state: GameState): TimelineItem[] {
  const items: TimelineItem[] = [];

  state.production.batches
    .filter((batch) => !['packaged', 'discarded'].includes(batch.status))
    .forEach((batch) => items.push({
      id: `batch-${batch.id}`,
      title: `${batch.code} · ${batch.recipe.name}`,
      detail: `${statusLabel(batch.status)} · готовность день ${batch.readyDay}`,
      value: batch.readyDay <= state.day ? 'сегодня' : `${batch.readyDay - state.day} дн.`,
      target: 'production',
      day: Math.max(batch.readyDay, state.day),
    }));

  state.supply.purchaseOrders
    .filter((order) => ['pending', 'delayed'].includes(order.status))
    .forEach((order) => items.push({
      id: `supply-${order.id}`,
      title: order.status === 'delayed' ? 'Поставка задержана' : 'Сырьё прибудет на склад',
      detail: `${order.quantity} ${order.unit} · ${order.note}`,
      value: order.expectedDay <= state.day ? 'сегодня' : `${order.expectedDay - state.day} дн.`,
      target: 'production',
      day: Math.max(order.expectedDay, state.day),
    }));

  (state.world?.repeatOrders ?? [])
    .filter((order) => order.status === 'pending')
    .forEach((order) => items.push({
      id: `order-${order.id}`,
      title: 'Срок повторного заказа',
      detail: `Нужно выполнить заказ до дня ${order.dueDay}`,
      value: order.dueDay <= state.day ? 'сегодня' : `${order.dueDay - state.day} дн.`,
      target: 'trade',
      day: Math.max(order.dueDay, state.day),
    }));

  (state.ecosystem?.trade.shipments ?? [])
    .filter((shipment) => ['awaiting_transport', 'in_transit', 'delayed', 'customs_hold'].includes(shipment.status))
    .forEach((shipment) => items.push({
      id: `freight-${shipment.id}`,
      title: shipment.status === 'customs_hold' ? 'Груз ожидает таможню' : shipment.status === 'delayed' ? 'Перевозка задержана' : 'Груз прибудет в точку',
      detail: `${shipment.quantity} ед. · ${shipment.note}`,
      value: shipment.arrivalDay <= state.day ? 'сегодня' : `${shipment.arrivalDay - state.day} дн.`,
      target: 'world',
      day: Math.max(shipment.arrivalDay, state.day),
    }));

  return items.sort((left, right) => left.day - right.day || left.title.localeCompare(right.title, 'ru'));
}

function buildDecisions(state: GameState): DecisionItem[] {
  const items: DecisionItem[] = [];
  const offers = state.world?.proposals.filter((proposal) => proposal.status === 'offer') ?? [];
  const orders = state.world?.repeatOrders.filter((order) => order.status === 'pending') ?? [];
  const ready = state.production.batches.filter((batch) => ['ready', 'tasted'].includes(batch.status));
  const delayed = state.supply.purchaseOrders.filter((order) => order.status === 'delayed');
  const exhausted = state.team.employees.filter((employee) => employee.fatigue >= 85 || employee.morale <= 30);
  const damaged = Object.entries(state.facility?.equipmentCondition ?? {}).filter(([, item]) => item < 25);
  const playerOrganizationId = state.ecosystem?.playerOrganizationId;
  const compliance = state.ecosystem?.regulation.compliance.find((item) => item.organizationId === playerOrganizationId);
  const regulatoryViolations = state.ecosystem?.regulation.violations.filter((item) => item.organizationId === playerOrganizationId && !item.resolved) ?? [];
  const overdueExcise = state.ecosystem?.regulation.obligations.filter((item) => item.organizationId === playerOrganizationId && item.status === 'overdue') ?? [];
  const freightHolds = state.ecosystem?.trade.shipments.filter((shipment) => shipment.status === 'customs_hold' || shipment.status === 'delayed') ?? [];
  const freightQueue = state.ecosystem?.logistics.jobs.filter((job) => job.status === 'queued' && state.day - job.createdDay >= 2) ?? [];
  const qualityIncidents = state.ecosystem?.quality.incidents.filter((incident) => incident.organizationId === playerOrganizationId && incident.status !== 'closed') ?? [];
  const activeRecalls = state.ecosystem?.quality.recalls.filter((recall) => recall.responsibleOrganizationId === playerOrganizationId && recall.status === 'active') ?? [];

  if (qualityIncidents.length > 0 || activeRecalls.length > 0) items.push({ id: 'quality', title: 'Проблема качества продукта', detail: `${qualityIncidents.length} инцидентов · ${activeRecalls.length} активных отзывов`, target: 'world', icon: 'warning', urgent: true });
  if (regulatoryViolations.length > 0 || overdueExcise.length > 0) items.push({ id: 'regulation', title: 'Регулятор требует внимания', detail: `${regulatoryViolations.length} нарушений · комплаенс ${compliance?.score ?? 100}/100`, target: 'company', icon: 'warning', urgent: true });
  if (freightHolds.length > 0 || freightQueue.length > 0) items.push({ id: 'freight', title: 'Логистика требует внимания', detail: `${freightHolds.length} задержано · ${freightQueue.length} ждут транспорт`, target: 'world', icon: 'warning', urgent: freightHolds.length > 0 });
  if (offers.length > 0) items.push({ id: 'offers', title: `${offers.length} коммерческих оффера`, detail: 'Принять условия или отказаться', target: 'trade', icon: 'contract', urgent: true });
  if (orders.length > 0) {
    const nearest = Math.min(...orders.map((order) => order.dueDay));
    items.push({ id: 'orders', title: `${orders.length} повторных заказа`, detail: `Ближайший срок — день ${nearest}`, target: 'trade', icon: 'market', urgent: nearest - state.day <= 2 });
  }
  if (ready.length > 0) items.push({ id: 'ready', title: `${ready.length} партии ждут решения`, detail: 'Дегустация, розлив или списание', target: 'production', icon: 'batch' });
  if (delayed.length > 0) items.push({ id: 'delayed', title: `${delayed.length} поставки задержаны`, detail: 'Проверь запас и производственный план', target: 'production', icon: 'warning', urgent: true });
  if ((state.facility?.sanitation ?? 100) < 45) items.push({ id: 'clean', title: 'Нужна санитарная смена', detail: `Чистота ${Math.round(state.facility?.sanitation ?? 0)}/100`, target: 'production', icon: 'factory', urgent: true });
  if (damaged.length > 0) items.push({ id: 'equipment', title: `${damaged.length} модуля критически изношены`, detail: 'Без ремонта линия может остановиться', target: 'production', icon: 'warning', urgent: true });
  if (exhausted.length > 0) items.push({ id: 'team', title: `${exhausted.length} сотрудника перегружены`, detail: 'Снизь нагрузку или измени назначение', target: 'company', icon: 'team' });

  return items;
}

function problemCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? 'проблема' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'проблемы' : 'проблем';
  return `${count} ${noun}`;
}
