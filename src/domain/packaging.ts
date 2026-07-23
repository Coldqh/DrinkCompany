import {
  packagingComponent,
  packagingPlants,
  packagingProfile,
  packagingRequirements,
  type PackagingComponentDefinition,
  type PackagingMaterialId,
} from '../data/packagingCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeContractState, TradeInventoryLot, TradeState } from './trade';

export type PackagingJobStatus = 'planned' | 'producing' | 'completed' | 'blocked';
export type PackagingReturnStatus = 'expected' | 'collected' | 'lost';
export type PackagingOperationKind = 'production' | 'return' | 'recycling' | 'defect' | 'environmental_fee' | 'shortage';

export interface PackagingMaterialStock {
  plantId: string;
  materialId: PackagingMaterialId;
  quantity: number;
  unitCost: number;
  recycledShare: number;
}

export interface PackagingProductionJob {
  id: string;
  plantId: string;
  componentId: string;
  quantity: number;
  startDay: number;
  dueDay: number;
  status: PackagingJobStatus;
  materialUsed: number;
  issue: string | null;
}

export interface PackagingReturnState {
  id: string;
  sourceAssetId: string;
  productId: string;
  profileId: string;
  componentId: string;
  unitsSold: number;
  expectedUnits: number;
  createdDay: number;
  dueDay: number;
  status: PackagingReturnStatus;
  collectedUnits: number;
  damagedUnits: number;
}

export interface PackagingOperationState {
  id: string;
  day: number;
  kind: PackagingOperationKind;
  organizationId: string;
  componentId: string | null;
  quantity: number;
  amount: number;
  headline: string;
  detail: string;
}

export interface PackagingState {
  version: 1;
  materialStocks: PackagingMaterialStock[];
  jobs: PackagingProductionJob[];
  returns: PackagingReturnState[];
  operations: PackagingOperationState[];
  nextJobNumber: number;
  nextReturnNumber: number;
  nextOperationNumber: number;
}

