import type { BrandState } from './brand';
import type { BatchState } from './production';
import {
  advanceRetailDay,
  cleanRetailVenue,
  createRetailState,
  retailOpenCost,
  retailStockLimit,
  retailStockUnits,
  retailVenueUpgradeCost,
  setRetailVenueStatus,
  stockRetailVenue,
  upgradeRetailVenue,
  type RetailDayReport,
  type RetailState,
  type RetailVenue,
  type RetailVenueStatus,
  type RetailVenueType,
} from './retail';
import type { MarketOutletState } from './market';
import { suppliers } from '../data/supplyCatalog';
import { advanceTradeDay, createTradeState, normalizeTradeState, type TradeState } from './trade';
import { advanceKernelDay, createEcosystemKernel, normalizeEcosystemKernel, synchronizeKernelFromTrade, type EcosystemKernelState } from './kernel';
import {
  advanceWorldIntelligence,
  createWorldIntelligenceState,
  normalizeWorldIntelligenceState,
  type WorldIntelligenceState,
} from './worldIntelligence';

export type OrganizationKind = 'player' | 'producer' | 'hospitality' | 'retailer' | 'supplier' | 'holding';
export type OrganizationStatus = 'active' | 'strained' | 'insolvent' | 'acquired';
export type AssetType = 'production' | 'bar' | 'shop' | 'warehouse' | 'laboratory' | 'office' | 'vacant_commercial';
export type AssetStatus = 'operating' | 'closed' | 'for_sale' | 'vacant';
export type DealKind = 'acquisition' | 'lease' | 'investment' | 'takeover' | 'capital_injection' | 'asset_transfer' | 'npc_acquisition' | 'bankruptcy';
export type SubsidiaryAutonomy = 'autonomous' | 'guided' | 'integrated';
export type TreasuryPolicy = 'retain' | 'balanced' | 'sweep';

export interface OrganizationState {
  id: string;
  name: string;
  kind: OrganizationKind;
  countryId: string;
  regionId: string;
  ownerLabel: string;
  status: OrganizationStatus;
  cash: number;
  debt: number;
  reputation: number;
  strategy: string;
  employeeCount: number;
  valuation: number;
  dailyRevenue: number;
  dailyCosts: number;
  assetIds: string[];
  supplierOrganizationIds: string[];
  buyerOrganizationIds: string[];
  foundedDay: number;
}

export interface WorldAssetState {
  id: string;
  type: AssetType;
  name: string;
  city: string;
  countryId: string;
  regionId: string;
  address: string;
  ownerOrganizationId: string | null;
  operatorOrganizationId: string | null;
  status: AssetStatus;
  condition: number;
  capacity: number;
  footfall: number;
  askingPrice: number;
  dailyRent: number;
  dailyOperatingCost: number;
  audience: string;
  marketOutletId: string | null;
  venue: RetailVenue | null;
}

export interface EquityHolding {
  id: string;
  organizationId: string;
  share: number;
  acquiredDay: number;
  cost: number;
}

export interface SubsidiaryControl {
  organizationId: string;
  controlShare: number;
  acquiredDay: number;
  autonomy: SubsidiaryAutonomy;
  treasuryPolicy: TreasuryPolicy;
  capitalInjected: number;
}

export interface EcosystemTransaction {
  id: string;
  day: number;
  kind: DealKind;
  buyerOrganizationId: string | null;
  sellerOrganizationId: string | null;
  assetId: string | null;
  organizationId: string | null;
  amount: number;
  headline: string;
  detail: string;
}

export interface EcosystemState {
  playerOrganizationId: string;
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  holdings: EquityHolding[];
  subsidiaries: SubsidiaryControl[];
  transactions: EcosystemTransaction[];
  retailReports: RetailDayReport[];
  nextAssetNumber: number;
  nextHoldingNumber: number;
  nextTransactionNumber: number;
  nextRetailStockNumber: number;
  nextRetailReportNumber: number;
  trade: TradeState;
  intelligence: WorldIntelligenceState;
  kernel: EcosystemKernelState;
}

export interface EcosystemAdvanceResult {
  ecosystem: EcosystemState;
  playerRevenue: number;
  playerUnitsSold: number;
  playerOperatingCost: number;
  reports: RetailDayReport[];
  events: { title: string; detail: string; tone: 'market' | 'warning' | 'release' }[];
}

interface SeedCompany {
  id: string;
  name: string;
  country: string;
  category: string;
  reputation: number;
  momentum: number;
  status: 'growing' | 'stable' | 'struggling';
}

