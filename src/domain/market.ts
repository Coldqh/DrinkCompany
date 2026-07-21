import type { BatchState, ProductFamily, QualityProfile } from './production';

export type MarketChannel = 'bar' | 'store' | 'specialty';
export type ContactMode = 'sample' | 'meeting';
export type ProposalStatus = 'reviewing' | 'offer' | 'rejected' | 'completed' | 'declined';
export type DemandTrend = 'rising' | 'stable' | 'falling';
export type RepeatOrderStatus = 'pending' | 'fulfilled' | 'failed' | 'expired';

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

export interface DemandSignal {
  id: string;
  countryId: string;
  regionId: string;
  family: ProductFamily;
  index: number;
  trend: DemandTrend;
  confidence: number;
  note: string;
  updatedDay: number;
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
  kind?: 'first' | 'repeat';
}

export interface RepeatOrder {
  id: string;
  outletId: string;
  referenceContractId: string;
  referenceBatchId: string;
  createdDay: number;
  dueDay: number;
  family: ProductFamily;
  styleId: string;
  units: number;
  unitPrice: number;
  minConsistency: number;
  status: RepeatOrderStatus;
  fulfilledBatchId: string | null;
  consistencyScore: number | null;
  decisionNote: string;
}

export interface ConsumerReview {
  id: string;
  contractId: string;
  outletId: string;
  batchId: string;
  day: number;
  score: number;
  headline: string;
  note: string;
  relationshipEffect: number;
}

export interface WorldRelease {
  id: string;
  companyId: string;
  day: number;
  name: string;
  category: string;
  outletId: string | null;
  impact: number;
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
  demandIndex = 50,
): EvaluatedProposal {
  const quality = batch.quality;
  const familyMatch = outlet.targetFamilies.includes(batch.recipe.family);
  const qualityScore = weightedQuality(quality, outlet.weights);
  const relationshipBonus = outlet.relationship * 0.22;
  const reputationBonus = companyReputation * 0.12;
  const meetingBonus = proposal.contactMode === 'meeting' ? 4 : 0;
  const familyModifier = familyMatch ? 6 : -16;
  const priceModifier = priceFitModifier(proposal.askingPrice, outlet.preferredWholesale);
  const demandModifier = clamp((demandIndex - 50) * 0.16, -8, 8);
  const score = clamp(Math.round(qualityScore + relationshipBonus + reputationBonus + meetingBonus + familyModifier + priceModifier + demandModifier), 0, 100);

  const hardFailures: string[] = [];
  if (!familyMatch) hardFailures.push('Категория напитка не входит в текущую закупочную матрицу точки.');
  if (quality.technicalPurity < outlet.minTechnicalPurity) hardFailures.push(`Техническая чистота ниже минимального уровня ${outlet.minTechnicalPurity}.`);
  if (quality.defectRisk > outlet.maxDefectRisk) hardFailures.push(`Риск дефектов выше допустимого уровня ${outlet.maxDefectRisk}.`);

  const reasons = [...proposal.decisionReasons, ...buildDecisionReasons(quality, outlet, proposal.askingPrice, demandIndex)];
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
  const demandFactor = clamp((score - 42) / 45 + (demandIndex - 50) / 180, 0.25, 1.15);
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

export function createRepeatOrder(
  contract: SupplyContract,
  batch: BatchState,
  day: number,
  number: number,
): RepeatOrder {
  const volumeFactor = 0.75 + ((contract.repeatPotential + day + number) % 5) * 0.08;
  const units = Math.max(12, Math.round((contract.units * volumeFactor) / 6) * 6);
  const priceShift = contract.repeatPotential >= 78 ? 0.05 : contract.repeatPotential < 64 ? -0.08 : 0;
  return {
    id: `repeat-${day}-${number}`,
    outletId: contract.outletId,
    referenceContractId: contract.id,
    referenceBatchId: contract.batchId,
    createdDay: day,
    dueDay: day + (contract.repeatPotential >= 78 ? 6 : 8),
    family: batch.recipe.family,
    styleId: batch.recipe.styleId,
    units,
    unitPrice: roundMoney(Math.max(0.5, contract.unitPrice + priceShift)),
    minConsistency: contract.repeatPotential >= 78 ? 74 : 66,
    status: 'pending',
    fulfilledBatchId: null,
    consistencyScore: null,
    decisionNote: 'Покупатель ждёт повторение характера первой поставки без роста дефектов.',
  };
}

export function batchConsistency(reference: BatchState, candidate: BatchState): number {
  if (reference.recipe.family !== candidate.recipe.family || reference.recipe.styleId !== candidate.recipe.styleId) return 0;
  const qualityKeys: (keyof QualityProfile)[] = [
    'technicalPurity', 'balance', 'intensity', 'complexity', 'cohesion',
    'originality', 'clarity', 'styleFit', 'character', 'defectRisk',
  ];
  const averageDistance = qualityKeys.reduce((sum, key) => sum + Math.abs(reference.quality[key] - candidate.quality[key]), 0) / qualityKeys.length;
  const processDistance = (
    Math.abs(reference.recipe.processTemperature - candidate.recipe.processTemperature) * 2
    + Math.abs(reference.recipe.primaryDays - candidate.recipe.primaryDays) * 0.7
    + Math.abs(reference.recipe.conditioningDays - candidate.recipe.conditioningDays) * 0.45
    + Math.abs(reference.recipe.treatment - candidate.recipe.treatment) * 3
  );
  return clamp(Math.round(100 - averageDistance * 1.45 - processDistance), 0, 100);
}

export function createConsumerReview(
  contract: SupplyContract,
  outlet: MarketOutletState,
  batch: BatchState,
  day: number,
): ConsumerReview {
  const audienceFit = weightedQuality(batch.quality, outlet.weights);
  const score100 = clamp(Math.round(audienceFit + outlet.relationship * 0.12 - batch.quality.defectRisk * 0.12), 0, 100);
  const score = clamp(Math.round(score100 / 20), 1, 5);
  const relationshipEffect = score >= 5 ? 5 : score === 4 ? 2 : score === 3 ? 0 : score === 2 ? -3 : -6;
  const headline = score >= 5 ? 'Разобрали быстрее прогноза' : score === 4 ? 'Хороший первый отклик' : score === 3 ? 'Продажи идут неровно' : 'Покупатели не приняли профиль';
  const note = reviewNote(score, batch, outlet);
  return {
    id: `review-${contract.id}`,
    contractId: contract.id,
    outletId: outlet.id,
    batchId: batch.id,
    day,
    score,
    headline,
    note,
    relationshipEffect,
  };
}

export function repeatPotential(score: number, relationship: number): number {
  return clamp(Math.round(score * 0.72 + relationship * 0.28), 0, 100);
}

export function demandEstimate(signal: DemandSignal): { low: number; high: number } {
  const uncertainty = Math.max(4, Math.round((100 - signal.confidence) * 0.18));
  return { low: clamp(signal.index - uncertainty, 0, 100), high: clamp(signal.index + uncertainty, 0, 100) };
}

export function channelLabel(channel: MarketChannel): string {
  if (channel === 'bar') return 'Бар';
  if (channel === 'specialty') return 'Спецмагазин';
  return 'Магазин';
}

function weightedQuality(quality: QualityProfile, weights: OutletWeights): number {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) return 0;
  return (
    quality.technicalPurity * weights.technicalPurity
    + quality.balance * weights.balance
    + quality.complexity * weights.complexity
    + quality.originality * weights.originality
    + quality.clarity * weights.clarity
    + quality.styleFit * weights.styleFit
    + quality.character * weights.character
  ) / totalWeight;
}

