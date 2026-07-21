import {
  advanceBatch,
  createBatch,
  createSavedRecipe,
  discardBatch,
  estimatePackagingCost,
  packageBatch,
  requiredEquipmentIds,
  tasteBatch,
  type BatchState,
  type EquipmentDefinition,
  type ProductFamily,
  type RecipeDraft,
  type SavedRecipe,
} from './production';
import { marketOutlets } from '../data/marketCatalog';
import {
  batchConsistency,
  createConsumerReview,
  createProposal,
  createRepeatOrder,
  evaluateProposal,
  proposalActionCost,
  repeatPotential,
  type MarketOutletState,
  type MarketProposal,
  type ConsumerReview,
  type DemandSignal,
  type MarketSale,
  type ProposalInput,
  type RepeatOrder,
  type SupplyContract,
  type WorldRelease,
} from './market';

export type GameMode = 'standard' | 'roguelike';
export type GamePhase = 'onboarding' | 'operating';

export interface RegionDefinition {
  id: string;
  countryId: string;
  name: string;
  climateLabel: string;
  demandLabel: string;
  ciderAffinity: number;
  beerAffinity: number;
  energyCostIndex: number;
}

export interface CountryDefinition {
  id: string;
  name: string;
  currency: string;
  marketLabel: string;
}

export interface PropertyDefinition {
  id: string;
  regionId: string;
  name: string;
  type: 'urban_unit' | 'rural_workshop' | 'converted_warehouse';
  acquisition: 'rent' | 'buy';
  upfrontCost: number;
  dailyCost: number;
  capacity: number;
  energyLimit: number;
  storageQuality: number;
  marketAccess: number;
  summary: string;
}

export interface CompanyState {
  name: string;
  reputation: number;
  completedBatches: number;
}

export interface WorldCompanyState {
  id: string;
  name: string;
  country: string;
  focus: string;
  category: string;
  reputation: number;
  activeRelease: string;
  momentum: number;
  status: 'growing' | 'stable' | 'struggling';
}

export interface WorldPulseItem {
  id: string;
  day: number;
  title: string;
  detail: string;
  tone: 'market' | 'release' | 'warning';
}

export interface WorldState {
  countryId: string;
  regionId: string;
  propertyId: string;
  companies: WorldCompanyState[];
  pulse: WorldPulseItem[];
  outlets: MarketOutletState[];
  proposals: MarketProposal[];
  contracts: SupplyContract[];
  sales: MarketSale[];
  repeatOrders: RepeatOrder[];
  reviews: ConsumerReview[];
  demandSignals: DemandSignal[];
  releases: WorldRelease[];
  nextProposalNumber: number;
  nextContractNumber: number;
  nextRepeatOrderNumber: number;
}

export interface FinanceState {
  cash: number;
  dailyFixedCost: number;
  productionSpend: number;
  equipmentSpend: number;
  packagedInventoryValue: number;
  salesRevenue: number;
  unitsSold: number;
}

export interface ProductionState {
  equipmentIds: string[];
  recipes: SavedRecipe[];
  batches: BatchState[];
  nextBatchNumber: number;
}

export interface TutorialState {
  dismissed: boolean;
  completedSteps: string[];
}

export interface GameState {
  schemaVersion: 4;
  phase: GamePhase;
  mode: GameMode;
  day: number;
  company: CompanyState;
  world: WorldState | null;
  finance: FinanceState;
  production: ProductionState;
  tutorial: TutorialState;
  discoveredProductFamilies: ProductFamily[];
  createdAt: string;
  updatedAt: string;
}

export interface LegacyGameStateV1 {
  schemaVersion: 1;
  phase: GamePhase;
  mode: GameMode;
  day: number;
  company: { name: string; reputation: number };
  world: { countryId: string; regionId: string; propertyId: string } | null;
  finance: { cash: number; dailyFixedCost: number };
  discoveredProductFamilies: ProductFamily[];
  createdAt: string;
  updatedAt: string;
}

export interface LegacyGameStateV3 extends Omit<GameState, 'schemaVersion' | 'world'> {
  schemaVersion: 3;
  world: (Omit<WorldState, 'repeatOrders' | 'reviews' | 'demandSignals' | 'releases' | 'nextRepeatOrderNumber'> & Partial<Pick<WorldState, 'repeatOrders' | 'reviews' | 'demandSignals' | 'releases' | 'nextRepeatOrderNumber'>>) | null;
}

export interface LegacyGameStateV2 {
  schemaVersion: 2;
  phase: GamePhase;
  mode: GameMode;
  day: number;
  company: CompanyState;
  world: {
    countryId: string;
    regionId: string;
    propertyId: string;
    companies: WorldCompanyState[];
    pulse: WorldPulseItem[];
  } | null;
  finance: Omit<FinanceState, 'salesRevenue' | 'unitsSold'>;
  production: ProductionState;
  tutorial: TutorialState;
  discoveredProductFamilies: ProductFamily[];
  createdAt: string;
  updatedAt: string;
}

export interface NewGameSelection {
  companyName: string;
  mode: GameMode;
  countryId: string;
  regionId: string;
  property: PropertyDefinition;
}

export const STARTING_CASH: Record<GameMode, number> = {
  standard: 120_000,
  roguelike: 80_000,
};

