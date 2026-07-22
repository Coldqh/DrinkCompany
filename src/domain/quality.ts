import type { BeverageCategoryId } from '../data/beverageCatalog';
import { qualityRuleForCategory, type QualityPanelId } from '../data/qualityCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeState } from './trade';

export type QualitySampleKind = 'release' | 'incoming' | 'market_surveillance' | 'incident_followup';
export type QualitySampleStatus = 'queued' | 'testing' | 'passed' | 'failed' | 'cancelled';
export type QualityIncidentSeverity = 'minor' | 'major' | 'critical';
export type QualityIncidentStatus = 'open' | 'contained' | 'closed';
export type RecallStatus = 'active' | 'completed';
export type RecallScope = 'lot' | 'product';
export type QualityDefectType = 'abv_mismatch' | 'microbial_contamination' | 'chemical_contamination' | 'package_failure' | 'label_noncompliance' | 'identity_failure';

export interface QualityLaboratoryState {
  id: string;
  organizationId: string;
  assetId: string;
  countryId: string;
  regionId: string;
  name: string;
  accreditation: QualityPanelId[];
  capacityPerDay: number;
  reliability: number;
  baseFee: number;
}

export interface ProductQualitySpecification {
  productId: string;
  categoryId: BeverageCategoryId;
  targetAbv: number;
  abvTolerance: number;
  minimumQuality: number;
  microbiologyLimit: number;
  contaminantLimit: number;
  requiredPanels: QualityPanelId[];
  revision: number;
}

export interface QualitySampleState {
  id: string;
  kind: QualitySampleKind;
  organizationId: string;
  laboratoryId: string;
  productId: string;
  lotId: string | null;
  shelfId: string | null;
  submittedDay: number;
  dueDay: number;
  status: QualitySampleStatus;
  panels: QualityPanelId[];
  fee: number;
}

export interface QualityMeasurement {
  key: 'abv' | 'microbiology' | 'contaminants' | 'packageIntegrity' | 'labelScore' | 'identityScore';
  value: number;
  unit: string;
  limit: string;
  passed: boolean;
}

export interface QualityResultState {
  id: string;
  sampleId: string;
  completedDay: number;
  passed: boolean;
  measurements: QualityMeasurement[];
  failureTypes: QualityDefectType[];
  summary: string;
}

export interface QualityCertificateState {
  id: string;
  resultId: string;
  organizationId: string;
  productId: string;
  lotId: string | null;
  issuedDay: number;
  expiresDay: number;
  status: 'valid' | 'revoked' | 'expired';
}

export interface QualityIncidentState {
  id: string;
  detectedDay: number;
  organizationId: string;
  productId: string;
  sourceLotId: string | null;
  severity: QualityIncidentSeverity;
  defectTypes: QualityDefectType[];
  status: QualityIncidentStatus;
  headline: string;
  detail: string;
}

export interface RecallState {
  id: string;
  incidentId: string;
  responsibleOrganizationId: string;
  productId: string;
  scope: RecallScope;
  affectedLotIds: string[];
  launchedDay: number;
  completedDay: number | null;
  status: RecallStatus;
  inventoryUnitsRecovered: number;
  shelfUnitsRecovered: number;
  shipmentUnitsStopped: number;
  destroyedUnits: number;
  cost: number;
  affectedAssetIds: string[];
}

export interface QualityOperationState {
  id: string;
  day: number;
  kind: 'test_fee' | 'recall_cost' | 'destruction';
  organizationId: string;
  counterpartyOrganizationId: string | null;
  amount: number;
  quantity: number;
  productId: string | null;
  lotId: string | null;
  headline: string;
}

export interface QualityState {
  laboratories: QualityLaboratoryState[];
  specifications: ProductQualitySpecification[];
  samples: QualitySampleState[];
  results: QualityResultState[];
  certificates: QualityCertificateState[];
  incidents: QualityIncidentState[];
  recalls: RecallState[];
  operations: QualityOperationState[];
  nextSampleNumber: number;
  nextResultNumber: number;
  nextCertificateNumber: number;
  nextIncidentNumber: number;
  nextRecallNumber: number;
  nextOperationNumber: number;
}

export interface QualitySectorResult {
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  quality: QualityState;
}

