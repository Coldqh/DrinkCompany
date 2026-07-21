import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import { channelLabel, proposalActionCost, type ContactMode, type MarketChannel, type ProposalInput } from '../../domain/market';
import type { BatchState } from '../../domain/production';
import { Icon } from '../../ui/Icon';

type MarketSection = 'sales' | 'negotiations' | 'ecosystem';
type OutletFilter = 'all' | 'local' | MarketChannel;

const radarPositions: [number, number][] = [[50, 13], [74, 22], [86, 50], [74, 76], [50, 86], [24, 76], [12, 50], [24, 22]];
const networkPositions: [number, number][] = [[50, 8], [78, 18], [88, 48], [76, 77], [50, 88], [23, 77], [10, 48], [22, 18]];

interface MarketWorldProps {
  state: GameState;
  onSendProposal: (input: ProposalInput) => ActionResult;
  onAcceptOffer: (proposalId: string) => ActionResult;
  onDeclineOffer: (proposalId: string) => ActionResult;
}

export function MarketWorld({ state, onSendProposal, onAcceptOffer, onDeclineOffer }: MarketWorldProps) {
  const world = state.world;
  const packagedBatches = state.production.batches.filter((batch) => batch.status === 'packaged' && batch.availableUnits > 0);
  const [section, setSection] = useState<MarketSection>('sales');
  const [filter, setFilter] = useState<OutletFilter>('local');
  const [selectedBatchId, setSelectedBatchId] = useState(packagedBatches[0]?.id ?? '');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [contactMode, setContactMode] = useState<ContactMode>('sample');
  const [askingPrice, setAskingPrice] = useState(2.7);
  const [requestedUnits, setRequestedUnits] = useState(24);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  const selectedBatch = packagedBatches.find((batch) => batch.id === selectedBatchId) ?? packagedBatches[0] ?? null;
  const outlets = world?.outlets ?? [];
  const selectedOutlet = outlets.find((outlet) => outlet.id === selectedOutletId) ?? null;
  const visibleOutlets = useMemo(() => outlets.filter((outlet) => {
    if (filter === 'all') return true;
    if (filter === 'local') return outlet.regionId === world?.regionId || outlet.countryId === world?.countryId;
    return outlet.channel === filter;
  }), [filter, outlets, world?.countryId, world?.regionId]);

  const reviewing = world?.proposals.filter((proposal) => proposal.status === 'reviewing').length ?? 0;
  const offers = world?.proposals.filter((proposal) => proposal.status === 'offer').length ?? 0;
  const stock = packagedBatches.reduce((sum, batch) => sum + batch.availableUnits, 0);

  function chooseOutlet(outletId: string) {
    const outlet = outlets.find((item) => item.id === outletId);
    if (!outlet) return;
    setSelectedOutletId(outletId);
    setAskingPrice(roundMoney((outlet.preferredWholesale[0] + outlet.preferredWholesale[1]) / 2));
    setRequestedUnits(outlet.minOrder);
  }

  function sendProposal() {
    if (!selectedBatch || !selectedOutlet) {
      showFeedback({ ok: false, message: 'Выбери партию и точку сбыта' });
      return;
    }
    const result = onSendProposal({
      outletId: selectedOutlet.id,
      batchId: selectedBatch.id,
      contactMode,
      askingPrice,
      requestedUnits,
    });
    showFeedback(result);
    if (result.ok) {
      setSelectedOutletId('');
      setSection('negotiations');
    }
  }

  function showFeedback(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3600);
  }

  if (!world) return null;

  return (
    <div className="market-world market-v2">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <section className="market-command glass-card">
        <div className="market-command-copy">
          <span className="section-kicker">distribution desk</span>
          <h2>Рынок состоит из конкретных людей и полок</h2>
          <p>Отправляй образцы, встречайся с закупщиками, получай отказ или оффер и решай, стоит ли отдавать партию по предложенной цене.</p>
          <div className="market-command-stats">
            <MarketMetric label="Склад" value={`${stock}`} suffix="бут." />
            <MarketMetric label="На рассмотрении" value={`${reviewing}`} suffix="заявок" />
            <MarketMetric label="Офферы" value={`${offers}`} suffix="активно" hot={offers > 0} />
            <MarketMetric label="Выручка" value={formatMoney(state.finance.salesRevenue)} suffix="всего" />
          </div>
        </div>
        <div className="market-radar" aria-hidden="true">
          <span className="radar-ring ring-a" />
          <span className="radar-ring ring-b" />
          <span className="radar-ring ring-c" />
          <i className="radar-sweep" />
          {world.outlets.slice(0, 8).map((outlet, index) => <b key={outlet.id} style={{ left: `${radarPositions[index]?.[0] ?? 50}%`, top: `${radarPositions[index]?.[1] ?? 50}%` }} />)}
          <div><Icon name="market" /><small>{world.outlets.length} точек</small></div>
        </div>
      </section>

      <nav className="market-tabs" aria-label="Разделы рынка">
        <button className={section === 'sales' ? 'active' : ''} onClick={() => setSection('sales')}><Icon name="store" />Сбыт</button>
        <button className={section === 'negotiations' ? 'active' : ''} onClick={() => setSection('negotiations')}><Icon name="handshake" />Переговоры{offers > 0 && <i>{offers}</i>}</button>
        <button className={section === 'ecosystem' ? 'active' : ''} onClick={() => setSection('ecosystem')}><Icon name="spark" />Экосистема</button>
      </nav>

      {section === 'sales' && (
        <div className="market-sales-layout">
          <section className="inventory-selector glass-card">
            <div className="card-heading"><div><span className="section-kicker">товар для предложения</span><h3>Выбери разлитую партию</h3></div><Icon name="bottle" className="heading-icon" /></div>
            {packagedBatches.length === 0 ? (
              <div className="market-empty-state"><div><Icon name="bottle" /><span /></div><strong>На складе нет готового продукта</strong><p>Доведи партию до дегустации и розлива. Рынок не принимает обещания вместо бутылок.</p></div>
            ) : (
              <div className="inventory-cards">
                {packagedBatches.map((batch) => (
                  <button key={batch.id} className={`inventory-batch-card ${selectedBatch?.id === batch.id ? 'selected' : ''}`} onClick={() => setSelectedBatchId(batch.id)}>
                    <div className="inventory-bottle"><i style={{ height: `${Math.max(20, batch.availableUnits / Math.max(1, batch.packagedUnits) * 100)}%` }} /></div>
                    <div><span>{batch.code} · {batch.recipe.family === 'beer' ? 'Пиво' : 'Сидр'}</span><strong>{batch.recipe.name}</strong><small>{batch.availableUnits} из {batch.packagedUnits} бутылок · профиль {averageMarketProfile(batch)}</small></div>
                    <b>{formatMoney(unitCost(batch))}<small>себестоимость</small></b>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="outlet-browser">
            <div className="section-title-row market-browser-title">
              <div><span className="section-kicker">карта покупателей</span><h3>Бары и магазины</h3></div>
              <span className="status-chip neutral">{visibleOutlets.length} точек</span>
            </div>
            <div className="outlet-filters">
              {([
                ['local', 'Рядом'], ['all', 'Все'], ['bar', 'Бары'], ['store', 'Магазины'], ['specialty', 'Спецточки'],
              ] as [OutletFilter, string][]).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
            </div>
            <div className="outlet-grid">
              {visibleOutlets.map((outlet) => {
                const active = outlet.id === selectedOutletId;
                const currentProposal = world.proposals.find((proposal) => proposal.outletId === outlet.id && selectedBatch && proposal.batchId === selectedBatch.id && ['reviewing', 'offer'].includes(proposal.status));
                return (
                  <button key={outlet.id} className={`outlet-card glass-card channel-${outlet.channel} ${active ? 'selected' : ''}`} onClick={() => chooseOutlet(outlet.id)}>
                    <div className="outlet-card-top">
                      <span className="outlet-channel"><Icon name={outlet.channel === 'bar' ? 'beer' : 'store'} />{channelLabel(outlet.channel)}</span>
                      <span className="outlet-relationship">связь {outlet.relationship}</span>
                    </div>
                    <h4>{outlet.name}</h4>
                    <p className="outlet-location"><Icon name="map" />{outlet.city}</p>
                    <p>{outlet.summary}</p>
                    <div className="requirement-tags">{outlet.requirementTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className="outlet-commercials">
                      <span>Цена <b>{outlet.preferredWholesale[0].toFixed(2)}–{outlet.preferredWholesale[1].toFixed(2)}</b></span>
                      <span>Заказ <b>{outlet.minOrder}–{outlet.maxOrder}</b></span>
                    </div>
                    <div className="supplier-stack">
                      {outlet.supplierCompanyIds.slice(0, 3).map((companyId) => {
                        const company = world.companies.find((item) => item.id === companyId);
                        return company ? <i key={companyId} title={company.name}>{company.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</i> : null;
                      })}
                      <small>{outlet.supplierCompanyIds.length} действующих поставщика</small>
                    </div>
                    {currentProposal && <div className={`outlet-lock ${currentProposal.status}`}><Icon name={currentProposal.status === 'offer' ? 'handshake' : 'clock'} />{currentProposal.status === 'offer' ? 'Есть оффер' : `Ответ на ${currentProposal.reviewDay}-й день`}</div>}
                  </button>
                );
              })}
            </div>
          </section>

          {selectedOutlet && selectedBatch && (
            <section className="deal-desk glass-card">
              <div className="deal-desk-head">
                <div><span className="section-kicker">коммерческое предложение</span><h3>{selectedOutlet.name}</h3><p>{selectedBatch.code} · {selectedBatch.recipe.name}</p></div>
                <button className="icon-button" onClick={() => setSelectedOutletId('')} aria-label="Закрыть"><Icon name="close" /></button>
              </div>
              <div className="deal-fit-strip">
                <div><span>Технический порог</span><strong>{selectedOutlet.minTechnicalPurity}</strong><small>у партии {selectedBatch.quality.technicalPurity}</small></div>
                <div><span>Риск дефектов</span><strong>до {selectedOutlet.maxDefectRisk}</strong><small>у партии {selectedBatch.quality.defectRisk}</small></div>
                <div><span>Категория</span><strong>{selectedOutlet.targetFamilies.includes(selectedBatch.recipe.family) ? 'подходит' : 'не подходит'}</strong><small>{selectedOutlet.targetFamilies.map((item) => item === 'beer' ? 'пиво' : 'сидр').join(', ')}</small></div>
              </div>
              <div className="contact-mode-grid">
                <button className={contactMode === 'sample' ? 'active' : ''} onClick={() => setContactMode('sample')}><Icon name="sample" /><span><strong>Отправить образцы</strong><small>2 бутылки · {formatMoney(proposalActionCost('sample'))} · ответ через {selectedOutlet.reviewDays} дн.</small></span></button>
                <button className={contactMode === 'meeting' ? 'active' : ''} onClick={() => setContactMode('meeting')}><Icon name="handshake" /><span><strong>Личная встреча</strong><small>1 бутылка · {formatMoney(proposalActionCost('meeting'))} · быстрее и сильнее связь</small></span></button>
              </div>
              <div className="deal-inputs">
                <label><span>Оптовая цена за бутылку</span><div><input type="number" min="0.5" max="12" step="0.05" value={askingPrice} onChange={(event) => setAskingPrice(Number(event.target.value))} /><b>{marginPercent(askingPrice, selectedBatch)}% маржа</b></div></label>
                <label><span>Запрашиваемый объём</span><div><input type="number" min={selectedOutlet.minOrder} max={Math.min(selectedOutlet.maxOrder, selectedBatch.availableUnits - (contactMode === 'meeting' ? 1 : 2))} step="6" value={requestedUnits} onChange={(event) => setRequestedUnits(Number(event.target.value))} /><b>из {selectedBatch.availableUnits}</b></div></label>
              </div>
              <div className="deal-summary">
                <div><span>Потенциальная выручка</span><strong>{formatMoney(askingPrice * requestedUnits)}</strong></div>
                <div><span>Рыночный диапазон</span><strong>{selectedOutlet.preferredWholesale[0].toFixed(2)}–{selectedOutlet.preferredWholesale[1].toFixed(2)}</strong></div>
                <button className="button primary glow" onClick={sendProposal}><Icon name="arrow" />Отправить предложение</button>
              </div>
            </section>
          )}
        </div>
      )}

      {section === 'negotiations' && (
        <Negotiations state={state} onAccept={(id) => showFeedback(onAcceptOffer(id))} onDecline={(id) => showFeedback(onDeclineOffer(id))} />
      )}

      {section === 'ecosystem' && <Ecosystem state={state} />}
    </div>
  );
}

function Negotiations({ state, onAccept, onDecline }: { state: GameState; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  const world = state.world;
  if (!world) return null;
  return (
    <div className="negotiation-layout">
      <section>
        <div className="section-title-row"><div><span className="section-kicker">pipeline</span><h3>Переговоры и решения</h3></div><span className="status-chip neutral">{world.proposals.length} контактов</span></div>
        {world.proposals.length === 0 ? (
          <div className="market-empty-panel glass-card"><Icon name="handshake" /><strong>Переговоров пока нет</strong><p>Выбери готовую партию и отправь образцы одной из точек.</p></div>
        ) : (
          <div className="proposal-list">
            {world.proposals.map((proposal) => {
              const outlet = world.outlets.find((item) => item.id === proposal.outletId);
              const batch = state.production.batches.find((item) => item.id === proposal.batchId);
              return (
                <article key={proposal.id} className={`proposal-card glass-card status-${proposal.status}`}>
                  <div className="proposal-track"><i /><span /><span /><b /></div>
                  <div className="proposal-head">
                    <div><span>{outlet?.city} · {outlet ? channelLabel(outlet.channel) : 'Точка'}</span><h4>{outlet?.name}</h4><p>{batch?.code} · {batch?.recipe.name}</p></div>
                    <ProposalStatus status={proposal.status} currentDay={state.day} reviewDay={proposal.reviewDay} />
                  </div>
                  <div className="proposal-numbers">
                    <span>Запрошено <b>{proposal.requestedUnits} × {proposal.askingPrice.toFixed(2)}</b></span>
                    <span>Контакт <b>{proposal.contactMode === 'meeting' ? 'личная встреча' : 'образцы'}</b></span>
                    {proposal.fitScore !== null && <span>Совпадение <b>{proposal.fitScore}/100</b></span>}
                  </div>
                  <div className="decision-reasons">{proposal.decisionReasons.slice(-3).map((reason) => reason && <p key={reason}><i />{reason}</p>)}</div>
                  {proposal.status === 'offer' && proposal.offeredPrice !== null && proposal.offeredUnits !== null && (
                    <div className="offer-sheet">
                      <div><small>предложение закупщика</small><strong>{proposal.offeredUnits} бутылок</strong><span>по {proposal.offeredPrice.toFixed(2)} · выручка {formatMoney(proposal.offeredPrice * proposal.offeredUnits)}</span></div>
                      <div><button className="button primary" onClick={() => onAccept(proposal.id)}><Icon name="check" />Принять</button><button className="button ghost" onClick={() => onDecline(proposal.id)}>Отказаться</button></div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="sales-ledger glass-card">
        <div className="card-heading"><div><span className="section-kicker">sales ledger</span><h3>История поставок</h3></div><Icon name="contract" className="heading-icon" /></div>
        {world.sales.length === 0 ? <div className="ledger-empty">Первая сделка ещё впереди.</div> : world.sales.map((sale) => {
          const outlet = world.outlets.find((item) => item.id === sale.outletId);
          const batch = state.production.batches.find((item) => item.id === sale.batchId);
          return <div key={sale.id} className="ledger-row"><span><i /><b>День {sale.day}</b></span><div><strong>{outlet?.name}</strong><small>{batch?.code} · {sale.units} бутылок</small></div><b>{formatMoney(sale.revenue)}</b></div>;
        })}
      </section>
    </div>
  );
}

function Ecosystem({ state }: { state: GameState }) {
  const world = state.world;
  if (!world) return null;
  return (
    <div className="ecosystem-layout">
      <section className="ecosystem-map glass-card">
        <div className="card-heading"><div><span className="section-kicker">living industry</span><h3>Производители существуют без игрока</h3></div><span className="status-chip positive">{world.companies.length} компаний</span></div>
        <p>Пивоварни, сидрерии, винодельни и дистиллерии занимают реальные места на полках. Их импульс меняется со временем.</p>
        <div className="ecosystem-network">
          <div className="network-core"><span>{state.company.name.slice(0, 2).toUpperCase()}</span><small>ты</small></div>
          {world.companies.slice(0, 8).map((company, index) => <div key={company.id} className={`network-node ${company.status}`} style={{ left: `${networkPositions[index]?.[0] ?? 50}%`, top: `${networkPositions[index]?.[1] ?? 50}%` }}><span>{company.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><small>{company.category}</small></div>)}
        </div>
      </section>

      <section className="world-companies">
        <div className="section-title-row"><div><span className="section-kicker">компании мира</span><h3>Текущие релизы</h3></div></div>
        <div className="company-grid ecosystem-company-grid">
          {world.companies.map((company) => {
            const placements = world.outlets.filter((outlet) => outlet.supplierCompanyIds.includes(company.id)).length;
            return (
              <article key={company.id} className="world-company-card glass-card">
                <div className="company-monogram">{company.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div className="company-card-head"><span>{company.country}</span><i className={company.status} /></div>
                <small className="company-category">{company.category}</small>
                <h4>{company.name}</h4>
                <p>{company.focus}</p>
                <div className="release-block"><small>актуальный релиз</small><strong>{company.activeRelease}</strong></div>
                <div className="momentum-row"><span>Импульс</span><div><i style={{ width: `${company.momentum}%` }} /></div><b>{company.momentum}</b></div>
                <div className="company-footer"><span>Репутация {company.reputation}</span><span>{placements} полок</span></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="market-feed glass-card">
        <div className="card-heading"><div><span className="section-kicker">лента рынка</span><h3>События и сигналы</h3></div><Icon name="market" className="heading-icon" /></div>
        <div className="feed-list">
          {world.pulse.map((item) => (
            <article key={item.id} className={`feed-item ${item.tone}`}>
              <div className="feed-icon"><Icon name={item.tone === 'warning' ? 'warning' : item.tone === 'release' ? 'spark' : 'market'} /></div>
              <div><span>День {item.day}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProposalStatus({ status, currentDay, reviewDay }: { status: string; currentDay: number; reviewDay: number }) {
  const labels: Record<string, string> = { reviewing: `ответ через ${Math.max(0, reviewDay - currentDay)} дн.`, offer: 'оффер', rejected: 'отказ', completed: 'поставка', declined: 'отклонено' };
  return <span className={`proposal-status ${status}`}>{labels[status] ?? status}</span>;
}

function MarketMetric({ label, value, suffix, hot = false }: { label: string; value: string; suffix: string; hot?: boolean }) {
  return <div className={hot ? 'hot' : ''}><span>{label}</span><strong>{value}</strong><small>{suffix}</small></div>;
}

function averageMarketProfile(batch: BatchState): number {
  const quality = batch.quality;
  return Math.round((quality.technicalPurity + quality.balance + quality.character + quality.styleFit) / 4);
}

function unitCost(batch: BatchState): number {
  return batch.packagedUnits > 0 ? (batch.productionCost + batch.packagingCost) / batch.packagedUnits : 0;
}

function marginPercent(price: number, batch: BatchState): number {
  const cost = unitCost(batch);
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
