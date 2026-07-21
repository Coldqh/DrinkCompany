import { useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import {
  CAMPAIGN_CATALOG,
  DEFAULT_PACKAGING,
  campaignLabel,
  positioningLabel,
  type BrandDraft,
  type BrandPositioning,
  type CampaignType,
  type PackagingDesign,
  type ProductRelease,
  type ReleaseDraft,
} from '../../domain/brand';
import type { GameState } from '../../domain/game';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal, SubTabs } from '../../ui/MobileUI';

type Section = 'brands' | 'packaging' | 'releases' | 'promotion';

export function BrandHub({ state, onCreateBrand, onCreateRelease, onLaunchCampaign }: {
  state: GameState;
  onCreateBrand: (draft: BrandDraft) => ActionResult;
  onCreateRelease: (draft: ReleaseDraft) => ActionResult;
  onLaunchCampaign: (releaseId: string, type: CampaignType) => ActionResult;
}) {
  const [section, setSection] = useState<Section>('brands');
  const [brandModal, setBrandModal] = useState(false);
  const [releaseModal, setReleaseModal] = useState(false);
  const [campaignRelease, setCampaignRelease] = useState<ProductRelease | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const activeReleases = state.brand.releases.filter((release) => release.status === 'active');
  const activeCampaigns = state.brand.campaigns.filter((campaign) => campaign.status === 'active');
  const awareness = state.brand.brands.length ? Math.round(state.brand.brands.reduce((sum, brand) => sum + brand.awareness, 0) / state.brand.brands.length) : 0;

  function show(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3000);
  }

  return <div className="screen-stack brand-hub">
    {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
    <section className="brand-summary-line"><span className="brand-command-mark">B</span><div><strong>Коммерческий слой</strong><small>{state.brand.brands.length} брендов · {activeReleases.length} релизов · узнаваемость {awareness}</small></div><b>{activeCampaigns.length > 0 ? `${activeCampaigns.length} камп.` : 'тихо'}</b></section>
    <SubTabs value={section} onChange={setSection} options={[
      { id: 'brands', label: 'Бренды' },
      { id: 'packaging', label: 'Упаковка' },
      { id: 'releases', label: 'Релизы', badge: activeReleases.length },
      { id: 'promotion', label: 'Продвижение', badge: activeCampaigns.length },
    ]} />

    {section === 'brands' && <>
      <button className="brand-primary-card" onClick={() => setBrandModal(true)}><span><Icon name="spark" /></span><div><strong>Создать новый бренд</strong><small>Название, позиционирование и история линейки</small></div><Icon name="arrow" /></button>
      {state.brand.brands.length === 0 ? <section className="glass-card"><EmptyState icon="market" title="Брендов пока нет" text="Создай коммерческое имя отдельно от компании." /></section> : <section className="compact-list glass-card">{state.brand.brands.map((brand) => <div className="compact-list-row static" key={brand.id}><span className="brand-list-mark">{brand.name.slice(0, 1)}</span><span><strong>{brand.name}</strong><small>{positioningLabel(brand.positioning)} · узнаваемость {brand.awareness} · репутация {brand.reputation}</small></span><span className="row-status neutral">{state.brand.releases.filter((release) => release.brandId === brand.id).length}</span></div>)}</section>}
    </>}

    {section === 'packaging' && <PackagingGallery />}

    {section === 'releases' && <>
      <button className="brand-primary-card" disabled={state.brand.brands.length === 0 || !state.production.batches.some((batch) => batch.status === 'packaged')} onClick={() => setReleaseModal(true)}><span><Icon name="bottle" /></span><div><strong>Подготовить релиз</strong><small>Связать партию, бренд, упаковку и цену</small></div><Icon name="arrow" /></button>
      {state.brand.releases.length === 0 ? <section className="glass-card"><EmptyState icon="bottle" title="Коммерческих релизов нет" text="Нужны бренд и разлитая партия." /></section> : <section className="compact-list glass-card">{state.brand.releases.map((release) => {
        const brand = state.brand.brands.find((item) => item.id === release.brandId);
        const batch = state.production.batches.find((item) => item.id === release.batchId);
        return <button key={release.id} className="compact-list-row" onClick={() => setCampaignRelease(release)}><span className="release-bottle-mark"><i /></span><span><strong>{release.name}</strong><small>{brand?.name} · {batch?.code} · {release.packaging.volumeMl} мл · узнаваемость {release.awareness}</small></span><span className="row-status neutral">{release.wholesalePrice.toFixed(2)}</span></button>;
      })}</section>}
    </>}

    {section === 'promotion' && <>
      {activeReleases.length === 0 ? <section className="glass-card"><EmptyState icon="market" title="Продвигать пока нечего" text="Сначала выпусти коммерческий релиз." /></section> : <section className="compact-list glass-card">{activeReleases.map((release) => <button key={release.id} className="compact-list-row" onClick={() => setCampaignRelease(release)}><span className="row-icon"><Icon name="market" /></span><span><strong>{release.name}</strong><small>Узнаваемость {release.awareness} · визуальная сила {release.visualAppeal}</small></span><Icon name="arrow" /></button>)}</section>}
      {state.brand.campaigns.length > 0 && <section className="compact-list glass-card">{state.brand.campaigns.map((campaign) => <div key={campaign.id} className="compact-list-row static"><span className={`row-icon ${campaign.status === 'active' ? 'proposal-reviewing' : ''}`}><Icon name={campaign.status === 'active' ? 'clock' : 'check'} /></span><span><strong>{campaignLabel(campaign.type)}</strong><small>{campaign.report}</small></span><span className="row-status neutral">{campaign.status === 'active' ? `до ${campaign.endDay}` : 'готово'}</span></div>)}</section>}
    </>}

    {brandModal && <BrandModal onClose={() => setBrandModal(false)} onCreate={(draft) => { const result = onCreateBrand(draft); show(result); if (result.ok) setBrandModal(false); }} />}
    {releaseModal && <ReleaseModal state={state} onClose={() => setReleaseModal(false)} onCreate={(draft) => { const result = onCreateRelease(draft); show(result); if (result.ok) setReleaseModal(false); }} />}
    {campaignRelease && <CampaignModal release={campaignRelease} cash={state.finance.cash} onClose={() => setCampaignRelease(null)} onLaunch={(type) => { const result = onLaunchCampaign(campaignRelease.id, type); show(result); if (result.ok) setCampaignRelease(null); }} />}
  </div>;
}