export interface QualityAdvanceResult {
  quality: QualityState;
  trade: TradeState;
  organizations: OrganizationState[];
  events: { title: string; detail: string; tone: 'market' | 'warning' | 'release' }[];
}

const LAB_SEEDS = [
  { id: 'rhein', name: 'Rhein Beverage Analytics', countryId: 'germany', regionId: 'berlin-brandenburg', reliability: 94, capacity: 7, fee: 310 },
  { id: 'grand-est', name: 'Grand Est Laboratoire Alimentaire', countryId: 'france', regionId: 'alsace', reliability: 92, capacity: 6, fee: 295 },
  { id: 'british', name: 'British Drinks Assurance', countryId: 'united-kingdom', regionId: 'south-west-england', reliability: 95, capacity: 7, fee: 335 },
] as const;

export function createQualitySector(organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number): QualitySectorResult {
  const laboratoryOrganizations = LAB_SEEDS.map((seed, index): OrganizationState => ({
    id: `org-quality-${seed.id}`,
    name: seed.name,
    kind: 'service',
    countryId: seed.countryId,
    regionId: seed.regionId,
    ownerLabel: `партнёры лаборатории ${index + 1}`,
    status: 'active',
    cash: 96_000 + index * 12_000,
    debt: 9_000 + index * 2_000,
    reputation: seed.reliability,
    strategy: 'Независимый лабораторный контроль напитков',
    employeeCount: 18 + index * 3,
    valuation: 180_000 + index * 24_000,
    dailyRevenue: 0,
    dailyCosts: 720 + index * 90,
    assetIds: [`asset-quality-${seed.id}`],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: Math.max(1, day - 1_200 - index * 140),
  }));
  const laboratoryAssets = LAB_SEEDS.map((seed, index): WorldAssetState => ({
    id: `asset-quality-${seed.id}`,
    type: 'laboratory',
    name: seed.name,
    city: seed.regionId === 'alsace' ? 'Strasbourg' : seed.regionId === 'south-west-england' ? 'Bristol' : 'Berlin',
    countryId: seed.countryId,
    regionId: seed.regionId,
    address: `Научный парк ${index + 1}`,
    ownerOrganizationId: `org-quality-${seed.id}`,
    operatorOrganizationId: `org-quality-${seed.id}`,
    status: 'operating',
    condition: 91 - index,
    capacity: seed.capacity,
    footfall: 0,
    askingPrice: 210_000 + index * 30_000,
    dailyRent: 0,
    dailyOperatingCost: 720 + index * 90,
    audience: 'Производители, импортёры и регуляторы алкогольной отрасли',
    marketOutletId: null,
    venue: null,
  }));
  const laboratories = LAB_SEEDS.map((seed): QualityLaboratoryState => ({
    id: `quality-lab-${seed.id}`,
    organizationId: `org-quality-${seed.id}`,
    assetId: `asset-quality-${seed.id}`,
    countryId: seed.countryId,
    regionId: seed.regionId,
    name: seed.name,
    accreditation: ['identity', 'abv', 'microbiology', 'contaminants', 'packaging', 'label'],
    capacityPerDay: seed.capacity,
    reliability: seed.reliability,
    baseFee: seed.fee,
  }));
  const combinedOrganizations = mergeById(organizations, laboratoryOrganizations);
  const combinedAssets = mergeById(assets, laboratoryAssets);
  return {
    organizations: combinedOrganizations,
    assets: combinedAssets,
    quality: {
      laboratories,
      specifications: createSpecifications(trade),
      samples: [],
      results: [],
      certificates: [],
      incidents: [],
      recalls: [],
      operations: [],
      nextSampleNumber: 1,
      nextResultNumber: 1,
      nextCertificateNumber: 1,
      nextIncidentNumber: 1,
      nextRecallNumber: 1,
      nextOperationNumber: 1,
    },
  };
}