export function createInitialState(now = new Date()): GameState {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 4,
    phase: 'onboarding',
    mode: 'standard',
    day: 1,
    company: { name: '', reputation: 0, completedBatches: 0 },
    world: null,
    finance: createFinance(STARTING_CASH.standard, 0),
    production: createProductionState(),
    tutorial: { dismissed: false, completedSteps: [] },
    discoveredProductFamilies: ['beer', 'cider'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function startCompany(selection: NewGameSelection, now = new Date()): GameState {
  const companyName = selection.companyName.trim();
  if (companyName.length < 2) throw new Error('Название компании должно содержать минимум 2 символа');

  const startingCash = STARTING_CASH[selection.mode];
  if (selection.property.upfrontCost > startingCash) {
    throw new Error('Недостаточно средств для выбранного объекта');
  }

  const timestamp = now.toISOString();
  return {
    schemaVersion: 4,
    phase: 'operating',
    mode: selection.mode,
    day: 1,
    company: { name: companyName, reputation: 0, completedBatches: 0 },
    world: createWorldState(selection.countryId, selection.regionId, selection.property.id),
    finance: createFinance(startingCash - selection.property.upfrontCost, selection.property.dailyCost),
    production: createProductionState(),
    tutorial: { dismissed: false, completedSteps: [] },
    discoveredProductFamilies: ['beer', 'cider'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function purchaseEquipment(state: GameState, equipment: EquipmentDefinition, now = new Date()): GameState {
  ensureOperating(state);
  if (state.production.equipmentIds.includes(equipment.id)) return state;
  if (state.finance.cash < equipment.cost) throw new Error('Недостаточно денег на оборудование');

  return touch({
    ...state,
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash - equipment.cost),
      equipmentSpend: roundMoney(state.finance.equipmentSpend + equipment.cost),
    },
    production: {
      ...state.production,
      equipmentIds: [...state.production.equipmentIds, equipment.id],
    },
    tutorial: completeTutorialStep(state.tutorial, 'equipment'),
  }, now);
}

export function saveRecipe(state: GameState, draft: RecipeDraft, now = new Date()): GameState {
  ensureOperating(state);
  const recipe = createSavedRecipe(draft, state.day, state.production.recipes);
  return touch({
    ...state,
    production: {
      ...state.production,
      recipes: [recipe, ...state.production.recipes],
    },
    tutorial: completeTutorialStep(state.tutorial, 'recipe'),
  }, now);
}

export function startProductionBatch(
  state: GameState,
  draft: RecipeDraft,
  property: PropertyDefinition,
  equipment: EquipmentDefinition[],
  now = new Date(),
): GameState {
  ensureOperating(state);
  const missingEquipment = requiredEquipmentIds(draft.family).filter((id) => !state.production.equipmentIds.includes(id));
  if (missingEquipment.length > 0) throw new Error('Сначала установи обязательное оборудование');

  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status));
  if (activeBatches.length >= property.capacity) throw new Error('На объекте нет свободного места для новой партии');

  const maxCapacity = equipment
    .filter((item) => state.production.equipmentIds.includes(item.id) && (item.family === draft.family || item.family === 'shared'))
    .map((item) => item.capacityLiters)
    .filter((capacity) => capacity > 0);
  const equipmentCapacity = maxCapacity.length > 0 ? Math.min(...maxCapacity) : 0;
  if (draft.volumeLiters > equipmentCapacity) throw new Error(`Оборудование ограничивает партию до ${equipmentCapacity} л`);

  const recipe = createSavedRecipe(draft, state.day, state.production.recipes);
  if (state.finance.cash < recipe.estimatedCost) throw new Error('Недостаточно денег на сырьё и запуск партии');

  const precisionValues = equipment
    .filter((item) => state.production.equipmentIds.includes(item.id) && (item.family === draft.family || item.family === 'shared'))
    .map((item) => item.precision);
  const equipmentPrecision = precisionValues.reduce((sum, value) => sum + value, 0) / Math.max(1, precisionValues.length);
  const batch = createBatch(recipe, state.day, state.production.nextBatchNumber, equipmentPrecision);

  return touch({
    ...state,
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash - batch.productionCost),
      productionSpend: roundMoney(state.finance.productionSpend + batch.productionCost),
    },
    production: {
      ...state.production,
      recipes: [recipe, ...state.production.recipes],
      batches: [batch, ...state.production.batches],
      nextBatchNumber: state.production.nextBatchNumber + 1,
    },
    tutorial: completeTutorialStep(state.tutorial, 'batch'),
  }, now);
}

export function tasteProductionBatch(state: GameState, batchId: string, now = new Date()): GameState {
  const batch = getBatch(state, batchId);
  const tasted = tasteBatch(batch, state.day, state.production.equipmentIds.includes('lab-kit'));
  return touch({
    ...state,
    production: replaceBatch(state.production, tasted),
    tutorial: completeTutorialStep(state.tutorial, 'tasting'),
  }, now);
}

export function packageProductionBatch(state: GameState, batchId: string, now = new Date()): GameState {
  if (!state.production.equipmentIds.includes('compact-bottler')) throw new Error('Для розлива нужна компактная линия');
  const batch = getBatch(state, batchId);
  const packagingCost = estimatePackagingCost(batch);
  if (state.finance.cash < packagingCost) throw new Error('Недостаточно денег на бутылки, пробки и этикетки');
  const packaged = packageBatch(batch);
  const inventoryValue = packaged.productionCost + packaged.packagingCost;

  return touch({
    ...state,
    company: {
      ...state.company,
      completedBatches: state.company.completedBatches + 1,
    },
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash - packagingCost),
      productionSpend: roundMoney(state.finance.productionSpend + packagingCost),
      packagedInventoryValue: roundMoney(state.finance.packagedInventoryValue + inventoryValue),
    },
    production: replaceBatch(state.production, packaged),
    tutorial: completeTutorialStep(state.tutorial, 'packaging'),
  }, now);
}

export function discardProductionBatch(state: GameState, batchId: string, now = new Date()): GameState {
  const discarded = discardBatch(getBatch(state, batchId));
  return touch({ ...state, production: replaceBatch(state.production, discarded) }, now);
}