export interface PackagingAdvanceResult {
  packaging: PackagingState;
  trade: TradeState;
  organizations: OrganizationState[];
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export interface PackagingSectorSeed {
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  packaging: PackagingState;
}

const MATERIAL_SEED: Record<PackagingMaterialId, { quantity: number; unitCost: number; recycledShare: number }> = {
  glass_feedstock: { quantity: 240_000, unitCost: .12, recycledShare: 68 },
  aluminum_coil: { quantity: 31_000, unitCost: 1.92, recycledShare: 73 },
  steel_sheet: { quantity: 46_000, unitCost: 1.18, recycledShare: 61 },
  paperboard: { quantity: 190_000, unitCost: .44, recycledShare: 84 },
  cork: { quantity: 12_000, unitCost: 6.8, recycledShare: 0 },
  label_stock: { quantity: 28_000, unitCost: 1.7, recycledShare: 32 },
  ink: { quantity: 8_000, unitCost: 4.4, recycledShare: 18 },
};

export function createPackagingSector(day: number): PackagingSectorSeed {
  const organizations: OrganizationState[] = packagingPlants.map((plant, index) => ({
    id: plant.organizationId,
    name: plant.name,
    kind: 'packaging',
    countryId: plant.countryId,
    regionId: plant.regionId,
    ownerLabel: ['Helena Vogt', 'Camille Duret', 'James Cole', 'Mara Neumann', 'Élodie Noir', 'Hannah Price'][index] ?? 'Промышленная группа',
    status: 'active',
    cash: 210_000 + index * 37_000,
    debt: 42_000 + index * 8_500,
    reputation: plant.quality,
    strategy: plant.componentIds.map((id) => packagingComponent(id).kind).filter((value, itemIndex, array) => array.indexOf(value) === itemIndex).join(', '),
    employeeCount: 34 + index * 7,
    valuation: 390_000 + index * 74_000,
    dailyRevenue: 0,
    dailyCosts: 1_050 + index * 180,
    assetIds: [plant.assetId],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: Math.max(1, day - 1_600 - index * 143),
  }));
  const assets: WorldAssetState[] = packagingPlants.map((plant, index) => ({
    id: plant.assetId,
    type: assetTypeForPlant(plant.id),
    name: `${plant.name} Plant`,
    city: cityForRegion(plant.regionId),
    countryId: plant.countryId,
    regionId: plant.regionId,
    address: `Промышленный парк P-${index + 1}`,
    ownerOrganizationId: plant.organizationId,
    operatorOrganizationId: plant.organizationId,
    status: 'operating',
    condition: 72 + index * 4,
    capacity: plant.dailyCapacity,
    footfall: 0,
    askingPrice: 460_000 + index * 92_000,
    dailyRent: 0,
    dailyOperatingCost: 1_050 + index * 180,
    audience: `Производство упаковки: ${plant.componentIds.map((id) => packagingComponent(id).name).join(', ')}`,
    marketOutletId: null,
    venue: null,
  }));
  const materialStocks: PackagingMaterialStock[] = packagingPlants.flatMap((plant) => {
    const materials = [...new Set(plant.componentIds.map((id) => packagingComponent(id).materialId))];
    return materials.map((materialId) => ({ plantId: plant.id, materialId, ...MATERIAL_SEED[materialId] }));
  });
  return {
    organizations,
    assets,
    packaging: {
      version: 1,
      materialStocks,
      jobs: [],
      returns: [],
      operations: [],
      nextJobNumber: 1,
      nextReturnNumber: 1,
      nextOperationNumber: 1,
    },
  };
}

export function ensurePackagingSector(input: {
  state: PackagingState | undefined;
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  trade: TradeState;
  day: number;
}): { packaging: PackagingState; organizations: OrganizationState[]; assets: WorldAssetState[]; trade: TradeState } {
  const seed = createPackagingSector(input.day);
  const organizationIds = new Set(input.organizations.map((item) => item.id));
  const assetIds = new Set(input.assets.map((item) => item.id));
  const organizations = [...input.organizations, ...seed.organizations.filter((item) => !organizationIds.has(item.id))];
  const assets = [...input.assets, ...seed.assets.filter((item) => !assetIds.has(item.id))];
  const packaging = normalizePackagingState(input.state ?? seed.packaging);
  const trade = seedPackagingTrade(packaging, input.trade, organizations, assets, input.day);
  return { packaging, organizations, assets, trade };
}

export function normalizePackagingState(state: PackagingState): PackagingState {
  return {
    version: 1,
    materialStocks: (state.materialStocks ?? []).map((item) => ({ ...item, quantity: Math.max(0, item.quantity), recycledShare: clamp(item.recycledShare ?? 0, 0, 100) })),
    jobs: state.jobs ?? [],
    returns: state.returns ?? [],
    operations: state.operations ?? [],
    nextJobNumber: state.nextJobNumber ?? 1,
    nextReturnNumber: state.nextReturnNumber ?? 1,
    nextOperationNumber: state.nextOperationNumber ?? 1,
  };
}

export function seedPackagingTrade(_packaging: PackagingState, state: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number, seedInventory = true): TradeState {
  const trade: TradeState = {
    ...state,
    inventory: state.inventory.map((item) => ({ ...item })),
    contracts: state.contracts.map((item) => ({ ...item })),
  };
  if (seedInventory) for (const plant of packagingPlants) {
    for (const componentId of plant.componentIds) {
      if (trade.inventory.some((lot) => lot.organizationId === plant.organizationId && lot.commodityKind === 'packaging' && lot.commodityId === componentId)) continue;
      const component = packagingComponent(componentId);
      trade.inventory.push(createPackagingLot(trade, plant.organizationId, component, component.minimumOrder * 4, day, plant.quality, component.baseUnitCost * 1.18, `SEED-${componentId}`));
    }
  }
  const producers = organizations.filter((organization) => organization.kind === 'producer');
  for (const producer of producers) {
    const products = trade.products.filter((product) => product.producerOrganizationId === producer.id && product.status !== 'discontinued');
    const componentNeeds = new Map<string, number>();
    for (const product of products) {
      const profileId = product.packagingProfileId ?? 'profile-returnable-500';
      for (const requirement of packagingRequirements(profileId, 240)) componentNeeds.set(requirement.componentId, Math.max(componentNeeds.get(requirement.componentId) ?? 0, requirement.quantity));
    }
    for (const [componentId, quantity] of componentNeeds) {
      if (trade.contracts.some((contract) => contract.commodityKind === 'packaging' && contract.commodityId === componentId && contract.buyerOrganizationId === producer.id)) continue;
      const plant = packagingPlants.find((item) => item.componentIds.includes(componentId));
      if (!plant) continue;
      const component = packagingComponent(componentId);
      const contract: TradeContractState = {
        id: `trade-contract-${trade.nextContractNumber++}`,
        sellerOrganizationId: plant.organizationId,
        buyerOrganizationId: producer.id,
        sellerAssetId: plant.assetId,
        buyerAssetId: firstOperatingAssetId(assets, producer.id),
        commodityKind: 'packaging',
        commodityId: componentId,
        quantity: Math.max(component.minimumOrder, Math.ceil(quantity * 1.5)),
        unitPrice: roundMoney(component.baseUnitCost * (1.42 + (100 - plant.reliability) / 300)),
        intervalDays: component.kind === 'pallet' ? 24 : component.kind === 'carton' ? 14 : 8,
        nextDeliveryDay: day + 2,
        status: 'active',
        failures: 0,
        lastResult: 'Упаковочный контракт активен',
      };
      trade.contracts.push(contract);
    }
  }
  return trade;
}

export function advancePackagingDay(state: PackagingState, tradeState: TradeState, organizationsState: OrganizationState[], assets: WorldAssetState[], day: number): PackagingAdvanceResult {
  let packaging = normalizePackagingState(state);
  const trade: TradeState = {
    ...tradeState,
    inventory: tradeState.inventory.map((item) => ({ ...item })),
    contracts: tradeState.contracts.map((item) => ({ ...item })),
    shelves: tradeState.shelves.map((item) => ({ ...item, soldLotAllocationsToday: item.soldLotAllocationsToday?.map((value) => ({ ...value })) })),
  };
  let organizations = organizationsState.map((item) => ({ ...item }));
  const events: PackagingAdvanceResult['events'] = [];
  let operations = [...packaging.operations];
  let nextOperationNumber = packaging.nextOperationNumber;
  const record = (kind: PackagingOperationKind, organizationId: string, componentId: string | null, quantity: number, amount: number, headline: string, detail: string) => {
    operations = [{ id: `packaging-operation-${day}-${nextOperationNumber++}`, day, kind, organizationId, componentId, quantity: roundQuantity(quantity), amount: roundMoney(amount), headline, detail }, ...operations].slice(0, 420);
  };

  // Возврат тары с уже совершённых розничных продаж.
  let returns = [...packaging.returns];
  for (const shelf of trade.shelves) {
    if (shelf.unitsSoldToday <= 0) continue;
    const product = trade.products.find((item) => item.id === shelf.productId);
    if (!product?.packagingProfileId) continue;
    const profile = packagingProfile(product.packagingProfileId);
    if (profile.returnRate <= 0) continue;
    const uniqueId = `packaging-return-${day}-${shelf.id}`;
    if (returns.some((item) => item.id === uniqueId)) continue;
    const expectedUnits = Math.floor(shelf.unitsSoldToday * profile.returnRate);
    if (expectedUnits <= 0) continue;
    returns.push({
      id: uniqueId,
      sourceAssetId: shelf.assetId,
      productId: product.id,
      profileId: profile.id,
      componentId: profile.containerComponentId,
      unitsSold: shelf.unitsSoldToday,
      expectedUnits,
      createdDay: day,
      dueDay: day + 3 + (hash(uniqueId) % 4),
      status: 'expected',
      collectedUnits: 0,
      damagedUnits: 0,
    });
  }

  const materialStocks = packaging.materialStocks.map((item) => ({ ...item }));
  returns = returns.map((item) => {
    if (item.status !== 'expected' || item.dueDay > day) return item;
    const component = packagingComponent(item.componentId);
    const collected = Math.max(0, Math.floor(item.expectedUnits * (.88 + (hash(`${item.id}-collect`) % 9) / 100)));
    const damaged = Math.max(0, item.expectedUnits - collected);
    const plant = packagingPlants.find((value) => value.componentIds.includes(component.id));
    const stock = plant ? materialStocks.find((value) => value.plantId === plant.id && value.materialId === component.materialId) : null;
    if (stock) {
      const recovery = component.containerType === 'keg' ? .96 : component.containerType === 'can' ? .91 : .78;
      stock.quantity = roundQuantity(stock.quantity + collected * component.materialPerUnit * recovery);
      stock.recycledShare = clamp(stock.recycledShare + .08, 0, 100);
      record('recycling', plant!.organizationId, component.id, collected, 0, `Возвращена тара: ${component.name}`, `${collected} ед. направлены в повторный цикл; повреждено ${damaged}.`);
    }
    return { ...item, status: collected > 0 ? 'collected' : 'lost', collectedUnits: collected, damagedUnits: damaged };
  });

  // Завершение промышленных заказов.
  let jobs = packaging.jobs.map((job) => ({ ...job }));
  for (const job of jobs) {
    if (job.status !== 'producing' || job.dueDay > day) continue;
    const plant = packagingPlants.find((item) => item.id === job.plantId);
    const component = packagingComponent(job.componentId);
    if (!plant) continue;
    const defectRate = clamp((100 - plant.quality) / 250 + (hash(`${job.id}-defect`) % 25) / 1000, .003, .12);
    const goodUnits = Math.max(0, Math.floor(job.quantity * (1 - defectRate)));
    const defectiveUnits = job.quantity - goodUnits;
    trade.inventory.push(createPackagingLot(trade, plant.organizationId, component, goodUnits, day, clamp(plant.quality - Math.round(defectRate * 50), 40, 100), component.baseUnitCost * (1.12 + defectRate), `PKG-${job.id}`));
    job.status = 'completed';
    const fee = roundMoney(goodUnits * environmentalFeeForComponent(component));
    organizations = organizations.map((organization) => organization.id === plant.organizationId ? { ...organization, cash: roundMoney(organization.cash - fee), dailyCosts: roundMoney(organization.dailyCosts + fee) } : organization);
    record('production', plant.organizationId, component.id, goodUnits, fee, `${plant.name} выпустила ${component.name}`, `${goodUnits} годных единиц; брак ${defectiveUnits}.`);
    if (defectiveUnits > 0) record('defect', plant.organizationId, component.id, defectiveUnits, 0, `Брак упаковки: ${component.name}`, `${defectiveUnits} единиц отправлены в переработку.`);
  }

  // Планирование следующего промышленного цикла по реальному спросу контрактов.
  for (const plant of packagingPlants) {
    for (const componentId of plant.componentIds) {
      if (jobs.some((job) => job.plantId === plant.id && job.componentId === componentId && job.status === 'producing')) continue;
      const component = packagingComponent(componentId);
      const currentStock = trade.inventory.filter((lot) => lot.organizationId === plant.organizationId && lot.commodityKind === 'packaging' && lot.commodityId === componentId && (lot.status ?? 'available') === 'available').reduce((sum, lot) => sum + lot.quantity, 0);
      const contractDemand = trade.contracts.filter((contract) => contract.status === 'active' && contract.sellerOrganizationId === plant.organizationId && contract.commodityKind === 'packaging' && contract.commodityId === componentId).reduce((sum, contract) => sum + contract.quantity * Math.max(1, Math.ceil(16 / contract.intervalDays)), 0);
      const target = Math.max(component.minimumOrder * 3, contractDemand * 1.35);
      if (currentStock >= target) continue;
      const quantity = Math.max(component.minimumOrder, Math.min(plant.dailyCapacity, Math.ceil(target - currentStock)));
      const materialNeeded = quantity * component.materialPerUnit;
      const material = materialStocks.find((item) => item.plantId === plant.id && item.materialId === component.materialId);
      if (!material || material.quantity < materialNeeded) {
        record('shortage', plant.organizationId, component.id, quantity, 0, `${plant.name}: дефицит промышленного сырья`, `Не хватает ${component.materialId} для выпуска ${component.name}.`);
        events.push({ tone: 'warning', title: `${plant.name}: остановка линии`, detail: `Нет материала для ${component.name}.` });
        continue;
      }
      material.quantity = roundQuantity(material.quantity - materialNeeded);
      jobs.push({
        id: `packaging-job-${day}-${packaging.nextJobNumber++}`,
        plantId: plant.id,
        componentId,
        quantity,
        startDay: day,
        dueDay: day + productionDays(component),
        status: 'producing',
        materialUsed: materialNeeded,
        issue: null,
      });
    }
  }

  packaging = {
    ...packaging,
    materialStocks,
    jobs: jobs.slice(-520),
    returns: returns.slice(-620),
    operations,
    nextOperationNumber,
  };
  return { packaging, trade: seedPackagingTrade(packaging, trade, organizations, assets, day, false), organizations, events };
}

export function packagingRequirementsAvailable(trade: TradeState, organizationId: string, profileId: string, packagedUnits: number): Array<{ componentId: string; required: number; available: number }> {
  return packagingRequirements(profileId, packagedUnits).map((requirement) => ({
    componentId: requirement.componentId,
    required: requirement.quantity,
    available: packagingInventoryQuantity(trade, organizationId, requirement.componentId),
  }));
}

export function packagingInventoryQuantity(trade: TradeState, organizationId: string, componentId: string): number {
  return roundQuantity(trade.inventory.filter((lot) => lot.organizationId === organizationId && lot.commodityKind === 'packaging' && lot.commodityId === componentId && (lot.status ?? 'available') === 'available').reduce((sum, lot) => sum + lot.quantity, 0));
}

export function packagingOrganizationSummary(state: PackagingState, trade: TradeState, organizationId: string): { activeJobs: number; componentUnits: number; returnedUnits: number; defectiveUnits: number } {
  const plantIds = packagingPlants.filter((plant) => plant.organizationId === organizationId).map((plant) => plant.id);
  const componentUnits = trade.inventory.filter((lot) => lot.organizationId === organizationId && lot.commodityKind === 'packaging').reduce((sum, lot) => sum + lot.quantity, 0);
  const operations = state.operations.filter((item) => item.organizationId === organizationId);
  return {
    activeJobs: state.jobs.filter((job) => plantIds.includes(job.plantId) && job.status === 'producing').length,
    componentUnits: roundQuantity(componentUnits),
    returnedUnits: operations.filter((item) => item.kind === 'recycling').reduce((sum, item) => sum + item.quantity, 0),
    defectiveUnits: operations.filter((item) => item.kind === 'defect').reduce((sum, item) => sum + item.quantity, 0),
  };
}

function createPackagingLot(trade: TradeState, organizationId: string, component: PackagingComponentDefinition, quantity: number, day: number, quality: number, unitCost: number, lotCode: string): TradeInventoryLot {
  return {
    id: `trade-lot-${trade.nextInventoryNumber++}`,
    organizationId,
    commodityKind: 'packaging',
    commodityId: component.id,
    quantity: roundQuantity(quantity),
    unit: component.unit,
    quality,
    unitCost: roundMoney(unitCost),
    originOrganizationId: organizationId,
    receivedDay: day,
    expiresDay: null,
    status: 'available',
    sourceLotIds: [],
    productionBatchId: null,
    lotCode,
  };
}

function assetTypeForPlant(id: string): WorldAssetState['type'] {
  if (id.includes('glass')) return 'glass_plant';
  if (id.includes('can')) return 'can_plant';
  if (id.includes('keg')) return 'keg_plant';
  if (id.includes('label')) return 'print_works';
  if (id.includes('closure')) return 'closure_plant';
  return 'recycling_center';
}

function firstOperatingAssetId(assets: WorldAssetState[], organizationId: string): string | null {
  return assets.find((asset) => asset.operatorOrganizationId === organizationId && asset.status === 'operating')?.id
    ?? assets.find((asset) => asset.ownerOrganizationId === organizationId)?.id
    ?? null;
}

function cityForRegion(regionId: string): string {
  const cities: Record<string, string> = {
    'rhine-ruhr': 'Дюссельдорф', 'grand-est': 'Реймс', 'west-midlands': 'Бирмингем', 'south-east': 'Кент',
  };
  return cities[regionId] ?? regionId;
}

function productionDays(component: PackagingComponentDefinition): number {
  if (component.containerType === 'keg') return 6;
  if (component.kind === 'container') return 3;
  if (component.kind === 'label') return 2;
  return 1;
}

function environmentalFeeForComponent(component: PackagingComponentDefinition): number {
  if (component.containerType === 'keg') return .21;
  if (component.containerType === 'bottle') return .012;
  if (component.containerType === 'can') return .007;
  return .003;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function roundQuantity(value: number): number { return Math.round((value + Number.EPSILON) * 1000) / 1000; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