export function ensureQualitySector(input: { state: QualityState | undefined; organizations: OrganizationState[]; assets: WorldAssetState[]; trade: TradeState; day: number }): QualitySectorResult {
  const created = createQualitySector(input.organizations, input.assets, input.trade, input.day);
  if (!input.state) return created;
  const state = input.state;
  return {
    organizations: created.organizations,
    assets: created.assets,
    quality: {
      ...state,
      laboratories: state.laboratories?.length ? state.laboratories : created.quality.laboratories,
      specifications: mergeSpecifications(state.specifications ?? [], input.trade),
      samples: state.samples ?? [],
      results: state.results ?? [],
      certificates: state.certificates ?? [],
      incidents: state.incidents ?? [],
      recalls: state.recalls ?? [],
      operations: state.operations ?? [],
      nextSampleNumber: state.nextSampleNumber ?? 1,
      nextResultNumber: state.nextResultNumber ?? 1,
      nextCertificateNumber: state.nextCertificateNumber ?? 1,
      nextIncidentNumber: state.nextIncidentNumber ?? 1,
      nextRecallNumber: state.nextRecallNumber ?? 1,
      nextOperationNumber: state.nextOperationNumber ?? 1,
    },
  };
}

export function advanceQualityDay(state: QualityState, tradeState: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): QualityAdvanceResult {
  let quality = { ...state, specifications: mergeSpecifications(state.specifications, tradeState), samples: state.samples.map((sample) => ({ ...sample })), results: [...state.results], certificates: [...state.certificates], incidents: [...state.incidents], recalls: [...state.recalls], operations: [...state.operations] };
  let trade = cloneTradeForQuality(tradeState);
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  const events: QualityAdvanceResult['events'] = [];

  const dueSamples = quality.samples.filter((sample) => ['queued', 'testing'].includes(sample.status) && sample.dueDay <= day);
  for (const sample of dueSamples) {
    const specification = quality.specifications.find((item) => item.productId === sample.productId);
    const product = trade.products.find((item) => item.id === sample.productId);
    const laboratory = quality.laboratories.find((item) => item.id === sample.laboratoryId);
    if (!specification || !product || !laboratory) {
      sample.status = 'cancelled';
      continue;
    }
    const lot = sample.lotId ? trade.inventory.find((item) => item.id === sample.lotId) : null;
    const result = evaluateSample(quality, sample, specification, product.quality, lot?.quality ?? product.quality, laboratory.reliability, day);
    quality.results.push(result);
    sample.status = result.passed ? 'passed' : 'failed';
    applyTestFee(quality, nextOrganizations, sample, laboratory, day);

    if (result.passed) {
      quality.incidents = quality.incidents.map((incident) => incident.organizationId === sample.organizationId && incident.productId === sample.productId && incident.status === 'contained' ? { ...incident, status: 'closed' as const } : incident);
      trade.products = trade.products.map((item) => item.id === sample.productId ? { ...item, status: 'active' as const } : item);
      trade.contracts = trade.contracts.map((contract) => contract.commodityKind === 'product' && contract.commodityId === sample.productId && contract.status === 'paused' && contract.lastResult.includes('отзыва') ? { ...contract, status: 'active' as const, lastResult: 'Возобновлён после успешного контрольного анализа' } : contract);
      quality.certificates.push({
        id: `quality-certificate-${quality.nextCertificateNumber++}`,
        resultId: result.id,
        organizationId: sample.organizationId,
        productId: sample.productId,
        lotId: sample.lotId,
        issuedDay: day,
        expiresDay: day + qualityRuleForCategory(specification.categoryId).certificateDays,
        status: 'valid',
      });
    } else {
      const incident = createIncident(quality, sample, result, day);
      quality.incidents.push(incident);
      quality.certificates = quality.certificates.map((certificate) => certificate.productId === sample.productId && certificate.status === 'valid' ? { ...certificate, status: 'revoked' as const } : certificate);
      trade.products = trade.products.map((item) => item.id === sample.productId ? { ...item, status: 'paused' as const } : item);
      trade.contracts = trade.contracts.map((contract) => contract.commodityKind === 'product' && contract.commodityId === sample.productId && contract.status === 'active' ? { ...contract, status: 'paused' as const, lastResult: 'Приостановлен из-за отзыва качества' } : contract);
      const recallResult = executeRecall(trade, incident, sample, day, quality.nextRecallNumber++);
      trade = recallResult.trade;
      quality.recalls.push(recallResult.recall);
      quality.operations.push({
        id: `quality-operation-${day}-${quality.nextOperationNumber++}`,
        day,
        kind: 'recall_cost',
        organizationId: incident.organizationId,
        counterpartyOrganizationId: null,
        amount: recallResult.recall.cost,
        quantity: recallResult.recall.destroyedUnits,
        productId: incident.productId,
        lotId: incident.sourceLotId,
        headline: `Отзыв ${product.name}`,
      });
      if (recallResult.recall.destroyedUnits > 0) quality.operations.push({
        id: `quality-operation-${day}-${quality.nextOperationNumber++}`,
        day,
        kind: 'destruction',
        organizationId: incident.organizationId,
        counterpartyOrganizationId: null,
        amount: 0,
        quantity: recallResult.recall.destroyedUnits,
        productId: incident.productId,
        lotId: incident.sourceLotId,
        headline: `Уничтожение отозванного товара ${product.name}`,
      });
      nextOrganizations = nextOrganizations.map((organization) => organization.id === incident.organizationId ? {
        ...organization,
        cash: roundMoney(organization.cash - recallResult.recall.cost),
        reputation: clamp(organization.reputation - (incident.severity === 'critical' ? 9 : incident.severity === 'major' ? 5 : 2), 0, 100),
        dailyCosts: roundMoney(organization.dailyCosts + recallResult.recall.cost),
      } : organization);
      events.push({ tone: 'warning', title: incident.headline, detail: `${incident.detail} Изъято ${recallResult.recall.destroyedUnits} ед.` });
    }
  }

  quality = expireCertificates(quality, day);
  quality = scheduleQualitySamples(quality, trade, nextOrganizations, assets, day);
  quality.samples = quality.samples.slice(-600);
  quality.results = quality.results.slice(-600);
  quality.certificates = quality.certificates.slice(-500);
  quality.incidents = quality.incidents.slice(-180);
  quality.recalls = quality.recalls.slice(-180);
  quality.operations = quality.operations.slice(-800);
  return { quality, trade, organizations: nextOrganizations, events };
}

