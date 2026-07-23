import type { QualityState } from './quality';
import type { FinancialSystemState } from './finance';
import type { PackagingState } from './packaging';
import type { HospitalityState } from './hospitality';
import { beverageBlueprints, type BeverageCategoryId } from '../data/beverageCatalog';

export type KernelEntityKind = 'organization' | 'asset' | 'product' | 'lot' | 'contract' | 'shipment' | 'serve_recipe' | 'region' | 'consumer_segment' | 'authority' | 'license' | 'inspection' | 'tax_obligation' | 'primary_site' | 'harvest' | 'vehicle' | 'route' | 'freight_job' | 'quality_lab' | 'quality_sample' | 'quality_certificate' | 'quality_incident' | 'recall' | 'bank_account' | 'invoice' | 'credit_facility' | 'loan' | 'insurance_policy' | 'financial_statement' | 'packaging_job' | 'packaging_return' | 'process_plan' | 'process_run' | 'intermediate_lot' | 'maturation_lot' | 'blend_recipe' | 'hospitality_venue' | 'menu_item' | 'shift_report';
export type LedgerAccount = `org:${string}:cash` | `org:${string}:revenue` | `org:${string}:expense` | `org:${string}:receivable` | `org:${string}:payable` | `org:${string}:inventory` | `org:${string}:debt` | `system:${string}`;
export type ScheduleCadence = 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual' | 'once';

export interface KernelOrganizationInput { id: string; name: string; countryId: string; regionId: string; }
export interface KernelAssetInput { id: string; ownerOrganizationId: string | null; operatorOrganizationId: string | null; countryId: string; regionId: string; type: string; }
export interface KernelProductInput { id: string; producerOrganizationId: string; name: string; family: string; beverageCategoryId?: string; alcoholByVolume?: number; packageVolumeLiters?: number; packagingProfileId?: string; }
export interface KernelLotInput { id: string; organizationId: string; commodityKind: string; commodityId: string; quantity: number; unit: string; originOrganizationId: string; sourceLotIds?: string[]; productionBatchId?: string | null; }
export interface KernelContractInput { id: string; sellerOrganizationId: string; buyerOrganizationId: string; commodityKind: string; commodityId: string; }
export interface KernelShipmentInput { id: string; sellerOrganizationId: string; buyerOrganizationId: string; buyerAssetId: string | null; commodityId: string; quantity: number; unitPrice: number; status: string; arrivalDay: number; lotAllocations?: Array<{ lotId: string; quantity: number }>; }
export interface KernelShelfInput { id: string; assetId: string; productId: string; supplierOrganizationId: string; unitsSoldToday: number; revenueToday: number; lotAllocations?: Array<{ lotId: string; quantity: number }>; soldLotAllocationsToday?: Array<{ lotId: string; quantity: number }>; }
export interface KernelOperationInput { id: string; day: number; kind: string; organizationId: string; counterpartyOrganizationId: string | null; assetId: string | null; amount: number; headline: string; }
export interface KernelTradeSnapshot {
  products: KernelProductInput[];
  inventory: KernelLotInput[];
  contracts: KernelContractInput[];
  shipments?: KernelShipmentInput[];
  shelves?: KernelShelfInput[];
  operations?: KernelOperationInput[];
  batches?: Array<{ id: string; producerOrganizationId: string; productId: string; ingredientLotIds: string[]; startDay: number }>;
  industrial?: {
    plans: Array<{ id: string; batchId: string; producerOrganizationId: string; productId: string; status: string }>;
    runs: Array<{ id: string; producerOrganizationId: string; productId: string; stageId: string; status: string }>;
    intermediateLots: Array<{ id: string; ownerOrganizationId: string; productId: string; batchId: string; sourceTradeLotIds: string[]; sourceIntermediateLotIds: string[]; createdDay: number }>;
    maturationLots: Array<{ id: string; producerOrganizationId: string; productId: string; sourceIntermediateLotId: string; enteredDay: number }>;
    blendRecipes: Array<{ id: string; producerOrganizationId: string; productId: string; name: string }>;
  };
}

export interface KernelEntityRef {
  id: string;
  kind: KernelEntityKind;
  label: string;
  ownerOrganizationId: string | null;
  countryId: string | null;
  regionId: string | null;
  sourceModule: 'ecosystem' | 'trade' | 'catalog' | 'demand' | 'regulation' | 'primary' | 'logistics' | 'quality' | 'finance' | 'packaging' | 'industrial' | 'hospitality';
}

export interface KernelProductSpecification {
  productId: string;
  blueprintId: string;
  beverageCategoryId: BeverageCategoryId;
  producerOrganizationId: string;
  revision: number;
  createdDay: number;
  attributes: Record<string, number | string | boolean>;
}

export interface KernelMoneyEntry {
  id: string;
  day: number;
  debitAccount: LedgerAccount;
  creditAccount: LedgerAccount;
  amount: number;
  currency: string;
  sourceType: string;
  sourceId: string;
  memo: string;
}

export interface KernelGoodsEntry {
  id: string;
  day: number;
  commodityId: string;
  lotId: string | null;
  quantity: number;
  unit: string;
  fromOrganizationId: string | null;
  toOrganizationId: string | null;
  fromAssetId: string | null;
  toAssetId: string | null;
  sourceType: string;
  sourceId: string;
}

export interface KernelTraceNode {
  id: string;
  entityKind: 'harvest_lot' | 'ingredient_lot' | 'production_batch' | 'bulk_lot' | 'maturation_lot' | 'package_lot' | 'shipment' | 'sale' | 'serve';
  entityId: string;
  parentNodeIds: string[];
  organizationId: string;
  createdDay: number;
}

export interface KernelKnowledgeFact {
  id: string;
  observerOrganizationId: string;
  subjectEntityId: string;
  factKey: string;
  value: string | number | boolean;
  confidence: number;
  learnedDay: number;
  expiresDay: number | null;
  source: 'observation' | 'contract' | 'report' | 'rumor' | 'public_record';
}

export interface KernelScheduledEvent {
  id: string;
  type: string;
  dueDay: number;
  cadence: ScheduleCadence;
  intervalDays: number;
  payload: Record<string, string | number | boolean>;
  active: boolean;
}

export interface KernelAuditSnapshot {
  day: number;
  organizationCount: number;
  assetCount: number;
  productCount: number;
  lotCount: number;
  moneyEntryCount: number;
  goodsEntryCount: number;
  traceNodeCount: number;
  violations: string[];
}