function PackagingGallery() {
  const cards: Array<[string, string, string]> = [
    ['NOIR 500', 'Чёрное стекло · минимальная этикетка', 'premium'],
    ['CELLAR 750', 'Винная форма · пробка · короб', 'heritage'],
    ['YARD 330', 'Короткая бутылка · индустриальная графика', 'industrial'],
    ['FIELD 500', 'Дымчатое стекло · редакционная сетка', 'editorial'],
  ];
  return <section className="packaging-gallery">{cards.map(([name, detail, kind]) => <article className={`package-concept ${kind}`} key={name}><div className="package-bottle"><i /><b>{name.split(' ')[0]}</b></div><div><strong>{name}</strong><small>{detail}</small></div></article>)}</section>;
}

function BrandModal({ onClose, onCreate }: { onClose: () => void; onCreate: (draft: BrandDraft) => void }) {
  const [draft, setDraft] = useState<BrandDraft>({ name: '', tagline: '', positioning: 'local', story: '' });
  return <Modal title="Новый бренд" kicker="Отдельно от компании" onClose={onClose} footer={<button className="button primary" onClick={() => onCreate(draft)}>Создать бренд</button>}>
    <div className="modal-form"><label><span>Название</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={32} /></label><label><span>Короткая фраза</span><input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} maxLength={72} /></label><label><span>Позиционирование</span><select value={draft.positioning} onChange={(event) => setDraft({ ...draft, positioning: event.target.value as BrandPositioning })}>{(['mass','local','premium','experimental','bar'] as BrandPositioning[]).map((value) => <option key={value} value={value}>{positioningLabel(value)}</option>)}</select></label><label><span>История</span><textarea value={draft.story} onChange={(event) => setDraft({ ...draft, story: event.target.value })} maxLength={280} /></label></div>
  </Modal>;
}

