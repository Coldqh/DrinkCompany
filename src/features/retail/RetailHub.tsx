import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import {
  retailDailyCost,
  retailOpenCost,
  retailStockLimit,
  retailStockUnits,
  retailVenueUpgradeCost,
  venueLabel,
  type RetailVenue,
  type RetailVenueStatus,
  type RetailVenueType,
} from '../../domain/retail';
import { Icon } from '../../ui/Icon';
import { EmptyState, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

interface RetailHubProps {
  state: GameState;
  onOpen: (type: RetailVenueType, name: string) => ActionResult;
  onStock: (venueId: string, releaseId: string, units: number, price: number) => ActionResult;
  onClean: (venueId: string) => ActionResult;
  onUpgrade: (venueId: string) => ActionResult;
  onStatus: (venueId: string, status: RetailVenueStatus) => ActionResult;
}

type Section = 'venues' | 'stock' | 'reports' | 'growth';

export function RetailHub({ state, onOpen, onStock, onClean, onUpgrade, onStatus }: RetailHubProps) {
  const [section, setSection] = useState<Section>('venues');
  const [openModal, setOpenModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<RetailVenue | null>(null);
  const [stockVenue, setStockVenue] = useState<RetailVenue | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const latestReport = state.retail.reports[0];
  const openVenues = state.retail.venues.filter((venue) => venue.status === 'open');
  const stockUnits = state.retail.venues.reduce((sum, venue) => sum + retailStockUnits(venue), 0);
  const dailyCost = retailDailyCost(state.retail);

  function act(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2600);
    if (result.ok) {
      setOpenModal(false);
      setStockVenue(null);
      setSelectedVenue(null);
    }
  }

  return (
    <div className="retail-hub compact-page">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <section className="retail-command glass-card">
        <div>
          <span className="section-kicker">собственная розница</span>
          <h2>{state.retail.venues.length === 0 ? 'Продавай напрямую гостям' : `${openVenues.length} точек работают сегодня`}</h2>
          <p>{state.retail.venues.length === 0 ? 'Бар и магазин дают большую маржу, но требуют аренды, ассортимента и ежедневного контроля.' : `Прямая выручка ${formatMoney(state.retail.directSalesRevenue)} · продано ${state.retail.directUnitsSold} бутылок.`}</p>
        </div>
        <button className="retail-open-button" onClick={() => setOpenModal(true)}><Icon name="store" /><span>Открыть</span></button>
      </section>

      <section className="mini-stat-grid retail-stat-grid">
        <MiniStat label="Точки" value={`${openVenues.length}`} note={`${state.retail.venues.length} всего`} />
        <MiniStat label="Остаток" value={`${stockUnits}`} note="в рознице" />
        <MiniStat label="Расходы" value={formatMoney(dailyCost)} note="за день" />
        <MiniStat label="Сегодня" value={formatMoney(latestReport?.revenue ?? 0)} note={`${latestReport?.unitsSold ?? 0} продаж`} />
      </section>

      <SubTabs value={section} onChange={setSection} label="Розница" options={[
        { id: 'venues', label: 'Точки', badge: openVenues.length },
        { id: 'stock', label: 'Полки', badge: stockUnits },
        { id: 'reports', label: 'Смены', badge: state.retail.reports.length },
        { id: 'growth', label: 'Рост' },
      ]} />

      {section === 'venues' && (
        state.retail.venues.length === 0
          ? <section className="glass-card"><EmptyState icon="store" title="Собственных точек ещё нет" text="Открой бар или магазин, затем передай туда оформленный релиз." action={<button className="button primary" onClick={() => setOpenModal(true)}>Открыть первую точку</button>} /></section>
          : <section className="retail-venue-grid">{state.retail.venues.map((venue) => <VenueCard key={venue.id} venue={venue} latest={state.retail.reports.find((report) => report.venueId === venue.id)} onOpen={() => setSelectedVenue(venue)} />)}</section>
      )}

      {section === 'stock' && (
        state.retail.venues.length === 0
          ? <section className="glass-card"><EmptyState icon="bottle" title="Некуда передавать продукт" text="Сначала открой собственную розничную точку." /></section>
          : <section className="retail-stock-stack">{state.retail.venues.map((venue) => <article key={venue.id} className="retail-stock-card glass-card">
            <header><div><span>{venueLabel(venue.type)}</span><strong>{venue.name}</strong></div><button className="button secondary compact-button" onClick={() => setStockVenue(venue)}>Пополнить</button></header>
            <div className="retail-capacity"><span>Полка {retailStockUnits(venue)} / {retailStockLimit(venue)}</span><i><b style={{ width: `${Math.min(100, retailStockUnits(venue) / retailStockLimit(venue) * 100)}%` }} /></i></div>
            {venue.stock.length === 0 ? <p>Полки пусты. Без продукта посетители уйдут.</p> : <div className="retail-stock-lines">{venue.stock.map((item) => {
              const release = state.brand.releases.find((entry) => entry.id === item.releaseId);
              return <div key={item.id}><span><strong>{release?.name ?? 'Неизвестный релиз'}</strong><small>{item.units} шт. · {formatMoney(item.price)} за бутылку</small></span><b>{formatMoney(item.units * item.price)}</b></div>;
            })}</div>}
          </article>)}</section>
      )}

      {section === 'reports' && (
        state.retail.reports.length === 0
          ? <section className="glass-card"><EmptyState icon="archive" title="Смен ещё не было" text="Заполни полки и заверши игровой день." /></section>
          : <section className="retail-report-list glass-card">{state.retail.reports.map((report) => {
            const venue = state.retail.venues.find((item) => item.id === report.venueId);
            return <article key={report.id}><i className={report.satisfaction >= 75 ? 'good' : report.satisfaction < 55 ? 'bad' : ''} /><span><strong>{venue?.name ?? 'Точка'} · {report.headline}</strong><small>День {report.day} · {report.visitors} гостей · {report.unitsSold} продаж · оценка {report.satisfaction}/100</small></span><b>{formatMoney(report.revenue)}</b></article>;
          })}</section>
      )}

      {section === 'growth' && (
        state.retail.venues.length === 0
          ? <section className="glass-card"><EmptyState icon="store" title="Сначала открой точку" text="После открытия появятся расширение, санитария и управление режимом работы." /></section>
          : <section className="retail-growth-list">{state.retail.venues.map((venue) => <article className="glass-card" key={venue.id}>
            <header><div><span>{venueLabel(venue.type)} · уровень {venue.level}</span><strong>{venue.name}</strong></div><span className={`row-status ${venue.status === 'open' ? 'positive' : 'neutral'}`}>{venue.status === 'open' ? 'открыто' : 'закрыто'}</span></header>
            <div className="detail-grid"><Detail label="Репутация" value={`${venue.reputation}/100`} /><Detail label="Чистота" value={`${venue.cleanliness}/100`} /><Detail label="Полка" value={`${retailStockUnits(venue)}/${retailStockLimit(venue)}`} /><Detail label="Аренда" value={`${formatMoney(venue.dailyCost)}/день`} /></div>
            <div className="retail-growth-actions"><button className="button secondary" disabled={state.finance.cash < (180 + venue.level * 75) || venue.cleanliness >= 96} onClick={() => act(onClean(venue.id))}>Санитарная смена</button><button className="button primary" disabled={venue.level >= 3 || state.finance.cash < retailVenueUpgradeCost(venue)} onClick={() => act(onUpgrade(venue.id))}>{venue.level >= 3 ? 'Максимум' : `Расширить · ${formatMoney(retailVenueUpgradeCost(venue))}`}</button><button className="button ghost" onClick={() => act(onStatus(venue.id, venue.status === 'open' ? 'closed' : 'open'))}>{venue.status === 'open' ? 'Закрыть временно' : 'Открыть снова'}</button></div>
          </article>)}</section>
      )}

      {openModal && <OpenVenueModal cash={state.finance.cash} onClose={() => setOpenModal(false)} onSubmit={(type, name) => act(onOpen(type, name))} />}
      {stockVenue && <StockVenueModal state={state} venue={stockVenue} onClose={() => setStockVenue(null)} onSubmit={(releaseId, units, price) => act(onStock(stockVenue.id, releaseId, units, price))} />}
      {selectedVenue && <VenueModal venue={selectedVenue} reports={state.retail.reports.filter((report) => report.venueId === selectedVenue.id)} onClose={() => setSelectedVenue(null)} />}
    </div>
  );
}

function VenueCard({ venue, latest, onOpen }: { venue: RetailVenue; latest?: GameState['retail']['reports'][number]; onOpen: () => void }) {
  return <button className="retail-venue-card glass-card" onClick={onOpen}>
    <div className="retail-venue-visual"><Icon name={venue.type === 'bar' ? 'beer' : 'store'} /><i>{venue.level}</i></div>
    <div><span>{venueLabel(venue.type)} · {venue.status === 'open' ? 'открыто' : 'закрыто'}</span><strong>{venue.name}</strong><small>{retailStockUnits(venue)} бутылок · репутация {venue.reputation}</small></div>
    <b>{formatMoney(latest?.revenue ?? 0)}<small>последняя смена</small></b>
  </button>;
}

function OpenVenueModal({ cash, onClose, onSubmit }: { cash: number; onClose: () => void; onSubmit: (type: RetailVenueType, name: string) => void }) {
  const [type, setType] = useState<RetailVenueType>('bar');
  const [name, setName] = useState('');
  return <Modal title="Новая розничная точка" kicker="прямые продажи" onClose={onClose} footer={<button className="button primary" disabled={name.trim().length < 2 || cash < retailOpenCost(type)} onClick={() => onSubmit(type, name)}>Открыть · {formatMoney(retailOpenCost(type))}</button>}>
    <div className="retail-type-choice">{(['bar', 'shop'] as RetailVenueType[]).map((value) => <button key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}><Icon name={value === 'bar' ? 'beer' : 'store'} /><strong>{venueLabel(value)}</strong><small>{value === 'bar' ? 'Выше маржа, меньше запас, сильнее роль атмосферы.' : 'Больше полка, стабильнее поток, важнее цена и понятность.'}</small><b>{formatMoney(retailOpenCost(value))}</b></button>)}</div>
    <label className="field"><span>Название точки</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={36} placeholder={type === 'bar' ? 'Например, Black Yard' : 'Например, District Bottle'} /></label>
  </Modal>;
}