export function organizationQualitySummary(state: QualityState, organizationId: string): { pending: number; validCertificates: number; openIncidents: number; recalledUnits: number } {
  return {
    pending: state.samples.filter((sample) => sample.organizationId === organizationId && ['queued', 'testing'].includes(sample.status)).length,
    validCertificates: state.certificates.filter((certificate) => certificate.organizationId === organizationId && certificate.status === 'valid').length,
    openIncidents: state.incidents.filter((incident) => incident.organizationId === organizationId && incident.status !== 'closed').length,
    recalledUnits: state.recalls.filter((recall) => recall.responsibleOrganizationId === organizationId).reduce((sum, recall) => sum + recall.destroyedUnits, 0),
  };
}

export function productQualitySummary(state: QualityState, productId: string): { status: 'certified' | 'testing' | 'incident' | 'unverified'; certificateCount: number; incidentCount: number; latestResult: QualityResultState | null } {
  const incidentCount = state.incidents.filter((incident) => incident.productId === productId && incident.status !== 'closed').length;
  const pending = state.samples.some((sample) => sample.productId === productId && ['queued', 'testing'].includes(sample.status));
  const certificates = state.certificates.filter((certificate) => certificate.productId === productId && certificate.status === 'valid');
  const sampleIds = new Set(state.samples.filter((sample) => sample.productId === productId).map((sample) => sample.id));
  const latestResult = state.results.filter((result) => sampleIds.has(result.sampleId)).sort((a, b) => b.completedDay - a.completedDay)[0] ?? null;
  return { status: incidentCount > 0 ? 'incident' : pending ? 'testing' : certificates.length > 0 ? 'certified' : 'unverified', certificateCount: certificates.length, incidentCount, latestResult };
}

export function auditQuality(state: QualityState, trade: TradeState): string[] {
  const violations: string[] = [];
  for (const certificate of state.certificates) {
    const result = state.results.find((item) => item.id === certificate.resultId);
    if (!result?.passed) violations.push(`Сертификат ${certificate.id} не имеет успешного результата`);
  }
  for (const recall of state.recalls) {
    if (!state.incidents.some((incident) => incident.id === recall.incidentId)) violations.push(`Отзыв ${recall.id} не связан с инцидентом`);
    if (recall.destroyedUnits < 0) violations.push(`Отзыв ${recall.id} имеет отрицательное количество`);
  }
  for (const lot of trade.inventory) if ((lot.quantity ?? 0) < 0) violations.push(`Лот ${lot.id} имеет отрицательный остаток`);
  return violations;
}

