import type { MarketChannel } from './market';
import type { BatchState } from './production';

export type BrandPositioning = 'mass' | 'local' | 'premium' | 'experimental' | 'bar';
export type PackageForm = 'stubby' | 'longneck' | 'wine';
export type GlassTone = 'smoke' | 'black' | 'clear';
export type LabelStyle = 'minimal' | 'editorial' | 'industrial' | 'heritage';
export type ClosureStyle = 'crown' | 'swing' | 'cork';
export type CampaignType = 'bar_tasting' | 'festival' | 'trade_press' | 'local_ads' | 'shelf_promo';
export type CampaignStatus = 'active' | 'completed';

export interface PlayerBrand {
  id: string;
  name: string;
  tagline: string;
  positioning: BrandPositioning;
  story: string;
  reputation: number;
  awareness: number;
  createdDay: number;
}

export interface PackagingDesign {
  form: PackageForm;
  glass: GlassTone;
  label: LabelStyle;
  closure: ClosureStyle;
  volumeMl: 330 | 500 | 750;
  carton: boolean;
}

export interface ProductRelease {
  id: string;
  brandId: string;
  batchId: string;
  name: string;
  launchedDay: number;
  positioning: BrandPositioning;
  packaging: PackagingDesign;
  wholesalePrice: number;
  retailPrice: number;
  setupCost: number;
  unitPackagingCost: number;
  visualAppeal: number;
  priceSignal: number;
  audienceClarity: number;
  awareness: number;
  status: 'active' | 'retired';
}

export interface PromotionCampaign {
  id: string;
  releaseId: string;
  type: CampaignType;
  regionId: string;
  startedDay: number;
  endDay: number;
  cost: number;
  awarenessGain: number;
  status: CampaignStatus;
  report: string;
}

export interface BrandState {
  brands: PlayerBrand[];
  releases: ProductRelease[];
  campaigns: PromotionCampaign[];
  nextBrandNumber: number;
  nextReleaseNumber: number;
  nextCampaignNumber: number;
}

export interface BrandDraft {
  name: string;
  tagline: string;
  positioning: BrandPositioning;
  story: string;
}

export interface ReleaseDraft {
  brandId: string;
  batchId: string;
  name: string;
  positioning: BrandPositioning;
  packaging: PackagingDesign;
  wholesalePrice: number;
  retailPrice: number;
}

export const DEFAULT_PACKAGING: PackagingDesign = {
  form: 'longneck',
  glass: 'black',
  label: 'minimal',
  closure: 'crown',
  volumeMl: 500,
  carton: false,
};

export const CAMPAIGN_CATALOG: Record<CampaignType, { name: string; cost: number; days: number; gain: number; channels: MarketChannel[] }> = {
  bar_tasting: { name: 'Дегустация в баре', cost: 950, days: 2, gain: 11, channels: ['bar'] },
  festival: { name: 'Городской фестиваль', cost: 2400, days: 3, gain: 19, channels: ['bar', 'specialty'] },
  trade_press: { name: 'Публикация для рынка', cost: 1750, days: 4, gain: 14, channels: ['specialty'] },
  local_ads: { name: 'Локальная реклама', cost: 1350, days: 3, gain: 12, channels: ['store', 'bar'] },
  shelf_promo: { name: 'Продвижение на полке', cost: 1100, days: 2, gain: 10, channels: ['store', 'specialty'] },
};

export function createBrandState(): BrandState {
  return { brands: [], releases: [], campaigns: [], nextBrandNumber: 1, nextReleaseNumber: 1, nextCampaignNumber: 1 };
}

export function createBrand(state: BrandState, draft: BrandDraft, day: number): { state: BrandState; brand: PlayerBrand; cost: number } {
  const name = draft.name.trim();
  if (name.length < 2) throw new Error('Название бренда должно содержать минимум 2 символа');
  if (state.brands.some((brand) => brand.name.toLowerCase() === name.toLowerCase())) throw new Error('Бренд с таким названием уже существует');
  const cost = 800;
  const brand: PlayerBrand = {
    id: `brand-${day}-${state.nextBrandNumber}`,
    name,
    tagline: draft.tagline.trim().slice(0, 72),
    positioning: draft.positioning,
    story: draft.story.trim().slice(0, 280),
    reputation: 0,
    awareness: 4,
    createdDay: day,
  };
  return { state: { ...state, brands: [brand, ...state.brands], nextBrandNumber: state.nextBrandNumber + 1 }, brand, cost };
}