function ReleaseModal({ state, onClose, onCreate }: { state: GameState; onClose: () => void; onCreate: (draft: ReleaseDraft) => void }) {
  const packaged = state.production.batches.filter((batch) => batch.status === 'packaged');
  const [brandId, setBrandId] = useState(state.brand.brands[0]?.id ?? '');
  const [batchId, setBatchId] = useState(packaged[0]?.id ?? '');
  const [name, setName] = useState(packaged[0]?.recipe.name ?? '');
  const [positioning, setPositioning] = useState<BrandPositioning>(state.brand.brands[0]?.positioning ?? 'local');
  const [packaging, setPackaging] = useState<PackagingDesign>({ ...DEFAULT_PACKAGING });
  const [wholesalePrice, setWholesalePrice] = useState(2.8);
  const [retailPrice, setRetailPrice] = useState(5.2);
  return <Modal title="Новый релиз" kicker="Партия → товар" onClose={onClose} footer={<button className="button primary" onClick={() => onCreate({ brandId, batchId, name, positioning, packaging, wholesalePrice, retailPrice })}>Запустить релиз</button>}>
    <div className="modal-form"><label><span>Бренд</span><select value={brandId} onChange={(event) => setBrandId(event.target.value)}>{state.brand.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label><span>Партия</span><select value={batchId} onChange={(event) => setBatchId(event.target.value)}>{packaged.map((batch) => <option key={batch.id} value={batch.id}>{batch.code} · {batch.recipe.name}</option>)}</select></label><label><span>Название продукта</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Позиционирование</span><select value={positioning} onChange={(event) => setPositioning(event.target.value as BrandPositioning)}>{(['mass','local','premium','experimental','bar'] as BrandPositioning[]).map((value) => <option key={value} value={value}>{positioningLabel(value)}</option>)}</select></label></div>
    <div className="package-editor"><SelectLine label="Форма" value={packaging.form} options={[['stubby','Короткая'],['longneck','Longneck'],['wine','Винная']]} onChange={(form) => setPackaging({ ...packaging, form: form as PackagingDesign['form'] })} /><SelectLine label="Стекло" value={packaging.glass} options={[['black','Чёрное'],['smoke','Дымчатое'],['clear','Прозрачное']]} onChange={(glass) => setPackaging({ ...packaging, glass: glass as PackagingDesign['glass'] })} /><SelectLine label="Этикетка" value={packaging.label} options={[['minimal','Минимализм'],['editorial','Редакционная'],['industrial','Индустриальная'],['heritage','Наследие']]} onChange={(label) => setPackaging({ ...packaging, label: label as PackagingDesign['label'] })} /><SelectLine label="Объём" value={`${packaging.volumeMl}`} options={[['330','330 мл'],['500','500 мл'],['750','750 мл']]} onChange={(volume) => setPackaging({ ...packaging, volumeMl: Number(volume) as PackagingDesign['volumeMl'] })} /></div>
    <div className="detail-grid"><label><span>Опт</span><input type="number" step="0.1" value={wholesalePrice} onChange={(event) => setWholesalePrice(Number(event.target.value))} /></label><label><span>Розница</span><input type="number" step="0.1" value={retailPrice} onChange={(event) => setRetailPrice(Number(event.target.value))} /></label></div>
  </Modal>;
}

function CampaignModal({ release, cash, onClose, onLaunch }: { release: ProductRelease; cash: number; onClose: () => void; onLaunch: (type: CampaignType) => void }) {
  return <Modal title={release.name} kicker="Выбрать продвижение" onClose={onClose}><div className="campaign-grid">{(Object.keys(CAMPAIGN_CATALOG) as CampaignType[]).map((type) => { const item = CAMPAIGN_CATALOG[type]; return <button key={type} disabled={cash < item.cost} onClick={() => onLaunch(type)}><span><Icon name={type === 'bar_tasting' ? 'beer' : type === 'festival' ? 'spark' : 'market'} /></span><div><strong>{item.name}</strong><small>{item.days} дн. · прирост около {item.gain}</small></div><b>{item.cost}</b></button>; })}</div></Modal>;
}

function SelectLine({ label, value, options, onChange }: { label: string; value: string; options: [string,string][]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