function scheduleQualitySamples(state: QualityState, trade: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): QualityState {
  const occupiedByLab = new Map<string, number>();
  for (const sample of state.samples.filter((item) => ['queued', 'testing'].includes(item.status))) occupiedByLab.set(sample.laboratoryId, (occupiedByLab.get(sample.laboratoryId) ?? 0) + 1);

  const candidates: Array<{ kind: QualitySampleKind; organizationId: string; productId: string; lotId: string | null; shelfId: string | null; countryId: string; regionId: string }> = [];
  for (const lot of trade.inventory.filter((item) => item.commodityKind === 'product' && item.quantity > 0 && (item.status ?? 'available') === 'available')) {
    if (state.samples.some((sample) => sample.lotId === lot.id)) continue;
    const product = trade.products.find((item) => item.id === lot.commodityId);
    const organization = organizations.find((item) => item.id === lot.organizationId);
    if (!product || !organization) continue;
    candidates.push({ kind: 'release', organizationId: product.producerOrganizationId, productId: product.id, lotId: lot.id, shelfId: null, countryId: organization.countryId, regionId: organization.regionId });
  }
  if (day % 14 === 0) {
    for (const shelf of trade.shelves.filter((item) => item.units > 0)) {
      const product = trade.products.find((item) => item.id === shelf.productId);
      const asset = assets.find((item) => item.id === shelf.assetId);
      if (!product || !asset) continue;
      const lotId = shelf.lotAllocations?.find((allocation) => allocation.quantity > 0)?.lotId ?? `shelf-lot:${shelf.id}`;
      if (state.samples.some((sample) => sample.kind === 'market_surveillance' && sample.lotId === lotId && day - sample.submittedDay < 60)) continue;
      candidates.push({ kind: 'market_surveillance', organizationId: product.producerOrganizationId, productId: product.id, lotId, shelfId: shelf.id, countryId: asset.countryId, regionId: asset.regionId });
    }
  }

  for (const candidate of candidates.sort((a, b) => samplePriority(a, day) - samplePriority(b, day))) {
    const laboratory = chooseLaboratory(state.laboratories, candidate.countryId, candidate.regionId, occupiedByLab);
    if (!laboratory) continue;
    const specification = state.specifications.find((item) => item.productId === candidate.productId);
    if (!specification) continue;
    const fee = roundMoney(laboratory.baseFee + specification.requiredPanels.length * 28);
    state.samples.push({
      id: `quality-sample-${state.nextSampleNumber++}`,
      kind: candidate.kind,
      organizationId: candidate.organizationId,
      laboratoryId: laboratory.id,
      productId: candidate.productId,
      lotId: candidate.lotId,
      shelfId: candidate.shelfId,
      submittedDay: day,
      dueDay: day + (candidate.kind === 'market_surveillance' ? 2 : 1),
      status: 'queued',
      panels: specification.requiredPanels,
      fee,
    });
    occupiedByLab.set(laboratory.id, (occupiedByLab.get(laboratory.id) ?? 0) + 1);
  }
  return state;
}

