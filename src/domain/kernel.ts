import { beverageBlueprints, type BeverageCategoryId } from '../data/beverageCatalog';

export type KernelEntityKind = 'organization' | 'asset' | 'product' | 'lot' | 'contract' | 'shipment' | 'serve_recipe' | 'region' | 'consumer_segment' | 'authority' | 'license' | 'inspection' | 'tax_obligation' | 'primary_site' | 'harvest';
export type LedgerAccount = `org:${string}:cash` | `org:${string}:revenue` | `org:${string}:expense` | `system:${string}`;
export type ScheduleCadence = 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual' | 'once';

export interface KernelOrganizationInput { id: string; name: string; countryId: string; regionId: string; }
export interface KernelAssetInput { id: string; ownerOrganizationId: string | null; operatorOrganizationId: string | null; countryId: string; regionId: string; type: string; }
export interface KernelProductInput { id: string; producerOrganizationId: string; name: string; family: string; beverageCategoryId?: string; alcoholByVolume?: number; packageVolumeLiters?: number; }
export interface KernelLotInput { id: string; organizationId: string; commodityKind: string; commodityId: string; quantity: number; unit: string; originOrganizationId: string; }
export interface KernelContractInput { id: string; sellerOrganizationId: string; buyerOrganizationId: string; commodityKind: string; commodityId: string; }
export interface KernelShipmentInput { id: string; sellerOrganizationId: string; buyerOrganizationId: string; buyerAssetId: string | null; commodityId: string; quantity: number; unitPrice: number; status: string; arrivalDay: number; }
export interface KernelShelfInput { id: string; assetId: string; productId: string; supplierOrganizationId: string; unitsSoldToday: number; revenueToday: number; }
export interface KernelOperationInput { id: string; day: number; kind: string; organizationId: string; counterpartyOrganizationId: string | null; assetId: string | null; amount: number; headline: string; }
export interface KernelTradeSnapshot {
  products: KernelProductInput[];
  inventory: KernelLotInput[];
  contracts: KernelContractInput[];
  shipments?: KernelShipmentInput[];
  shelves?: KernelShelfInput[];
  operations?: KernelOperationInput[];
}