export function createRelease(state: BrandState, draft: ReleaseDraft, batch: BatchState, day: number): { state: BrandState; release: ProductRelease; cost: number } {
  const brand = state.brands.find((item) => item.id === draft.brandId);
  if (!brand) throw new Error('Сначала создай бренд');
  if (batch.status !== 'packaged') throw new Error('Релиз создаётся только из разлитой партии');
  if (state.releases.some((release) => release.batchId === batch.id && release.status === 'active')) throw new Error('Для этой партии уже существует активный релиз');
  const name = draft.name.trim();
  if (name.length < 2) throw new Error('Укажи название продукта');
  if (draft.wholesalePrice <= 0 || draft.retailPrice <= draft.wholesalePrice) throw new Error('Розничная цена должна быть выше оптовой');

  const setupCost = packagingSetupCost(draft.packaging);
  const unitPackagingCost = packagingUnitCost(draft.packaging);
  const visualAppeal = packagingAppeal(draft.packaging, draft.positioning);
  const priceSignal = clamp(Math.round((draft.retailPrice / Math.max(0.1, draft.wholesalePrice)) * 32), 25, 100);
  const audienceClarity = positioningClarity(draft.positioning, draft.packaging.label);
  const release: ProductRelease = {
    id: `product-${day}-${state.nextReleaseNumber}`,
    brandId: brand.id,
    batchId: batch.id,
    name,
    launchedDay: day,
    positioning: draft.positioning,
    packaging: draft.packaging,
    wholesalePrice: roundMoney(draft.wholesalePrice),
    retailPrice: roundMoney(draft.retailPrice),
    setupCost,
    unitPackagingCost,
    visualAppeal,
    priceSignal,
    audienceClarity,
    awareness: clamp(Math.round(brand.awareness * 0.55 + visualAppeal * 0.18), 3, 55),
    status: 'active',
  };
  return {
    state: { ...state, releases: [release, ...state.releases], nextReleaseNumber: state.nextReleaseNumber + 1 },
    release,
    cost: roundMoney(setupCost + unitPackagingCost * Math.min(batch.availableUnits, 48)),
  };
}

export function launchCampaign(state: BrandState, releaseId: string, type: CampaignType, regionId: string, day: number, teamBonus = 0): { state: BrandState; campaign: PromotionCampaign; cost: number } {
  const release = state.releases.find((item) => item.id === releaseId && item.status === 'active');
  if (!release) throw new Error('Активный релиз не найден');
  if (state.campaigns.some((campaign) => campaign.releaseId === releaseId && campaign.status === 'active')) throw new Error('Для релиза уже идёт рекламная кампания');
  const definition = CAMPAIGN_CATALOG[type];
  const campaign: PromotionCampaign = {
    id: `campaign-${day}-${state.nextCampaignNumber}`,
    releaseId,
    type,
    regionId,
    startedDay: day,
    endDay: day + definition.days,
    cost: definition.cost,
    awarenessGain: clamp(definition.gain + Math.round(teamBonus), definition.gain, definition.gain + 8),
    status: 'active',
    report: `${definition.name} запущена. Результат появится на ${day + definition.days}-й день.`,
  };
  return { state: { ...state, campaigns: [campaign, ...state.campaigns], nextCampaignNumber: state.nextCampaignNumber + 1 }, campaign, cost: definition.cost };
}