function evaluateSample(state: QualityState, sample: QualitySampleState, specification: ProductQualitySpecification, productQuality: number, lotQuality: number, labReliability: number, day: number): QualityResultState {
  const seed = hash(`${sample.id}:${day}:${state.nextResultNumber}`);
  const noise = ((seed % 2001) - 1000) / 1000;
  const targetAbv = specification.targetAbv;
  const qualityRisk = clamp((35 - lotQuality) / 140 + (86 - labReliability) / 700, 0, .18);
  const deterministicIncident = (seed % 10000) / 10000 < .012 + qualityRisk;
  const abv = round(targetAbv + noise * (deterministicIncident ? specification.abvTolerance * 2.3 : specification.abvTolerance * .55), 2);
  const microbiology = Math.max(0, round((100 - lotQuality) * .1 + (seed % 11) * .22 + (deterministicIncident ? specification.microbiologyLimit * 1.05 : 0), 1));
  const contaminants = Math.max(0, round(1.2 + (seed % 13) * .18 + (deterministicIncident && seed % 3 === 0 ? specification.contaminantLimit * 1.2 : 0), 1));
  const packageIntegrity = clamp(round(92 - (seed % 9) - (deterministicIncident && seed % 5 === 0 ? 28 : 0), 1), 0, 100);
  const labelScore = clamp(round(93 - (seed % 8) - (deterministicIncident && seed % 7 === 0 ? 30 : 0), 1), 0, 100);
  const identityScore = clamp(round(94 - (100 - productQuality) * .03 - (seed % 8) - (lotQuality < specification.minimumQuality ? 35 : 0), 1), 0, 100);
  const measurements = ([
    { key: 'abv', value: abv, unit: '% об.', limit: `${targetAbv} ± ${specification.abvTolerance}`, passed: Math.abs(abv - targetAbv) <= specification.abvTolerance },
    { key: 'microbiology', value: microbiology, unit: 'КУО', limit: `≤ ${specification.microbiologyLimit}`, passed: microbiology <= specification.microbiologyLimit },
    { key: 'contaminants', value: contaminants, unit: 'индекс', limit: `≤ ${specification.contaminantLimit}`, passed: contaminants <= specification.contaminantLimit },
    { key: 'packageIntegrity', value: packageIntegrity, unit: '/100', limit: '≥ 72', passed: packageIntegrity >= 72 },
    { key: 'labelScore', value: labelScore, unit: '/100', limit: '≥ 70', passed: labelScore >= 70 },
    { key: 'identityScore', value: identityScore, unit: '/100', limit: '≥ 68', passed: identityScore >= 68 },
  ] satisfies QualityMeasurement[]).filter((measurement) => panelForMeasurement(measurement.key, sample.panels));
  const failureTypes = measurements.filter((measurement) => !measurement.passed).map((measurement) => defectForMeasurement(measurement.key));
  const passed = failureTypes.length === 0 && lotQuality >= specification.minimumQuality;
  if (!passed && failureTypes.length === 0) failureTypes.push('identity_failure');
  return {
    id: `quality-result-${state.nextResultNumber++}`,
    sampleId: sample.id,
    completedDay: day,
    passed,
    measurements,
    failureTypes,
    summary: passed ? 'Образец соответствует спецификации и может обращаться на рынке.' : `Не пройдены проверки: ${failureTypes.map(defectLabel).join(', ')}.`,
  };
}

function applyTestFee(state: QualityState, organizations: OrganizationState[], sample: QualitySampleState, laboratory: QualityLaboratoryState, day: number): void {
  const payer = organizations.find((organization) => organization.id === sample.organizationId);
  const lab = organizations.find((organization) => organization.id === laboratory.organizationId);
  const actualFee = Math.min(sample.fee, Math.max(0, payer?.cash ?? 0));
  if (payer) { payer.cash = roundMoney(payer.cash - actualFee); payer.dailyCosts = roundMoney(payer.dailyCosts + actualFee); }
  if (lab) { lab.cash = roundMoney(lab.cash + actualFee); lab.dailyRevenue = roundMoney(lab.dailyRevenue + actualFee); }
  state.operations.push({ id: `quality-operation-${day}-${state.nextOperationNumber++}`, day, kind: 'test_fee', organizationId: sample.organizationId, counterpartyOrganizationId: laboratory.organizationId, amount: actualFee, quantity: 0, productId: sample.productId, lotId: sample.lotId, headline: `Лабораторный анализ ${sample.productId}` });
}

function createIncident(state: QualityState, sample: QualitySampleState, result: QualityResultState, day: number): QualityIncidentState {
  const critical = result.failureTypes.includes('chemical_contamination') || result.failureTypes.includes('microbial_contamination');
  const severity: QualityIncidentSeverity = critical ? 'critical' : result.failureTypes.length >= 2 ? 'major' : 'minor';
  return {
    id: `quality-incident-${state.nextIncidentNumber++}`,
    detectedDay: day,
    organizationId: sample.organizationId,
    productId: sample.productId,
    sourceLotId: sample.lotId,
    severity,
    defectTypes: result.failureTypes,
    status: 'contained',
    headline: severity === 'critical' ? 'Критический дефект: запущен отзыв' : 'Партия не прошла контроль качества',
    detail: result.summary,
  };
}

