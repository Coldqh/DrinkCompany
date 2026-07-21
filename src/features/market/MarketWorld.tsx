import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState, WorldCompanyState } from '../../domain/game';
import { channelLabel, proposalActionCost, type ContactMode, type MarketChannel, type MarketOutletState, type MarketProposal, type ProposalInput } from '../../domain/market';
import type { BatchState } from '../../domain/production';
import { Icon } from '../../ui/Icon';
import { CompactHeader, EmptyState, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

type MarketSection = 'sales' | 'negotiations' | 'ecosystem';
type OutletFilter = 'local' | 'all' | MarketChannel;
type EcosystemSection = 'companies' | 'pulse';

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
  const [dealOutlet, setDealOutlet] = useState<MarketOutletState | null>(null);
  const [proposalModal, setProposalModal] = useState<MarketProposal | null>(null);
  const [companyModal, setCompanyModal] = useState<WorldCompanyState | null>(null);
  const [ecosystemSection, setEcosystemSection] = useState<EcosystemSection>('companies');
  const [contactMode, setContactMode] = useState<ContactMode>('sample');
  const [askingPrice, setAskingPrice] = useState(2.7);
  const [requestedUnits, setRequestedUnits] = useState(24);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  const selectedBatch = packagedBatches.find((batch) => batch.id === selectedBatchId) ?? packagedBatches[0] ?? null;
  const outlets = world?.outlets ?? [];
  const visibleOutlets = useMemo(() => outlets.filter((outlet) => {
    if (filter === 'all') return true;
    if (filter === 'local') return outlet.regionId === world?.regionId || outlet.countryId === world?.countryId;
    return outlet.channel === filter;
  }), [filter, outlets, world?.countryId, world?.regionId]);

  if (!world) return null;

  const reviewing = world.proposals.filter((proposal) => proposal.status === 'reviewing').length;
  const offers = world.proposals.filter((proposal) => proposal.status === 'offer').length;
  const stock = packagedBatches.reduce((sum, batch) => sum + batch.availableUnits, 0);

  function openDeal(outlet: MarketOutletState) {
    setDealOutlet(outlet);
    setAskingPrice(roundMoney((outlet.preferredWholesale[0] + outlet.preferredWholesale[1]) / 2));
    setRequestedUnits(outlet.minOrder);
  }

  function sendProposal() {
    if (!selectedBatch || !dealOutlet) {
      showFeedback({ ok: false, message: 'Выбери партию и точку сбыта' });
      return;
    }
    const result = onSendProposal({ outletId: dealOutlet.id, batchId: selectedBatch.id, contactMode, askingPrice, requestedUnits });
    showFeedback(result);
    if (result.ok) {
      setDealOutlet(null);
      setSection('negotiations');
    }
  }

  function showFeedback(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3200);
  }

  return (
    <div className="screen-stack market-compact">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <CompactHeader kicker="Рынок" title="Сбыт и экосистема" meta={`${world.outlets.length} точек · ${world.companies.length} компаний · ${offers} офферов`} action={<div className="market-pulse-dot"><Icon name="market" /><i /></div>} />

      <section className="mini-stat-grid four-tight">
        <MiniStat label="Склад" value={`${stock}`} note="бутылок" tone="warm" />
        <MiniStat label="Ответы" value={`${reviewing}`} note="ждём" tone="blue" />
        <MiniStat label="Офферы" value={`${offers}`} note="решить" tone="green" />
        <MiniStat label="Продажи" value={formatMoney(state.finance.salesRevenue)} note="всего" />
      </section>

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'sales', label: 'Сбыт' },
        { id: 'negotiations', label: 'Сделки', badge: offers || reviewing },
        { id: 'ecosystem', label: 'Мир' },
      ]} />

      {section === 'sales' && (
        <>
          {packagedBatches.length === 0 ? (
            <section className="glass-card"><EmptyState icon="bottle" title="Нет товара для предложения" text="Сначала доведи партию до дегустации и розлива." /></section>
          ) : (
            <>
              <section className="stock-strip glass-card">
                <div className="stock-strip-head"><span>Товар для предложения</span><strong>{selectedBatch?.availableUnits ?? 0} бут.</strong></div>
                <div className="stock-chips">
                  {packagedBatches.map((batch) => <button key={batch.id} className={selectedBatch?.id === batch.id ? 'active' : ''} onClick={() => setSelectedBatchId(batch.id)}><span>{batch.code}</span><strong>{batch.recipe.name}</strong><small>{batch.availableUnits} бут.</small></button>)}
                </div>
              </section>

              <div className="filter-pills">
                {([['local', 'Рядом'], ['all', 'Все'], ['bar', 'Бары'], ['store', 'Магазины'], ['specialty', 'Спец']] as [OutletFilter, string][]).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
              </div>

              <section className="compact-list glass-card outlet-list">
                {visibleOutlets.map((outlet) => {
                  const currentProposal = world.proposals.find((proposal) => proposal.outletId === outlet.id && selectedBatch && proposal.batchId === selectedBatch.id && ['reviewing', 'offer'].includes(proposal.status));
                  return (
                    <button key={outlet.id} className="compact-list-row outlet-row" onClick={() => openDeal(outlet)}>
                      <span className={`row-icon channel-${outlet.channel}`}><Icon name={outlet.channel === 'bar' ? 'beer' : 'store'} /></span>
                      <span><strong>{outlet.name}</strong><small>{outlet.city} · {channelLabel(outlet.channel)} · связь {outlet.relationship}</small></span>
                      <span className={`outlet-fit ${currentProposal ? 'busy' : ''}`}>{currentProposal ? (currentProposal.status === 'offer' ? 'оффер' : 'ответ ждём') : `${outlet.preferredWholesale[0].toFixed(2)}–${outlet.preferredWholesale[1].toFixed(2)}`}</span>
                    </button>
                  );
                })}
              </section>
            </>
          )}
        </>
      )}

      {section === 'negotiations' && (
        <>
          {world.proposals.length === 0 ? (
            <section className="glass-card"><EmptyState icon="handshake" title="Переговоров пока нет" text="Открой сбыт, выбери готовую партию и свяжись с закупщиком." /></section>
          ) : (
            <section className="compact-list glass-card proposal-rows">
              {world.proposals.map((proposal) => {
                const outlet = world.outlets.find((item) => item.id === proposal.outletId);
                const batch = state.production.batches.find((item) => item.id === proposal.batchId);
                return (
                  <button key={proposal.id} className="compact-list-row" onClick={() => setProposalModal(proposal)}>
                    <span className={`row-icon proposal-${proposal.status}`}><Icon name={proposal.status === 'offer' ? 'contract' : proposal.status === 'rejected' ? 'warning' : 'handshake'} /></span>
                    <span><strong>{outlet?.name ?? 'Точка'}</strong><small>{batch?.code} · {proposal.requestedUnits} × {proposal.askingPrice.toFixed(2)}</small></span>
                    <ProposalStatus status={proposal.status} currentDay={state.day} reviewDay={proposal.reviewDay} />
                  </button>
                );
              })}
            </section>
          )}
          <section className="sales-summary glass-card">
            <div><span>Закрыто поставок</span><strong>{world.sales.length}</strong></div>
            <div><span>Продано бутылок</span><strong>{state.finance.unitsSold}</strong></div>
            <div><span>Выручка</span><strong>{formatMoney(state.finance.salesRevenue)}</strong></div>
          </section>
        </>
      )}

      {section === 'ecosystem' && (
        <>
          <SubTabs value={ecosystemSection} onChange={setEcosystemSection} options={[{ id: 'companies', label: 'Компании' }, { id: 'pulse', label: 'События', badge: world.pulse.length }]} />
          {ecosystemSection === 'companies' ? (
            <section className="compact-list glass-card company-list">
              {world.companies.map((company) => {
                const placements = world.outlets.filter((outlet) => outlet.supplierCompanyIds.includes(company.id)).length;
                return <button key={company.id} className="compact-list-row" onClick={() => setCompanyModal(company)}><span className={`company-badge ${company.status}`}>{monogram(company.name)}</span><span><strong>{company.name}</strong><small>{company.country} · {company.category} · {placements} полок</small></span><span className="momentum-number">{company.momentum}</span></button>;
              })}
            </section>
          ) : (
            <section className="compact-list glass-card pulse-list">
              {world.pulse.map((item) => <div key={item.id} className="compact-list-row static"><span className={`row-icon pulse-${item.tone}`}><Icon name={item.tone === 'warning' ? 'warning' : item.tone === 'release' ? 'spark' : 'market'} /></span><span><strong>{item.title}</strong><small>День {item.day} · {item.detail}</small></span></div>)}
            </section>
          )}
        </>
      )}

      {dealOutlet && selectedBatch && (
        <DealModal outlet={dealOutlet} batch={selectedBatch} contactMode={contactMode} setContactMode={setContactMode} askingPrice={askingPrice} setAskingPrice={setAskingPrice} requestedUnits={requestedUnits} setRequestedUnits={setRequestedUnits} onClose={() => setDealOutlet(null)} onSend={sendProposal} />
      )}

      {proposalModal && (
        <ProposalModal state={state} proposal={proposalModal} onClose={() => setProposalModal(null)} onAccept={() => { showFeedback(onAcceptOffer(proposalModal.id)); setProposalModal(null); }} onDecline={() => { showFeedback(onDeclineOffer(proposalModal.id)); setProposalModal(null); }} />
      )}

      {companyModal && <CompanyModal state={state} company={companyModal} onClose={() => setCompanyModal(null)} />}
    </div>
  );
}