export interface EcosystemKernelState {
  kernelVersion: 1;
  seed: number;
  randomState: number;
  currentDay: number;
  entities: KernelEntityRef[];
  productSpecifications: KernelProductSpecification[];
  moneyLedger: KernelMoneyEntry[];
  goodsLedger: KernelGoodsEntry[];
  traceability: KernelTraceNode[];
  knowledge: KernelKnowledgeFact[];
  schedule: KernelScheduledEvent[];
  audits: KernelAuditSnapshot[];
  nextMoneyEntryNumber: number;
  nextGoodsEntryNumber: number;
  nextTraceNodeNumber: number;
  nextKnowledgeNumber: number;
  nextScheduleNumber: number;
}


export interface KernelDemandSnapshot {
  regions: Array<{
    regionId: string;
    countryId: string;
    population: number;
    segments: Array<{ id: string; name: string }>;
  }>;
}

export interface KernelRegulationSnapshot {
  authorities: Array<{ id: string; countryId: string; name: string }>;
  licenses: Array<{ id: string; organizationId: string; countryId: string; permitType: string; assetId: string | null }>;
  obligations: Array<{ id: string; organizationId: string; authorityId: string; amount: number; currency: string; status: string; assessedDay: number }>;
  inspections: Array<{ id: string; organizationId: string; authorityId: string; result: string; day: number }>;
  payments: Array<{ id: string; day: number; organizationId: string; authorityId: string; amount: number; currency: string; obligationId: string }>;
}

export interface KernelPrimarySnapshot {
  sites: Array<{ id: string; assetId: string; organizationId: string; regionId: string; commodityId: string }>;
  rawLots: Array<{ id: string; organizationId: string; siteId: string; commodityId: string; quantity: number }>;
  harvests: Array<{ id: string; day: number; siteId: string; organizationId: string; commodityId: string; quantity: number }>;
  operations: Array<{ id: string; day: number; kind: string; organizationId: string; counterpartyOrganizationId: string | null; commodityId: string; quantity: number; amount: number; inputLotIds: string[]; outputLotIds: string[]; headline: string }>;
}

export interface KernelLogisticsSnapshot {
  fleet: Array<{ id: string; carrierId: string; type: string; currentRegionId: string }>;
  routes: Array<{ id: string; originRegionId: string; destinationRegionId: string }>;
  jobs: Array<{ id: string; shipmentId: string; carrierId: string | null; routeId: string; status: string }>;
  operations: Array<{ id: string; day: number; kind: string; carrierOrganizationId: string | null; organizationId: string | null; amount: number; headline: string }>;
}


export interface KernelQualitySnapshot {
  laboratories: Array<{ id: string; organizationId: string; countryId: string; regionId: string; name: string }>;
  samples: Array<{ id: string; organizationId: string; productId: string; lotId: string | null; status: string }>;
  certificates: Array<{ id: string; organizationId: string; productId: string; lotId: string | null; status: string }>;
  incidents: Array<{ id: string; organizationId: string; productId: string; status: string }>;
  recalls: Array<{ id: string; responsibleOrganizationId: string; productId: string; status: string }>;
}



export interface KernelPackagingSnapshot {
  jobs: Array<{ id: string; plantId: string; componentId: string; status: string }>;
  returns: Array<{ id: string; sourceAssetId: string; productId: string; status: string }>;
}

export interface KernelFinancialSnapshot {
  accounts: Array<{ id: string; organizationId: string; bankId: string }>;
  invoices: Array<{ id: string; sellerOrganizationId: string; buyerOrganizationId: string; status: string }>;
  creditFacilities: Array<{ id: string; organizationId: string; bankId: string; status: string }>;
  loans: Array<{ id: string; organizationId: string; bankId: string; status: string }>;
  insurancePolicies: Array<{ id: string; organizationId: string; insurerBankId: string; kind: string }>;
  statements: Array<{ id: string; organizationId: string; periodEndDay: number }>;
}

export interface KernelCreateInput {
  day: number;
  seedText: string;
  organizations: KernelOrganizationInput[];
  assets: KernelAssetInput[];
  trade: KernelTradeSnapshot;
  demand?: KernelDemandSnapshot;
  regulation?: KernelRegulationSnapshot;
  primaryProduction?: KernelPrimarySnapshot;
  logistics?: KernelLogisticsSnapshot;
  quality?: KernelQualitySnapshot;
  financials?: KernelFinancialSnapshot;
  packaging?: KernelPackagingSnapshot;
  hospitality?: HospitalityState;
}

export function createEcosystemKernel(input: KernelCreateInput): EcosystemKernelState {
  const seed = hashSeed(input.seedText);
  const entities = buildEntityRegistry(input.organizations, input.assets, input.trade, input.demand, input.regulation, input.primaryProduction, input.logistics, input.quality, input.financials, input.packaging, input.hospitality);
  const productSpecifications = input.trade.products.map((product) => createProductSpecification(product, input.day));
  const traceability = mergeTraceability([], input.trade.inventory, input.primaryProduction?.rawLots ?? [], input.trade.batches ?? [], input.day, input.trade.industrial);
  return {
    kernelVersion: 1,
    seed,
    randomState: seed,
    currentDay: input.day,
    entities,
    productSpecifications,
    moneyLedger: [],
    goodsLedger: [],
    traceability,
    knowledge: [],
    schedule: createCoreSchedule(input.day),
    audits: [],
    nextMoneyEntryNumber: 1,
    nextGoodsEntryNumber: 1,
    nextTraceNodeNumber: traceability.length + 1,
    nextKnowledgeNumber: 1,
    nextScheduleNumber: 6,
  };
}

export function normalizeEcosystemKernel(kernel: EcosystemKernelState | undefined, input: KernelCreateInput): EcosystemKernelState {
  if (!kernel || kernel.kernelVersion !== 1) return createEcosystemKernel(input);
  const traceability = mergeTraceability(kernel.traceability ?? [], input.trade.inventory, input.primaryProduction?.rawLots ?? [], input.trade.batches ?? [], input.day, input.trade.industrial);
  const normalized: EcosystemKernelState = {
    ...kernel,
    entities: buildEntityRegistry(input.organizations, input.assets, input.trade, input.demand, input.regulation, input.primaryProduction, input.logistics, input.quality, input.financials, input.packaging, input.hospitality),
    productSpecifications: mergeProductSpecifications(kernel.productSpecifications ?? [], input.trade.products, input.day),
    moneyLedger: kernel.moneyLedger ?? [],
    goodsLedger: kernel.goodsLedger ?? [],
    traceability,
    knowledge: kernel.knowledge ?? [],
    schedule: kernel.schedule?.length ? kernel.schedule : createCoreSchedule(input.day),
    audits: kernel.audits ?? [],
    nextTraceNodeNumber: nextTraceNumber(traceability),
    currentDay: input.day,
  };
  return appendKernelAudit(normalized, auditKernel(normalized, input.trade));
}