function priceFitModifier(price: number, preferred: [number, number]): number {
  const [min, max] = preferred;
  if (price >= min && price <= max) return 6;
  if (price < min) return 2;
  const excess = (price - max) / Math.max(0.01, max);
  return -Math.min(24, excess * 42);
}

function buildDecisionReasons(quality: QualityProfile, outlet: MarketOutletState, askingPrice: number, demandIndex: number): string[] {
  const reasons: string[] = [];
  if (quality.technicalPurity >= outlet.minTechnicalPurity + 8) reasons.push('Техническая чистота уверенно проходит требования точки.');
  if (quality.originality >= 70 && outlet.weights.originality >= 1.2) reasons.push('Необычный профиль может выделиться среди текущих поставщиков.');
  if (quality.clarity >= 72 && outlet.channel === 'store') reasons.push('Понятный стиль упрощает продажу с полки.');
  if (quality.character >= 72 && outlet.channel !== 'store') reasons.push('Выраженный характер подходит аудитории заведения.');
  if (askingPrice > outlet.preferredWholesale[1]) reasons.push('Запрошенная цена выше комфортного закупочного диапазона.');
  if (askingPrice < outlet.preferredWholesale[0]) reasons.push('Цена привлекательна, но закупщик проверяет стабильность и маржу бренда.');
  if (quality.defectRisk >= outlet.maxDefectRisk - 8) reasons.push('Закупщик отметил риск нестабильности партии.');
  if (demandIndex >= 68) reasons.push('По категории сейчас заметен повышенный локальный спрос.');
  if (demandIndex <= 36) reasons.push('Категория продаётся медленнее обычного, закупщик осторожен с объёмом.');
  return reasons.slice(0, 5);
}

function reviewNote(score: number, batch: BatchState, outlet: MarketOutletState): string {
  if (score >= 5) return `${outlet.audience} хорошо приняла характер продукта; точка просит не менять профиль следующей партии.`;
  if (score === 4) return batch.quality.originality >= 70
    ? 'Необычность продукта сработала, но часть гостей просит более понятный вкус.'
    : 'Продукт понятен аудитории и держит темп продаж без сильного ажиотажа.';
  if (score === 3) return 'Одним покупателям продукт понравился, другие не поняли позиционирование. Нужна точнее выбранная аудитория.';
  return batch.quality.defectRisk >= 35
    ? 'Покупатели заметили нестабильность и технические оттенки. Повтор без исправления рискован.'
    : 'Профиль не совпал с ожиданиями аудитории точки.';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
