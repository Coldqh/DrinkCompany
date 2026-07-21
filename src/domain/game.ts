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
}

export interface FinanceState {
  cash: number;
  dailyFixedCost: number;
  productionSpend: number;
  equipmentSpend: number;
  packagedInventoryValue: number;
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
  schemaVersion: 2;
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
    schemaVersion: 2,
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
    schemaVersion: 2,
    phase: 'operating',
    mode: selection.mode,
    day: 1,
    company: { name: companyName, reputation: 0, completedBatches: 0 },
    world: {
      countryId: selection.countryId,
      regionId: selection.regionId,
      propertyId: selection.property.id,
      companies: createWorldCompanies(),
      pulse: createInitialPulse(),
    },
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
  const inventoryValue = packaged.packagedUnits * 2.1;

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

export function dismissTutorial(state: GameState, now = new Date()): GameState {
  return touch({ ...state, tutorial: { ...state.tutorial, dismissed: true } }, now);
}

export function advanceDay(state: GameState, now = new Date()): GameState {
  if (state.phase !== 'operating') return state;
  const nextDay = state.day + 1;
  const nextCash = roundMoney(state.finance.cash - state.finance.dailyFixedCost);
  const batches = state.production.batches.map((batch) => advanceBatch(batch, nextDay));
  const world = state.world ? advanceWorld(state.world, nextDay) : null;

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
  if (candidate.schemaVersion === 2 && candidate.phase && candidate.company && candidate.finance && candidate.production) {
    return value as GameState;
  }
  if (candidate.schemaVersion === 1 && candidate.phase && candidate.company && candidate.finance) {
    const legacy = value as LegacyGameStateV1;
    return {
      schemaVersion: 2,
      phase: legacy.phase,
      mode: legacy.mode,
      day: legacy.day,
      company: { ...legacy.company, completedBatches: 0 },
      world: legacy.world ? { ...legacy.world, companies: createWorldCompanies(), pulse: createInitialPulse() } : null,
      finance: {
        ...legacy.finance,
        productionSpend: 0,
        equipmentSpend: 0,
        packagedInventoryValue: 0,
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

function createFinance(cash: number, dailyFixedCost: number): FinanceState {
  return { cash, dailyFixedCost, productionSpend: 0, equipmentSpend: 0, packagedInventoryValue: 0 };
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

function advanceWorld(world: WorldState, day: number): WorldState {
  if (day % 4 !== 0) return world;
  const companyIndex = Math.floor(day / 4) % world.companies.length;
  const companies: WorldCompanyState[] = world.companies.map((company, index): WorldCompanyState => {
    if (index !== companyIndex) return company;
    const momentumShift = ((day + index * 3) % 7) - 3;
    const momentum = clamp(company.momentum + momentumShift, 15, 95);
    const status: WorldCompanyState['status'] = momentum >= 67 ? 'growing' : momentum <= 36 ? 'struggling' : 'stable';
    return { ...company, momentum, status };
  });
  const changed = companies[companyIndex] ?? companies[0];
  if (!changed) return world;
  const pulse: WorldPulseItem = {
    id: `pulse-${day}-${changed.id}`,
    day,
    tone: changed.status === 'struggling' ? 'warning' : 'release',
    title: changed.status === 'growing' ? `${changed.name} набирает спрос` : `${changed.name} меняет рыночную позицию`,
    detail: `${changed.activeRelease}: импульс рынка ${changed.momentum}/100.`,
  };
  return { ...world, companies, pulse: [pulse, ...world.pulse].slice(0, 8) };
}

function createWorldCompanies(): WorldCompanyState[] {
  return [
    { id: 'alten-brucke', name: 'Alten Brücke', country: 'Германия', focus: 'лагеры и сезонное пиво', reputation: 72, activeRelease: 'Keller No. 8', momentum: 66, status: 'stable' },
    { id: 'maison-orbe', name: 'Maison Orbe', country: 'Франция', focus: 'сидры и фруктовые аперитивы', reputation: 68, activeRelease: 'Brut de Verger', momentum: 74, status: 'growing' },
    { id: 'black-finch', name: 'Black Finch', country: 'Великобритания', focus: 'тёмное пиво и барные коллаборации', reputation: 61, activeRelease: 'Night Porter', momentum: 58, status: 'stable' },
    { id: 'north-acre', name: 'North Acre', country: 'Великобритания', focus: 'фермерские сидры', reputation: 79, activeRelease: 'Orchard 26', momentum: 83, status: 'growing' },
    { id: 'atelier-neuf', name: 'Atelier Neuf', country: 'Франция', focus: 'натуральные вина и малые партии', reputation: 75, activeRelease: 'Rouge Sans Filtre', momentum: 49, status: 'stable' },
    { id: 'rhein-lab', name: 'Rhein Lab', country: 'Германия', focus: 'экспериментальные ферментации', reputation: 54, activeRelease: 'Acid Grain 04', momentum: 31, status: 'struggling' },
  ];
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