export function advanceKernelDay(kernel: EcosystemKernelState, day: number, trade: KernelTradeSnapshot): EcosystemKernelState {
  let next = { ...kernel, currentDay: day };
  const due = next.schedule.filter((event) => event.active && event.dueDay <= day);
  next = {
    ...next,
    schedule: next.schedule.map((event) => event.active && event.dueDay <= day ? reschedule(event, day) : event),
  };
  for (const event of due) {
    if (event.type === 'kernel.audit') next = appendKernelAudit(next, auditKernel(next, trade));
  }
  const random = nextRandom(next.randomState);
  return { ...next, randomState: random.state };
}

export function synchronizeKernelFromTrade(kernel: EcosystemKernelState, trade: KernelTradeSnapshot, day: number): EcosystemKernelState {
  let next = kernel;
  const recordedMoneySources = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  for (const operation of trade.operations ?? []) {
    if (operation.amount <= 0 || recordedMoneySources.has(operation.id)) continue;
    // B2B deliveries are accrued and settled by FinancialSystemState invoices.
    if (operation.kind === 'delivery' || operation.kind === 'purchase') continue;
    if (operation.kind === 'sale') {
      next = recordMoneyTransfer(next, {
        day: operation.day,
        debitAccount: 'system:consumer_spend',
        creditAccount: `org:${operation.organizationId}:revenue`,
        amount: operation.amount,
        currency: 'EUR',
        sourceType: 'consumer_sale',
        sourceId: operation.id,
        memo: operation.headline,
      });
      recordedMoneySources.add(operation.id);
      continue;
    }
    if (!operation.counterpartyOrganizationId) continue;
    next = recordMoneyTransfer(next, {
      day: operation.day,
      debitAccount: `org:${operation.organizationId}:expense`,
      creditAccount: `org:${operation.counterpartyOrganizationId}:revenue`,
      amount: operation.amount,
      currency: 'EUR',
      sourceType: operation.kind,
      sourceId: operation.id,
      memo: operation.headline,
    });
    recordedMoneySources.add(operation.id);
  }

  const recordedGoodsSources = new Set(next.goodsLedger.map((entry) => entry.sourceId));
  for (const shipment of trade.shipments ?? []) {
    if (shipment.status !== 'delivered' || shipment.arrivalDay > day || recordedGoodsSources.has(shipment.id)) continue;
    next = recordGoodsMovement(next, {
      day,
      commodityId: shipment.commodityId,
      lotId: null,
      quantity: shipment.quantity,
      unit: 'unit',
      fromOrganizationId: shipment.sellerOrganizationId,
      toOrganizationId: shipment.buyerOrganizationId,
      fromAssetId: null,
      toAssetId: shipment.buyerAssetId,
      sourceType: 'shipment',
      sourceId: shipment.id,
    });
    recordedGoodsSources.add(shipment.id);
    const parentNodeIds = (shipment.lotAllocations ?? []).map((allocation) => next.traceability.find((node) => node.entityId === allocation.lotId)?.id).filter((id): id is string => Boolean(id));
    if (!next.traceability.some((node) => node.entityKind === 'shipment' && node.entityId === shipment.id)) next = addTraceNode(next, { entityKind: 'shipment', entityId: shipment.id, parentNodeIds, organizationId: shipment.buyerOrganizationId, createdDay: day });
  }
  for (const shelf of trade.shelves ?? []) {
    const sourceId = `retail:${day}:${shelf.id}`;
    if (shelf.unitsSoldToday <= 0 || recordedGoodsSources.has(sourceId)) continue;
    next = recordGoodsMovement(next, {
      day,
      commodityId: shelf.productId,
      lotId: null,
      quantity: shelf.unitsSoldToday,
      unit: 'bottle',
      fromOrganizationId: shelf.supplierOrganizationId,
      toOrganizationId: null,
      fromAssetId: shelf.assetId,
      toAssetId: null,
      sourceType: 'consumer_sale',
      sourceId,
    });
    recordedGoodsSources.add(sourceId);
    const parentNodeIds = (shelf.soldLotAllocationsToday ?? shelf.lotAllocations ?? []).map((allocation) => next.traceability.find((node) => node.entityId === allocation.lotId)?.id).filter((id): id is string => Boolean(id));
    if (!next.traceability.some((node) => node.entityKind === 'sale' && node.entityId === sourceId)) next = addTraceNode(next, { entityKind: 'sale', entityId: sourceId, parentNodeIds, organizationId: shelf.supplierOrganizationId, createdDay: day });
  }
  return { ...next, traceability: mergeTraceability(next.traceability, trade.inventory, [], trade.batches ?? [], day, trade.industrial) };
}


export function synchronizeKernelFromHospitality(kernel: EcosystemKernelState, hospitality: HospitalityState): EcosystemKernelState {
  let next = kernel;
  const recorded = new Set(next.goodsLedger.map((entry) => entry.sourceId));
  for (const report of hospitality.shiftReports) {
    for (const item of report.items) {
      const sourceId = `hospitality:${report.id}:${item.menuItemId}`;
      if (item.orders <= 0 || recorded.has(sourceId)) continue;
      const menuItem = hospitality.menuItems.find((candidate) => candidate.id === item.menuItemId);
      const productId = menuItem?.ingredients.find((ingredient) => ingredient.productId)?.productId ?? 'hospitality-serve';
      next = recordGoodsMovement(next, {
        day: report.day,
        commodityId: productId,
        lotId: item.sourceLotIds[0] ?? null,
        quantity: item.orders,
        unit: 'serve',
        fromOrganizationId: report.organizationId,
        toOrganizationId: null,
        fromAssetId: report.assetId,
        toAssetId: null,
        sourceType: 'hospitality_service',
        sourceId,
      });
      recorded.add(sourceId);
      const parentNodeIds = item.sourceLotIds.map((lotId) => next.traceability.find((node) => node.entityId === lotId)?.id).filter((id): id is string => Boolean(id));
      if (!next.traceability.some((node) => node.entityKind === 'serve' && node.entityId === sourceId)) next = addTraceNode(next, {
        entityKind: 'serve', entityId: sourceId, parentNodeIds, organizationId: report.organizationId, createdDay: report.day,
      });
    }
  }

  const recordedTrendFacts = new Set(next.knowledge
    .filter((fact) => fact.factKey.startsWith('hospitality.cocktail_trend:'))
    .map((fact) => `${fact.subjectEntityId}:${fact.factKey}:${fact.learnedDay}`));
  for (const snapshot of hospitality.trendHistory.slice().sort((left, right) => left.day - right.day)) {
    const subjectEntityId = `region:${snapshot.regionId}`;
    const factKey = `hospitality.cocktail_trend:${snapshot.recipeId}`;
    const dedupeKey = `${subjectEntityId}:${factKey}:${snapshot.day}`;
    if (recordedTrendFacts.has(dedupeKey)) continue;
    const fact: KernelKnowledgeFact = {
      id: `knowledge-${next.nextKnowledgeNumber}`,
      observerOrganizationId: 'system-market',
      subjectEntityId,
      factKey,
      value: `${snapshot.stage}|popularity=${snapshot.popularity}|momentum=${snapshot.momentum}|saturation=${snapshot.saturation}|cause=${snapshot.cause}`,
      confidence: .98,
      learnedDay: snapshot.day,
      expiresDay: null,
      source: 'public_record',
    };
    next = {
      ...next,
      knowledge: [...next.knowledge, fact].slice(-5000),
      nextKnowledgeNumber: next.nextKnowledgeNumber + 1,
    };
    recordedTrendFacts.add(dedupeKey);
  }
  return next;
}