export interface KernelEntityRef {
  id: string;
  kind: KernelEntityKind;
  label: string;
  ownerOrganizationId: string | null;
  countryId: string | null;
  regionId: string | null;
  sourceModule: 'ecosystem' | 'trade' | 'catalog' | 'demand' | 'regulation' | 'primary';
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
  entityKind: 'harvest_lot' | 'ingredient_lot' | 'production_batch' | 'bulk_lot' | 'package_lot' | 'shipment' | 'sale';
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

export interface KernelCreateInput {
  day: number;
  seedText: string;
  organizations: KernelOrganizationInput[];
  assets: KernelAssetInput[];
  trade: KernelTradeSnapshot;
  demand?: KernelDemandSnapshot;
  regulation?: KernelRegulationSnapshot;
  primaryProduction?: KernelPrimarySnapshot;
}

export function createEcosystemKernel(input: KernelCreateInput): EcosystemKernelState {
  const seed = hashSeed(input.seedText);
  const entities = buildEntityRegistry(input.organizations, input.assets, input.trade, input.demand, input.regulation, input.primaryProduction);
  const productSpecifications = input.trade.products.map((product) => createProductSpecification(product, input.day));
  const primaryTrace = (input.primaryProduction?.rawLots ?? []).map((lot, index) => ({
    id: `trace-${index + 1}`,
    entityKind: 'harvest_lot' as const,
    entityId: lot.id,
    parentNodeIds: [],
    organizationId: lot.organizationId,
    createdDay: input.day,
  }));
  const tradeTrace = input.trade.inventory.map((lot, index) => ({
    id: `trace-${primaryTrace.length + index + 1}`,
    entityKind: lot.commodityKind === 'ingredient' ? 'ingredient_lot' as const : 'package_lot' as const,
    entityId: lot.id,
    parentNodeIds: [],
    organizationId: lot.organizationId,
    createdDay: input.day,
  }));
  const traceability = [...primaryTrace, ...tradeTrace];
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
  const traceability = mergeTraceability(kernel.traceability ?? [], input.trade.inventory, input.primaryProduction?.rawLots ?? [], input.day);
  const normalized: EcosystemKernelState = {
    ...kernel,
    entities: buildEntityRegistry(input.organizations, input.assets, input.trade, input.demand, input.regulation, input.primaryProduction),
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
    const payer = operation.kind === 'sale' || operation.kind === 'delivery' ? operation.counterpartyOrganizationId : operation.organizationId;
    const payee = operation.kind === 'sale' || operation.kind === 'delivery' ? operation.organizationId : operation.counterpartyOrganizationId;
    if (!payer || !payee) continue;
    next = recordMoneyTransfer(next, {
      day: operation.day,
      debitAccount: `org:${payer}:expense`,
      creditAccount: `org:${payee}:revenue`,
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
  }
  return { ...next, traceability: mergeTraceability(next.traceability, trade.inventory, [], day) };
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
  const traceByEntity = new Map(next.traceability.map((node) => [node.entityId, node.id]));

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
      const parentNodeIds = operation.inputLotIds.map((lotId) => traceByEntity.get(lotId)).filter((id): id is string => Boolean(id));
      for (const outputLotId of operation.outputLotIds) {
        if (traceByEntity.has(outputLotId)) {
          const nodeId = traceByEntity.get(outputLotId)!;
          next = { ...next, traceability: next.traceability.map((node) => node.id === nodeId && node.parentNodeIds.length === 0 ? { ...node, parentNodeIds } : node) };
          continue;
        }
        next = addTraceNode(next, {
          entityKind: 'ingredient_lot', entityId: outputLotId, parentNodeIds,
          organizationId: operation.organizationId, createdDay: operation.day,
        });
        const created = next.traceability[next.traceability.length - 1];
        if (created) traceByEntity.set(outputLotId, created.id);
      }
    }
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

function buildEntityRegistry(organizations: KernelOrganizationInput[], assets: KernelAssetInput[], trade: KernelTradeSnapshot, demand?: KernelDemandSnapshot, regulation?: KernelRegulationSnapshot, primary?: KernelPrimarySnapshot): KernelEntityRef[] {
  const entities: KernelEntityRef[] = [];
  for (const organization of organizations) entities.push({ id: organization.id, kind: 'organization', label: organization.name, ownerOrganizationId: organization.id, countryId: organization.countryId, regionId: organization.regionId, sourceModule: 'ecosystem' });
  for (const asset of assets) entities.push({ id: asset.id, kind: 'asset', label: asset.type, ownerOrganizationId: asset.ownerOrganizationId, countryId: asset.countryId, regionId: asset.regionId, sourceModule: 'ecosystem' });
  for (const product of trade.products) entities.push({ id: product.id, kind: 'product', label: product.name, ownerOrganizationId: product.producerOrganizationId, countryId: null, regionId: null, sourceModule: 'trade' });
  for (const lot of trade.inventory) entities.push({ id: lot.id, kind: 'lot', label: lot.commodityId, ownerOrganizationId: lot.organizationId, countryId: null, regionId: null, sourceModule: 'trade' });
  for (const contract of trade.contracts) entities.push({ id: contract.id, kind: 'contract', label: `${contract.commodityKind}:${contract.commodityId}`, ownerOrganizationId: contract.sellerOrganizationId, countryId: null, regionId: null, sourceModule: 'trade' });
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
  return { productId: product.id, blueprintId: blueprint.id, beverageCategoryId: categoryId, producerOrganizationId: product.producerOrganizationId, revision: 1, createdDay: day, attributes: { alcoholByVolume: product.alcoholByVolume ?? 0, packageVolumeLiters: product.packageVolumeLiters ?? .5 } };
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

function mergeTraceability(current: KernelTraceNode[], lots: KernelLotInput[], rawLots: KernelPrimarySnapshot['rawLots'], day: number): KernelTraceNode[] {
  const existingEntities = new Set(current.map((node) => node.entityId));
  let nextNumber = current.reduce((max, node) => Math.max(max, Number(node.id.split('-').at(-1)) || 0), 0) + 1;
  const additions: KernelTraceNode[] = [];
  for (const lot of rawLots) {
    if (existingEntities.has(lot.id)) continue;
    additions.push({ id: `trace-${nextNumber++}`, entityKind: 'harvest_lot', entityId: lot.id, parentNodeIds: [], organizationId: lot.organizationId, createdDay: day });
    existingEntities.add(lot.id);
  }
  for (const lot of lots) {
    if (existingEntities.has(lot.id)) continue;
    additions.push({
      id: `trace-${nextNumber++}`,
      entityKind: lot.commodityKind === 'ingredient' ? 'ingredient_lot' : 'package_lot',
      entityId: lot.id,
      parentNodeIds: [],
      organizationId: lot.organizationId,
      createdDay: day,
    });
    existingEntities.add(lot.id);
  }
  return [...current, ...additions];
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