export function submitMarketProposal(state: GameState, input: ProposalInput, now = new Date()): GameState {
  ensureOperating(state);
  if (!state.world) throw new Error('Рынок недоступен');
  const outlet = getOutlet(state.world, input.outletId);
  const batch = getBatch(state, input.batchId);
  if (batch.status !== 'packaged') throw new Error('Предлагать рынку можно только разлитую партию');
  const sampleUnits = input.contactMode === 'meeting' ? 1 : 2;
  if (batch.availableUnits < input.requestedUnits + sampleUnits) throw new Error('На складе недостаточно бутылок с учётом образцов');
  const duplicate = state.world.proposals.some((proposal) => proposal.outletId === input.outletId && proposal.batchId === input.batchId && ['reviewing', 'offer'].includes(proposal.status));
  if (duplicate) throw new Error('Эта точка уже рассматривает предложение по выбранной партии');
  const actionCost = proposalActionCost(input.contactMode);
  if (state.finance.cash < actionCost) throw new Error('Недостаточно денег на образцы и переговоры');

  const proposal = createProposal(input, state.day, state.world.nextProposalNumber, outlet);
  const updatedBatch = { ...batch, availableUnits: batch.availableUnits - proposal.sampleUnits };
  const sampleBookValue = unitBookValue(batch) * proposal.sampleUnits;
  const relationshipGain = input.contactMode === 'meeting' ? 4 : 1;
  const outlets = state.world.outlets.map((item) => item.id === outlet.id ? { ...item, relationship: clamp(item.relationship + relationshipGain, 0, 100) } : item);

  return touch({
    ...state,
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash - actionCost),
      packagedInventoryValue: roundMoney(Math.max(0, state.finance.packagedInventoryValue - sampleBookValue)),
    },
    production: replaceBatch(state.production, updatedBatch),
    world: {
      ...state.world,
      outlets,
      proposals: [proposal, ...state.world.proposals],
      nextProposalNumber: state.world.nextProposalNumber + 1,
      pulse: [{
        id: `pulse-${state.day}-proposal-${proposal.id}`,
        day: state.day,
        tone: 'market' as const,
        title: `${outlet.name} получила образец`,
        detail: `Ответ ожидается на ${proposal.reviewDay}-й день. Запрошено ${proposal.requestedUnits} бутылок по ${proposal.askingPrice.toFixed(2)} за единицу.`,
      }, ...state.world.pulse].slice(0, 10),
    },
    tutorial: completeTutorialStep(state.tutorial, 'market-contact'),
  }, now);
}

export function acceptMarketOffer(state: GameState, proposalId: string, now = new Date()): GameState {
  ensureOperating(state);
  if (!state.world) throw new Error('Рынок недоступен');
  const proposal = getProposal(state.world, proposalId);
  if (proposal.status !== 'offer' || proposal.offeredPrice === null || proposal.offeredUnits === null || proposal.fitScore === null) {
    throw new Error('По этому предложению нет действующего оффера');
  }
  const outlet = getOutlet(state.world, proposal.outletId);
  const batch = getBatch(state, proposal.batchId);
  if (batch.availableUnits < proposal.offeredUnits) throw new Error('На складе больше нет нужного объёма');

  const revenue = roundMoney(proposal.offeredPrice * proposal.offeredUnits);
  const bookValue = roundMoney(unitBookValue(batch) * proposal.offeredUnits);
  const contract: SupplyContract = {
    id: `contract-${state.day}-${state.world.nextContractNumber}`,
    outletId: outlet.id,
    batchId: batch.id,
    signedDay: state.day,
    unitPrice: proposal.offeredPrice,
    units: proposal.offeredUnits,
    grossRevenue: revenue,
    repeatPotential: repeatPotential(proposal.fitScore, outlet.relationship),
    status: 'fulfilled',
  };
  const sale: MarketSale = {
    id: `sale-${state.day}-${state.world.sales.length + 1}`,
    contractId: contract.id,
    outletId: outlet.id,
    batchId: batch.id,
    day: state.day,
    units: proposal.offeredUnits,
    unitPrice: proposal.offeredPrice,
    revenue,
    kind: 'first',
  };
  const updatedBatch = { ...batch, availableUnits: batch.availableUnits - proposal.offeredUnits };
  const reputationGain = proposal.fitScore >= 78 ? 3 : proposal.fitScore >= 66 ? 2 : 1;
  const outlets = state.world.outlets.map((item) => item.id === outlet.id ? { ...item, relationship: clamp(item.relationship + 8, 0, 100) } : item);
  const proposals = state.world.proposals.map((item) => item.id === proposal.id ? { ...item, status: 'completed' as const } : item);

  return touch({
    ...state,
    company: { ...state.company, reputation: clamp(state.company.reputation + reputationGain, 0, 100) },
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash + revenue),
      packagedInventoryValue: roundMoney(Math.max(0, state.finance.packagedInventoryValue - bookValue)),
      salesRevenue: roundMoney(state.finance.salesRevenue + revenue),
      unitsSold: state.finance.unitsSold + proposal.offeredUnits,
    },
    production: replaceBatch(state.production, updatedBatch),
    world: {
      ...state.world,
      outlets, proposals,
      contracts: [contract, ...state.world.contracts],
      sales: [sale, ...state.world.sales],
      nextContractNumber: state.world.nextContractNumber + 1,
      pulse: [{
        id: `pulse-${state.day}-sale-${sale.id}`,
        day: state.day,
        tone: 'release' as const,
        title: `${state.company.name} заключила первую поставку`,
        detail: `${outlet.name}: ${sale.units} бутылок, выручка ${sale.revenue.toFixed(2)}.`,
      }, ...state.world.pulse].slice(0, 10),
    },
    tutorial: completeTutorialStep(completeTutorialStep(state.tutorial, 'market-offer'), 'first-sale'),
  }, now);
}