function executeRecall(trade: TradeState, incident: QualityIncidentState, sample: QualitySampleState, day: number, number: number): { trade: TradeState; recall: RecallState } {
  const affectedLotIds = new Set<string>();
  if (sample.lotId) affectedLotIds.add(sample.lotId);
  for (const lot of trade.inventory) {
    if (lot.id === sample.lotId || (lot.sourceLotIds ?? []).some((sourceId) => affectedLotIds.has(sourceId))) affectedLotIds.add(lot.id);
  }
  const scope: RecallScope = incident.severity === 'critical' && affectedLotIds.size === 0 ? 'product' : 'lot';
  let inventoryUnitsRecovered = 0;
  let shelfUnitsRecovered = 0;
  let shipmentUnitsStopped = 0;
  const affectedAssetIds = new Set<string>();
  trade.inventory = trade.inventory.map((lot) => {
    const affected = lot.commodityKind === 'product' && lot.commodityId === incident.productId && (scope === 'product' || affectedLotIds.has(lot.id) || (lot.sourceLotIds ?? []).some((sourceId) => affectedLotIds.has(sourceId)));
    if (!affected || lot.quantity <= 0) return lot;
    inventoryUnitsRecovered += lot.quantity;
    affectedLotIds.add(lot.id);
    return { ...lot, quantity: 0, status: 'recalled' as const };
  });
  trade.shelves = trade.shelves.map((shelf) => {
    if (shelf.productId !== incident.productId || shelf.units <= 0) return shelf;
    const allocations = shelf.lotAllocations ?? [{ lotId: `shelf-lot:${shelf.id}`, quantity: shelf.units }];
    const recalled = allocations.filter((allocation) => scope === 'product' || affectedLotIds.has(allocation.lotId)).reduce((sum, allocation) => sum + allocation.quantity, 0);
    if (recalled <= 0) return shelf;
    shelfUnitsRecovered += Math.min(shelf.units, recalled);
    affectedAssetIds.add(shelf.assetId);
    return { ...shelf, units: Math.max(0, shelf.units - recalled), lotAllocations: allocations.filter((allocation) => !(scope === 'product' || affectedLotIds.has(allocation.lotId))) };
  });
  trade.shipments = trade.shipments.map((shipment) => {
    if (shipment.commodityKind !== 'product' || shipment.commodityId !== incident.productId || ['delivered', 'failed'].includes(shipment.status)) return shipment;
    const allocations = shipment.lotAllocations ?? [];
    const affected = scope === 'product' || allocations.some((allocation) => affectedLotIds.has(allocation.lotId));
    if (!affected) return shipment;
    shipmentUnitsStopped += shipment.quantity;
    return { ...shipment, status: 'failed' as const, note: 'Остановлена из-за отзыва партии' };
  });
  const destroyedUnits = roundQuantity(inventoryUnitsRecovered + shelfUnitsRecovered + shipmentUnitsStopped);
  const cost = roundMoney(850 + destroyedUnits * 1.75 + affectedAssetIds.size * 180);
  return {
    trade,
    recall: {
      id: `quality-recall-${number}`,
      incidentId: incident.id,
      responsibleOrganizationId: incident.organizationId,
      productId: incident.productId,
      scope,
      affectedLotIds: [...affectedLotIds],
      launchedDay: day,
      completedDay: day,
      status: 'completed',
      inventoryUnitsRecovered: roundQuantity(inventoryUnitsRecovered),
      shelfUnitsRecovered: roundQuantity(shelfUnitsRecovered),
      shipmentUnitsStopped: roundQuantity(shipmentUnitsStopped),
      destroyedUnits,
      cost,
      affectedAssetIds: [...affectedAssetIds],
    },
  };
}

function createSpecifications(trade: TradeState): ProductQualitySpecification[] {
  return trade.products.map((product) => specificationForProduct(product.id, product.beverageCategoryId ?? legacyCategory(product.family), product.alcoholByVolume));
}

function mergeSpecifications(current: ProductQualitySpecification[], trade: TradeState): ProductQualitySpecification[] {
  const byProduct = new Map(current.map((specification) => [specification.productId, specification]));
  for (const product of trade.products) if (!byProduct.has(product.id)) byProduct.set(product.id, specificationForProduct(product.id, product.beverageCategoryId ?? legacyCategory(product.family), product.alcoholByVolume));
  return [...byProduct.values()].filter((specification) => trade.products.some((product) => product.id === specification.productId));
}

function specificationForProduct(productId: string, categoryId: BeverageCategoryId, targetAbv: number): ProductQualitySpecification {
  const rule = qualityRuleForCategory(categoryId);
  return { productId, categoryId, targetAbv, abvTolerance: rule.abvTolerance, minimumQuality: rule.minimumQuality, microbiologyLimit: rule.microbiologyLimit, contaminantLimit: rule.contaminantLimit, requiredPanels: rule.requiredPanels, revision: 1 };
}