function StockVenueModal({ state, venue, onClose, onSubmit }: { state: GameState; venue: RetailVenue; onClose: () => void; onSubmit: (releaseId: string, units: number, price: number) => void }) {
  const releases = useMemo(() => state.brand.releases.filter((release) => release.status === 'active' && (state.production.batches.find((batch) => batch.id === release.batchId)?.availableUnits ?? 0) >= 6), [state.brand.releases, state.production.batches]);
  const [releaseId, setReleaseId] = useState(releases[0]?.id ?? '');
  const release = releases.find((item) => item.id === releaseId);
  const batch = state.production.batches.find((item) => item.id === release?.batchId);
  const [units, setUnits] = useState(12);
  const [price, setPrice] = useState(release?.retailPrice ?? 4);
  const maxUnits = Math.max(0, Math.min(batch?.availableUnits ?? 0, retailStockLimit(venue) - retailStockUnits(venue)));
  return <Modal title={`Пополнить «${venue.name}»`} kicker="выкладка" onClose={onClose} footer={<button className="button primary" disabled={!release || units < 6 || units > maxUnits || price <= (release?.wholesalePrice ?? 0)} onClick={() => onSubmit(releaseId, units, price)}>Передать {units} бутылок</button>}>
    {releases.length === 0 ? <EmptyState icon="bottle" title="Нет готовых релизов" text="Нужен активный брендированный релиз и минимум 6 свободных бутылок." /> : <>
      <div className="release-choice-list">{releases.map((item) => {
        const itemBatch = state.production.batches.find((batchItem) => batchItem.id === item.batchId);
        const brand = state.brand.brands.find((brandItem) => brandItem.id === item.brandId);
        return <button key={item.id} className={releaseId === item.id ? 'active' : ''} onClick={() => { setReleaseId(item.id); setPrice(item.retailPrice); }}><span className="release-bottle-mark"><i /></span><span><strong>{item.name}</strong><small>{brand?.name ?? 'Бренд'} · доступно {itemBatch?.availableUnits ?? 0}</small></span><b>{formatMoney(item.retailPrice)}</b></button>;
      })}</div>
      <div className="retail-stock-form"><label><span>Количество</span><input type="number" min={6} max={maxUnits} value={units} onChange={(event) => setUnits(Number(event.target.value))} /></label><label><span>Цена за бутылку</span><input type="number" min={(release?.wholesalePrice ?? 0) + 0.01} step="0.1" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label></div>
      <div className="compact-banner neutral"><Icon name="wallet" /><span>Потенциальная выручка выкладки: {formatMoney(units * price)}. Свободно места: {retailStockLimit(venue) - retailStockUnits(venue)}.</span></div>
    </>}
  </Modal>;
}

function VenueModal({ venue, reports, onClose }: { venue: RetailVenue; reports: GameState['retail']['reports']; onClose: () => void }) {
  return <Modal title={venue.name} kicker={`${venueLabel(venue.type)} · уровень ${venue.level}`} onClose={onClose}>
    <div className="detail-grid"><Detail label="Статус" value={venue.status === 'open' ? 'Открыто' : 'Закрыто'} /><Detail label="Репутация" value={`${venue.reputation}/100`} /><Detail label="Чистота" value={`${venue.cleanliness}/100`} /><Detail label="Гостей всего" value={`${venue.totalVisitors}`} /><Detail label="Продано" value={`${venue.totalUnitsSold}`} /><Detail label="Выручка" value={formatMoney(venue.totalRevenue)} /></div>
    <div className="retail-mini-history">{reports.slice(0, 7).map((report) => <div key={report.id}><span><strong>День {report.day}</strong><small>{report.headline}</small></span><b>{formatMoney(report.revenue)}</b></div>)}</div>
  </Modal>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