export function fulfillRepeatOrder(state: GameState, orderId: string, batchId: string, now = new Date()): GameState {
  ensureOperating(state);
  if (!state.world) throw new Error('Рынок недоступен');
  const order = getRepeatOrder(state.world, orderId);
  if (order.status !== 'pending') throw new Error('Этот повторный заказ уже закрыт');
  if (state.day > order.dueDay) throw new Error('Срок заказа уже истёк');
  const outlet = getOutlet(state.world, order.outletId);
  const candidate = getBatch(state, batchId);
  const reference = getBatch(state, order.referenceBatchId);
  if (candidate.status !== 'packaged') throw new Error('Для поставки нужна разлитая партия');
  if (candidate.recipe.family !== order.family || candidate.recipe.styleId !== order.styleId) {
    throw new Error('Покупатель ждёт тот же стиль напитка, что и в первой поставке');
  }
  if (candidate.availableUnits < order.units) throw new Error(`Для заказа нужно ${order.units} бутылок`);

  const consistency = batchConsistency(reference, candidate);
  const qualityAccepted = candidate.quality.technicalPurity >= outlet.minTechnicalPurity
    && candidate.quality.defectRisk <= outlet.maxDefectRisk;
  if (consistency < order.minConsistency || !qualityAccepted) {
    const reason = !qualityAccepted
      ? 'Контроль качества не пропустил новую партию: чистота или риск дефектов вышли за требования.'
      : `Стабильность ${consistency}/100 ниже требуемых ${order.minConsistency}/100.`;
    return touch({
      ...state,
      company: { ...state.company, reputation: clamp(state.company.reputation - 2, 0, 100) },
      world: {
        ...state.world,
        repeatOrders: state.world.repeatOrders.map((item) => item.id === order.id ? {
          ...item,
          status: 'failed' as const,
          fulfilledBatchId: candidate.id,
          consistencyScore: consistency,
          decisionNote: reason,
        } : item),
        outlets: state.world.outlets.map((item) => item.id === outlet.id ? { ...item, relationship: clamp(item.relationship - 10, 0, 100) } : item),
        pulse: [{
          id: `pulse-${state.day}-repeat-fail-${order.id}`,
          day: state.day,
          tone: 'warning' as const,
          title: `${outlet.name} отклонила повторную поставку`,
          detail: reason,
        }, ...state.world.pulse].slice(0, 12),
      },
    }, now);
  }

  const revenue = roundMoney(order.unitPrice * order.units);
  const bookValue = roundMoney(unitBookValue(candidate) * order.units);
  const contract: SupplyContract = {
    id: `contract-${state.day}-${state.world.nextContractNumber}`,
    outletId: outlet.id,
    batchId: candidate.id,
    signedDay: state.day,
    unitPrice: order.unitPrice,
    units: order.units,
    grossRevenue: revenue,
    repeatPotential: clamp(Math.round(order.minConsistency * 0.45 + consistency * 0.35 + outlet.relationship * 0.2), 0, 100),
    status: 'fulfilled',
  };
  const sale: MarketSale = {
    id: `sale-${state.day}-${state.world.sales.length + 1}`,
    contractId: contract.id,
    outletId: outlet.id,
    batchId: candidate.id,
    day: state.day,
    units: order.units,
    unitPrice: order.unitPrice,
    revenue,
    kind: 'repeat',
  };
  const updatedBatch = { ...candidate, availableUnits: candidate.availableUnits - order.units };

  return touch({
    ...state,
    company: { ...state.company, reputation: clamp(state.company.reputation + (consistency >= 86 ? 3 : 2), 0, 100) },
    finance: {
      ...state.finance,
      cash: roundMoney(state.finance.cash + revenue),
      packagedInventoryValue: roundMoney(Math.max(0, state.finance.packagedInventoryValue - bookValue)),
      salesRevenue: roundMoney(state.finance.salesRevenue + revenue),
      unitsSold: state.finance.unitsSold + order.units,
    },
    production: replaceBatch(state.production, updatedBatch),
    world: {
      ...state.world,
      repeatOrders: state.world.repeatOrders.map((item) => item.id === order.id ? {
        ...item,
        status: 'fulfilled' as const,
        fulfilledBatchId: candidate.id,
        consistencyScore: consistency,
        decisionNote: `Поставка принята. Стабильность ${consistency}/100.`,
      } : item),
      outlets: state.world.outlets.map((item) => item.id === outlet.id ? { ...item, relationship: clamp(item.relationship + 7, 0, 100) } : item),
      contracts: [contract, ...state.world.contracts],
      sales: [sale, ...state.world.sales],
      nextContractNumber: state.world.nextContractNumber + 1,
      pulse: [{
        id: `pulse-${state.day}-repeat-sale-${sale.id}`,
        day: state.day,
        tone: 'release' as const,
        title: `${outlet.name} приняла повторную поставку`,
        detail: `${order.units} бутылок · стабильность ${consistency}/100 · выручка ${revenue.toFixed(2)}.`,
      }, ...state.world.pulse].slice(0, 12),
    },
  }, now);
}

export function declineMarketOffer(state: GameState, proposalId: string, now = new Date()): GameState {
  if (!state.world) throw new Error('Рынок недоступен');
  const proposal = getProposal(state.world, proposalId);
  if (proposal.status !== 'offer') throw new Error('Отклонить можно только активный оффер');
  return touch({
    ...state,
    world: {
      ...state.world,
      proposals: state.world.proposals.map((item) => item.id === proposalId ? { ...item, status: 'declined' as const } : item),
    },
  }, now);
}