function expireCertificates(state: QualityState, day: number): QualityState {
  return { ...state, certificates: state.certificates.map((certificate) => certificate.status === 'valid' && certificate.expiresDay < day ? { ...certificate, status: 'expired' as const } : certificate) };
}

function chooseLaboratory(laboratories: QualityLaboratoryState[], countryId: string, regionId: string, occupied: Map<string, number>): QualityLaboratoryState | null {
  return laboratories
    .filter((laboratory) => (occupied.get(laboratory.id) ?? 0) < laboratory.capacityPerDay)
    .sort((a, b) => scoreLab(b, countryId, regionId, occupied) - scoreLab(a, countryId, regionId, occupied))[0] ?? null;
}

function scoreLab(laboratory: QualityLaboratoryState, countryId: string, regionId: string, occupied: Map<string, number>): number {
  return laboratory.reliability + (laboratory.countryId === countryId ? 20 : 0) + (laboratory.regionId === regionId ? 10 : 0) - (occupied.get(laboratory.id) ?? 0) * 4;
}

function samplePriority(candidate: { kind: QualitySampleKind; productId: string; lotId: string | null }, day: number): number {
  return candidate.kind === 'release' ? hash(`${candidate.lotId}:${day}`) % 100 : 200 + hash(`${candidate.productId}:${day}`) % 100;
}

function cloneTradeForQuality(state: TradeState): TradeState {
  return {
    ...state,
    inventory: state.inventory.map((lot) => ({ ...lot, sourceLotIds: [...(lot.sourceLotIds ?? [])] })),
    products: state.products.map((product) => ({ ...product })),
    batches: state.batches.map((batch) => ({ ...batch, ingredientLotIds: [...batch.ingredientLotIds] })),
    contracts: state.contracts.map((contract) => ({ ...contract })),
    shipments: state.shipments.map((shipment) => ({ ...shipment, lotAllocations: shipment.lotAllocations?.map((allocation) => ({ ...allocation })) ?? [] })),
    shelves: state.shelves.map((shelf) => ({ ...shelf, lotAllocations: shelf.lotAllocations?.map((allocation) => ({ ...allocation })) ?? [], soldLotAllocationsToday: shelf.soldLotAllocationsToday?.map((allocation) => ({ ...allocation })) ?? [] })),
    operations: [...state.operations],
  };
}

function panelForMeasurement(key: QualityMeasurement['key'], panels: QualityPanelId[]): boolean {
  const panel: Record<QualityMeasurement['key'], QualityPanelId> = { abv: 'abv', microbiology: 'microbiology', contaminants: 'contaminants', packageIntegrity: 'packaging', labelScore: 'label', identityScore: 'identity' };
  return panels.includes(panel[key]);
}

function defectForMeasurement(key: QualityMeasurement['key']): QualityDefectType {
  const defects: Record<QualityMeasurement['key'], QualityDefectType> = { abv: 'abv_mismatch', microbiology: 'microbial_contamination', contaminants: 'chemical_contamination', packageIntegrity: 'package_failure', labelScore: 'label_noncompliance', identityScore: 'identity_failure' };
  return defects[key];
}

function defectLabel(type: QualityDefectType): string {
  return ({ abv_mismatch: 'крепость вне допуска', microbial_contamination: 'микробиология', chemical_contamination: 'посторонние вещества', package_failure: 'герметичность упаковки', label_noncompliance: 'маркировка', identity_failure: 'идентичность продукта' })[type];
}

function legacyCategory(family: string): BeverageCategoryId {
  if (family === 'wine') return 'still_wine';
  if (family === 'spirit') return 'whisky';
  if (family === 'liqueur') return 'liqueur';
  if (family === 'alcohol_free') return 'alcohol_free';
  return family === 'cider' ? 'cider' : 'beer';
}

function mergeById<T extends { id: string }>(current: T[], additions: T[]): T[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of additions) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

function hash(value: string): number { let result = 2166136261; for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); } return Math.abs(result >>> 0); }
function round(value: number, digits: number): number { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function roundQuantity(value: number): number { return Math.round(value * 1000) / 1000; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
