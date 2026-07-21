import type { BatchState, ProductFamily, QualityProfile } from './production';

export type MarketChannel = 'bar' | 'store' | 'specialty';
export type ContactMode = 'sample' | 'meeting';
export type ProposalStatus = 'reviewing' | 'offer' | 'rejected' | 'completed' | 'declined';

export interface OutletWeights {
  technicalPurity: number;
  balance: number;
  complexity: number;
  originality: number;
  clarity: number;
  styleFit: number;
  character: number;
}

export interface MarketOutletState {
  id: string;
  name: string;
  city: string;
  countryId: string;
  regionId: string;
  channel: MarketChannel;
  audience: string;
  summary: string;
  targetFamilies: ProductFamily[];
  minTechnicalPurity: number;
  maxDefectRisk: number;
  preferredWholesale: [number, number];
  minOrder: number;
  maxOrder: number;
  acceptanceThreshold: number;
  reviewDays: number;
  relationship: number;
  requirementTags: string[];
  weights: OutletWeights;
  supplierCompanyIds: string[];
}

export interface MarketProposal {
  id: string;
  outletId: string;
  batchId: string;
  createdDay: number;
  reviewDay: number;
  contactMode: ContactMode;
  askingPrice: number;
  requestedUnits: number;
  sampleUnits: number;
  status: ProposalStatus;
  fitScore: number | null;
  offeredPrice: number | null;
  offeredUnits: number | null;
  decisionReasons: string[];
}

export interface SupplyContract {
  id: string;
  outletId: string;
  batchId: string;
  signedDay: number;
  unitPrice: number;
  units: number;
  grossRevenue: number;
  repeatPotential: number;
  status: 'fulfilled';
}

export interface MarketSale {
  id: string;
  contractId: string;
  outletId: string;
  batchId: string;
  day: number;
  units: number;
  unitPrice: number;
  revenue: number;
}

export interface ProposalInput {
  outletId: string;
  batchId: string;
  contactMode: ContactMode;
  askingPrice: number;
  requestedUnits: number;
}

export interface EvaluatedProposal extends MarketProposal {
  status: 'offer' | 'rejected';
  fitScore: number;
  offeredPrice: number | null;
  offeredUnits: number | null;
}

export function proposalActionCost(contactMode: ContactMode): number {
  return contactMode === 'meeting' ? 180 : 45;
}

export function proposalSampleUnits(contactMode: ContactMode): number {
  return contactMode === 'meeting' ? 1 : 2;
}

export function createProposal(
  input: ProposalInput,
  day: number,
  number: number,
  outlet: MarketOutletState,
): MarketProposal {
  if (!Number.isFinite(input.askingPrice) || input.askingPrice <= 0) throw new Error('Укажи корректную оптовую цену');
  if (!Number.isInteger(input.requestedUnits) || input.requestedUnits < outlet.minOrder) {
    throw new Error(`Минимальная заявка для этой точки — ${outlet.minOrder} бутылок`);
  }
  if (input.requestedUnits > outlet.maxOrder) throw new Error(`Точка принимает не более ${outlet.maxOrder} бутылок за поставку`);

  return {
    id: `proposal-${day}-${number}`,
    outletId: input.outletId,
    batchId: input.batchId,
    createdDay: day,
    reviewDay: day + Math.max(1, outlet.reviewDays - (input.contactMode === 'meeting' ? 1 : 0)),
    contactMode: input.contactMode,
    askingPrice: roundMoney(input.askingPrice),
    requestedUnits: input.requestedUnits,
    sampleUnits: proposalSampleUnits(input.contactMode),
    status: 'reviewing',
    fitScore: null,
    offeredPrice: null,
    offeredUnits: null,
    decisionReasons: input.contactMode === 'meeting'
      ? ['Личная встреча повысила внимание закупщика к образцу.']
      : ['Образец передан на внутреннюю дегустацию.'],
  };
}