export function dismissTutorial(state: GameState, now = new Date()): GameState {
  return touch({ ...state, tutorial: { ...state.tutorial, dismissed: true } }, now);
}

export function advanceDay(state: GameState, now = new Date()): GameState {
  if (state.phase !== 'operating') return state;
  const nextDay = state.day + 1;
  const nextCash = roundMoney(state.finance.cash - state.finance.dailyFixedCost);
  const batches = state.production.batches.map((batch) => advanceBatch(batch, nextDay));
  const world = state.world ? advanceWorld(state.world, batches, state.company.reputation, nextDay) : null;

  return touch({
    ...state,
    day: nextDay,
    finance: { ...state.finance, cash: nextCash },
    production: { ...state.production, batches },
    world,
  }, now);
}

export function migrateGameState(value: unknown): GameState {
  if (!value || typeof value !== 'object') return createInitialState();
  const candidate = value as { schemaVersion?: number; phase?: unknown; company?: unknown; finance?: unknown; production?: unknown };

  if (candidate.schemaVersion === 4 && candidate.phase && candidate.company && candidate.finance && candidate.production) {
    return normalizeCurrentState(value as GameState);
  }

  if (candidate.schemaVersion === 3 && candidate.phase && candidate.company && candidate.finance && candidate.production) {
    return normalizeCurrentState({ ...(value as LegacyGameStateV3), schemaVersion: 4 } as GameState);
  }

  if (candidate.schemaVersion === 2 && candidate.phase && candidate.company && candidate.finance && candidate.production) {
    const legacy = value as LegacyGameStateV2;
    return normalizeCurrentState({
      ...legacy,
      schemaVersion: 4,
      world: legacy.world ? {
        ...createWorldState(legacy.world.countryId, legacy.world.regionId, legacy.world.propertyId),
        companies: legacy.world.companies?.length ? normalizeWorldCompanies(legacy.world.companies) : createWorldCompanies(),
        pulse: legacy.world.pulse?.length ? legacy.world.pulse : createInitialPulse(),
      } : null,
      finance: {
        ...legacy.finance,
        salesRevenue: 0,
        unitsSold: 0,
      },
    });
  }

  if (candidate.schemaVersion === 1 && candidate.phase && candidate.company && candidate.finance) {
    const legacy = value as LegacyGameStateV1;
    return {
      schemaVersion: 4,
      phase: legacy.phase,
      mode: legacy.mode,
      day: legacy.day,
      company: { ...legacy.company, completedBatches: 0 },
      world: legacy.world ? createWorldState(legacy.world.countryId, legacy.world.regionId, legacy.world.propertyId) : null,
      finance: {
        ...legacy.finance,
        productionSpend: 0,
        equipmentSpend: 0,
        packagedInventoryValue: 0,
        salesRevenue: 0,
        unitsSold: 0,
      },
      production: createProductionState(),
      tutorial: { dismissed: false, completedSteps: [] },
      discoveredProductFamilies: legacy.discoveredProductFamilies ?? ['beer', 'cider'],
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    };
  }
  return createInitialState();
}

function normalizeCurrentState(state: GameState): GameState {
  const production: ProductionState = {
    ...state.production,
    batches: state.production.batches.map((batch) => ({
      ...batch,
      availableUnits: Number.isFinite(batch.availableUnits) ? batch.availableUnits : batch.packagedUnits,
    })),
  };
  const world = state.world ? {
    ...createWorldState(state.world.countryId, state.world.regionId, state.world.propertyId),
    ...state.world,
    companies: normalizeWorldCompanies(state.world.companies ?? createWorldCompanies()),
    outlets: state.world.outlets?.length ? state.world.outlets : cloneOutlets(),
    proposals: state.world.proposals ?? [],
    contracts: state.world.contracts ?? [],
    sales: state.world.sales ?? [],
    repeatOrders: state.world.repeatOrders ?? [],
    reviews: state.world.reviews ?? [],
    demandSignals: state.world.demandSignals?.length ? state.world.demandSignals : createDemandSignals(),
    releases: state.world.releases ?? [],
    nextProposalNumber: state.world.nextProposalNumber ?? 1,
    nextContractNumber: state.world.nextContractNumber ?? 1,
    nextRepeatOrderNumber: state.world.nextRepeatOrderNumber ?? 1,
  } : null;
  return {
    ...state,
    schemaVersion: 4,
    finance: {
      ...state.finance,
      salesRevenue: state.finance.salesRevenue ?? 0,
      unitsSold: state.finance.unitsSold ?? 0,
    },
    production,
    world,
  };
}

function createFinance(cash: number, dailyFixedCost: number): FinanceState {
  return {
    cash,
    dailyFixedCost,
    productionSpend: 0,
    equipmentSpend: 0,
    packagedInventoryValue: 0,
    salesRevenue: 0,
    unitsSold: 0,
  };
}

function createProductionState(): ProductionState {
  return { equipmentIds: [], recipes: [], batches: [], nextBatchNumber: 1 };
}

function getBatch(state: GameState, batchId: string): BatchState {
  const batch = state.production.batches.find((item) => item.id === batchId);
  if (!batch) throw new Error('Партия не найдена');
  return batch;
}

function replaceBatch(production: ProductionState, batch: BatchState): ProductionState {
  return {
    ...production,
    batches: production.batches.map((item) => item.id === batch.id ? batch : item),
  };
}

function ensureOperating(state: GameState): void {
  if (state.phase !== 'operating') throw new Error('Компания ещё не создана');
}

function completeTutorialStep(tutorial: TutorialState, step: string): TutorialState {
  return tutorial.completedSteps.includes(step)
    ? tutorial
    : { ...tutorial, completedSteps: [...tutorial.completedSteps, step] };
}