export function synchronizeKernelFromRegulation(kernel: EcosystemKernelState, regulation: KernelRegulationSnapshot): EcosystemKernelState {
  let next = kernel;
  const sources = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  for (const payment of regulation.payments) {
    if (payment.amount <= 0 || sources.has(payment.id)) continue;
    next = recordMoneyTransfer(next, {
      day: payment.day,
      debitAccount: `org:${payment.organizationId}:expense`,
      creditAccount: `system:${payment.authorityId}:tax_revenue`,
      amount: payment.amount,
      currency: payment.currency,
      sourceType: 'excise_payment',
      sourceId: payment.id,
      memo: `Уплата акциза ${payment.obligationId}`,
    });
    sources.add(payment.id);
  }
  return next;
}

export function synchronizeKernelFromLogistics(kernel: EcosystemKernelState, logistics: KernelLogisticsSnapshot): EcosystemKernelState {
  let next = kernel;
  const recorded = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  for (const operation of logistics.operations) {
    if (operation.amount <= 0 || recorded.has(operation.id) || !operation.carrierOrganizationId || !operation.organizationId) continue;
    const damageClaim = operation.kind === 'damage';
    next = recordMoneyTransfer(next, {
      day: operation.day,
      debitAccount: `org:${damageClaim ? operation.carrierOrganizationId : operation.organizationId}:expense`,
      creditAccount: `org:${damageClaim ? operation.organizationId : operation.carrierOrganizationId}:revenue`,
      amount: operation.amount,
      currency: 'EUR',
      sourceType: damageClaim ? 'freight_claim' : 'freight_service',
      sourceId: operation.id,
      memo: operation.headline,
    });
    recorded.add(operation.id);
  }
  return next;
}

export function synchronizeKernelFromQuality(kernel: EcosystemKernelState, quality: QualityState): EcosystemKernelState {
  let next = kernel;
  const moneySources = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  const goodsSources = new Set(next.goodsLedger.map((entry) => entry.sourceId));
  for (const operation of quality.operations) {
    if (operation.kind === 'test_fee' && operation.amount > 0 && operation.counterpartyOrganizationId && !moneySources.has(operation.id)) {
      next = recordMoneyTransfer(next, {
        day: operation.day,
        debitAccount: `org:${operation.organizationId}:expense`,
        creditAccount: `org:${operation.counterpartyOrganizationId}:revenue`,
        amount: operation.amount,
        currency: 'EUR',
        sourceType: 'quality_test',
        sourceId: operation.id,
        memo: operation.headline,
      });
      moneySources.add(operation.id);
    }
    if (operation.kind === 'recall_cost' && operation.amount > 0 && !moneySources.has(operation.id)) {
      next = recordMoneyTransfer(next, {
        day: operation.day,
        debitAccount: `org:${operation.organizationId}:expense`,
        creditAccount: 'system:quality_recall',
        amount: operation.amount,
        currency: 'EUR',
        sourceType: 'recall_cost',
        sourceId: operation.id,
        memo: operation.headline,
      });
      moneySources.add(operation.id);
    }
    if (operation.kind === 'destruction' && operation.quantity > 0 && operation.productId && !goodsSources.has(operation.id)) {
      next = recordGoodsMovement(next, {
        day: operation.day,
        commodityId: operation.productId,
        lotId: operation.lotId,
        quantity: operation.quantity,
        unit: 'bottle',
        fromOrganizationId: operation.organizationId,
        toOrganizationId: null,
        fromAssetId: null,
        toAssetId: null,
        sourceType: 'quality_destruction',
        sourceId: operation.id,
      });
      goodsSources.add(operation.id);
    }
  }
  return next;
}


export function synchronizeKernelFromPackaging(kernel: EcosystemKernelState, packaging: PackagingState): EcosystemKernelState {
  const entities = [...kernel.entities];
  const byId = new Set(entities.map((entity) => entity.id));
  for (const job of packaging.jobs) {
    if (byId.has(job.id)) continue;
    entities.push({ id: job.id, kind: 'packaging_job', label: `${job.componentId}:${job.status}`, ownerOrganizationId: null, countryId: null, regionId: null, sourceModule: 'packaging' });
    byId.add(job.id);
  }
  for (const item of packaging.returns) {
    if (byId.has(item.id)) continue;
    entities.push({ id: item.id, kind: 'packaging_return', label: `${item.productId}:${item.status}`, ownerOrganizationId: null, countryId: null, regionId: null, sourceModule: 'packaging' });
    byId.add(item.id);
  }
  let next = { ...kernel, entities: deduplicateEntities(entities) };
  const recordedMoney = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  const recordedGoods = new Set(next.goodsLedger.map((entry) => entry.sourceId));
  for (const operation of packaging.operations) {
    const sourceId = `packaging:${operation.id}`;
    if (operation.amount > 0 && !recordedMoney.has(sourceId)) {
      next = recordMoneyTransfer(next, { day: operation.day, debitAccount: `org:${operation.organizationId}:expense`, creditAccount: 'system:packaging-environment', amount: operation.amount, currency: 'EUR', sourceType: 'packaging', sourceId, memo: operation.headline });
      recordedMoney.add(sourceId);
    }
    if (operation.quantity > 0 && operation.componentId && !recordedGoods.has(sourceId)) {
      next = recordGoodsMovement(next, {
        day: operation.day,
        commodityId: operation.componentId,
        lotId: null,
        quantity: operation.quantity,
        unit: 'unit',
        fromOrganizationId: operation.kind === 'defect' ? operation.organizationId : null,
        toOrganizationId: operation.kind === 'defect' ? null : operation.organizationId,
        fromAssetId: null,
        toAssetId: null,
        sourceType: `packaging_${operation.kind}`,
        sourceId,
      });
      recordedGoods.add(sourceId);
    }
  }
  return next;
}

