import { useMemo, useState } from 'react';
import type { GameState } from '../../domain/game';
import type { HospitalityMenuItemState } from '../../domain/hospitality';
import { CocktailArt, ScoreRing, type CocktailVisualVariant } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';
import { CocktailStudio } from './CocktailStudio';

interface ClubOperationsProps {
  state: GameState;
  onClose: () => void;
  onFlowChange?: (open: boolean) => void;
}

type ClubTab = 'hall' | 'menu' | 'bar' | 'inventory' | 'service';

const fallbackNames = ['Negroni', 'French 75', 'Espresso Martini', 'Boulevardier', 'Paloma', 'Signature No. 4'];
const variants: CocktailVisualVariant[] = ['negroni', 'french75', 'espresso', 'boulevardier', 'paloma', 'signature'];

export function ClubOperations({ state, onClose, onFlowChange }: ClubOperationsProps) {
  const [tab, setTab] = useState<ClubTab>('menu');
  const [studioOpen, setStudioOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const ecosystem = state.ecosystem;
  const hospitality = ecosystem?.hospitality;
  const playerOrganizationId = ecosystem?.playerOrganizationId;
  const playerVenue = hospitality?.venues.find((venue) => venue.operatorOrganizationId === playerOrganizationId) ?? hospitality?.venues[0] ?? null;
  const asset = playerVenue ? ecosystem?.assets.find((item) => item.id === playerVenue.assetId) : null;
  const latestReport = playerVenue ? (hospitality?.shiftReports.find((report) => report.venueId === playerVenue.id) ?? undefined) : undefined;
  const realMenu = useMemo(() => playerVenue ? (hospitality?.menuItems.filter((item) => item.venueId === playerVenue.id && item.kind === 'cocktail').slice(0, 6) ?? []) : [], [hospitality, playerVenue]);
  const menu = useMemo(() => Array.from({ length: 6 }, (_, index) => realMenu[index] ?? createFallbackItem(index, playerVenue?.id ?? 'preview')), [realMenu, playerVenue]);
  const reservations = Math.max(8, Math.round((latestReport?.guests ?? playerVenue?.totalGuests ?? 28) * .32));
  const activeOrders = Math.max(0, latestReport?.orders ?? Math.round((playerVenue?.totalOrders ?? 34) * .12));
  const rating = Math.max(3.8, Math.min(5, (latestReport?.satisfaction ?? playerVenue?.serviceQuality ?? 82) / 20));

  function openStudio() { setStudioOpen(true); onFlowChange?.(true); }
  function closeStudio() { setStudioOpen(false); onFlowChange?.(false); }
  function saveCocktail(name: string) { setFeedback(`${name} сохранён как концепт.`); window.setTimeout(() => setFeedback(null), 2400); }

  if (studioOpen) return <CocktailStudio state={state} onClose={closeStudio} onSave={saveCocktail} />;

  return (
    <div className="lux-screen club-screen">
      {feedback && <div className="toast success"><Icon name="check" />{feedback}</div>}
      <header className="lux-screen-header club-header">
        <button className="lux-icon-button" onClick={onClose} aria-label="Назад"><Icon name="arrow" /></button>
        <div className="lux-screen-title"><span>{asset?.name ?? 'Club Noir'}</span><h1>Коктейльный клуб</h1><p>Меню, сервис и атмосфера. Сегодня твой вечер.</p></div>
        <button className="lux-icon-button club-create" onClick={openStudio} aria-label="Создать новый коктейль"><Icon name="spark" /></button>
      </header>

      <nav className="lux-tabs club-tabs" aria-label="Разделы клуба">
        {([['hall', 'Зал'], ['menu', 'Меню'], ['bar', 'Бар'], ['inventory', 'Склад'], ['service', 'Сервис']] as Array<[ClubTab, string]>).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      <main>
        <section className="club-shift-section"><header><span>Сегодня, вечерняя смена</span><small>{latestReport ? `День ${latestReport.day}` : 'Подготовка к открытию'}</small></header><div className="club-shift-grid">
          <ClubStat icon="team" value={String(reservations)} label="Броней" note="6 онлайн" tone="accent" />
          <ClubStat icon="spark" value={String(Math.max(1, Math.round(reservations / 7)))} label="VIP стола" note="ожидаются" />
          <ClubStat icon="contract" value={String(activeOrders)} label="Активных заказов" note="в работе" tone="accent" />
          <ClubStat icon="spark" value={rating.toFixed(1)} label="Рейтинг бара" note="+0.2 к вчера" />
        </div></section>

        {tab === 'menu' && <MenuSection items={menu} onCreate={openStudio} />}
        {tab === 'hall' && <HallSection capacity={playerVenue?.capacity ?? 80} reservations={reservations} />}
        {tab === 'bar' && <BarSection playerVenue={playerVenue} latestReport={latestReport} />}
        {tab === 'inventory' && <InventorySection state={state} venueId={playerVenue?.id ?? ''} />}
        {tab === 'service' && <ServiceSection latestReport={latestReport} />}

        <section className="club-operations"><header>Операции бара</header><div>
          <article><ScoreRing value={Math.round(latestReport?.serviceUtilization ?? 82)} label="Загрузка" /><p>Пик: 22:00–00:00</p></article>
          <article className="club-shortage"><span>Дефицит ингредиентов</span><p><i className="danger" />Грейпфрут <small>6 порций</small></p><p><i />Свежий лайм <small>12 порций</small></p><p><i className="danger" />Биттер Кампари <small>8 порций</small></p></article>
          <article className="club-best"><span>Самый заказываемый</span><CocktailArt variant="negroni" compact /><strong>{menu[0]?.name ?? 'Negroni'}</strong><b>{Math.max(12, menu[0]?.recentOrders ?? 24)} заказов</b></article>
          <article><ScoreRing value={Math.round(latestReport?.satisfaction ?? 94)} label="Гости" /><p>Настроение отличное</p></article>
        </div></section>
      </main>
    </div>
  );
}

function MenuSection({ items, onCreate }: { items: HospitalityMenuItemState[]; onCreate: () => void }) {
  return <section className="club-menu"><header><span>Меню коктейлей</span><button onClick={onCreate}>Создать авторский <Icon name="arrow" /></button></header><div>{items.map((item, index) => {
    const margin = Math.round(Math.max(45, (1 - item.materialCost / Math.max(item.salePrice, 1)) * 100));
    const stock = item.active ? item.availabilityReason ? 'Средний' : 'Высокий' : 'Низкий';
    return <article key={item.id}><header><h3>{item.name}</h3><i /></header><CocktailArt variant={variants[index] ?? 'signature'} /><span className="club-menu-trend"><Icon name={index === 2 ? 'spark' : 'pulse'} />{index === 1 ? 'Хит вечера' : index === 5 ? 'Авторский' : 'Популярный'}</span><strong>{formatMoney(item.salePrice || 850)} ₽</strong><dl><div><dt>Маржа</dt><dd>{margin}%</dd></div><div><dt>Запас</dt><dd className={stock === 'Низкий' ? 'danger' : stock === 'Высокий' ? 'success' : 'warning'}>{stock}</dd></div></dl><button>{stock === 'Низкий' ? 'Заказать' : 'Продвигать'}<Icon name="arrow" /></button></article>;
  })}</div></section>;
}
function HallSection({ capacity, reservations }: { capacity: number; reservations: number }) { return <section className="club-detail-section"><h2>Зал</h2><div className="club-detail-grid"><article><span>Вместимость</span><strong>{capacity}</strong><small>гостей</small></article><article><span>Брони</span><strong>{reservations}</strong><small>на сегодня</small></article><article><span>VIP-зона</span><strong>4</strong><small>стола</small></article></div></section>; }
function BarSection({ playerVenue, latestReport }: { playerVenue: NonNullable<GameState['ecosystem']>['hospitality']['venues'][number] | null; latestReport: NonNullable<GameState['ecosystem']>['hospitality']['shiftReports'][number] | undefined }) { return <section className="club-detail-section"><h2>Бар</h2><div className="club-detail-grid"><article><span>Станции</span><strong>{playerVenue?.stations ?? 2}</strong><small>активно</small></article><article><span>Бармены</span><strong>{playerVenue?.workforce.bartenders ?? 3}</strong><small>в смене</small></article><article><span>Среднее ожидание</span><strong>{Math.round(latestReport?.averageWaitMinutes ?? 6)}</strong><small>минут</small></article></div></section>; }
function InventorySection({ state, venueId }: { state: GameState; venueId: string }) { const lots = state.ecosystem?.hospitality.pantryLots.filter((item) => item.venueId === venueId && item.quantity > 0) ?? []; return <section className="club-detail-section"><h2>Клубный склад</h2><div className="club-inventory-list">{lots.slice(0, 10).map((lot) => <article key={lot.id}><span>{lot.ingredientTag}</span><strong>{Math.round(lot.quantity)} {lot.unit}</strong><small>до дня {lot.expiresDay}</small></article>)}{lots.length === 0 && <p>Кладовая пока пуста.</p>}</div></section>; }
function ServiceSection({ latestReport }: { latestReport: NonNullable<GameState['ecosystem']>['hospitality']['shiftReports'][number] | undefined }) { return <section className="club-detail-section"><h2>Сервис</h2><div className="club-detail-grid"><article><span>Удовлетворённость</span><strong>{Math.round(latestReport?.satisfaction ?? 88)}%</strong><small>гостей</small></article><article><span>Качество подачи</span><strong>{Math.round(latestReport?.averageServeQuality ?? 84)}</strong><small>из 100</small></article><article><span>Потеряно гостей</span><strong>{latestReport?.lostGuests ?? 0}</strong><small>за смену</small></article></div></section>; }
function ClubStat({ icon, value, label, note, tone }: { icon: Parameters<typeof Icon>[0]['name']; value: string; label: string; note: string; tone?: 'accent' }) { return <article className={tone ?? ''}><Icon name={icon} /><strong>{value}</strong><span>{label}</span><small>{note}</small><Icon name="arrow" /></article>; }
function createFallbackItem(index: number, venueId: string): HospitalityMenuItemState { return { id: `preview-${index}`, venueId, name: fallbackNames[index] ?? `Signature ${index + 1}`, kind: 'cocktail', recipeId: null, method: null, glassware: 'premium', ice: 'large_cube', garnish: [], preparationSeconds: 75, complexity: 3, ingredients: [], materialCost: 220 + index * 18, salePrice: [850, 950, 850, 900, 800, 1200][index] ?? 900, listed: true, active: true, availabilityReason: index === 4 ? 'Низкий запас грейпфрута' : null, marketScore: 70, trendScore: 68, competitionPressure: 20, recentOrders: 24 - index * 2, recentRevenue: 0, lastSoldDay: null, weakReviewCount: 0, totalSold: 0, totalRevenue: 0, createdDay: 1 }; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