export function createEcosystemState(input: {
  playerCompanyName: string;
  countryId: string;
  regionId: string;
  propertyName: string;
  propertyId: string;
  propertyDailyCost: number;
  propertyOwned: boolean;
  companies: SeedCompany[];
  outlets: MarketOutletState[];
  day: number;
}): EcosystemState {
  const playerOrganizationId = 'org-player';
  const player: OrganizationState = {
    id: playerOrganizationId,
    name: input.playerCompanyName,
    kind: 'player',
    countryId: input.countryId,
    regionId: input.regionId,
    ownerLabel: 'Игрок',
    status: 'active',
    cash: 0,
    debt: 0,
    reputation: 0,
    strategy: 'Независимый производитель напитков',
    employeeCount: 0,
    valuation: 45_000,
    dailyRevenue: 0,
    dailyCosts: input.propertyDailyCost,
    assetIds: ['asset-player-production'],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: input.day,
  };

  const companyOrganizations = input.companies.map((company, index): OrganizationState => {
    const countryId = countryIdFromLabel(company.country);
    const baseCash = 42_000 + company.reputation * 760 + company.momentum * 310;
    const kind: OrganizationKind = company.category.toLowerCase().includes('магаз')
      ? 'retailer'
      : company.category.toLowerCase().includes('постав')
        ? 'supplier'
        : 'producer';
    return {
      id: `org-${company.id}`,
      name: company.name,
      kind,
      countryId,
      regionId: defaultRegionForCountry(countryId),
      ownerLabel: npcOwner(index),
      status: company.status === 'struggling' ? 'strained' : 'active',
      cash: baseCash,
      debt: company.status === 'struggling' ? Math.round(baseCash * .62) : Math.round(baseCash * .16),
      reputation: company.reputation,
      strategy: company.category,
      employeeCount: 8 + (index % 7) * 3,
      valuation: Math.round(baseCash * 1.8),
      dailyRevenue: 900 + company.momentum * 18,
      dailyCosts: 760 + (index % 5) * 130,
      assetIds: [`asset-production-${company.id}`],
      supplierOrganizationIds: [],
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, input.day - 420 - index * 37),
    };
  });

  const producerAssets: WorldAssetState[] = input.companies.map((company, index) => {
    const countryId = countryIdFromLabel(company.country);
    const regionId = defaultRegionForCountry(countryId);
    return {
      id: `asset-production-${company.id}`,
      type: 'production',
      name: `${company.name} Production`,
      city: cityForRegion(regionId),
      countryId,
      regionId,
      address: `Промышленный квартал ${index + 2}`,
      ownerOrganizationId: `org-${company.id}`,
      operatorOrganizationId: `org-${company.id}`,
      status: company.status === 'struggling' ? 'closed' : 'operating',
      condition: 58 + (index * 7) % 35,
      capacity: 180 + (index % 5) * 90,
      footfall: 0,
      askingPrice: 85_000 + company.reputation * 1_350,
      dailyRent: 0,
      dailyOperatingCost: 580 + (index % 4) * 170,
      audience: company.category,
      marketOutletId: null,
      venue: null,
    };
  });

  const supplierOrganizations: OrganizationState[] = suppliers.map((supplier, index) => {
    const countryId = countryIdFromLabel(supplier.country);
    const regionId = defaultRegionForCountry(countryId);
    return {
      id: `org-supplier-${supplier.id}`,
      name: supplier.name,
      kind: 'supplier',
      countryId,
      regionId,
      ownerLabel: npcOwner(index + input.companies.length + input.outlets.length),
      status: 'active',
      cash: 68_000 + supplier.reliability * 620,
      debt: 8_000 + (index % 4) * 2_700,
      reputation: supplier.reliability,
      strategy: supplier.focus,
      employeeCount: 12 + (index % 5) * 4,
      valuation: 110_000 + supplier.reliability * 1_050,
      dailyRevenue: 0,
      dailyCosts: 0,
      assetIds: [`asset-supplier-${supplier.id}`],
      supplierOrganizationIds: [],
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, input.day - 760 - index * 43),
    };
  });

  const supplierAssets: WorldAssetState[] = suppliers.map((supplier, index) => {
    const countryId = countryIdFromLabel(supplier.country);
    const regionId = defaultRegionForCountry(countryId);
    return {
      id: `asset-supplier-${supplier.id}`,
      type: 'warehouse',
      name: `${supplier.name} Hub`,
      city: cityForRegion(regionId),
      countryId,
      regionId,
      address: `Логистическая зона ${index + 1}`,
      ownerOrganizationId: `org-supplier-${supplier.id}`,
      operatorOrganizationId: `org-supplier-${supplier.id}`,
      status: 'operating',
      condition: 72 + supplier.reliability % 24,
      capacity: 520 + (index % 4) * 180,
      footfall: 0,
      askingPrice: 95_000 + supplier.reliability * 980,
      dailyRent: 0,
      dailyOperatingCost: 440 + (index % 4) * 95,
      audience: supplier.focus,
      marketOutletId: null,
      venue: null,
    };
  });

  const outletOrganizations: OrganizationState[] = [];
  const outletAssets: WorldAssetState[] = [];
  input.outlets.forEach((outlet, index) => {
    const organizationId = `org-outlet-${outlet.id}`;
    const assetId = `asset-outlet-${outlet.id}`;
    const type: RetailVenueType = outlet.channel === 'bar' ? 'bar' : 'shop';
    const venue = createSeedVenue(assetId, type, outlet.name, outlet.regionId, input.day, index);
    outletOrganizations.push({
      id: organizationId,
      name: `${outlet.name} Operations`,
      kind: outlet.channel === 'bar' ? 'hospitality' : 'retailer',
      countryId: outlet.countryId,
      regionId: outlet.regionId,
      ownerLabel: npcOwner(index + input.companies.length),
      status: index % 7 === 5 ? 'strained' : 'active',
      cash: 18_000 + outlet.relationship * 260 + index * 1_150,
      debt: index % 7 === 5 ? 21_000 : 4_000 + index * 350,
      reputation: 46 + outlet.acceptanceThreshold / 2,
      strategy: outlet.audience,
      employeeCount: type === 'bar' ? 7 + index % 5 : 5 + index % 4,
      valuation: 34_000 + outlet.maxOrder * 145 + outlet.acceptanceThreshold * 260,
      dailyRevenue: 680 + outlet.maxOrder * 5.2,
      dailyCosts: 560 + outlet.reviewDays * 95,
      assetIds: [assetId],
      supplierOrganizationIds: outlet.supplierCompanyIds.map((id) => `org-${id}`),
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, input.day - 260 - index * 19),
    });
    outletAssets.push({
      id: assetId,
      type,
      name: outlet.name,
      city: outlet.city,
      countryId: outlet.countryId,
      regionId: outlet.regionId,
      address: addressFor(outlet.city, index),
      ownerOrganizationId: organizationId,
      operatorOrganizationId: organizationId,
      status: index % 7 === 5 ? 'for_sale' : 'operating',
      condition: 62 + (index * 7) % 32,
      capacity: venue.level === 1 ? 180 : 260,
      footfall: 38 + (index * 11) % 57,
      askingPrice: 29_000 + outlet.maxOrder * 135 + index * 1_250,
      dailyRent: 150 + index * 13,
      dailyOperatingCost: venue.dailyCost,
      audience: outlet.audience,
      marketOutletId: outlet.id,
      venue,
    });
  });

  const landlordOrganizations = createLandlordOrganizations(input.day);
  const vacantAssets = createVacantAssets();
  const playerAsset: WorldAssetState = {
    id: 'asset-player-production',
    type: 'production',
    name: input.propertyName,
    city: cityForRegion(input.regionId),
    countryId: input.countryId,
    regionId: input.regionId,
    address: 'Промышленная зона, корпус 1',
    ownerOrganizationId: input.propertyOwned ? playerOrganizationId : null,
    operatorOrganizationId: playerOrganizationId,
    status: 'operating',
    condition: 74,
    capacity: 100,
    footfall: 0,
    askingPrice: 72_000,
    dailyRent: input.propertyDailyCost,
    dailyOperatingCost: input.propertyDailyCost,
    audience: 'Производственный объект',
    marketOutletId: null,
    venue: null,
  };

  const organizations = [player, ...companyOrganizations, ...supplierOrganizations, ...outletOrganizations, ...landlordOrganizations];
  const assets = [playerAsset, ...producerAssets, ...supplierAssets, ...outletAssets, ...vacantAssets];
  const trade = createTradeState(organizations, assets, input.day);
  const kernel = createEcosystemKernel({
    day: input.day,
    seedText: `${input.playerCompanyName}:${input.countryId}:${input.regionId}`,
    organizations,
    assets,
    trade,
  });
  return {
    playerOrganizationId,
    organizations,
    assets,
    holdings: [],
    subsidiaries: [],
    transactions: [],
    retailReports: [],
    nextAssetNumber: 1,
    nextHoldingNumber: 1,
    nextTransactionNumber: 1,
    nextRetailStockNumber: 1,
    nextRetailReportNumber: 1,
    trade,
    intelligence: createWorldIntelligenceState(organizations, input.day),
    kernel,
  };
}