export function evaluateProposal(
  proposal: MarketProposal,
  outlet: MarketOutletState,
  batch: BatchState,
  companyReputation: number,
): EvaluatedProposal {
  const quality = batch.quality;
  const familyMatch = outlet.targetFamilies.includes(batch.recipe.family);
  const qualityScore = weightedQuality(quality, outlet.weights);
  const relationshipBonus = outlet.relationship * 0.22;
  const reputationBonus = companyReputation * 0.12;
  const meetingBonus = proposal.contactMode === 'meeting' ? 4 : 0;
  const familyModifier = familyMatch ? 6 : -16;
  const priceModifier = priceFitModifier(proposal.askingPrice, outlet.preferredWholesale);
  const score = clamp(Math.round(qualityScore + relationshipBonus + reputationBonus + meetingBonus + familyModifier + priceModifier), 0, 100);

  const hardFailures: string[] = [];
  if (!familyMatch) hardFailures.push('Категория напитка не входит в текущую закупочную матрицу точки.');
  if (quality.technicalPurity < outlet.minTechnicalPurity) hardFailures.push(`Техническая чистота ниже минимального уровня ${outlet.minTechnicalPurity}.`);
  if (quality.defectRisk > outlet.maxDefectRisk) hardFailures.push(`Риск дефектов выше допустимого уровня ${outlet.maxDefectRisk}.`);

  const reasons = [...proposal.decisionReasons, ...buildDecisionReasons(quality, outlet, proposal.askingPrice)];
  if (hardFailures.length > 0 || score < outlet.acceptanceThreshold - 8) {
    return {
      ...proposal,
      status: 'rejected',
      fitScore: score,
      offeredPrice: null,
      offeredUnits: null,
      decisionReasons: [...reasons, ...hardFailures, score < outlet.acceptanceThreshold - 8 ? 'Общий коммерческий профиль оказался слабее текущих альтернатив.' : ''],
    };
  }

  const preferredMax = outlet.preferredWholesale[1];
  const qualityPremium = Math.max(0, (score - outlet.acceptanceThreshold) * 0.012);
  const priceCap = roundMoney(preferredMax + qualityPremium);
  const offeredPrice = roundMoney(Math.min(proposal.askingPrice, priceCap));
  const demandFactor = clamp((score - 42) / 45, 0.35, 1);
  const offeredUnits = Math.max(outlet.minOrder, Math.min(proposal.requestedUnits, Math.floor(outlet.maxOrder * demandFactor)));
  const isCounter = offeredPrice + 0.01 < proposal.askingPrice || offeredUnits < proposal.requestedUnits;

  return {
    ...proposal,
    status: 'offer',
    fitScore: score,
    offeredPrice,
    offeredUnits,
    decisionReasons: [
      ...reasons,
      isCounter ? 'Точка готова начать с ограниченной тестовой поставки.' : 'Профиль соответствует аудитории и текущей полке.',
    ],
  };
}

export function repeatPotential(score: number, relationship: number): number {
  return clamp(Math.round(score * 0.72 + relationship * 0.28), 0, 100);
}

export function channelLabel(channel: MarketChannel): string {
  if (channel === 'bar') return 'Бар';
  if (channel === 'specialty') return 'Спецмагазин';
  return 'Магазин';
}

function weightedQuality(quality: QualityProfile, weights: OutletWeights): number {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) return 0;
  const score = (
    quality.technicalPurity * weights.technicalPurity
    + quality.balance * weights.balance
    + quality.complexity * weights.complexity
    + quality.originality * weights.originality
    + quality.clarity * weights.clarity
    + quality.styleFit * weights.styleFit
    + quality.character * weights.character
  ) / totalWeight;
  return score;
}

function priceFitModifier(price: number, preferred: [number, number]): number {
  const [min, max] = preferred;
  if (price >= min && price <= max) return 6;
  if (price < min) return 2;
  const excess = (price - max) / Math.max(0.01, max);
  return -Math.min(24, excess * 42);
}

function buildDecisionReasons(quality: QualityProfile, outlet: MarketOutletState, askingPrice: number): string[] {
  const reasons: string[] = [];
  if (quality.technicalPurity >= outlet.minTechnicalPurity + 8) reasons.push('Техническая чистота уверенно проходит требования точки.');
  if (quality.originality >= 70 && outlet.weights.originality >= 1.2) reasons.push('Необычный профиль может выделиться среди текущих поставщиков.');
  if (quality.clarity >= 72 && outlet.channel === 'store') reasons.push('Понятный стиль упрощает продажу с полки.');
  if (quality.character >= 72 && outlet.channel !== 'store') reasons.push('Выраженный характер подходит аудитории заведения.');
  if (askingPrice > outlet.preferredWholesale[1]) reasons.push('Запрошенная цена выше комфортного закупочного диапазона.');
  if (askingPrice < outlet.preferredWholesale[0]) reasons.push('Цена привлекательна, но закупщик проверяет стабильность и маржу бренда.');
  if (quality.defectRisk >= outlet.maxDefectRisk - 8) reasons.push('Закупщик отметил риск нестабильности партии.');
  return reasons.slice(0, 4);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