export function synchronizeKernelFromFinance(kernel: EcosystemKernelState, financials: FinancialSystemState): EcosystemKernelState {
  let next = kernel;
  const recorded = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  const add = (sourceId: string, day: number, debitAccount: LedgerAccount, creditAccount: LedgerAccount, amount: number, sourceType: string, memo: string) => {
    if (amount <= 0 || recorded.has(sourceId)) return;
    next = recordMoneyTransfer(next, { day, debitAccount, creditAccount, amount, currency: 'EUR', sourceType, sourceId, memo });
    recorded.add(sourceId);
  };
  for (const operation of financials.operations) {
    if (operation.amount <= 0) continue;
    if (operation.kind === 'invoice_issued' && operation.invoiceId && operation.counterpartyOrganizationId) {
      add(`${operation.id}:seller`, operation.day, `org:${operation.organizationId}:receivable`, `org:${operation.organizationId}:revenue`, operation.amount, 'invoice_accrual', operation.memo);
      add(`${operation.id}:buyer`, operation.day, `org:${operation.counterpartyOrganizationId}:inventory`, `org:${operation.counterpartyOrganizationId}:payable`, operation.amount, 'invoice_accrual', operation.memo);
      continue;
    }
    if (operation.kind === 'payment' && operation.invoiceId && operation.counterpartyOrganizationId) {
      add(`${operation.id}:buyer`, operation.day, `org:${operation.organizationId}:payable`, `org:${operation.organizationId}:cash`, operation.amount, 'invoice_payment', operation.memo);
      add(`${operation.id}:seller`, operation.day, `org:${operation.counterpartyOrganizationId}:cash`, `org:${operation.counterpartyOrganizationId}:receivable`, operation.amount, 'invoice_payment', operation.memo);
      continue;
    }
    if (operation.kind === 'credit_draw') {
      add(operation.id, operation.day, `org:${operation.organizationId}:cash`, `org:${operation.organizationId}:debt`, operation.amount, 'credit_draw', operation.memo);
      continue;
    }
    if (operation.kind === 'credit_repayment') {
      add(operation.id, operation.day, `org:${operation.organizationId}:debt`, `org:${operation.organizationId}:cash`, operation.amount, 'credit_repayment', operation.memo);
      continue;
    }
    if (operation.kind === 'default') {
      add(operation.id, operation.day, `org:${operation.organizationId}:expense`, `org:${operation.organizationId}:receivable`, operation.amount, 'bad_debt_writeoff', operation.memo);
      continue;
    }
    if (operation.kind === 'interest' || operation.kind === 'insurance_premium') {
      add(operation.id, operation.day, `org:${operation.organizationId}:expense`, operation.counterpartyOrganizationId ? `org:${operation.counterpartyOrganizationId}:revenue` : 'system:finance', operation.amount, `finance_${operation.kind}`, operation.memo);
    }
  }
  return next;
}

export function runObserverKernelSimulation(kernel: EcosystemKernelState, trade: KernelTradeSnapshot, days: number): EcosystemKernelState {
  let next = kernel;
  for (let offset = 1; offset <= Math.max(0, days); offset += 1) {
    const day = kernel.currentDay + offset;
    next = synchronizeKernelFromTrade(advanceKernelDay(next, day, trade), trade, day);
  }
  return next;
}

export function recordMoneyTransfer(kernel: EcosystemKernelState, input: Omit<KernelMoneyEntry, 'id'>): EcosystemKernelState {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Сумма проводки должна быть положительной');
  const entry: KernelMoneyEntry = { ...input, id: `money-${kernel.nextMoneyEntryNumber}` };
  return { ...kernel, moneyLedger: [...kernel.moneyLedger, entry].slice(-10_000), nextMoneyEntryNumber: kernel.nextMoneyEntryNumber + 1 };
}

export function recordGoodsMovement(kernel: EcosystemKernelState, input: Omit<KernelGoodsEntry, 'id'>): EcosystemKernelState {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('Количество товара должно быть положительным');
  const entry: KernelGoodsEntry = { ...input, id: `goods-${kernel.nextGoodsEntryNumber}` };
  return { ...kernel, goodsLedger: [...kernel.goodsLedger, entry].slice(-20_000), nextGoodsEntryNumber: kernel.nextGoodsEntryNumber + 1 };
}

export function addTraceNode(kernel: EcosystemKernelState, input: Omit<KernelTraceNode, 'id'>): EcosystemKernelState {
  for (const parentId of input.parentNodeIds) if (!kernel.traceability.some((node) => node.id === parentId)) throw new Error(`Неизвестный родительский trace node: ${parentId}`);
  const node: KernelTraceNode = { ...input, id: `trace-${kernel.nextTraceNodeNumber}` };
  return { ...kernel, traceability: [...kernel.traceability, node], nextTraceNodeNumber: kernel.nextTraceNodeNumber + 1 };
}

export function synchronizeKernelFromPrimary(kernel: EcosystemKernelState, primary: KernelPrimarySnapshot, _day: number): EcosystemKernelState {
  let next = kernel;
  const recordedGoods = new Set(next.goodsLedger.map((entry) => entry.sourceId));
  const recordedMoney = new Set(next.moneyLedger.map((entry) => entry.sourceId));
  const traceByEntity = new Map(next.traceability.map((node) => [node.entityId, node]));
  const pendingParentUpdates = new Map<string, string[]>();

  for (const operation of primary.operations) {
    if (operation.kind === 'harvest' && !recordedGoods.has(operation.id)) {
      const lotId = operation.outputLotIds[0] ?? null;
      next = recordGoodsMovement(next, {
        day: operation.day, commodityId: operation.commodityId, lotId, quantity: operation.quantity, unit: 'kg',
        fromOrganizationId: null, toOrganizationId: operation.organizationId, fromAssetId: null, toAssetId: null,
        sourceType: 'harvest', sourceId: operation.id,
      });
      recordedGoods.add(operation.id);
    }
    if (operation.kind === 'raw_sale') {
      if (operation.amount > 0 && operation.counterpartyOrganizationId && !recordedMoney.has(operation.id)) {
        next = recordMoneyTransfer(next, {
          day: operation.day,
          debitAccount: `org:${operation.counterpartyOrganizationId}:expense`,
          creditAccount: `org:${operation.organizationId}:revenue`,
          amount: operation.amount,
          currency: 'EUR',
          sourceType: 'raw_sale',
          sourceId: operation.id,
          memo: operation.headline,
        });
        recordedMoney.add(operation.id);
      }
      if (!recordedGoods.has(operation.id)) {
        next = recordGoodsMovement(next, {
          day: operation.day, commodityId: operation.commodityId, lotId: operation.inputLotIds[0] ?? null,
          quantity: operation.quantity, unit: 'kg', fromOrganizationId: operation.organizationId,
          toOrganizationId: operation.counterpartyOrganizationId, fromAssetId: null, toAssetId: null,
          sourceType: 'raw_sale', sourceId: operation.id,
        });
        recordedGoods.add(operation.id);
      }
    }
    if (operation.kind === 'processing') {
      const parentNodeIds = operation.inputLotIds
        .map((lotId) => traceByEntity.get(lotId)?.id)
        .filter((id): id is string => Boolean(id));
      for (const outputLotId of operation.outputLotIds) {
        const existing = traceByEntity.get(outputLotId);
        if (existing) {
          if (existing.parentNodeIds.length === 0 && parentNodeIds.length > 0) pendingParentUpdates.set(existing.id, [...new Set(parentNodeIds)]);
          continue;
        }
        next = addTraceNode(next, {
          entityKind: 'ingredient_lot', entityId: outputLotId, parentNodeIds,
          organizationId: operation.organizationId, createdDay: operation.day,
        });
        const created = next.traceability[next.traceability.length - 1];
        if (created) traceByEntity.set(outputLotId, created);
      }
    }
  }
  if (pendingParentUpdates.size > 0) {
    next = {
      ...next,
      traceability: next.traceability.map((node) => {
        const parentNodeIds = pendingParentUpdates.get(node.id);
        return parentNodeIds ? { ...node, parentNodeIds } : node;
      }),
    };
  }
  return next;
}