export function migrateRetailIntoEcosystem(ecosystem: EcosystemState, retail: RetailState | undefined, day: number): EcosystemState {
  if (!retail || retail.venues.length === 0) return ecosystem;
  let next = ecosystem;
  for (const oldVenue of retail.venues) {
    const assetId = `asset-migrated-${oldVenue.id}`;
    if (next.assets.some((asset) => asset.id === assetId)) continue;
    const asset: WorldAssetState = {
      id: assetId,
      type: oldVenue.type,
      name: oldVenue.name,
      city: cityForRegion(oldVenue.regionId),
      countryId: countryForRegion(oldVenue.regionId),
      regionId: oldVenue.regionId,
      address: `Старая точка ${oldVenue.id}`,
      ownerOrganizationId: next.playerOrganizationId,
      operatorOrganizationId: next.playerOrganizationId,
      status: oldVenue.status === 'open' ? 'operating' : 'closed',
      condition: oldVenue.cleanliness,
      capacity: retailStockLimit(oldVenue),
      footfall: 52 + oldVenue.level * 9,
      askingPrice: 24_000 + oldVenue.level * 15_000,
      dailyRent: oldVenue.dailyCost,
      dailyOperatingCost: oldVenue.dailyCost,
      audience: 'Собственная аудитория, перенесённая из старой системы',
      marketOutletId: null,
      venue: { ...oldVenue, id: assetId },
    };
    next = {
      ...next,
      assets: [...next.assets, asset],
      organizations: next.organizations.map((org) => org.id === next.playerOrganizationId ? { ...org, assetIds: [...org.assetIds, assetId] } : org),
      retailReports: [...retail.reports, ...next.retailReports],
      nextRetailStockNumber: Math.max(next.nextRetailStockNumber, retail.nextStockNumber),
      nextRetailReportNumber: Math.max(next.nextRetailReportNumber, retail.nextReportNumber),
      transactions: [{
        id: `transaction-migration-${assetId}`,
        day,
        kind: 'acquisition',
        buyerOrganizationId: next.playerOrganizationId,
        sellerOrganizationId: null,
        assetId,
        organizationId: null,
        amount: 0,
        headline: `${oldVenue.name} перенесена в экосистему`,
        detail: 'Старая собственная точка стала реальным объектом мира.',
      }, ...next.transactions],
    };
  }
  return next;
}


export function normalizeEcosystemState(state: EcosystemState, day: number): EcosystemState {
  const trade = state.trade && Array.isArray(state.trade.products)
    ? normalizeTradeState(state.trade)
    : createTradeState(state.organizations, state.assets, day);
  const kernel = normalizeEcosystemKernel(state.kernel, {
    day,
    seedText: `${state.playerOrganizationId}:${state.organizations.length}:${state.assets.length}`,
    organizations: state.organizations,
    assets: state.assets,
    trade,
  });
  return {
    ...state,
    subsidiaries: state.subsidiaries ?? [],
    trade,
    kernel,
    intelligence: normalizeWorldIntelligenceState(state.intelligence, state.organizations, day),
  };
}

export function ecosystemPlayerDailyCost(state: EcosystemState): number {
  return roundMoney(state.assets
    .filter((asset) => asset.operatorOrganizationId === state.playerOrganizationId && asset.type !== 'production' && asset.status === 'operating')
    .reduce((sum, asset) => sum + asset.dailyOperatingCost + (asset.ownerOrganizationId === state.playerOrganizationId ? 0 : asset.dailyRent), 0));
}

export function controlledShare(state: EcosystemState, organizationId: string): number {
  if (organizationId === state.playerOrganizationId) return 100;
  return state.holdings.filter((holding) => holding.organizationId === organizationId).reduce((sum, holding) => sum + holding.share, 0);
}

export function isPlayerControlledOrganization(state: EcosystemState, organizationId: string | null): boolean {
  if (!organizationId) return false;
  return organizationId === state.playerOrganizationId || state.subsidiaries.some((subsidiary) => subsidiary.organizationId === organizationId && subsidiary.controlShare >= 51);
}

export function isPlayerControlledAsset(state: EcosystemState, asset: WorldAssetState): boolean {
  return asset.operatorOrganizationId === state.playerOrganizationId;
}

export function isPlayerGroupAsset(state: EcosystemState, asset: WorldAssetState): boolean {
  return isPlayerControlledOrganization(state, asset.operatorOrganizationId);
}