export function advanceBrandDay(state: BrandState, day: number): BrandState {
  let releases = state.releases;
  let brands = state.brands;
  const campaigns = state.campaigns.map((campaign) => {
    if (campaign.status !== 'active' || campaign.endDay > day) return campaign;
    const release = releases.find((item) => item.id === campaign.releaseId);
    if (!release) return { ...campaign, status: 'completed' as const, report: 'Кампания завершилась без активного продукта.' };
    const deterministicSwing = ((day + campaign.id.length + release.visualAppeal) % 9) - 3;
    const gain = clamp(campaign.awarenessGain + deterministicSwing, 4, 28);
    releases = releases.map((item) => item.id === release.id ? { ...item, awareness: clamp(item.awareness + gain, 0, 100) } : item);
    brands = brands.map((item) => item.id === release.brandId ? { ...item, awareness: clamp(item.awareness + Math.round(gain * 0.45), 0, 100), reputation: clamp(item.reputation + (gain >= 16 ? 2 : 1), 0, 100) } : item);
    return { ...campaign, status: 'completed' as const, report: `Кампания завершена: узнаваемость релиза выросла на ${gain} пунктов.` };
  });
  return { ...state, releases, brands, campaigns };
}

export function commercialScoreForBatch(state: BrandState, batchId: string, channel: MarketChannel): number {
  const release = state.releases.find((item) => item.batchId === batchId && item.status === 'active');
  if (!release) return -4;
  const brand = state.brands.find((item) => item.id === release.brandId);
  const channelFit = release.positioning === 'bar' && channel === 'bar' ? 8
    : release.positioning === 'mass' && channel === 'store' ? 7
      : release.positioning === 'premium' && channel === 'specialty' ? 8
        : release.positioning === 'experimental' && channel === 'specialty' ? 6
          : release.positioning === 'local' ? 4 : 0;
  return clamp(Math.round(release.visualAppeal * 0.08 + release.audienceClarity * 0.07 + release.awareness * 0.06 + (brand?.reputation ?? 0) * 0.05 + channelFit - 12), -8, 18);
}

export function activeReleaseForBatch(state: BrandState, batchId: string): ProductRelease | undefined {
  return state.releases.find((item) => item.batchId === batchId && item.status === 'active');
}

export function positioningLabel(value: BrandPositioning): string {
  return { mass: 'Массовый', local: 'Локальный', premium: 'Премиальный', experimental: 'Экспериментальный', bar: 'Барный' }[value];
}

export function campaignLabel(value: CampaignType): string { return CAMPAIGN_CATALOG[value].name; }

function packagingSetupCost(packaging: PackagingDesign): number {
  return 420 + (packaging.label === 'editorial' ? 380 : packaging.label === 'heritage' ? 260 : packaging.label === 'industrial' ? 180 : 120)
    + (packaging.form === 'wine' ? 280 : packaging.form === 'stubby' ? 90 : 140)
    + (packaging.carton ? 260 : 0);
}

function packagingUnitCost(packaging: PackagingDesign): number {
  return roundMoney(0.08 + (packaging.volumeMl === 750 ? 0.16 : packaging.volumeMl === 330 ? 0.05 : 0.09)
    + (packaging.closure === 'cork' ? 0.22 : packaging.closure === 'swing' ? 0.17 : 0.05)
    + (packaging.carton ? 0.14 : 0));
}

function packagingAppeal(packaging: PackagingDesign, positioning: BrandPositioning): number {
  let score = 48;
  if (packaging.glass === 'black') score += 8;
  if (packaging.label === 'minimal') score += positioning === 'premium' || positioning === 'local' ? 11 : 5;
  if (packaging.label === 'industrial') score += positioning === 'experimental' || positioning === 'bar' ? 10 : 3;
  if (packaging.label === 'editorial') score += positioning === 'premium' ? 12 : 7;
  if (packaging.label === 'heritage') score += positioning === 'local' ? 11 : 4;
  if (packaging.closure === 'cork') score += positioning === 'premium' ? 8 : 2;
  if (packaging.form === 'stubby') score += positioning === 'bar' ? 7 : 3;
  if (packaging.carton) score += 4;
  return clamp(score, 20, 95);
}

function positioningClarity(positioning: BrandPositioning, label: LabelStyle): number {
  const fit: Record<BrandPositioning, LabelStyle[]> = {
    mass: ['minimal', 'editorial'],
    local: ['heritage', 'minimal'],
    premium: ['editorial', 'minimal'],
    experimental: ['industrial', 'editorial'],
    bar: ['industrial', 'minimal'],
  };
  return fit[positioning].includes(label) ? 82 : 58;
}

function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