function touch(state: GameState, now: Date): GameState {
  return { ...state, updatedAt: now.toISOString() };
}

function advanceWorld(world: WorldState, batches: BatchState[], companyReputation: number, day: number): WorldState {
  let companies = world.companies;
  let outlets = world.outlets;
  let pulse = world.pulse;
  let releases = world.releases;
  let demandSignals = world.demandSignals;

  if (day % 3 === 0) {
    demandSignals = demandSignals.map((signal, index) => {
      const marketPressure = companies.reduce((sum, company) => sum + (companyFamily(company) === signal.family ? company.momentum - 50 : 0), 0) / Math.max(1, companies.length);
      const cycle = ((day + index * 5) % 9) - 4;
      const shift = Math.round(cycle * 0.7 + marketPressure * 0.035);
      const indexValue = clamp(signal.index + shift, 18, 88);
      const trend = shift >= 2 ? 'rising' : shift <= -2 ? 'falling' : 'stable';
      return {
        ...signal,
        index: indexValue,
        trend,
        confidence: clamp(signal.confidence + (((day + index) % 5) - 2), 42, 86),
        note: demandNote(signal.family, trend, indexValue),
        updatedDay: day,
      };
    });
    const local = demandSignals.find((signal) => signal.regionId === world.regionId && signal.family === (day % 2 === 0 ? 'beer' : 'cider'));
    if (local) {
      pulse = [{
        id: `pulse-${day}-demand-${local.id}`,
        day,
        tone: local.trend === 'falling' ? 'warning' as const : 'market' as const,
        title: `${local.family === 'beer' ? 'Пиво' : 'Сидр'}: спрос ${local.trend === 'rising' ? 'растёт' : local.trend === 'falling' ? 'снижается' : 'держится'}`,
        detail: `${local.note} Точность сигнала ${local.confidence}%.`,
      }, ...pulse].slice(0, 12);
    }
  }

  if (day % 5 === 0 && companies.length > 0) {
    const companyIndex = Math.floor(day / 5) % companies.length;
    const current = companies[companyIndex];
    if (current) {
      const family = companyFamily(current);
      const compatible = outlets.filter((outlet) => outlet.targetFamilies.includes(family));
      const placement = compatible[(day + companyIndex) % Math.max(1, compatible.length)] ?? outlets[(day + companyIndex) % outlets.length];
      const releaseName = nextReleaseName(current, day);
      const impact = ((day + companyIndex * 7) % 15) - 5;
      const momentum = clamp(current.momentum + impact, 15, 95);
      const status: WorldCompanyState['status'] = momentum >= 67 ? 'growing' : momentum <= 36 ? 'struggling' : 'stable';
      companies = companies.map((company, index) => index === companyIndex ? { ...company, activeRelease: releaseName, momentum, status } : company);
      if (placement) {
        outlets = outlets.map((outlet) => outlet.id === placement.id ? {
          ...outlet,
          supplierCompanyIds: [current.id, ...outlet.supplierCompanyIds.filter((id) => id !== current.id)].slice(0, 5),
        } : outlet);
      }
      const release: WorldRelease = {
        id: `release-${day}-${current.id}`,
        companyId: current.id,
        day,
        name: releaseName,
        category: current.category,
        outletId: placement?.id ?? null,
        impact,
      };
      releases = [release, ...releases].slice(0, 24);
      pulse = [{
        id: `pulse-${day}-release-${current.id}`,
        day,
        tone: impact < 0 ? 'warning' as const : 'release' as const,
        title: `${current.name} выпустила ${releaseName}`,
        detail: placement ? `Релиз появился в ${placement.name}; импульс компании ${momentum}/100.` : `Импульс компании ${momentum}/100.`,
      }, ...pulse].slice(0, 12);
    }
  }

  const proposals = world.proposals.map((proposal) => {
    if (proposal.status !== 'reviewing' || proposal.reviewDay > day) return proposal;
    const outlet = outlets.find((item) => item.id === proposal.outletId);
    const batch = batches.find((item) => item.id === proposal.batchId);
    if (!outlet || !batch) return { ...proposal, status: 'rejected' as const, fitScore: 0, decisionReasons: [...proposal.decisionReasons, 'Закупщик не смог подтвердить происхождение образца.'] };
    return evaluateProposal(proposal, outlet, batch, companyReputation, getDemandIndex({ demandSignals }, outlet, batch.recipe.family));
  });

  const newlyResolved = proposals.filter((proposal) => {
    const previous = world.proposals.find((item) => item.id === proposal.id);
    return previous?.status === 'reviewing' && proposal.status !== 'reviewing';
  });
  for (const proposal of newlyResolved) {
    const outlet = outlets.find((item) => item.id === proposal.outletId);
    if (!outlet) continue;
    pulse = [{
      id: `pulse-${day}-decision-${proposal.id}`,
      day,
      tone: proposal.status === 'offer' ? 'release' as const : 'warning' as const,
      title: proposal.status === 'offer' ? `${outlet.name} прислала оффер` : `${outlet.name} отказала в поставке`,
      detail: proposal.status === 'offer'
        ? `${proposal.offeredUnits} бутылок по ${proposal.offeredPrice?.toFixed(2)} за единицу.`
        : proposal.decisionReasons.at(-1) ?? 'Продукт не прошёл внутренний отбор.',
    }, ...pulse].slice(0, 12);
  }

  let reviews = world.reviews;
  const reviewable = world.contracts.filter((contract) => day >= contract.signedDay + 2 && !reviews.some((review) => review.contractId === contract.id));
  for (const contract of reviewable) {
    const outlet = outlets.find((item) => item.id === contract.outletId);
    const batch = batches.find((item) => item.id === contract.batchId);
    if (!outlet || !batch) continue;
    const review = createConsumerReview(contract, outlet, batch, day);
    reviews = [review, ...reviews];
    outlets = outlets.map((item) => item.id === outlet.id ? { ...item, relationship: clamp(item.relationship + review.relationshipEffect, 0, 100) } : item);
    pulse = [{
      id: `pulse-${day}-${review.id}`,
      day,
      tone: review.score >= 4 ? 'release' as const : review.score <= 2 ? 'warning' as const : 'market' as const,
      title: `${outlet.name}: ${review.headline}`,
      detail: `${review.score}/5 · ${review.note}`,
    }, ...pulse].slice(0, 12);
  }

  let repeatOrders = world.repeatOrders;
  let nextRepeatOrderNumber = world.nextRepeatOrderNumber;
  const eligibleContracts = world.contracts.filter((contract) => (
    contract.repeatPotential >= 55
    && day >= contract.signedDay + 4
    && !repeatOrders.some((order) => order.referenceContractId === contract.id)
  ));
  for (const contract of eligibleContracts) {
    const batch = batches.find((item) => item.id === contract.batchId);
    const outlet = outlets.find((item) => item.id === contract.outletId);
    if (!batch || !outlet) continue;
    const order = createRepeatOrder(contract, batch, day, nextRepeatOrderNumber);
    nextRepeatOrderNumber += 1;
    repeatOrders = [order, ...repeatOrders];
    pulse = [{
      id: `pulse-${day}-${order.id}`,
      day,
      tone: 'market' as const,
      title: `${outlet.name} прислала повторный заказ`,
      detail: `${order.units} бутылок до ${order.dueDay}-го дня. Нужна стабильность не ниже ${order.minConsistency}/100.`,
    }, ...pulse].slice(0, 12);
  }

  const expiredIds = repeatOrders.filter((order) => order.status === 'pending' && day > order.dueDay).map((order) => order.id);
  if (expiredIds.length > 0) {
    repeatOrders = repeatOrders.map((order) => expiredIds.includes(order.id) ? { ...order, status: 'expired' as const, decisionNote: 'Срок поставки истёк, точка закрыла заказ.' } : order);
    for (const orderId of expiredIds) {
      const order = repeatOrders.find((item) => item.id === orderId);
      if (!order) continue;
      const outlet = outlets.find((item) => item.id === order.outletId);
      outlets = outlets.map((item) => item.id === order.outletId ? { ...item, relationship: clamp(item.relationship - 12, 0, 100) } : item);
      pulse = [{
        id: `pulse-${day}-expired-${orderId}`,
        day,
        tone: 'warning' as const,
        title: `${outlet?.name ?? 'Покупатель'} закрыла просроченный заказ`,
        detail: `Поставка не пришла до ${order.dueDay}-го дня. Отношения ухудшились.`,
      }, ...pulse].slice(0, 12);
    }
  }

  return { ...world, companies, outlets, proposals, pulse, releases, demandSignals, reviews, repeatOrders, nextRepeatOrderNumber };
}