export function acquireAsset(state: EcosystemState, assetId: string, cash: number, day: number): { ecosystem: EcosystemState; cost: number } {
  const asset = getAsset(state, assetId);
  if (asset.type !== 'bar' && asset.type !== 'shop' && asset.type !== 'warehouse' && asset.type !== 'laboratory') throw new Error('Этот объект нельзя приобрести напрямую');
  if (isPlayerControlledAsset(state, asset)) throw new Error('Объект уже находится под твоим контролем');
  if (isPlayerControlledOrganization(state, asset.ownerOrganizationId)) throw new Error('Объект уже находится внутри группы — используй внутреннюю передачу');
  if (asset.status !== 'for_sale' && asset.status !== 'operating') throw new Error('Владелец не рассматривает продажу');
  const seller = asset.ownerOrganizationId ? state.organizations.find((org) => org.id === asset.ownerOrganizationId) : null;
  const distressDiscount = seller?.status === 'insolvent' ? .68 : seller?.status === 'strained' ? .84 : 1;
  const relationshipPremium = asset.status === 'operating' && seller?.status === 'active' ? 1.18 : 1;
  const cost = roundMoney(asset.askingPrice * distressDiscount * relationshipPremium);
  if (cash < cost) throw new Error('Недостаточно денег для выкупа объекта');
  const transaction = createTransaction(state, day, 'acquisition', state.playerOrganizationId, asset.ownerOrganizationId, asset.id, null, cost, `Куплен объект «${asset.name}»`, `Право собственности и операционный контроль перешли компании игрока.`);
  const organizations = state.organizations.map((org) => {
    if (org.id === state.playerOrganizationId) return { ...org, assetIds: unique([...org.assetIds, asset.id]), valuation: org.valuation + Math.round(cost * .85) };
    if (org.id === asset.ownerOrganizationId) return { ...org, assetIds: org.assetIds.filter((id) => id !== asset.id), cash: roundMoney(org.cash + cost), status: org.assetIds.length <= 1 ? 'strained' : org.status };
    return org;
  });
  return {
    cost,
    ecosystem: {
      ...state,
      organizations,
      assets: state.assets.map((item) => item.id === asset.id ? { ...item, ownerOrganizationId: state.playerOrganizationId, operatorOrganizationId: state.playerOrganizationId, status: 'operating' } : item),
      transactions: [transaction, ...state.transactions].slice(0, 160),
      nextTransactionNumber: state.nextTransactionNumber + 1,
    },
  };
}

export function leaseVacantAsset(state: EcosystemState, assetId: string, input: { type: RetailVenueType; name: string }, cash: number, day: number): { ecosystem: EcosystemState; cost: number } {
  const asset = getAsset(state, assetId);
  if (asset.type !== 'vacant_commercial' || asset.status !== 'vacant') throw new Error('Для запуска нужна свободная коммерческая недвижимость');
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Название точки слишком короткое');
  const fitout = retailOpenCost(input.type);
  const deposit = asset.dailyRent * 30;
  const cost = roundMoney(fitout + deposit);
  if (cash < cost) throw new Error('Недостаточно денег на депозит и запуск точки');
  const venue = createSeedVenue(asset.id, input.type, name, asset.regionId, day, state.nextAssetNumber);
  const transaction = createTransaction(state, day, 'lease', state.playerOrganizationId, asset.ownerOrganizationId, asset.id, null, cost, `Арендован объект «${asset.name}»`, `${name} открывается в существующем помещении. Депозит и переоборудование оплачены.`);
  return {
    cost,
    ecosystem: {
      ...state,
      organizations: state.organizations.map((org) => org.id === state.playerOrganizationId ? { ...org, assetIds: unique([...org.assetIds, asset.id]), valuation: org.valuation + Math.round(fitout * .6) } : org),
      assets: state.assets.map((item) => item.id === asset.id ? { ...item, type: input.type, name, operatorOrganizationId: state.playerOrganizationId, status: 'operating', venue, dailyOperatingCost: venue.dailyCost } : item),
      transactions: [transaction, ...state.transactions].slice(0, 160),
      nextTransactionNumber: state.nextTransactionNumber + 1,
      nextAssetNumber: state.nextAssetNumber + 1,
    },
  };
}

export function investInOrganization(state: EcosystemState, organizationId: string, share: number, cash: number, day: number): { ecosystem: EcosystemState; cost: number } {
  const organization = getOrganization(state, organizationId);
  if (organization.id === state.playerOrganizationId) throw new Error('Нельзя инвестировать в собственную компанию через этот экран');
  if (![10, 25, 40].includes(share)) throw new Error('Доступная доля: 10%, 25% или 40%');
  const currentShare = state.holdings.filter((holding) => holding.organizationId === organizationId).reduce((sum, holding) => sum + holding.share, 0);
  if (currentShare + share > 49) throw new Error('Для полного контроля нужна отдельная сделка поглощения');
  const riskDiscount = organization.status === 'insolvent' ? .52 : organization.status === 'strained' ? .76 : 1;
  const cost = roundMoney(organization.valuation * (share / 100) * riskDiscount);
  if (cash < cost) throw new Error('Недостаточно денег для инвестиции');
  const holding: EquityHolding = { id: `holding-${day}-${state.nextHoldingNumber}`, organizationId, share, acquiredDay: day, cost };
  const transaction = createTransaction(state, day, 'investment', state.playerOrganizationId, organizationId, null, organizationId, cost, `Куплено ${share}% ${organization.name}`, `Игрок получает долю будущего денежного потока, но не операционный контроль.`);
  return {
    cost,
    ecosystem: {
      ...state,
      holdings: [...state.holdings, holding],
      organizations: state.organizations.map((org) => org.id === organizationId ? { ...org, cash: roundMoney(org.cash + cost), debt: Math.max(0, roundMoney(org.debt - cost * .35)) } : org),
      transactions: [transaction, ...state.transactions].slice(0, 160),
      nextHoldingNumber: state.nextHoldingNumber + 1,
      nextTransactionNumber: state.nextTransactionNumber + 1,
    },
  };
}


