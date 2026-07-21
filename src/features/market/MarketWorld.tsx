import type { GameState } from '../../domain/game';
import { Icon } from '../../ui/Icon';

export function MarketWorld({ state }: { state: GameState }) {
  const stock = state.production.batches.filter((batch) => batch.status === 'packaged').reduce((sum, batch) => sum + batch.packagedUnits, 0);

  return (
    <div className="market-world">
      <section className="market-hero glass-card">
        <div>
          <span className="section-kicker">market intelligence</span>
          <h2>Рынок не ждёт игрока</h2>
          <p>Компании выпускают продукты, теряют импульс и занимают места в барах и магазинах независимо от тебя.</p>
        </div>
        <div className="stock-orb"><span>готовый склад</span><strong>{stock}</strong><small>бутылок</small></div>
      </section>

      <section className="world-companies">
        <div className="section-title-row"><div><span className="section-kicker">компании мира</span><h3>Активные производители</h3></div><span className="status-chip neutral">{state.world?.companies.length ?? 0} компаний</span></div>
        <div className="company-grid">
          {state.world?.companies.map((company) => (
            <article key={company.id} className="world-company-card glass-card">
              <div className="company-monogram">{company.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
              <div className="company-card-head"><span>{company.country}</span><i className={company.status} /></div>
              <h4>{company.name}</h4>
              <p>{company.focus}</p>
              <div className="release-block"><small>актуальный релиз</small><strong>{company.activeRelease}</strong></div>
              <div className="momentum-row"><span>Импульс</span><div><i style={{ width: `${company.momentum}%` }} /></div><b>{company.momentum}</b></div>
              <div className="company-footer"><span>Репутация {company.reputation}</span><span>{company.status === 'growing' ? 'растёт' : company.status === 'struggling' ? 'теряет позиции' : 'стабильна'}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="market-feed glass-card">
        <div className="card-heading"><div><span className="section-kicker">лента рынка</span><h3>События и сигналы</h3></div><Icon name="market" className="heading-icon" /></div>
        <div className="feed-list">
          {state.world?.pulse.map((item) => (
            <article key={item.id} className={`feed-item ${item.tone}`}>
              <div className="feed-icon"><Icon name={item.tone === 'warning' ? 'warning' : item.tone === 'release' ? 'spark' : 'market'} /></div>
              <div><span>День {item.day}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="channel-preview glass-card">
        <div className="card-heading"><div><span className="section-kicker">каналы сбыта</span><h3>Куда пойдёт первая партия</h3></div></div>
        <div className="channel-grid">
          <Channel title="Независимые бары" count="18 точек" text="Берут малые объёмы, требуют образец и понятную маржу." accent="warm" />
          <Channel title="Обычные магазины" count="31 точка" text="Ищут стабильность, понятную этикетку и повторяемые поставки." accent="cool" />
          <Channel title="Спецмагазины" count="9 точек" text="Жёстко отбирают продукт, но способны раскрыть нишевый релиз." accent="violet" />
        </div>
        <div className="system-note"><Icon name="clock" /><span>Переговоры, образцы и контракты подключаются следующим вертикальным срезом. Уже разлитые партии сохранятся и будут доступны для предложений.</span></div>
      </section>
    </div>
  );
}

function Channel({ title, count, text, accent }: { title: string; count: string; text: string; accent: string }) {
  return <article className={`channel-card ${accent}`}><div><span /><span /><span /></div><strong>{title}</strong><b>{count}</b><p>{text}</p></article>;
}