function createWorldState(countryId: string, regionId: string, propertyId: string): WorldState {
  return {
    countryId,
    regionId,
    propertyId,
    companies: createWorldCompanies(),
    pulse: createInitialPulse(),
    outlets: cloneOutlets(),
    proposals: [],
    contracts: [],
    sales: [],
    repeatOrders: [],
    reviews: [],
    demandSignals: createDemandSignals(),
    releases: [],
    nextProposalNumber: 1,
    nextContractNumber: 1,
    nextRepeatOrderNumber: 1,
  };
}

function cloneOutlets(): MarketOutletState[] {
  return marketOutlets.map((outlet) => ({
    ...outlet,
    targetFamilies: [...outlet.targetFamilies],
    requirementTags: [...outlet.requirementTags],
    supplierCompanyIds: [...outlet.supplierCompanyIds],
    weights: { ...outlet.weights },
    preferredWholesale: [...outlet.preferredWholesale] as [number, number],
  }));
}

function createWorldCompanies(): WorldCompanyState[] {
  return [
    { id: 'alten-brucke', name: 'Alten Brücke', country: 'Германия', category: 'Пивоварня', focus: 'лагеры и сезонное пиво', reputation: 72, activeRelease: 'Keller No. 8', momentum: 66, status: 'stable' },
    { id: 'maison-orbe', name: 'Maison Orbe', country: 'Франция', category: 'Сидрерия', focus: 'сидры и фруктовые аперитивы', reputation: 68, activeRelease: 'Brut de Verger', momentum: 74, status: 'growing' },
    { id: 'black-finch', name: 'Black Finch', country: 'Великобритания', category: 'Пивоварня', focus: 'тёмное пиво и барные коллаборации', reputation: 61, activeRelease: 'Night Porter', momentum: 58, status: 'stable' },
    { id: 'north-acre', name: 'North Acre', country: 'Великобритания', category: 'Сидрерия', focus: 'фермерские сидры', reputation: 79, activeRelease: 'Orchard 26', momentum: 83, status: 'growing' },
    { id: 'atelier-neuf', name: 'Atelier Neuf', country: 'Франция', category: 'Винодельня', focus: 'натуральные вина и малые партии', reputation: 75, activeRelease: 'Rouge Sans Filtre', momentum: 49, status: 'stable' },
    { id: 'rhein-lab', name: 'Rhein Lab', country: 'Германия', category: 'Ферментационная лаборатория', focus: 'экспериментальные ферментации', reputation: 54, activeRelease: 'Acid Grain 04', momentum: 31, status: 'struggling' },
    { id: 'copper-stag', name: 'Copper Stag', country: 'Великобритания', category: 'Дистиллерия', focus: 'зерновые дистилляты и выдержка', reputation: 81, activeRelease: 'Malt Reserve 12', momentum: 71, status: 'growing' },
    { id: 'verger-haut', name: 'Verger Haut', country: 'Франция', category: 'Сидрерия', focus: 'пуаре и сухие сидры', reputation: 63, activeRelease: 'Poire Sec', momentum: 52, status: 'stable' },
    { id: 'wald-kraut', name: 'Wald & Kraut', country: 'Германия', category: 'Ликёрный дом', focus: 'травяные ликёры и биттеры', reputation: 70, activeRelease: 'Kräuter 31', momentum: 64, status: 'stable' },
    { id: 'saint-roux', name: 'Saint Roux', country: 'Франция', category: 'Винодельня', focus: 'региональные красные вина', reputation: 86, activeRelease: 'Cuvée 2024', momentum: 77, status: 'growing' },
    { id: 'mill-river', name: 'Mill River', country: 'Великобритания', category: 'Пивоварня', focus: 'эль и стабильные пабные линейки', reputation: 65, activeRelease: 'Public House Bitter', momentum: 55, status: 'stable' },
    { id: 'eiswerk', name: 'Eiswerk', country: 'Германия', category: 'Безалкогольный производитель', focus: 'ферментированные безалкогольные напитки', reputation: 48, activeRelease: 'Hop Zero', momentum: 44, status: 'stable' },
  ];
}