export function takeoverOrganization(state: EcosystemState, organizationId: string, targetShare: 51 | 75 | 100, cash: number, day: number): { ecosystem: EcosystemState; cost: number } {
  const organization = getOrganization(state, organizationId);
  if (organization.id === state.playerOrganizationId) throw new Error('Собственную компанию нельзя поглотить');
  const currentShare = controlledShare(state, organizationId);
  if (currentShare >= targetShare) throw new Error(`У тебя уже есть не меньше ${targetShare}% компании`);
  const additionalShare = targetShare - currentShare;
  const statusMultiplier = organization.status === 'insolvent' ? .58 : organization.status === 'strained' ? .82 : 1.22;
  const controlPremium = targetShare >= 75 ? 1.08 : 1;
  const cost = roundMoney(organization.valuation * (additionalShare / 100) * statusMultiplier * controlPremium);
  if (cash < cost) throw new Error('Недостаточно денег для контрольной сделки');

  const holding: EquityHolding = { id: `holding-${day}-${state.nextHoldingNumber}`, organizationId, share: additionalShare, acquiredDay: day, cost };
  const existing = state.subsidiaries.find((item) => item.organizationId === organizationId);
  const subsidiary: SubsidiaryControl = existing
    ? { ...existing, controlShare: targetShare }
    : { organizationId, controlShare: targetShare, acquiredDay: day, autonomy: 'autonomous', treasuryPolicy: 'balanced', capitalInjected: 0 };
  const player = getOrganization(state, state.playerOrganizationId);
  const transaction = createTransaction(state, day, 'takeover', state.playerOrganizationId, organizationId, null, organizationId, cost, `Получен контроль над ${organization.name}`, `${targetShare}% капитала перешли группе ${player.name}. Компания продолжает работать со своими активами, сотрудниками и контрактами.`);

  return {
    cost,
    ecosystem: {
      ...state,
      holdings: [...state.holdings, holding],
      subsidiaries: [...state.subsidiaries.filter((item) => item.organizationId !== organizationId), subsidiary],
      organizations: state.organizations.map((item) => item.id === organizationId
        ? { ...item, ownerLabel: `группа ${player.name}`, status: item.status === 'acquired' ? 'active' : item.status }
        : item),
      transactions: [transaction, ...state.transactions].slice(0, 160),
      nextHoldingNumber: state.nextHoldingNumber + 1,
      nextTransactionNumber: state.nextTransactionNumber + 1,
    },
  };
}

export function injectSubsidiaryCapital(state: EcosystemState, organizationId: string, amount: number, cash: number, day: number): { ecosystem: EcosystemState; cost: number } {
  if (!isPlayerControlledOrganization(state, organizationId) || organizationId === state.playerOrganizationId) throw new Error('Капитал можно вносить только в контролируемую дочернюю компанию');
  if (!Number.isFinite(amount) || amount < 5_000) throw new Error('Минимальный взнос — 5 000');
  if (cash < amount) throw new Error('Недостаточно денег для докапитализации');
  const organization = getOrganization(state, organizationId);
  const transaction = createTransaction(state, day, 'capital_injection', state.playerOrganizationId, null, null, organizationId, amount, `${organization.name} получила капитал`, `Группа внесла ${roundMoney(amount)} для оборотных средств и сокращения долга.`);
  return {
    cost: roundMoney(amount),
    ecosystem: {
      ...state,
      organizations: state.organizations.map((item) => item.id === organizationId ? {
        ...item,
        cash: roundMoney(item.cash + amount * .72),
        debt: Math.max(0, roundMoney(item.debt - amount * .28)),
        status: item.status === 'insolvent' && item.debt - amount * .28 < item.valuation * .72 ? 'strained' : item.status,
      } : item),
      subsidiaries: state.subsidiaries.map((item) => item.organizationId === organizationId ? { ...item, capitalInjected: roundMoney(item.capitalInjected + amount) } : item),
      transactions: [transaction, ...state.transactions].slice(0, 160),
      nextTransactionNumber: state.nextTransactionNumber + 1,
    },
  };
}

export function setSubsidiaryPolicy(state: EcosystemState, organizationId: string, autonomy: SubsidiaryAutonomy, treasuryPolicy: TreasuryPolicy): EcosystemState {
  if (!isPlayerControlledOrganization(state, organizationId) || organizationId === state.playerOrganizationId) throw new Error('Политика доступна только для дочерней компании');
  return {
    ...state,
    subsidiaries: state.subsidiaries.map((item) => item.organizationId === organizationId ? { ...item, autonomy, treasuryPolicy } : item),
  };
}

export function transferGroupAsset(state: EcosystemState, assetId: string, targetOrganizationId: string, day: number): EcosystemState {
  const asset = getAsset(state, assetId);
  const sourceOrganizationId = asset.ownerOrganizationId;
  if (asset.type === 'production') throw new Error('Производственный комплекс остаётся внутри своей компании и передаётся только вместе с ней');
  if (!isPlayerControlledOrganization(state, sourceOrganizationId) || !isPlayerControlledOrganization(state, targetOrganizationId)) throw new Error('Передача возможна только внутри контролируемой группы');
  if (sourceOrganizationId === targetOrganizationId) throw new Error('Объект уже принадлежит выбранной компании');
  const target = getOrganization(state, targetOrganizationId);
  const transaction = createTransaction(state, day, 'asset_transfer', targetOrganizationId, sourceOrganizationId, assetId, targetOrganizationId, 0, `${asset.name} передан внутри группы`, `${target.name} получила право собственности и операционный контроль без внешней продажи.`);
  return {
    ...state,
    organizations: state.organizations.map((organization) => {
      if (organization.id === sourceOrganizationId) return { ...organization, assetIds: organization.assetIds.filter((id) => id !== assetId), valuation: Math.max(0, organization.valuation - Math.round(asset.askingPrice * .8)) };
      if (organization.id === targetOrganizationId) return { ...organization, assetIds: unique([...organization.assetIds, assetId]), valuation: organization.valuation + Math.round(asset.askingPrice * .8) };
      return organization;
    }),
    assets: state.assets.map((item) => item.id === assetId ? { ...item, ownerOrganizationId: targetOrganizationId, operatorOrganizationId: targetOrganizationId } : item),
    transactions: [transaction, ...state.transactions].slice(0, 160),
    nextTransactionNumber: state.nextTransactionNumber + 1,
  };
}