export function traceAncestors(kernel: EcosystemKernelState, nodeId: string): KernelTraceNode[] {
  const byId = new Map(kernel.traceability.map((node) => [node.id, node]));
  const result: KernelTraceNode[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;
    result.push(node);
    node.parentNodeIds.forEach(visit);
  };
  visit(nodeId);
  return result;
}

export function auditKernel(kernel: EcosystemKernelState, trade: KernelTradeSnapshot): KernelAuditSnapshot {
  const violations: string[] = [];
  const ids = new Set<string>();
  for (const entity of kernel.entities) {
    if (ids.has(entity.id)) violations.push(`Дублирующийся entity id: ${entity.id}`);
    ids.add(entity.id);
  }
  for (const lot of trade.inventory) {
    if (lot.quantity < 0) violations.push(`Отрицательный остаток: ${lot.id}`);
    if (!ids.has(lot.organizationId)) violations.push(`Лот ${lot.id} ссылается на неизвестную организацию ${lot.organizationId}`);
  }
  for (const contract of trade.contracts) {
    if (!ids.has(contract.sellerOrganizationId)) violations.push(`Контракт ${contract.id}: неизвестный продавец`);
    if (!ids.has(contract.buyerOrganizationId)) violations.push(`Контракт ${contract.id}: неизвестный покупатель`);
  }
  for (const lot of trade.industrial?.intermediateLots ?? []) if (!ids.has(lot.ownerOrganizationId)) violations.push(`Промежуточный лот ${lot.id}: неизвестный владелец`);
  for (const plan of trade.industrial?.plans ?? []) if (!ids.has(plan.producerOrganizationId)) violations.push(`Процесс ${plan.id}: неизвестный производитель`);
  for (const entry of kernel.moneyLedger) if (entry.amount <= 0) violations.push(`Некорректная денежная проводка: ${entry.id}`);
  for (const entry of kernel.goodsLedger) if (entry.quantity <= 0) violations.push(`Некорректная товарная проводка: ${entry.id}`);
  return {
    day: kernel.currentDay,
    organizationCount: kernel.entities.filter((entity) => entity.kind === 'organization').length,
    assetCount: kernel.entities.filter((entity) => entity.kind === 'asset').length,
    productCount: kernel.entities.filter((entity) => entity.kind === 'product').length,
    lotCount: trade.inventory.length,
    moneyEntryCount: kernel.moneyLedger.length,
    goodsEntryCount: kernel.goodsLedger.length,
    traceNodeCount: kernel.traceability.length,
    violations,
  };
}