function DealModal({ outlet, batch, contactMode, setContactMode, askingPrice, setAskingPrice, requestedUnits, setRequestedUnits, onClose, onSend }: { outlet: MarketOutletState; batch: BatchState; contactMode: ContactMode; setContactMode: (value: ContactMode) => void; askingPrice: number; setAskingPrice: (value: number) => void; requestedUnits: number; setRequestedUnits: (value: number) => void; onClose: () => void; onSend: () => void }) {
  const maxUnits = Math.max(outlet.minOrder, Math.min(outlet.maxOrder, batch.availableUnits - (contactMode === 'meeting' ? 1 : 2)));
  return (
    <Modal title={outlet.name} kicker={`${outlet.city} · ${channelLabel(outlet.channel)}`} onClose={onClose} footer={<button className="button primary" onClick={onSend}>Отправить предложение <Icon name="arrow" /></button>}>
      <p className="modal-description">{outlet.summary}</p>
      <div className="tag-cloud">{outlet.requirementTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="detail-grid">
        <div><span>Закупочная цена</span><strong>{outlet.preferredWholesale[0].toFixed(2)}–{outlet.preferredWholesale[1].toFixed(2)}</strong></div>
        <div><span>Объём</span><strong>{outlet.minOrder}–{outlet.maxOrder}</strong></div>
        <div><span>Связь</span><strong>{outlet.relationship}/100</strong></div>
        <div><span>На складе</span><strong>{batch.availableUnits} бут.</strong></div>
      </div>
      <div className="modal-form">
        <label><span>Способ контакта</span><div className="choice-buttons"><button className={contactMode === 'sample' ? 'active' : ''} onClick={() => setContactMode('sample')}><Icon name="sample" />Образцы · {proposalActionCost('sample')}</button><button className={contactMode === 'meeting' ? 'active' : ''} onClick={() => setContactMode('meeting')}><Icon name="handshake" />Встреча · {proposalActionCost('meeting')}</button></div></label>
        <label><span>Цена за бутылку</span><div className="number-field"><input type="number" min="0.5" max="12" step="0.05" value={askingPrice} onChange={(event) => setAskingPrice(Number(event.target.value))} /><b>{marginPercent(askingPrice, batch)}% маржа</b></div></label>
        <label><span>Объём поставки</span><div className="number-field"><input type="number" min={outlet.minOrder} max={maxUnits} step="6" value={Math.min(requestedUnits, maxUnits)} onChange={(event) => setRequestedUnits(Number(event.target.value))} /><b>макс. {maxUnits}</b></div></label>
      </div>
      <div className="compact-banner"><Icon name="wallet" /><span><strong>Потенциальная выручка {formatMoney(askingPrice * Math.min(requestedUnits, maxUnits))}</strong><small>Закупщик может предложить меньшую цену или тестовый объём.</small></span></div>
    </Modal>
  );
}

function ProposalModal({ state, proposal, onClose, onAccept, onDecline }: { state: GameState; proposal: MarketProposal; onClose: () => void; onAccept: () => void; onDecline: () => void }) {
  const outlet = state.world?.outlets.find((item) => item.id === proposal.outletId);
  const batch = state.production.batches.find((item) => item.id === proposal.batchId);
  const footer = proposal.status === 'offer' ? <div className="modal-actions"><button className="button primary" onClick={onAccept}><Icon name="check" />Принять</button><button className="button ghost" onClick={onDecline}>Отказаться</button></div> : undefined;
  return (
    <Modal title={outlet?.name ?? 'Переговоры'} kicker={`${batch?.code ?? ''} · ${batch?.recipe.name ?? ''}`} onClose={onClose} footer={footer}>
      <div className="proposal-modal-status"><ProposalStatus status={proposal.status} currentDay={state.day} reviewDay={proposal.reviewDay} /></div>
      <div className="detail-grid">
        <div><span>Запрошено</span><strong>{proposal.requestedUnits} бут.</strong></div>
        <div><span>Цена</span><strong>{proposal.askingPrice.toFixed(2)}</strong></div>
        <div><span>Контакт</span><strong>{proposal.contactMode === 'meeting' ? 'встреча' : 'образцы'}</strong></div>
        <div><span>Совпадение</span><strong>{proposal.fitScore === null ? '—' : `${proposal.fitScore}/100`}</strong></div>
      </div>
      {proposal.status === 'offer' && proposal.offeredPrice !== null && proposal.offeredUnits !== null && <div className="offer-focus"><span>Оффер закупщика</span><strong>{proposal.offeredUnits} × {proposal.offeredPrice.toFixed(2)}</strong><small>Выручка {formatMoney(proposal.offeredUnits * proposal.offeredPrice)}</small></div>}
      <div className="reason-list">{proposal.decisionReasons.filter(Boolean).map((reason) => <div key={reason}><i /><span>{reason}</span></div>)}</div>
    </Modal>
  );
}

function CompanyModal({ state, company, onClose }: { state: GameState; company: WorldCompanyState; onClose: () => void }) {
  const placements = state.world?.outlets.filter((outlet) => outlet.supplierCompanyIds.includes(company.id)) ?? [];
  return (
    <Modal title={company.name} kicker={`${company.country} · ${company.category}`} onClose={onClose}>
      <div className={`company-modal-mark ${company.status}`}>{monogram(company.name)}</div>
      <p className="modal-description">{company.focus}</p>
      <div className="detail-grid"><div><span>Репутация</span><strong>{company.reputation}</strong></div><div><span>Импульс</span><strong>{company.momentum}</strong></div><div><span>Полки</span><strong>{placements.length}</strong></div><div><span>Статус</span><strong>{company.status === 'growing' ? 'рост' : company.status === 'struggling' ? 'спад' : 'стабильно'}</strong></div></div>
      <div className="release-focus"><span>Актуальный релиз</span><strong>{company.activeRelease}</strong></div>
      <div className="modal-list">{placements.map((outlet) => <div key={outlet.id}><span>{outlet.name}</span><b>{outlet.city}</b></div>)}</div>
    </Modal>
  );
}

function ProposalStatus({ status, currentDay, reviewDay }: { status: string; currentDay: number; reviewDay: number }) {
  const labels: Record<string, string> = { reviewing: `через ${Math.max(0, reviewDay - currentDay)} дн.`, offer: 'оффер', rejected: 'отказ', completed: 'закрыто', declined: 'отклонено' };
  return <span className={`proposal-status ${status}`}>{labels[status] ?? status}</span>;
}

function monogram(name: string): string { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function unitCost(batch: BatchState): number { return batch.packagedUnits > 0 ? (batch.productionCost + batch.packagingCost) / batch.packagedUnits : 0; }
function marginPercent(price: number, batch: BatchState): number { const cost = unitCost(batch); return price <= 0 ? 0 : Math.round(((price - cost) / price) * 100); }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