export function stockControlledVenue(state: EcosystemState, assetId: string, release: BrandState['releases'][number], batch: BatchState, units: number, price: number, day: number): { ecosystem: EcosystemState; batch: BatchState } {
  const asset = getAsset(state, assetId);
  if (!isPlayerControlledAsset(state, asset) || !asset.venue) throw new Error('Точка не находится под твоим операционным контролем');
  const retail: RetailState = stateToRetail(state);
  const result = stockRetailVenue(retail, asset.id, release, batch, units, price, day);
  return { ecosystem: mergeRetailState(state, result.retail), batch: result.batch };
}

export function cleanControlledVenue(state: EcosystemState, assetId: string): { ecosystem: EcosystemState; cost: number } {
  const asset = getAsset(state, assetId);
  if (!isPlayerControlledAsset(state, asset) || !asset.venue) throw new Error('Точка не находится под твоим контролем');
  const result = cleanRetailVenue(stateToRetail(state), asset.id);
  return { ecosystem: mergeRetailState(state, result.retail), cost: result.cost };
}

export function upgradeControlledVenue(state: EcosystemState, assetId: string): { ecosystem: EcosystemState; cost: number } {
  const asset = getAsset(state, assetId);
  if (!isPlayerControlledAsset(state, asset) || !asset.venue) throw new Error('Точка не находится под твоим контролем');
  const result = upgradeRetailVenue(stateToRetail(state), asset.id);
  const merged = mergeRetailState(state, result.retail);
  return {
    ecosystem: {
      ...merged,
      assets: merged.assets.map((item) => item.id === asset.id ? { ...item, condition: Math.min(100, item.condition + 8), footfall: item.footfall + 7, askingPrice: Math.round(item.askingPrice * 1.12) } : item),
    },
    cost: result.cost,
  };
}

export function setControlledVenueStatus(state: EcosystemState, assetId: string, status: RetailVenueStatus): EcosystemState {
  const asset = getAsset(state, assetId);
  if (!isPlayerControlledAsset(state, asset) || !asset.venue) throw new Error('Точка не находится под твоим контролем');
  const retail = setRetailVenueStatus(stateToRetail(state), asset.id, status);
  const merged = mergeRetailState(state, retail);
  return {
    ...merged,
    assets: merged.assets.map((item) => item.id === asset.id ? { ...item, status: status === 'open' ? 'operating' : 'closed' } : item),
  };
}

export function controlledVenueUpgradeCost(asset: WorldAssetState): number {
  if (!asset.venue) return 0;
  return retailVenueUpgradeCost(asset.venue);
}

export function controlledVenueStockUnits(asset: WorldAssetState): number {
  return asset.venue ? retailStockUnits(asset.venue) : 0;
}

export function controlledVenueStockLimit(asset: WorldAssetState): number {
  return asset.venue ? retailStockLimit(asset.venue) : 0;
}

