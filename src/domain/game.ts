export type GameMode = 'standard' | 'roguelike';
export type GamePhase = 'onboarding' | 'operating';
export type ProductFamily = 'beer' | 'cider';

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
}

export interface WorldState {
  countryId: string;
  regionId: string;
  propertyId: string;
}

export interface FinanceState {
  cash: number;
  dailyFixedCost: number;
}

export interface GameState {
  schemaVersion: 1;
  phase: GamePhase;
  mode: GameMode;
  day: number;
  company: CompanyState;
  world: WorldState | null;
  finance: FinanceState;
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
    schemaVersion: 1,
    phase: 'onboarding',
    mode: 'standard',
    day: 1,
    company: { name: '', reputation: 0 },
    world: null,
    finance: { cash: STARTING_CASH.standard, dailyFixedCost: 0 },
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
    schemaVersion: 1,
    phase: 'operating',
    mode: selection.mode,
    day: 1,
    company: { name: companyName, reputation: 0 },
    world: {
      countryId: selection.countryId,
      regionId: selection.regionId,
      propertyId: selection.property.id,
    },
    finance: {
      cash: startingCash - selection.property.upfrontCost,
      dailyFixedCost: selection.property.dailyCost,
    },
    discoveredProductFamilies: ['beer', 'cider'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function advanceDay(state: GameState, now = new Date()): GameState {
  if (state.phase !== 'operating') return state;
  const nextCash = state.finance.cash - state.finance.dailyFixedCost;
  return {
    ...state,
    day: state.day + 1,
    finance: { ...state.finance, cash: nextCash },
    updatedAt: now.toISOString(),
  };
}
