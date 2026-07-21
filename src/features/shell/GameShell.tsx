import { useRef, useState } from 'react';
import { countries, properties, regions } from '../../data/catalog';
import type { GameState } from '../../domain/game';

type Tab = 'company' | 'production' | 'batches' | 'market' | 'archive';

interface GameShellProps {
  state: GameState;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onNextDay: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'company', label: 'Компания', icon: '⌂' },
  { id: 'production', label: 'Производство', icon: '◫' },
  { id: 'batches', label: 'Партии', icon: '◉' },
  { id: 'market', label: 'Рынок', icon: '↗' },
  { id: 'archive', label: 'Архив', icon: '▤' },
];

export function GameShell({ state, saveStatus, onNextDay, onReset, onExport, onImport }: GameShellProps) {
  const [tab, setTab] = useState<Tab>('company');
  const fileInput = useRef<HTMLInputElement>(null);
  const country = countries.find((item) => item.id === state.world?.countryId);
  const region = regions.find((item) => item.id === state.world?.regionId);
  const property = properties.find((item) => item.id === state.world?.propertyId);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">День {state.day}</span>
          <h1>{state.company.name}</h1>
        </div>
        <div className="money-block">
          <strong>{state.finance.cash.toLocaleString('ru-RU')}</strong>
          <span>{saveStatus === 'saving' ? 'Сохранение…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Сохранено'}</span>
        </div>
      </header>

      <main className="content">
        {tab === 'company' && (
          <section className="stack">
            <div className="hero-card">
              <span className="eyebrow">Первый этап</span>
              <h2>Подготовь производство</h2>
              <p>Объект выбран. Следом появятся оборудование, закупка сырья и полный цикл пива и сидра.</p>
              <button className="primary" onClick={() => setTab('production')}>Перейти к производству</button>
            </div>
            <div className="panel compact">
              <h3>Текущая база</h3>
              <dl className="review-list">
                <div><dt>Страна</dt><dd>{country?.name}</dd></div>
                <div><dt>Регион</dt><dd>{region?.name}</dd></div>
                <div><dt>Объект</dt><dd>{property?.name}</dd></div>
                <div><dt>Расход в день</dt><dd>{state.finance.dailyFixedCost.toLocaleString('ru-RU')}</dd></div>
              </dl>
            </div>
            <div className="panel compact">
              <h3>Управление сохранением</h3>
              <div className="button-row">
                <button className="secondary" onClick={onExport}>Экспорт</button>
                <button className="secondary" onClick={() => fileInput.current?.click()}>Импорт</button>
                <button className="danger" onClick={onReset}>Новая игра</button>
              </div>
              <input ref={fileInput} hidden type="file" accept="application/json" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImport(file);
                event.currentTarget.value = '';
              }} />
            </div>
          </section>
        )}

        {tab === 'production' && <ComingNext title="Производство" text="Следующий патч: покупка оборудования и первая настройка рецептуры пива." />}
        {tab === 'batches' && <ComingNext title="Партии" text="Здесь будут живые партии с историей операций, наблюдениями и дегустациями." />}
        {tab === 'market' && <ComingNext title="Рынок" text="Здесь появятся бары, магазины, специальные точки и напитки других компаний." />}
        {tab === 'archive' && <ComingNext title="Архив" text="Рецепты, версии партий, собственные заметки и купленные напитки." />}
      </main>

      <div className="day-action">
        <button onClick={onNextDay}>Завершить день <span>−{state.finance.dailyFixedCost.toLocaleString('ru-RU')}</span></button>
      </div>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ComingNext({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel empty-state">
      <span className="eyebrow">Раздел подключён</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}