export function advanceEcosystemDay(state: EcosystemState, brand: BrandState, batches: BatchState[], day: number, staffBoost: number): EcosystemAdvanceResult {
  const retailAdvance = advanceRetailDay(stateToRetail(state), brand, batches, day, staffBoost);
  let ecosystem = mergeRetailState({ ...state, trade: normalizeTradeState(state.trade) }, retailAdvance.retail);
  const events: EcosystemAdvanceResult['events'] = [];
  const playerCost = ecosystemPlayerDailyCost(ecosystem);
  const tradeAdvance = advanceTradeDay(ecosystem.trade, ecosystem.organizations, ecosystem.assets, day);
  ecosystem = { ...ecosystem, trade: tradeAdvance.trade, organizations: tradeAdvance.organizations };
  events.push(...tradeAdvance.events);

  let organizations = ecosystem.organizations.map((organization) => {
    if (organization.id === ecosystem.playerOrganizationId) {
      return { ...organization, dailyRevenue: retailAdvance.revenue, dailyCosts: playerCost };
    }
    if (organization.status === 'acquired') return organization;
    const revenue = organization.dailyRevenue;
    const costs = organization.dailyCosts;
    const cash = Math.max(-8_000, organization.cash);
    const operatingProfit = revenue - costs;
    const debt = cash < 0
      ? roundMoney(organization.debt + Math.abs(cash) * .38)
      : Math.max(0, roundMoney(organization.debt - Math.max(0, operatingProfit) * .08));
    const status: OrganizationStatus = debt > organization.valuation * .82 || cash < -3_500
      ? 'insolvent'
      : debt > organization.valuation * .48 || cash < 4_000
        ? 'strained'
        : 'active';
    return { ...organization, cash, debt, status, reputation: clamp(organization.reputation + (operatingProfit > 0 ? .08 : -.12), 10, 98) };
  });

  let assets = ecosystem.assets.map((asset, index) => {
    if (asset.operatorOrganizationId === ecosystem.playerOrganizationId || asset.status === 'vacant') return asset;
    const operator = organizations.find((org) => org.id === asset.operatorOrganizationId);
    let status = asset.status;
    if (operator?.status === 'insolvent') status = 'for_sale';
    const condition = clamp(asset.condition - (asset.status === 'operating' ? .12 + (index % 4) * .04 : .03), 18, 100);
    return { ...asset, status, condition };
  });

  const newlyInsolvent = organizations.filter((org) => org.status === 'insolvent' && state.organizations.find((old) => old.id === org.id)?.status !== 'insolvent');
  let transactions = [...ecosystem.transactions];
  let nextTransactionNumber = ecosystem.nextTransactionNumber;
  for (const org of newlyInsolvent) {
    const asset = assets.find((item) => item.ownerOrganizationId === org.id);
    const transaction = createTransaction({ ...ecosystem, nextTransactionNumber }, day, 'bankruptcy', null, org.id, asset?.id ?? null, org.id, 0, `${org.name} не справляется с долгами`, asset ? `${asset.name} выставлена на продажу. Кредиторы требуют ликвидности.` : 'Компания начала процедуру реструктуризации.');
    transactions = [transaction, ...transactions].slice(0, 160);
    nextTransactionNumber += 1;
    events.push({ tone: 'warning', title: transaction.headline, detail: transaction.detail });
  }

  if (day % 6 === 0) {
    const targetAsset = assets.find((asset) => asset.status === 'for_sale' && !isPlayerControlledOrganization(ecosystem, asset.operatorOrganizationId) && !isPlayerControlledOrganization(ecosystem, asset.ownerOrganizationId));
    const buyer = organizations
      .filter((org) => org.status === 'active' && org.kind !== 'player' && org.cash > (targetAsset?.askingPrice ?? Infinity) * .75)
      .sort((a, b) => b.cash - a.cash)[0];
    if (targetAsset && buyer && targetAsset.ownerOrganizationId !== buyer.id) {
      const price = roundMoney(targetAsset.askingPrice * .78);
      const sellerId = targetAsset.ownerOrganizationId;
      organizations = organizations.map((org) => {
        if (org.id === buyer.id) return { ...org, cash: roundMoney(org.cash - price), assetIds: unique([...org.assetIds, targetAsset.id]) };
        if (org.id === sellerId) return { ...org, cash: roundMoney(org.cash + price), assetIds: org.assetIds.filter((id) => id !== targetAsset.id) };
        return org;
      });
      assets = assets.map((asset) => asset.id === targetAsset.id ? { ...asset, ownerOrganizationId: buyer.id, operatorOrganizationId: buyer.id, status: 'operating' } : asset);
      const transaction = createTransaction({ ...ecosystem, nextTransactionNumber }, day, 'npc_acquisition', buyer.id, sellerId, targetAsset.id, null, price, `${buyer.name} выкупила ${targetAsset.name}`, 'Объект сменил владельца без участия игрока. Ассортимент и поставщики будут пересмотрены.');
      transactions = [transaction, ...transactions].slice(0, 160);
      nextTransactionNumber += 1;
      events.push({ tone: 'market', title: transaction.headline, detail: transaction.detail });
    }
  }

  let dividend = 0;
  const holdingsByOrganization = new Map<string, number>();
  for (const holding of ecosystem.holdings) holdingsByOrganization.set(holding.organizationId, (holdingsByOrganization.get(holding.organizationId) ?? 0) + holding.share);
  organizations = organizations.map((organization) => {
    const share = holdingsByOrganization.get(organization.id) ?? 0;
    if (share <= 0 || organization.status !== 'active') return organization;
    const operatingProfit = Math.max(0, organization.dailyRevenue - organization.dailyCosts);
    const subsidiary = ecosystem.subsidiaries.find((item) => item.organizationId === organization.id);
    const payoutRatio = subsidiary?.treasuryPolicy === 'retain' ? 0 : subsidiary?.treasuryPolicy === 'sweep' ? .55 : subsidiary ? .28 : .2;
    const payout = Math.min(Math.max(0, organization.cash) * .08, operatingProfit * payoutRatio) * (share / 100);
    dividend += payout;
    return { ...organization, cash: roundMoney(organization.cash - payout) };
  });
  if (dividend >= 1) events.push({ tone: 'market', title: 'Группа получила дивиденды', detail: `Контролируемые и миноритарные доли перечислили ${roundMoney(dividend)}.` });

  ecosystem = { ...ecosystem, organizations, assets, transactions, nextTransactionNumber };
  ecosystem = {
    ...ecosystem,
    kernel: synchronizeKernelFromTrade(
      advanceKernelDay(
        normalizeEcosystemKernel(ecosystem.kernel, {
          day,
          seedText: `${ecosystem.playerOrganizationId}:${ecosystem.organizations.length}:${ecosystem.assets.length}`,
          organizations: ecosystem.organizations,
          assets: ecosystem.assets,
          trade: ecosystem.trade,
        }),
        day,
        ecosystem.trade,
      ),
      ecosystem.trade,
      day,
    ),
  };
  const intelligenceAdvance = advanceWorldIntelligence(ecosystem, day);
  ecosystem = intelligenceAdvance.ecosystem;
  events.push(...intelligenceAdvance.events);
  return {
    ecosystem,
    playerRevenue: roundMoney(retailAdvance.revenue + dividend),
    playerUnitsSold: retailAdvance.unitsSold,
    playerOperatingCost: playerCost,
    reports: retailAdvance.reports,
    events,
  };
}

export function assetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    production: 'Производство', bar: 'Бар', shop: 'Магазин', warehouse: 'Склад', laboratory: 'Лаборатория', office: 'Офис', vacant_commercial: 'Свободный объект',
  };
  return labels[type];
}

export function organizationKindLabel(kind: OrganizationKind): string {
  const labels: Record<OrganizationKind, string> = {
    player: 'Компания игрока', producer: 'Производитель', hospitality: 'Оператор заведений', retailer: 'Ритейлер', supplier: 'Поставщик', holding: 'Холдинг',
  };
  return labels[kind];
}

function stateToRetail(state: EcosystemState): RetailState {
  return {
    ...createRetailState(),
    venues: state.assets.filter((asset) => asset.venue && asset.operatorOrganizationId === state.playerOrganizationId).map((asset) => ({ ...asset.venue!, id: asset.id })),
    reports: state.retailReports,
    nextStockNumber: state.nextRetailStockNumber,
    nextReportNumber: state.nextRetailReportNumber,
  };
}

function mergeRetailState(state: EcosystemState, retail: RetailState): EcosystemState {
  const byId = new Map(retail.venues.map((venue) => [venue.id, venue]));
  return {
    ...state,
    assets: state.assets.map((asset) => byId.has(asset.id) ? { ...asset, venue: byId.get(asset.id)!, dailyOperatingCost: byId.get(asset.id)!.dailyCost, status: byId.get(asset.id)!.status === 'open' ? 'operating' : 'closed' } : asset),
    retailReports: retail.reports,
    nextRetailStockNumber: retail.nextStockNumber,
    nextRetailReportNumber: retail.nextReportNumber,
  };
}

function createSeedVenue(id: string, type: RetailVenueType, name: string, regionId: string, day: number, seed: number): RetailVenue {
  return {
    id,
    type,
    name,
    regionId,
    openedDay: Math.max(1, day - 120 - seed * 11),
    status: 'open',
    level: 1 + (seed % 3),
    reputation: 48 + (seed * 7) % 38,
    cleanliness: 66 + (seed * 9) % 29,
    dailyCost: type === 'bar' ? 240 : 170,
    stock: [],
    totalVisitors: 1_800 + seed * 137,
    totalUnitsSold: 620 + seed * 61,
    totalRevenue: 4_800 + seed * 740,
  };
}