export function observerSummary(kernel: EcosystemKernelState): { day: number; entities: number; scheduled: number; violations: number; seed: number } {
  const latest = kernel.audits[kernel.audits.length - 1];
  return { day: kernel.currentDay, entities: kernel.entities.length, scheduled: kernel.schedule.filter((event) => event.active).length, violations: latest?.violations.length ?? 0, seed: kernel.seed };
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export function nextRandom(state: number): { state: number; value: number } {
  let x = state || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const next = x >>> 0;
  return { state: next || 1, value: next / 0x1_0000_0000 };
}

function buildEntityRegistry(organizations: KernelOrganizationInput[], assets: KernelAssetInput[], trade: KernelTradeSnapshot, demand?: KernelDemandSnapshot, regulation?: KernelRegulationSnapshot, primary?: KernelPrimarySnapshot, logistics?: KernelLogisticsSnapshot, quality?: KernelQualitySnapshot, financials?: KernelFinancialSnapshot, packaging?: KernelPackagingSnapshot, hospitality?: HospitalityState): KernelEntityRef[] {
  const entities: KernelEntityRef[] = [];
  for (const organization of organizations) entities.push({ id: organization.id, kind: 'organization', label: organization.name, ownerOrganizationId: organization.id, countryId: organization.countryId, regionId: organization.regionId, sourceModule: 'ecosystem' });
  for (const asset of assets) entities.push({ id: asset.id, kind: 'asset', label: asset.type, ownerOrganizationId: asset.ownerOrganizationId, countryId: asset.countryId, regionId: asset.regionId, sourceModule: 'ecosystem' });
  for (const product of trade.products) entities.push({ id: product.id, kind: 'product', label: product.name, ownerOrganizationId: product.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'trade' });
  for (const lot of trade.inventory) entities.push({ id: lot.id, kind: 'lot', label: lot.commodityId, ownerOrganizationId: lot.organizationId, countryId: null, regionId: null, sourceModule: 'trade' });
  for (const contract of trade.contracts) entities.push({ id: contract.id, kind: 'contract', label: `${contract.commodityKind}:${contract.commodityId}`, ownerOrganizationId: contract.sellerOrganizationId, countryId: null, regionId: null, sourceModule: 'trade' });
  for (const plan of (trade.industrial?.plans ?? []).filter((item) => item.status !== 'complete').slice(-120)) entities.push({ id: plan.id, kind: 'process_plan', label: `${plan.productId}:${plan.status}`, ownerOrganizationId: plan.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'industrial' });
  for (const run of (trade.industrial?.runs ?? []).filter((item) => item.status !== 'complete').slice(-120)) entities.push({ id: run.id, kind: 'process_run', label: `${run.stageId}:${run.status}`, ownerOrganizationId: run.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'industrial' });
  for (const lot of (trade.industrial?.intermediateLots ?? []).filter((item) => !('status' in item) || item.status !== 'consumed').slice(-240)) entities.push({ id: lot.id, kind: 'intermediate_lot', label: lot.productId, ownerOrganizationId: lot.ownerOrganizationId, countryId: null, regionId: null, sourceModule: 'industrial' });
  for (const lot of (trade.industrial?.maturationLots ?? []).filter((item) => !('status' in item) || item.status !== 'drained').slice(-120)) entities.push({ id: lot.id, kind: 'maturation_lot', label: lot.productId, ownerOrganizationId: lot.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'industrial' });
  for (const recipe of (trade.industrial?.blendRecipes ?? []).slice(-160)) entities.push({ id: recipe.id, kind: 'blend_recipe', label: recipe.name, ownerOrganizationId: recipe.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'industrial' });
  for (const region of demand?.regions ?? []) {
    entities.push({ id: `region:${region.regionId}`, kind: 'region', label: region.regionId, ownerOrganizationId: null, countryId: region.countryId, regionId: region.regionId, sourceModule: 'demand' });
    for (const segment of region.segments) entities.push({ id: segment.id, kind: 'consumer_segment', label: segment.name, ownerOrganizationId: null, countryId: region.countryId, regionId: region.regionId, sourceModule: 'demand' });
  }
  for (const authority of regulation?.authorities ?? []) entities.push({ id: authority.id, kind: 'authority', label: authority.name, ownerOrganizationId: null, countryId: authority.countryId, regionId: null, sourceModule: 'regulation' });
  for (const license of regulation?.licenses ?? []) entities.push({ id: license.id, kind: 'license', label: license.permitType, ownerOrganizationId: license.organizationId, countryId: license.countryId, regionId: null, sourceModule: 'regulation' });
  for (const obligation of regulation?.obligations ?? []) entities.push({ id: obligation.id, kind: 'tax_obligation', label: obligation.status, ownerOrganizationId: obligation.organizationId, countryId: null, regionId: null, sourceModule: 'regulation' });
  for (const inspection of regulation?.inspections ?? []) entities.push({ id: inspection.id, kind: 'inspection', label: inspection.result, ownerOrganizationId: inspection.organizationId, countryId: null, regionId: null, sourceModule: 'regulation' });
  for (const site of primary?.sites ?? []) entities.push({ id: `primary-site:${site.id}`, kind: 'primary_site', label: site.commodityId, ownerOrganizationId: site.organizationId, countryId: null, regionId: site.regionId, sourceModule: 'primary' });
  for (const lot of primary?.rawLots ?? []) entities.push({ id: lot.id, kind: 'lot', label: lot.commodityId, ownerOrganizationId: lot.organizationId, countryId: null, regionId: null, sourceModule: 'primary' });
  for (const harvest of primary?.harvests ?? []) entities.push({ id: harvest.id, kind: 'harvest', label: harvest.commodityId, ownerOrganizationId: harvest.organizationId, countryId: null, regionId: null, sourceModule: 'primary' });
  for (const vehicle of logistics?.fleet ?? []) entities.push({ id: vehicle.id, kind: 'vehicle', label: vehicle.type, ownerOrganizationId: vehicle.carrierId, countryId: null, regionId: vehicle.currentRegionId, sourceModule: 'logistics' });
  for (const route of logistics?.routes ?? []) entities.push({ id: route.id, kind: 'route', label: `${route.originRegionId} → ${route.destinationRegionId}`, ownerOrganizationId: null, countryId: null, regionId: route.originRegionId, sourceModule: 'logistics' });
  for (const job of logistics?.jobs ?? []) entities.push({ id: job.id, kind: 'freight_job', label: job.status, ownerOrganizationId: job.carrierId, countryId: null, regionId: null, sourceModule: 'logistics' });
  for (const laboratory of quality?.laboratories ?? []) entities.push({ id: laboratory.id, kind: 'quality_lab', label: laboratory.name, ownerOrganizationId: laboratory.organizationId, countryId: laboratory.countryId, regionId: laboratory.regionId, sourceModule: 'quality' });
  for (const sample of quality?.samples ?? []) entities.push({ id: sample.id, kind: 'quality_sample', label: sample.status, ownerOrganizationId: sample.organizationId, countryId: null, regionId: null, sourceModule: 'quality' });
  for (const certificate of quality?.certificates ?? []) entities.push({ id: certificate.id, kind: 'quality_certificate', label: certificate.status, ownerOrganizationId: certificate.organizationId, countryId: null, regionId: null, sourceModule: 'quality' });
  for (const incident of quality?.incidents ?? []) entities.push({ id: incident.id, kind: 'quality_incident', label: incident.status, ownerOrganizationId: incident.organizationId, countryId: null, regionId: null, sourceModule: 'quality' });
  for (const recall of quality?.recalls ?? []) entities.push({ id: recall.id, kind: 'recall', label: recall.status, ownerOrganizationId: recall.responsibleOrganizationId, countryId: null, regionId: null, sourceModule: 'quality' });

  for (const account of financials?.accounts ?? []) entities.push({ id: account.id, kind: 'bank_account', label: account.bankId, ownerOrganizationId: account.organizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const invoice of financials?.invoices ?? []) entities.push({ id: invoice.id, kind: 'invoice', label: invoice.status, ownerOrganizationId: invoice.sellerOrganizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const facility of financials?.creditFacilities ?? []) entities.push({ id: facility.id, kind: 'credit_facility', label: facility.status, ownerOrganizationId: facility.organizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const loan of financials?.loans ?? []) entities.push({ id: loan.id, kind: 'loan', label: loan.status, ownerOrganizationId: loan.organizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const policy of financials?.insurancePolicies ?? []) entities.push({ id: policy.id, kind: 'insurance_policy', label: policy.kind, ownerOrganizationId: policy.organizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const statement of financials?.statements ?? []) entities.push({ id: statement.id, kind: 'financial_statement', label: `Период до ${statement.periodEndDay}`, ownerOrganizationId: statement.organizationId, countryId: null, regionId: null, sourceModule: 'finance' });
  for (const job of packaging?.jobs ?? []) entities.push({ id: job.id, kind: 'packaging_job', label: `${job.componentId}:${job.status}`, ownerOrganizationId: null, countryId: null, regionId: null, sourceModule: 'packaging' });
  for (const item of packaging?.returns ?? []) entities.push({ id: item.id, kind: 'packaging_return', label: `${item.productId}:${item.status}`, ownerOrganizationId: null, countryId: null, regionId: null, sourceModule: 'packaging' });
  for (const venue of hospitality?.venues ?? []) entities.push({ id: venue.id, kind: 'hospitality_venue', label: venue.concept, ownerOrganizationId: venue.operatorOrganizationId, countryId: null, regionId: null, sourceModule: 'hospitality' });
  for (const item of hospitality?.menuItems ?? []) entities.push({ id: item.id, kind: 'menu_item', label: item.name, ownerOrganizationId: hospitality?.venues.find((venue) => venue.id === item.venueId)?.operatorOrganizationId ?? null, countryId: null, regionId: null, sourceModule: 'hospitality' });
  for (const report of (hospitality?.shiftReports ?? []).slice(0, 240)) entities.push({ id: report.id, kind: 'shift_report', label: `${report.guests} гостей`, ownerOrganizationId: report.organizationId, countryId: null, regionId: null, sourceModule: 'hospitality' });
  return deduplicateEntities(entities);
}

function deduplicateEntities(entities: KernelEntityRef[]): KernelEntityRef[] {
  const byId = new Map<string, KernelEntityRef>();
  for (const entity of entities) byId.set(entity.id, entity);
  return [...byId.values()];
}

function createProductSpecification(product: KernelProductInput, day: number): KernelProductSpecification {
  const categoryId = normalizeCategoryId(product.beverageCategoryId ?? product.family);
  const blueprint = beverageBlueprints.find((item) => item.categoryId === categoryId) ?? beverageBlueprints[0];
  if (!blueprint) throw new Error('Каталог напитков пуст');
  return { productId: product.id, blueprintId: blueprint.id, beverageCategoryId: categoryId, producerOrganizationId: product.producerOrganizationId, revision: 1, createdDay: day, attributes: { alcoholByVolume: product.alcoholByVolume ?? 0, packageVolumeLiters: product.packageVolumeLiters ?? .5, packagingProfileId: product.packagingProfileId ?? 'profile-returnable-500', productionBlueprintId: (product as KernelProductInput & { productionBlueprintId?: string }).productionBlueprintId ?? blueprint.id } };
}

function mergeProductSpecifications(current: KernelProductSpecification[], products: KernelProductInput[], day: number): KernelProductSpecification[] {
  const byProduct = new Map(current.map((spec) => [spec.productId, spec]));
  for (const product of products) if (!byProduct.has(product.id)) byProduct.set(product.id, createProductSpecification(product, day));
  return [...byProduct.values()].filter((spec) => products.some((product) => product.id === spec.productId));
}

function normalizeCategoryId(value: string): BeverageCategoryId {
  if (beverageBlueprints.some((item) => item.categoryId === value)) return value;
  if (value === 'wine') return 'still_wine';
  if (value === 'spirit') return 'whisky';
  if (value === 'liqueur') return 'liqueur';
  return value === 'beer' || value === 'cider' || value === 'alcohol_free' ? value : 'beer';
}

function nextTraceNumber(nodes: KernelTraceNode[]): number {
  return nodes.reduce((max, node) => Math.max(max, Number(node.id.split('-').at(-1)) || 0), 0) + 1;
}

function mergeTraceability(current: KernelTraceNode[], lots: KernelLotInput[], rawLots: KernelPrimarySnapshot['rawLots'], batches: NonNullable<KernelTradeSnapshot['batches']>, day: number, industrial?: KernelTradeSnapshot['industrial']): KernelTraceNode[] {
  const nodes = current.map((node) => ({ ...node, parentNodeIds: [...node.parentNodeIds] }));
  const byEntity = new Map(nodes.map((node) => [node.entityId, node]));
  let nextNumber = nodes.reduce((max, node) => Math.max(max, Number(node.id.split('-').at(-1)) || 0), 0) + 1;
  const add = (entityKind: KernelTraceNode['entityKind'], entityId: string, parentNodeIds: string[], organizationId: string, createdDay: number) => {
    const existing = byEntity.get(entityId);
    if (existing) {
      if (existing.parentNodeIds.length === 0 && parentNodeIds.length > 0) existing.parentNodeIds = [...new Set(parentNodeIds)];
      return existing;
    }
    const node: KernelTraceNode = { id: `trace-${nextNumber++}`, entityKind, entityId, parentNodeIds: [...new Set(parentNodeIds)], organizationId, createdDay };
    nodes.push(node);
    byEntity.set(entityId, node);
    return node;
  };
  for (const lot of rawLots) add('harvest_lot', lot.id, [], lot.organizationId, day);
  for (const batch of batches) {
    const parents = batch.ingredientLotIds.map((lotId) => byEntity.get(lotId)?.id).filter((id): id is string => Boolean(id));
    add('production_batch', batch.id, parents, batch.producerOrganizationId, batch.startDay);
  }
  for (const lot of industrial?.intermediateLots ?? []) {
    const parents = [...lot.sourceTradeLotIds, ...lot.sourceIntermediateLotIds].map((lotId) => byEntity.get(lotId)?.id).filter((id): id is string => Boolean(id));
    add('bulk_lot', lot.id, parents, lot.ownerOrganizationId, lot.createdDay);
  }
  for (const lot of industrial?.maturationLots ?? []) {
    const parent = byEntity.get(lot.sourceIntermediateLotId)?.id;
    add('maturation_lot', lot.id, parent ? [parent] : [], lot.producerOrganizationId, lot.enteredDay);
  }
  for (const lot of lots) {
    const parents = [
      ...(lot.sourceLotIds ?? []).map((lotId) => byEntity.get(lotId)?.id),
      lot.productionBatchId ? byEntity.get(lot.productionBatchId)?.id : undefined,
    ].filter((id): id is string => Boolean(id));
    add(lot.commodityKind === 'ingredient' ? 'ingredient_lot' : 'package_lot', lot.id, parents, lot.organizationId, day);
  }
  return nodes;
}

function createCoreSchedule(day: number): KernelScheduledEvent[] {
  return [
    { id: 'schedule-1', type: 'kernel.audit', dueDay: day + 1, cadence: 'daily', intervalDays: 1, payload: {}, active: true },
    { id: 'schedule-2', type: 'market.month_close', dueDay: day + 30, cadence: 'monthly', intervalDays: 30, payload: {}, active: true },
    { id: 'schedule-3', type: 'agriculture.season', dueDay: day + 90, cadence: 'seasonal', intervalDays: 90, payload: {}, active: true },
    { id: 'schedule-4', type: 'regulation.year_close', dueDay: day + 365, cadence: 'annual', intervalDays: 365, payload: {}, active: true },
    { id: 'schedule-5', type: 'history.compact', dueDay: day + 120, cadence: 'monthly', intervalDays: 120, payload: {}, active: true },
  ];
}

function reschedule(event: KernelScheduledEvent, day: number): KernelScheduledEvent {
  if (event.cadence === 'once') return { ...event, active: false };
  return { ...event, dueDay: day + Math.max(1, event.intervalDays) };
}

function appendKernelAudit(kernel: EcosystemKernelState, audit: KernelAuditSnapshot): EcosystemKernelState {
  return { ...kernel, audits: [...kernel.audits, audit].slice(-48) };
}