function normalizeWorldCompanies(companies: WorldCompanyState[]): WorldCompanyState[] {
  return companies.map((company) => ({ ...company, category: company.category ?? 'Производитель напитков' }));
}

function getOutlet(world: WorldState, outletId: string): MarketOutletState {
  const outlet = world.outlets.find((item) => item.id === outletId);
  if (!outlet) throw new Error('Точка сбыта не найдена');
  return outlet;
}

function getProposal(world: WorldState, proposalId: string): MarketProposal {
  const proposal = world.proposals.find((item) => item.id === proposalId);
  if (!proposal) throw new Error('Предложение не найдено');
  return proposal;
}

function getRepeatOrder(world: WorldState, orderId: string): RepeatOrder {
  const order = world.repeatOrders.find((item) => item.id === orderId);
  if (!order) throw new Error('Повторный заказ не найден');
  return order;
}

function createDemandSignals(): DemandSignal[] {
  const regionKeys = new Map<string, { countryId: string; regionId: string }>();
  for (const outlet of marketOutlets) regionKeys.set(`${outlet.countryId}:${outlet.regionId}`, { countryId: outlet.countryId, regionId: outlet.regionId });
  const signals: DemandSignal[] = [];
  let index = 0;
  for (const region of regionKeys.values()) {
    for (const family of ['beer', 'cider'] as ProductFamily[]) {
      const interested = marketOutlets.filter((outlet) => outlet.regionId === region.regionId && outlet.targetFamilies.includes(family)).length;
      const base = clamp(42 + interested * 8 + ((index * 7) % 13), 28, 78);
      signals.push({
        id: `demand-${region.regionId}-${family}`,
        countryId: region.countryId,
        regionId: region.regionId,
        family,
        index: base,
        trend: 'stable',
        confidence: 58 + (index % 4) * 6,
        note: demandNote(family, 'stable', base),
        updatedDay: 1,
      });
      index += 1;
    }
  }
  return signals;
}

function getDemandIndex(world: Pick<WorldState, 'demandSignals'>, outlet: MarketOutletState, family: ProductFamily): number {
  return world.demandSignals.find((signal) => signal.regionId === outlet.regionId && signal.family === family)?.index
    ?? world.demandSignals.find((signal) => signal.countryId === outlet.countryId && signal.family === family)?.index
    ?? 50;
}

function companyFamily(company: WorldCompanyState): ProductFamily {
  const text = `${company.category} ${company.focus}`.toLowerCase();
  return text.includes('сидр') || text.includes('ябл') || text.includes('пуар') ? 'cider' : 'beer';
}

function demandNote(family: ProductFamily, trend: DemandSignal['trend'], index: number): string {
  const category = family === 'beer' ? 'пива' : 'сидра';
  if (trend === 'rising') return `Точки активнее ищут новые позиции ${category}, но лучшие полки быстро занимают.`;
  if (trend === 'falling') return `Продажи ${category} замедлились; закупщики режут тестовые объёмы и цену.`;
  if (index >= 68) return `Спрос на ${category} высокий, хотя данные по отдельным районам расходятся.`;
  if (index <= 36) return `Категория ${category} сейчас слабая, прогноз основан на неполных продажах.`;
  return `Спрос на ${category} ровный; заметной волны пока нет.`;
}

function nextReleaseName(company: WorldCompanyState, day: number): string {
  const stem = company.activeRelease.split(/[\s#]/)[0] || company.name.split(' ')[0] || 'Release';
  const suffix = String((day * 7 + company.name.length) % 97).padStart(2, '0');
  return `${stem} ${suffix}`;
}

function unitBookValue(batch: BatchState): number {
  if (batch.packagedUnits <= 0) return 0;
  return (batch.productionCost + batch.packagingCost) / batch.packagedUnits;
}

function createInitialPulse(): WorldPulseItem[] {
  return [
    { id: 'pulse-start-1', day: 1, tone: 'market', title: 'Бары осторожнее берут неизвестные бренды', detail: 'Новые поставщики чаще начинают с образцов и малых объёмов.' },
    { id: 'pulse-start-2', day: 1, tone: 'release', title: 'North Acre выпустила новый сухой сидр', detail: 'Специализированные магазины уже запросили первую поставку.' },
    { id: 'pulse-start-3', day: 1, tone: 'warning', title: 'Цена стекла остаётся высокой', detail: 'Малые производители переходят на короткие серии и возвратную тару.' },
  ];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