function createLandlordOrganizations(day: number): OrganizationState[] {
  const definitions = [
    ['org-landlord-de', 'Rhein & Süd Immobilien', 'germany', 'hesse', 'семья Крюгер', ['vacant-bavaria-1', 'vacant-hesse-1']],
    ['org-landlord-fr', 'Maison Urbaine Gestion', 'france', 'grand-est', 'группа Мартен', ['vacant-normandy-1', 'vacant-grand-est-1']],
    ['org-landlord-uk', 'Canal Street Properties', 'united-kingdom', 'somerset', 'Bennett Property Trust', ['vacant-somerset-1', 'vacant-kent-1']],
  ] as const;
  return definitions.map(([id, name, countryId, regionId, ownerLabel, assetIds], index) => ({
    id,
    name,
    kind: 'holding' as const,
    countryId,
    regionId,
    ownerLabel,
    status: 'active' as const,
    cash: 165_000 + index * 38_000,
    debt: 42_000 + index * 17_000,
    reputation: 58 + index * 7,
    strategy: 'Коммерческая недвижимость и долгосрочная аренда',
    employeeCount: 11 + index * 4,
    valuation: 310_000 + index * 72_000,
    dailyRevenue: 1_350 + index * 240,
    dailyCosts: 790 + index * 150,
    assetIds: [...assetIds],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: Math.max(1, day - 1_800 - index * 420),
  }));
}

function createVacantAssets(): WorldAssetState[] {
  const definitions = [
    ['vacant-bavaria-1', 'Старый угловой паб', 'Мюнхен', 'germany', 'bavaria', 'Schillerstraße 38', 340, 31_000, 78, 'Вечерняя аудитория, офисы и туристы'],
    ['vacant-hesse-1', 'Помещение у рынка', 'Франкфурт', 'germany', 'hesse', 'Marktgasse 11', 230, 22_000, 66, 'Семьи, рынок выходного дня, локальные жители'],
    ['vacant-normandy-1', 'Бывшее винное ателье', 'Руан', 'france', 'normandy', 'Rue Eau-de-Robec 17', 285, 28_000, 71, 'Гастрономическая публика и туристы'],
    ['vacant-grand-est-1', 'Торговый блок у канала', 'Страсбург', 'france', 'grand-est', 'Quai des Bateliers 52', 260, 25_000, 73, 'Туристы и городской средний сегмент'],
    ['vacant-somerset-1', 'Бывший музыкальный бар', 'Бристоль', 'united-kingdom', 'somerset', 'King Street 26', 315, 30_000, 82, 'Студенты, музыка, крафтовая публика'],
    ['vacant-kent-1', 'Небольшой магазин у вокзала', 'Кентербери', 'united-kingdom', 'kent', 'Station Road 8', 205, 19_000, 69, 'Туристы и ежедневный поток пассажиров'],
  ] as const;
  return definitions.map(([id, name, city, countryId, regionId, address, rent, price, footfall, audience], index) => ({
    id,
    type: 'vacant_commercial' as const,
    name,
    city,
    countryId,
    regionId,
    address,
    ownerOrganizationId: countryId === 'france' ? 'org-landlord-fr' : countryId === 'united-kingdom' ? 'org-landlord-uk' : 'org-landlord-de',
    operatorOrganizationId: null,
    status: 'vacant' as const,
    condition: 48 + (index * 8) % 38,
    capacity: 120 + index * 35,
    footfall,
    askingPrice: price,
    dailyRent: rent,
    dailyOperatingCost: 0,
    audience,
    marketOutletId: null,
    venue: null,
  }));
}

function createTransaction(state: Pick<EcosystemState, 'nextTransactionNumber'>, day: number, kind: DealKind, buyerOrganizationId: string | null, sellerOrganizationId: string | null, assetId: string | null, organizationId: string | null, amount: number, headline: string, detail: string): EcosystemTransaction {
  return { id: `transaction-${day}-${state.nextTransactionNumber}`, day, kind, buyerOrganizationId, sellerOrganizationId, assetId, organizationId, amount, headline, detail };
}

function getAsset(state: EcosystemState, assetId: string): WorldAssetState {
  const asset = state.assets.find((item) => item.id === assetId);
  if (!asset) throw new Error('Объект мира не найден');
  return asset;
}

function getOrganization(state: EcosystemState, organizationId: string): OrganizationState {
  const organization = state.organizations.find((item) => item.id === organizationId);
  if (!organization) throw new Error('Организация не найдена');
  return organization;
}

function countryIdFromLabel(label: string): string {
  const value = label.toLowerCase();
  if (value.includes('фран')) return 'france';
  if (value.includes('велик') || value.includes('британ')) return 'united-kingdom';
  return 'germany';
}

function defaultRegionForCountry(countryId: string): string {
  if (countryId === 'france') return 'normandy';
  if (countryId === 'united-kingdom') return 'somerset';
  return 'bavaria';
}

function countryForRegion(regionId: string): string {
  if (['normandy', 'grand-est'].includes(regionId)) return 'france';
  if (['somerset', 'kent'].includes(regionId)) return 'united-kingdom';
  return 'germany';
}

function cityForRegion(regionId: string): string {
  const cities: Record<string, string> = { bavaria: 'Мюнхен', hesse: 'Франкфурт', normandy: 'Руан', 'grand-est': 'Страсбург', somerset: 'Бристоль', kent: 'Кентербери' };
  return cities[regionId] ?? 'Региональный центр';
}

function npcOwner(index: number): string {
  const owners = ['семья Вебер', 'Morrow Holdings', 'группа Лефевр', 'North District Capital', 'семья Шнайдер', 'Arc & Field Partners', 'семья Беннетт', 'частный владелец'];
  return owners[index % owners.length] ?? 'частный владелец';
}

function addressFor(city: string, index: number): string {
  return `${city}, ${['Центральная', 'Рыночная', 'Портовая', 'Садовая', 'Вокзальная'][index % 5]} улица, ${8 + index * 3}`;
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
