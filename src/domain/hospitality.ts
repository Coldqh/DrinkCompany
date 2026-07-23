import type { BeverageCategoryId } from '../data/beverageCatalog';
import type { ConsumerSegmentTemplateId } from '../data/demandCatalog';
import {
  cocktailPantryCatalog,
  cocktailRecipe,
  cocktailRecipes,
  pantryDefinition,
  type CocktailIce,
  type CocktailIngredientDefinition,
  type CocktailIngredientSelector,
  type CocktailIngredientUnit,
  type CocktailRecipeDefinition,
  type ServeMethod,
} from '../data/cocktailCatalog';
import {
  hospitalityConcept,
  hospitalityConceptForAssetType,
  hospitalitySeeds,
  isHospitalityAssetType,
  type HospitalityVenueConcept,
} from '../data/hospitalityCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import {
  advanceHospitalityMarketDay,
  audienceCompetitionMultiplier,
  cocktailMarketMetrics,
  createHospitalityMarketState,
  normalizeHospitalityMarketState,
  recipeRegionalScore,
  targetSegmentForConcept,
  type HospitalityCocktailTrendState,
  type HospitalityRegionTasteState,
  type HospitalityTrendSnapshotState,
} from './hospitalityMarket';
import { calculateShelfDemand, recordConsumerPurchase, type DemandState } from './demand';
import type {
  TradeLotAllocation,
  TradeOperationState,
  TradeProductState,
  TradeShelfListingState,
  TradeState,
} from './trade';

export type HospitalityVenueStatus = 'open' | 'closed' | 'suspended';
export type HospitalityMenuKind = 'bottle' | 'glass' | 'draft' | 'shot' | 'cocktail' | 'non_alcoholic';
export type HospitalityIncidentKind = 'overcrowding' | 'service_failure' | 'stockout' | 'security' | 'spoilage';

export interface HospitalityWorkforceState {
  bartenders: number;
  servers: number;
  security: number;
  managers: number;
}

export interface HospitalityMenuIngredientState {
  productId: string | null;
  categoryId: BeverageCategoryId | null;
  pantryTag: string | null;
  amount: number;
  unit: CocktailIngredientUnit;
}

export interface HospitalityMenuItemState {
  id: string;
  venueId: string;
  name: string;
  kind: HospitalityMenuKind;
  recipeId: string | null;
  method: ServeMethod | null;
  glassware: string;
  ice: CocktailIce | null;
  garnish: string[];
  preparationSeconds: number;
  complexity: number;
  ingredients: HospitalityMenuIngredientState[];
  materialCost: number;
  salePrice: number;
  listed: boolean;
  active: boolean;
  availabilityReason: string | null;
  marketScore: number;
  trendScore: number;
  competitionPressure: number;
  recentOrders: number;
  recentRevenue: number;
  lastSoldDay: number | null;
  weakReviewCount: number;
  totalSold: number;
  totalRevenue: number;
  createdDay: number;
}

export interface HospitalityOpenContainerState {
  id: string;
  venueId: string;
  productId: string;
  sourceShelfId: string;
  sourceLotAllocations: TradeLotAllocation[];
  openedDay: number;
  expiresDay: number;
  initialMl: number;
  remainingMl: number;
  costBasis: number;
}

export interface HospitalityPantryLotState {
  id: string;
  venueId: string;
  ingredientTag: string;
  quantity: number;
  unit: CocktailIngredientUnit;
  unitCost: number;
  receivedDay: number;
  expiresDay: number;
  source: 'opening_stock' | 'restock';
}

export interface HospitalityVenueState {
  id: string;
  assetId: string;
  operatorOrganizationId: string;
  concept: HospitalityVenueConcept;
  status: HospitalityVenueStatus;
  capacity: number;
  stations: number;
  workforce: HospitalityWorkforceState;
  menuItemIds: string[];
  openContainerIds: string[];
  reputation: number;
  cleanliness: number;
  serviceQuality: number;
  securityLevel: number;
  targetSegmentId: ConsumerSegmentTemplateId;
  marketingIntensity: number;
  lastMenuReviewDay: number | null;
  menuRevisionCount: number;
  lossStreak: number;
  lastShiftProfit: number;
  closedDay: number | null;
  totalGuests: number;
  totalOrders: number;
  totalRevenue: number;
  totalWasteMl: number;
  lastShiftDay: number | null;
}

export interface HospitalityShiftItemState {
  menuItemId: string;
  orders: number;
  revenue: number;
  consumedMl: number;
  pantryConsumed: number;
  sourceLotIds: string[];
  quality: number;
}

export interface HospitalityShiftReportState {
  id: string;
  day: number;
  venueId: string;
  assetId: string;
  organizationId: string;
  guests: number;
  servedGuests: number;
  lostGuests: number;
  orders: number;
  revenue: number;
  costOfGoods: number;
  wasteMl: number;
  averageWaitMinutes: number;
  serviceUtilization: number;
  averageServeQuality: number;
  satisfaction: number;
  profit: number;
  marketingSpend: number;
  competitionMultiplier: number;
  incidentIds: string[];
  items: HospitalityShiftItemState[];
}

export interface HospitalityIncidentState {
  id: string;
  day: number;
  venueId: string;
  kind: HospitalityIncidentKind;
  severity: number;
  headline: string;
  detail: string;
  resolved: boolean;
}

export interface HospitalityState {
  hospitalityVersion: 3;
  venues: HospitalityVenueState[];
  menuItems: HospitalityMenuItemState[];
  openContainers: HospitalityOpenContainerState[];
  pantryLots: HospitalityPantryLotState[];
  shiftReports: HospitalityShiftReportState[];
  incidents: HospitalityIncidentState[];
  tasteProfiles: HospitalityRegionTasteState[];
  cocktailTrends: HospitalityCocktailTrendState[];
  trendHistory: HospitalityTrendSnapshotState[];
  nextMenuItemNumber: number;
  nextContainerNumber: number;
  nextPantryLotNumber: number;
  nextShiftNumber: number;
  nextIncidentNumber: number;
}

export interface HospitalityAdvanceResult {
  hospitality: HospitalityState;
  trade: TradeState;
  demand: DemandState;
  organizations: OrganizationState[];
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
  playerRevenue: number;
  playerOrders: number;
}

export interface HospitalityFoundation {
  organizations: OrganizationState[];
  assets: WorldAssetState[];
}

interface ConsumptionResult {
  trade: TradeState;
  openContainers: HospitalityOpenContainerState[];
  nextContainerNumber: number;
  consumedMl: number;
  cost: number;
  sourceLotIds: string[];
}

interface PantryConsumptionResult {
  pantryLots: HospitalityPantryLotState[];
  consumed: number;
  cost: number;
}

interface PantryRestockResult {
  pantryLots: HospitalityPantryLotState[];
  organizations: OrganizationState[];
  nextPantryLotNumber: number;
  spend: number;
}

export function createHospitalityFoundation(day: number): HospitalityFoundation {
  const organizations = hospitalitySeeds.map((seed, index): OrganizationState => {
    const concept = hospitalityConcept(seed.conceptId);
    return {
      id: seed.organizationId,
      name: seed.organizationName,
      kind: 'hospitality',
      countryId: seed.countryId,
      regionId: seed.regionId,
      ownerLabel: seed.ownerLabel,
      status: 'active',
      cash: 85_000 + index * 21_500,
      debt: 18_000 + (index % 4) * 11_000,
      reputation: seed.reputation,
      strategy: concept.name,
      employeeCount: concept.bartenders + concept.servers + concept.security + 2,
      valuation: Math.round(concept.askingPrice * 1.35),
      dailyRevenue: 0,
      dailyCosts: concept.dailyOperatingCost,
      assetIds: [`asset-hospitality-${seed.id}`],
      supplierOrganizationIds: [],
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, day - 640 - index * 97),
    };
  });
  const assets = hospitalitySeeds.map((seed): WorldAssetState => {
    const concept = hospitalityConcept(seed.conceptId);
    return {
      id: `asset-hospitality-${seed.id}`,
      type: seed.conceptId,
      name: seed.assetName,
      city: seed.city,
      countryId: seed.countryId,
      regionId: seed.regionId,
      address: seed.address,
      ownerOrganizationId: seed.organizationId,
      operatorOrganizationId: seed.organizationId,
      status: 'operating',
      condition: seed.condition,
      capacity: concept.capacity,
      footfall: concept.footfall,
      askingPrice: concept.askingPrice,
      dailyRent: Math.round(concept.dailyOperatingCost * .42),
      dailyOperatingCost: concept.dailyOperatingCost,
      audience: concept.audience,
      marketOutletId: null,
      venue: null,
    };
  });
  return { organizations, assets };
}

export function createHospitalityState(organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, demand: DemandState, day: number): HospitalityState {
  const venues = assets
    .filter((asset) => isHospitalityAssetType(asset.type) && asset.operatorOrganizationId)
    .map((asset, index) => createVenue(asset, organizations, day, index));
  const pantry = createInitialPantryLots(venues, day, 1);
  const market = createHospitalityMarketState(demand, assets, venues, [], organizations, day);
  const state: HospitalityState = {
    hospitalityVersion: 3,
    venues,
    menuItems: [],
    openContainers: [],
    pantryLots: pantry.pantryLots,
    shiftReports: [],
    incidents: [],
    tasteProfiles: market.tasteProfiles,
    cocktailTrends: market.cocktailTrends,
    trendHistory: market.trendHistory,
    nextMenuItemNumber: 1,
    nextContainerNumber: 1,
    nextPantryLotNumber: pantry.nextPantryLotNumber,
    nextShiftNumber: 1,
    nextIncidentNumber: 1,
  };
  return ensureHospitalityMenus(state, trade, assets, day);
}

export function ensureHospitalitySector(input: {
  state: HospitalityState | undefined;
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  trade: TradeState;
  demand: DemandState;
  day: number;
}): { hospitality: HospitalityState; organizations: OrganizationState[]; assets: WorldAssetState[]; trade: TradeState } {
  const foundation = createHospitalityFoundation(input.day);
  const organizationIds = new Set(input.organizations.map((item) => item.id));
  const assetIds = new Set(input.assets.map((item) => item.id));
  const organizations = [...input.organizations, ...foundation.organizations.filter((item) => !organizationIds.has(item.id))];
  const assets = [...input.assets, ...foundation.assets.filter((item) => !assetIds.has(item.id))];
  const trade = ensureHospitalityTrade(input.trade, organizations, assets, input.day);
  const storedVersion = (input.state as { hospitalityVersion?: number } | undefined)?.hospitalityVersion;
  const base = storedVersion === 1 || storedVersion === 2 || storedVersion === 3
    ? normalizeHospitalityState(input.state as unknown as Partial<HospitalityState>, organizations, assets, trade, input.demand, input.day)
    : createHospitalityState(organizations, assets, trade, input.demand, input.day);
  return { hospitality: ensureHospitalityMenus(base, trade, assets, input.day), organizations, assets, trade };
}

export function advanceHospitalityDay(
  state: HospitalityState,
  tradeInput: TradeState,
  demandInput: DemandState,
  organizationsInput: OrganizationState[],
  assets: WorldAssetState[],
  day: number,
): HospitalityAdvanceResult {
  let hospitality = ensureHospitalityMenus(state, tradeInput, assets, day);
  const marketAdvance = advanceHospitalityMarketDay({
    market: hospitality,
    demand: demandInput,
    assets,
    venues: hospitality.venues,
    menuItems: hospitality.menuItems,
    organizations: organizationsInput,
    day,
  });
  hospitality = {
    ...hospitality,
    tasteProfiles: marketAdvance.tasteProfiles,
    cocktailTrends: marketAdvance.cocktailTrends,
    trendHistory: marketAdvance.trendHistory,
  };
  hospitality = reviewHospitalityMenus(hospitality, tradeInput, assets, organizationsInput, day);
  hospitality = ensureHospitalityMenus(hospitality, tradeInput, assets, day);
  let trade: TradeState = {
    ...tradeInput,
    inventory: tradeInput.inventory.map((item) => ({ ...item })),
    shelves: tradeInput.shelves.map((item) => ({ ...item, lotAllocations: cloneAllocations(item.lotAllocations), soldLotAllocationsToday: [] })),
    operations: [...tradeInput.operations],
  };
  let demand = demandInput;
  let organizations = organizationsInput.map((item) => ({ ...item }));
  let openContainers = hospitality.openContainers.map((item) => ({ ...item, sourceLotAllocations: cloneAllocations(item.sourceLotAllocations) }));
  let pantryLots = hospitality.pantryLots.map((item) => ({ ...item }));
  let menuItems = hospitality.menuItems.map(cloneMenuItem);
  let venues = hospitality.venues.map((item) => ({ ...item, workforce: { ...item.workforce }, menuItemIds: [...item.menuItemIds], openContainerIds: [...item.openContainerIds] }));
  let incidents = [...hospitality.incidents];
  let nextContainerNumber = hospitality.nextContainerNumber;
  let nextPantryLotNumber = hospitality.nextPantryLotNumber;
  let nextShiftNumber = hospitality.nextShiftNumber;
  let nextIncidentNumber = hospitality.nextIncidentNumber;
  let nextOperationNumber = trade.nextOperationNumber;
  const reports: HospitalityShiftReportState[] = [];
  const events: HospitalityAdvanceResult['events'] = [...marketAdvance.events];

  for (let venueIndex = 0; venueIndex < venues.length; venueIndex += 1) {
    const venue = venues[venueIndex];
    if (!venue) continue;
    const asset = assets.find((item) => item.id === venue.assetId);
    const organizationIndex = organizations.findIndex((item) => item.id === venue.operatorOrganizationId);
    let organization = organizations[organizationIndex];
    const concept = hospitalityConcept(venue.concept);
    if (!asset || !organization || venue.status !== 'open' || asset.status !== 'operating' || !concept.openDays.includes(dayOfWeek(day))) continue;

    const containerSpoilage = removeExpiredContainers(openContainers, venue.id, day);
    openContainers = containerSpoilage.openContainers;
    let shiftWasteMl = containerSpoilage.wasteMl;
    if (containerSpoilage.wasteMl > 0) {
      const incident: HospitalityIncidentState = {
        id: `hospitality-incident-${nextIncidentNumber++}`,
        day,
        venueId: venue.id,
        kind: 'spoilage',
        severity: Math.min(100, Math.round(containerSpoilage.wasteMl / 30)),
        headline: `${asset.name}: списаны открытые бутылки`,
        detail: `${Math.round(containerSpoilage.wasteMl)} мл потеряно из-за истёкшего срока после открытия.`,
        resolved: true,
      };
      incidents = [incident, ...incidents].slice(0, 500);
    }

    const pantrySpoilage = removeExpiredPantryLots(pantryLots, venue.id, day);
    pantryLots = pantrySpoilage.pantryLots;
    if (pantrySpoilage.quantity > 0) {
      const incident: HospitalityIncidentState = {
        id: `hospitality-incident-${nextIncidentNumber++}`,
        day,
        venueId: venue.id,
        kind: 'spoilage',
        severity: Math.min(75, Math.max(5, Math.round(pantrySpoilage.cost * 4))),
        headline: `${asset.name}: испорчены ингредиенты бара`,
        detail: `Кладовая списала ${roundToOne(pantrySpoilage.quantity)} единиц на сумму ${roundMoney(pantrySpoilage.cost)}.`,
        resolved: true,
      };
      incidents = [incident, ...incidents].slice(0, 500);
    }

    const restock = restockVenuePantry(pantryLots, venue, organizations, day, nextPantryLotNumber);
    pantryLots = restock.pantryLots;
    organizations = restock.organizations;
    nextPantryLotNumber = restock.nextPantryLotNumber;
    const shiftOrganization = organizations[organizationIndex];
    if (!shiftOrganization) continue;
    organization = shiftOrganization;
    if (restock.spend > 0) {
      const pantryOperation: TradeOperationState = {
        id: `trade-operation-${day}-${nextOperationNumber++}`,
        day,
        kind: 'purchase',
        organizationId: shiftOrganization.id,
        counterpartyOrganizationId: null,
        assetId: asset.id,
        headline: `${asset.name}: пополнение кладовой`,
        detail: `Соки, сиропы, газировка и гарниши пополнены на ${roundMoney(restock.spend)}.`,
        amount: roundMoney(restock.spend),
      };
      trade.operations = [pantryOperation, ...trade.operations].slice(0, 240);
    }

    menuItems = refreshVenueMenuAvailability(menuItems, venue, trade, openContainers, pantryLots, day);
    const region = demand.regions.find((item) => item.regionId === asset.regionId);
    const trafficMultiplier = region?.today.channelTraffic[concept.channel] ?? 1;
    const weekendBoost = region?.today.weekend ? (concept.channel === 'club' ? 1.32 : 1.14) : 1;
    const deterministicNoise = deterministicFraction(`${day}:${venue.id}:guests`, .87, 1.14);
    const competitionMultiplier = audienceCompetitionMultiplier({ venue, asset, venues, assets, organizations });
    const marketingTraffic = 1 + venue.marketingIntensity * (.06 + shiftOrganization.reputation / 900);
    const guests = Math.max(0, Math.round(Math.min(venue.capacity * 1.35, (venue.capacity * concept.baseOccupancy * trafficMultiplier * weekendBoost * deterministicNoise + asset.footfall * .22) * competitionMultiplier * marketingTraffic)));
    const serviceSecondsAvailable = Math.max(900, Math.round((venue.workforce.bartenders * 15_600 + venue.workforce.servers * 2_400 + venue.stations * 3_600) * (.7 + venue.serviceQuality / 250)));
    let remainingServiceSeconds = serviceSecondsAvailable;
    menuItems = menuItems.map((item) => item.venueId === venue.id
      ? { ...item, recentOrders: roundToThree(item.recentOrders * .86), recentRevenue: roundMoney(item.recentRevenue * .86) }
      : item);
    const activeMenu = menuItems.filter((item) => item.venueId === venue.id && item.listed && item.active && item.ingredients.length > 0);
    const scored = activeMenu
      .map((item) => ({ item, score: scoreMenuItem(item, trade.products, demand, asset, shiftOrganization, venue) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.item.preparationSeconds - right.item.preparationSeconds);
    const totalScore = scored.reduce((sum, entry) => sum + entry.score, 0);
    const itemReports: HospitalityShiftItemState[] = [];
    let shiftRevenue = 0;
    let shiftCost = 0;
    let orders = 0;
    let qualityTotal = 0;

    for (const [index, entry] of scored.entries()) {
      if (orders >= guests || totalScore <= 0 || remainingServiceSeconds < 20) break;
      const remainingGuestCapacity = guests - orders;
      const desired = index === scored.length - 1
        ? remainingGuestCapacity
        : Math.min(remainingGuestCapacity, Math.max(0, Math.round(guests * (entry.score / totalScore))));
      if (desired <= 0) continue;
      const available = availableMenuPortions(entry.item, trade, openContainers, pantryLots, venue.id, day);
      const secondsPerServe = effectivePreparationSeconds(entry.item, venue);
      const timeCapacity = Math.floor(remainingServiceSeconds / Math.max(20, secondsPerServe));
      const sold = Math.min(desired, available, timeCapacity);
      if (sold <= 0) continue;
      let sourceLotIds: string[] = [];
      let consumedMl = 0;
      let pantryConsumed = 0;
      let itemCost = 0;
      let candidateTrade = trade;
      let candidateOpenContainers = openContainers;
      let candidatePantryLots = pantryLots;
      let candidateContainerNumber = nextContainerNumber;
      let fullyConsumed = true;
      for (const ingredient of entry.item.ingredients) {
        if (ingredient.productId) {
          const requiredMl = ingredient.amount * sold;
          const consumed = consumeProductMl(candidateTrade, candidateOpenContainers, venue.id, ingredient.productId, requiredMl, day, candidateContainerNumber);
          if (consumed.consumedMl + .01 < requiredMl) {
            fullyConsumed = false;
            break;
          }
          candidateTrade = consumed.trade;
          candidateOpenContainers = consumed.openContainers;
          candidateContainerNumber = consumed.nextContainerNumber;
          consumedMl += consumed.consumedMl;
          itemCost += consumed.cost;
          sourceLotIds = unique([...sourceLotIds, ...consumed.sourceLotIds]);
        } else if (ingredient.pantryTag) {
          const required = ingredient.amount * sold;
          const consumed = consumePantryIngredient(candidatePantryLots, venue.id, ingredient.pantryTag, ingredient.unit, required, day);
          if (consumed.consumed + .01 < required) {
            fullyConsumed = false;
            break;
          }
          candidatePantryLots = consumed.pantryLots;
          pantryConsumed += consumed.consumed;
          itemCost += consumed.cost;
        }
      }
      if (!fullyConsumed) continue;
      trade = candidateTrade;
      openContainers = candidateOpenContainers;
      pantryLots = candidatePantryLots;
      nextContainerNumber = candidateContainerNumber;
      const revenue = roundMoney(entry.item.salePrice * sold);
      const serveQuality = calculateMenuItemQuality(entry.item, trade.products, venue);
      orders += sold;
      shiftRevenue += revenue;
      shiftCost += itemCost;
      qualityTotal += serveQuality * sold;
      remainingServiceSeconds = Math.max(0, remainingServiceSeconds - secondsPerServe * sold);
      const menuIndex = menuItems.findIndex((item) => item.id === entry.item.id);
      if (menuIndex >= 0 && menuItems[menuIndex]) menuItems[menuIndex] = {
        ...menuItems[menuIndex],
        recentOrders: roundToThree(menuItems[menuIndex].recentOrders + sold),
        recentRevenue: roundMoney(menuItems[menuIndex].recentRevenue + revenue),
        lastSoldDay: day,
        weakReviewCount: Math.max(0, menuItems[menuIndex].weakReviewCount - 1),
        totalSold: menuItems[menuIndex].totalSold + sold,
        totalRevenue: roundMoney(menuItems[menuIndex].totalRevenue + revenue),
      };
      itemReports.push({
        menuItemId: entry.item.id,
        orders: sold,
        revenue,
        consumedMl: roundToOne(consumedMl),
        pantryConsumed: roundToOne(pantryConsumed),
        sourceLotIds,
        quality: serveQuality,
      });
    }

    const servedGuests = Math.min(guests, orders);
    const lostGuests = Math.max(0, guests - servedGuests);
    const serviceUtilization = roundToOne(clamp((serviceSecondsAvailable - remainingServiceSeconds) / Math.max(1, serviceSecondsAvailable) * 100, 0, 100));
    const averageWaitMinutes = roundToOne(Math.max(2, 2.5 + serviceUtilization * .075 + (lostGuests / Math.max(1, guests)) * 12));
    const averageServeQuality = orders > 0 ? roundToOne(qualityTotal / orders) : 0;
    let satisfaction = clamp(Math.round(58 + venue.serviceQuality * .16 + venue.cleanliness * .08 + (averageServeQuality - 55) * .22 - averageWaitMinutes * 1.05 - (lostGuests / Math.max(1, guests)) * 38), 10, 98);
    const incidentIds: string[] = [];
    if (guests > venue.capacity * 1.12 && deterministicFraction(`${day}:${venue.id}:crowd`, 0, 1) > .78) {
      const incident: HospitalityIncidentState = {
        id: `hospitality-incident-${nextIncidentNumber++}`,
        day,
        venueId: venue.id,
        kind: venue.securityLevel < 55 ? 'security' : 'overcrowding',
        severity: Math.round(clamp((guests / Math.max(1, venue.capacity)) * 45 - venue.securityLevel * .18, 10, 80)),
        headline: `${asset.name}: инцидент во время смены`,
        detail: venue.securityLevel < 55 ? 'Охране пришлось остановить конфликт в зале.' : 'Очередь и плотность гостей превысили комфортный уровень.',
        resolved: true,
      };
      incidents = [incident, ...incidents].slice(0, 500);
      incidentIds.push(incident.id);
      satisfaction = Math.max(10, satisfaction - Math.round(incident.severity * .18));
      if (incident.severity >= 45) events.push({ tone: 'warning', title: incident.headline, detail: incident.detail });
    }
    if (orders === 0 && guests > 0) {
      const incident: HospitalityIncidentState = {
        id: `hospitality-incident-${nextIncidentNumber++}`,
        day,
        venueId: venue.id,
        kind: 'stockout',
        severity: 55,
        headline: `${asset.name}: бар остался без доступного меню`,
        detail: 'Гости пришли, но склад и кладовая не позволили принять заказы.',
        resolved: false,
      };
      incidents = [incident, ...incidents].slice(0, 500);
      incidentIds.push(incident.id);
      events.push({ tone: 'warning', title: incident.headline, detail: incident.detail });
    }

    const wageAndOperations = roundMoney(asset.dailyOperatingCost * .45 + venue.workforce.bartenders * 58 + venue.workforce.servers * 41 + venue.workforce.security * 52 + venue.workforce.managers * 76);
    const marketingSpend = roundMoney(concept.dailyOperatingCost * venue.marketingIntensity * .08);
    const shiftProfit = roundMoney(shiftRevenue - shiftCost - wageAndOperations - marketingSpend);
    const nextLossStreak = shiftProfit < 0 ? venue.lossStreak + 1 : Math.max(0, venue.lossStreak - 1);
    const report: HospitalityShiftReportState = {
      id: `hospitality-shift-${nextShiftNumber++}`,
      day,
      venueId: venue.id,
      assetId: asset.id,
      organizationId: organization.id,
      guests,
      servedGuests,
      lostGuests,
      orders,
      revenue: roundMoney(shiftRevenue),
      costOfGoods: roundMoney(shiftCost),
      wasteMl: roundToOne(shiftWasteMl),
      averageWaitMinutes,
      serviceUtilization,
      averageServeQuality,
      satisfaction,
      profit: shiftProfit,
      marketingSpend,
      competitionMultiplier,
      incidentIds,
      items: itemReports,
    };
    reports.push(report);

    organizations = organizations.map((item) => item.id === shiftOrganization.id ? {
      ...item,
      cash: roundMoney(item.cash + shiftRevenue - wageAndOperations - marketingSpend),
      dailyRevenue: roundMoney(item.dailyRevenue + shiftRevenue),
      dailyCosts: roundMoney(item.dailyCosts + wageAndOperations + marketingSpend),
      status: item.id !== 'org-player' && nextLossStreak >= 6 ? 'strained' : item.status === 'strained' && nextLossStreak === 0 ? 'active' : item.status,
      reputation: clamp(item.reputation + (satisfaction >= 75 ? .12 : satisfaction < 50 ? -.22 : 0), 8, 99),
    } : item);
    const updatedOrganization = organizations[organizationIndex] ?? shiftOrganization;
    organization = updatedOrganization;
    const shouldClose = updatedOrganization.id !== 'org-player'
      && updatedOrganization.cash < -25_000;
    if (shouldClose) {
      organizations = organizations.map((item) => item.id === shiftOrganization.id ? { ...item, status: 'insolvent' } : item);
      events.push({
        tone: 'warning',
        title: `${asset.name}: заведение закрывается`,
        detail: `Убытки держались ${nextLossStreak} смен, денег на продолжение работы не осталось.`,
      });
    }

    const operation: TradeOperationState = {
      id: `trade-operation-${day}-${nextOperationNumber++}`,
      day,
      kind: 'sale',
      organizationId: shiftOrganization.id,
      counterpartyOrganizationId: null,
      assetId: asset.id,
      headline: `${asset.name}: смена завершена`,
      detail: `${servedGuests} гостей · ${orders} заказов · выручка ${roundMoney(shiftRevenue)} · качество ${averageServeQuality}.`,
      amount: roundMoney(shiftRevenue),
    };
    trade.operations = [operation, ...trade.operations].slice(0, 240);

    const dominant = itemReports.slice().sort((a, b) => b.orders - a.orders)[0];
    const dominantMenu = dominant ? menuItems.find((item) => item.id === dominant.menuItemId) : null;
    const dominantProductId = dominantMenu?.ingredients.find((ingredient) => ingredient.productId)?.productId;
    const dominantProduct = dominantProductId ? trade.products.find((product) => product.id === dominantProductId) : null;
    if (dominantProduct && orders > 0) {
      const demandResult = calculateShelfDemand(demand, {
        day,
        regionId: asset.regionId,
        assetId: asset.id,
        assetType: asset.type,
        assetFootfall: asset.footfall,
        productId: dominantProduct.id,
        beverageCategoryId: dominantProduct.beverageCategoryId ?? dominantProduct.family,
        quality: Math.round(averageServeQuality || dominantProduct.quality),
        retailPrice: dominantMenu?.salePrice ?? dominantProduct.recommendedRetailPrice,
        referencePrice: dominantProduct.recommendedRetailPrice,
        organizationReputation: organization.reputation,
      });
      demand = recordConsumerPurchase(demand, {
        day,
        regionId: asset.regionId,
        assetId: asset.id,
        productId: dominantProduct.id,
        categoryId: dominantProduct.beverageCategoryId ?? dominantProduct.family,
        channel: concept.channel,
        units: orders,
        unitPrice: roundMoney(shiftRevenue / Math.max(1, orders)),
        revenue: roundMoney(shiftRevenue),
        primarySegmentId: demandResult.primarySegmentId,
        occasion: demandResult.occasion,
      });
    }

    const nightlyCleaning = 2.5 + venue.workforce.managers * 1.4 + venue.workforce.servers * .35;
    const serviceWear = guests / 115;
    venues[venueIndex] = {
      ...venue,
      status: shouldClose ? 'closed' : venue.status,
      closedDay: shouldClose ? day : venue.closedDay,
      lossStreak: nextLossStreak,
      lastShiftProfit: shiftProfit,
      reputation: clamp(venue.reputation + (satisfaction - 65) * .015, 10, 99),
      cleanliness: clamp(venue.cleanliness + nightlyCleaning - serviceWear, 30, 100),
      serviceQuality: clamp(venue.serviceQuality + (satisfaction >= 78 ? .08 : satisfaction < 48 ? -.15 : 0), 20, 100),
      securityLevel: clamp(venue.securityLevel + (incidentIds.length === 0 ? .05 : -incidentIds.length * .2), 20, 100),
      totalGuests: venue.totalGuests + guests,
      totalOrders: venue.totalOrders + orders,
      totalRevenue: roundMoney(venue.totalRevenue + shiftRevenue),
      totalWasteMl: roundToOne(venue.totalWasteMl + shiftWasteMl),
      lastShiftDay: day,
      openContainerIds: openContainers.filter((container) => container.venueId === venue.id && container.remainingMl > 0).map((container) => container.id),
    };
  }

  menuItems = menuItems.map((item) => {
    const venue = venues.find((candidate) => candidate.id === item.venueId);
    return venue ? refreshMenuItemAvailability(item, venue, trade, openContainers, pantryLots, day) : item;
  });
  trade = { ...trade, nextOperationNumber, operations: trade.operations };
  hospitality = {
    ...hospitality,
    venues,
    menuItems,
    openContainers,
    pantryLots,
    shiftReports: [...reports, ...hospitality.shiftReports].slice(0, 1200),
    incidents,
    nextContainerNumber,
    nextPantryLotNumber,
    nextShiftNumber,
    nextIncidentNumber,
  };
  const playerReports = reports.filter((report) => report.organizationId === 'org-player');
  return {
    hospitality, trade, demand, organizations, events,
    playerRevenue: roundMoney(playerReports.reduce((sum, report) => sum + report.revenue, 0)),
    playerOrders: playerReports.reduce((sum, report) => sum + report.orders, 0),
  };
}

export function hospitalityVenueSummary(state: HospitalityState, venueId: string): { headline: string; detail: string } {
  const venue = state.venues.find((item) => item.id === venueId);
  if (!venue) return { headline: 'Нет данных', detail: 'Заведение не зарегистрировано в hospitality-секторе.' };
  const last = state.shiftReports.find((report) => report.venueId === venue.id);
  const menuCount = state.menuItems.filter((item) => item.venueId === venue.id && item.listed && item.active).length;
  return {
    headline: `${hospitalityConcept(venue.concept).name} · меню ${menuCount}`,
    detail: last ? `${last.guests} гостей · ${last.orders} заказов · удовлетворённость ${last.satisfaction}/100` : 'Смена ещё не проводилась.',
  };
}

export function hospitalityOrganizationSummary(state: HospitalityState, organizationId: string): { venues: number; guests: number; revenue: number; openContainers: number } {
  const venues = state.venues.filter((item) => item.operatorOrganizationId === organizationId);
  const venueIds = new Set(venues.map((item) => item.id));
  return {
    venues: venues.length,
    guests: venues.reduce((sum, item) => sum + item.totalGuests, 0),
    revenue: roundMoney(venues.reduce((sum, item) => sum + item.totalRevenue, 0)),
    openContainers: state.openContainers.filter((item) => venueIds.has(item.venueId) && item.remainingMl > 0).length,
  };
}

export function hospitalityConceptLabel(concept: HospitalityVenueConcept): string {
  return hospitalityConcept(concept).name;
}

function createVenue(asset: WorldAssetState, organizations: OrganizationState[], day: number, index: number): HospitalityVenueState {
  const conceptId = hospitalityConceptForAssetType(asset.type);
  const concept = hospitalityConcept(conceptId);
  const operator = organizations.find((item) => item.id === asset.operatorOrganizationId);
  return {
    id: `hospitality-venue:${asset.id}`,
    assetId: asset.id,
    operatorOrganizationId: asset.operatorOrganizationId ?? operator?.id ?? 'unknown',
    concept: conceptId,
    status: asset.status === 'operating' ? 'open' : 'closed',
    capacity: asset.capacity || concept.capacity,
    stations: concept.stations,
    workforce: { bartenders: concept.bartenders, servers: concept.servers, security: concept.security, managers: 1 },
    menuItemIds: [],
    openContainerIds: [],
    reputation: clamp((operator?.reputation ?? 55) + (index % 5), 20, 95),
    cleanliness: clamp(asset.condition + 5, 30, 100),
    serviceQuality: clamp(58 + (index * 7) % 25, 35, 92),
    securityLevel: clamp(50 + concept.security * 5, 35, 95),
    targetSegmentId: targetSegmentForConcept(conceptId),
    marketingIntensity: roundToThree(clamp(.3 + concept.priceMultiplier * .14 + (index % 4) * .05, .25, .85)),
    lastMenuReviewDay: null,
    menuRevisionCount: 0,
    lossStreak: 0,
    lastShiftProfit: 0,
    closedDay: null,
    totalGuests: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalWasteMl: 0,
    lastShiftDay: day > 1 ? day - 1 : null,
  };
}

function normalizeHospitalityState(
  state: Partial<HospitalityState>,
  organizations: OrganizationState[],
  assets: WorldAssetState[],
  trade: TradeState,
  demand: DemandState,
  day: number,
): HospitalityState {
  const existingByAsset = new Map((state.venues ?? []).map((item) => [item.assetId, item]));
  const venues = assets.filter((asset) => isHospitalityAssetType(asset.type) && asset.operatorOrganizationId).map((asset, index) => {
    const current = existingByAsset.get(asset.id);
    if (!current) return createVenue(asset, organizations, day, index);
    const operatorChanged = Boolean(asset.operatorOrganizationId && asset.operatorOrganizationId !== current.operatorOrganizationId);
    return {
      ...current,
      operatorOrganizationId: asset.operatorOrganizationId ?? current.operatorOrganizationId,
      concept: hospitalityConceptForAssetType(asset.type),
      status: operatorChanged
        ? asset.status === 'operating' ? 'open' : 'closed'
        : current.closedDay !== null && current.closedDay !== undefined ? 'closed' : asset.status === 'operating' ? 'open' : asset.status === 'closed' ? 'closed' : current.status,
      capacity: asset.capacity || current.capacity,
      workforce: { ...current.workforce },
      menuItemIds: current.menuItemIds ?? [],
      openContainerIds: current.openContainerIds ?? [],
      targetSegmentId: current.targetSegmentId ?? targetSegmentForConcept(hospitalityConceptForAssetType(asset.type)),
      marketingIntensity: current.marketingIntensity ?? .45,
      lastMenuReviewDay: operatorChanged ? null : current.lastMenuReviewDay ?? null,
      menuRevisionCount: current.menuRevisionCount ?? 0,
      lossStreak: operatorChanged ? 0 : current.lossStreak ?? 0,
      lastShiftProfit: operatorChanged ? 0 : current.lastShiftProfit ?? 0,
      closedDay: operatorChanged ? null : current.closedDay ?? null,
    };
  });
  const rawItems = (state.menuItems ?? []) as Array<Partial<HospitalityMenuItemState> & { amountMl?: number; ingredients?: Array<Partial<HospitalityMenuIngredientState> & { amountMl?: number }> }>;
  const menuItems = rawItems.map((item, index): HospitalityMenuItemState => {
    const recipe = item.recipeId ? cocktailRecipe(item.recipeId) : cocktailRecipes.find((candidate) => candidate.name === item.name);
    const ingredients = (item.ingredients ?? []).map((ingredient): HospitalityMenuIngredientState => ({
      productId: ingredient.productId ?? null,
      categoryId: ingredient.categoryId ?? null,
      pantryTag: ingredient.pantryTag ?? null,
      amount: ingredient.amount ?? (ingredient as { amountMl?: number }).amountMl ?? 0,
      unit: ingredient.unit ?? 'ml',
    }));
    return {
      id: item.id ?? `hospitality-menu-${index + 1}`,
      venueId: item.venueId ?? 'unknown',
      name: item.name ?? recipe?.name ?? 'Позиция меню',
      kind: item.kind ?? (recipe ? 'cocktail' : 'bottle'),
      recipeId: recipe?.id ?? item.recipeId ?? null,
      method: item.method ?? recipe?.method ?? null,
      glassware: item.glassware ?? recipe?.glassware ?? 'glass',
      ice: item.ice ?? recipe?.ice ?? null,
      garnish: item.garnish ?? recipe?.garnish ?? [],
      preparationSeconds: item.preparationSeconds ?? recipe?.preparationSeconds ?? 35,
      complexity: item.complexity ?? recipe?.complexity ?? 1,
      ingredients,
      materialCost: item.materialCost ?? calculateMenuMaterialCost(ingredients, trade.products),
      salePrice: item.salePrice ?? 0,
      listed: item.listed ?? true,
      active: item.active ?? true,
      availabilityReason: item.availabilityReason ?? null,
      marketScore: item.marketScore ?? 1,
      trendScore: item.trendScore ?? 1,
      competitionPressure: item.competitionPressure ?? 0,
      recentOrders: item.recentOrders ?? 0,
      recentRevenue: item.recentRevenue ?? 0,
      lastSoldDay: item.lastSoldDay ?? null,
      weakReviewCount: item.weakReviewCount ?? 0,
      totalSold: item.totalSold ?? 0,
      totalRevenue: item.totalRevenue ?? 0,
      createdDay: item.createdDay ?? day,
    };
  });
  const existingPantry = (state.pantryLots ?? []).map((item) => ({ ...item }));
  const missingPantryVenues = venues.filter((venue) => supportsCocktails(venue.concept) && !existingPantry.some((lot) => lot.venueId === venue.id));
  const pantrySeed = createInitialPantryLots(missingPantryVenues, day, state.nextPantryLotNumber ?? 1);
  const market = normalizeHospitalityMarketState(state, demand, assets, venues, menuItems, organizations, day);
  const normalized: HospitalityState = {
    hospitalityVersion: 3,
    venues,
    menuItems,
    openContainers: (state.openContainers ?? []).map((item) => ({ ...item, sourceLotAllocations: cloneAllocations(item.sourceLotAllocations) })),
    pantryLots: [...existingPantry, ...pantrySeed.pantryLots],
    shiftReports: (state.shiftReports ?? []).map((report) => ({
      ...report,
      serviceUtilization: report.serviceUtilization ?? 0,
      averageServeQuality: report.averageServeQuality ?? 0,
      profit: report.profit ?? roundMoney((report.revenue ?? 0) - (report.costOfGoods ?? 0)),
      marketingSpend: report.marketingSpend ?? 0,
      competitionMultiplier: report.competitionMultiplier ?? 1,
      items: (report.items ?? []).map((item) => ({ ...item, pantryConsumed: item.pantryConsumed ?? 0, quality: item.quality ?? 0 })),
    })),
    incidents: state.incidents ?? [],
    tasteProfiles: market.tasteProfiles,
    cocktailTrends: market.cocktailTrends,
    trendHistory: market.trendHistory,
    nextMenuItemNumber: state.nextMenuItemNumber ?? Math.max(1, menuItems.length + 1),
    nextContainerNumber: state.nextContainerNumber ?? 1,
    nextPantryLotNumber: pantrySeed.nextPantryLotNumber,
    nextShiftNumber: state.nextShiftNumber ?? 1,
    nextIncidentNumber: state.nextIncidentNumber ?? 1,
  };
  return ensureHospitalityMenus(normalized, trade, assets, day);
}

function reviewHospitalityMenus(
  state: HospitalityState,
  trade: TradeState,
  assets: WorldAssetState[],
  organizations: OrganizationState[],
  day: number,
): HospitalityState {
  let nextMenuNumber = state.nextMenuItemNumber;
  const menuItems = state.menuItems.map(cloneMenuItem);
  const venues = state.venues.map((venue) => {
    if (!supportsCocktails(venue.concept) || venue.status !== 'open') return venue;
    if (venue.lastMenuReviewDay === null) return { ...venue, lastMenuReviewDay: day };
    if (day - venue.lastMenuReviewDay < 7) return venue;
    const asset = assets.find((item) => item.id === venue.assetId);
    const organization = organizations.find((item) => item.id === venue.operatorOrganizationId);
    if (!asset || !organization) return { ...venue, lastMenuReviewDay: day };
    const concept = hospitalityConcept(venue.concept);
    const financiallyPressed = organization.status === 'strained' || organization.cash < concept.dailyOperatingCost * 12;
    const baseSlots = effectiveCocktailSlots(venue, concept.menuSlots);
    const targetSlots = Math.max(3, baseSlots - (financiallyPressed ? 2 : 0));
    const venueCocktails = menuItems.filter((item) => item.venueId === venue.id && item.kind === 'cocktail');
    let listed = venueCocktails.filter((item) => item.listed);
    const itemScore = (item: HospitalityMenuItemState): number => item.recentOrders * .08
      + item.marketScore * 2.3
      + item.trendScore * 2.8
      - item.competitionPressure * 2.1
      + Math.min(1.5, item.totalSold / 500);

    if (listed.length > targetSlots) {
      const excess = listed.slice().sort((left, right) => itemScore(left) - itemScore(right)).slice(0, listed.length - targetSlots);
      const excessIds = new Set(excess.map((item) => item.id));
      for (let index = 0; index < menuItems.length; index += 1) {
        const item = menuItems[index];
        if (!item || !excessIds.has(item.id)) continue;
        menuItems[index] = { ...item, listed: false, active: false, availabilityReason: 'Меню сокращено из-за финансового давления', weakReviewCount: item.weakReviewCount + 1 };
      }
      listed = listed.filter((item) => !excessIds.has(item.id));
    }

    const shelves = trade.shelves.filter((shelf) => shelf.assetId === venue.assetId);
    const candidates = cocktailRecipes
      .map((recipe) => {
        const ingredients = resolveCocktailIngredients(recipe.ingredients, shelves, trade.products);
        const score = cocktailFitScore(recipe, venue.concept) + recipeRegionalScore(recipe, asset.regionId, state) * 15;
        return { recipe, ingredients, score };
      })
      .filter((entry): entry is { recipe: CocktailRecipeDefinition; ingredients: HospitalityMenuIngredientState[]; score: number } => Boolean(entry.ingredients))
      .sort((left, right) => right.score - left.score || left.recipe.id.localeCompare(right.recipe.id));

    const listedRecipeIds = new Set(listed.map((item) => item.recipeId).filter((id): id is string => Boolean(id)));
    const replacementCandidates = candidates.filter((entry) => !listedRecipeIds.has(entry.recipe.id));
    const weakItems = listed.slice().sort((left, right) => itemScore(left) - itemScore(right));
    let replacements = 0;
    const maxReplacements = financiallyPressed ? 1 : 2;
    for (const weak of weakItems) {
      if (replacements >= maxReplacements || listed.length <= 3) break;
      const weakAge = day - weak.createdDay;
      const weakPerformance = weak.recentOrders < 2.5 || weak.lastSoldDay === null || day - weak.lastSoldDay >= 7;
      const candidate = replacementCandidates.shift();
      const candidateScore = candidate ? candidate.score / 6 : 0;
      if (weakAge < 7 || (!weakPerformance && candidateScore <= itemScore(weak) * 1.15)) continue;
      const weakIndex = menuItems.findIndex((item) => item.id === weak.id);
      if (weakIndex >= 0 && menuItems[weakIndex]) menuItems[weakIndex] = {
        ...menuItems[weakIndex],
        listed: false,
        active: false,
        availabilityReason: candidate ? 'Снято после анализа продаж и регионального спроса' : 'Снято после слабых продаж: доступной замены нет',
        weakReviewCount: menuItems[weakIndex].weakReviewCount + 1,
      };
      if (!candidate) {
        listed = listed.filter((item) => item.id !== weak.id);
        replacements += 1;
        continue;
      }
      const existing = menuItems.find((item) => item.venueId === venue.id && item.recipeId === candidate.recipe.id);
      const materialCost = calculateMenuMaterialCost(candidate.ingredients, trade.products);
      if (existing) {
        const existingIndex = menuItems.findIndex((item) => item.id === existing.id);
        if (existingIndex >= 0) menuItems[existingIndex] = refreshMenuItemAvailability({
          ...existing,
          listed: true,
          availabilityReason: null,
          ingredients: candidate.ingredients,
          materialCost,
          salePrice: cocktailSalePrice(materialCost, candidate.recipe, concept.priceMultiplier, trade.products, candidate.ingredients),
          weakReviewCount: Math.max(0, existing.weakReviewCount - 1),
        }, venue, trade, state.openContainers, state.pantryLots, day);
      } else {
        menuItems.push(createCocktailMenuItem(venue, candidate.recipe, candidate.ingredients, materialCost, concept.priceMultiplier, trade, state, assets, day, nextMenuNumber++));
      }
      listedRecipeIds.add(candidate.recipe.id);
      listed = listed.filter((item) => item.id !== weak.id);
      replacements += 1;
    }

    for (let index = 0; index < menuItems.length; index += 1) {
      const item = menuItems[index];
      if (!item || item.venueId !== venue.id || item.kind !== 'cocktail' || !item.listed) continue;
      const weak = item.recentOrders < 1.5 && day - item.createdDay >= 7;
      menuItems[index] = { ...item, weakReviewCount: weak ? item.weakReviewCount + 1 : Math.max(0, item.weakReviewCount - 1) };
    }

    const marketingIntensity = financiallyPressed
      ? clamp(venue.marketingIntensity - .04, .18, .9)
      : venue.lastShiftProfit > 0 ? clamp(venue.marketingIntensity + .015, .18, .9) : venue.marketingIntensity;
    return {
      ...venue,
      marketingIntensity: roundToThree(marketingIntensity),
      lastMenuReviewDay: day,
      menuRevisionCount: venue.menuRevisionCount + replacements + Math.max(0, venueCocktails.filter((item) => item.listed).length - targetSlots),
    };
  });
  return { ...state, venues, menuItems, nextMenuItemNumber: nextMenuNumber };
}

function effectiveCocktailSlots(venue: HospitalityVenueState, menuSlots: number): number {
  const base = Math.max(5, Math.floor(menuSlots * .58));
  if (venue.lossStreak >= 12) return Math.max(3, base - 4);
  if (venue.lossStreak >= 6) return Math.max(3, base - 2);
  return base;
}

function ensureHospitalityMenus(state: HospitalityState, trade: TradeState, assets: WorldAssetState[], day: number): HospitalityState {
  let nextMenuNumber = state.nextMenuItemNumber;
  const menuItems = state.menuItems.map(cloneMenuItem);
  const venues = state.venues.map((venue) => {
    const concept = hospitalityConcept(venue.concept);
    const asset = assets.find((item) => item.id === venue.assetId);
    const shelves = trade.shelves.filter((shelf) => shelf.assetId === venue.assetId);
    const venueItems = menuItems.filter((item) => item.venueId === venue.id);
    const cocktailSlots = supportsCocktails(venue.concept) ? effectiveCocktailSlots(venue, concept.menuSlots) : 0;
    const directSlots = Math.max(1, concept.menuSlots - Math.max(0, cocktailSlots));
    const directItems = venueItems.filter((item) => item.kind !== 'cocktail' && item.listed);
    const representedProductIds = new Set(directItems.flatMap((item) => item.ingredients.map((ingredient) => ingredient.productId).filter((id): id is string => Boolean(id))));
    const rankedShelves = shelves.slice().sort((left, right) => {
      const leftProduct = trade.products.find((item) => item.id === left.productId);
      const rightProduct = trade.products.find((item) => item.id === right.productId);
      return (rightProduct ? categoryRank(rightProduct, concept.preferredCategories) : 0) - (leftProduct ? categoryRank(leftProduct, concept.preferredCategories) : 0)
        || (rightProduct?.quality ?? 0) - (leftProduct?.quality ?? 0);
    });
    for (const shelf of rankedShelves) {
      const product = trade.products.find((item) => item.id === shelf.productId);
      if (!product || representedProductIds.has(product.id) || directItems.length >= directSlots) continue;
      const item = createProductMenuItem(venue.id, product, concept.priceMultiplier, day, nextMenuNumber++);
      menuItems.push(item);
      directItems.push(item);
      representedProductIds.add(product.id);
    }

    if (cocktailSlots > 0 && asset) {
      const recipes = cocktailRecipes.slice().sort((left, right) => {
        const leftScore = cocktailFitScore(left, venue.concept) + recipeRegionalScore(left, asset.regionId, state) * 12;
        const rightScore = cocktailFitScore(right, venue.concept) + recipeRegionalScore(right, asset.regionId, state) * 12;
        return rightScore - leftScore || left.id.localeCompare(right.id);
      });
      const existingByRecipe = new Map(menuItems.filter((item) => item.venueId === venue.id && item.recipeId).map((item) => [item.recipeId!, item]));
      let listedCocktailCount = menuItems.filter((item) => item.venueId === venue.id && item.kind === 'cocktail' && item.listed).length;
      const initialBuild = venue.lastMenuReviewDay === null && venue.menuRevisionCount === 0;
      for (const recipe of recipes) {
        const existing = existingByRecipe.get(recipe.id);
        const ingredients = resolveCocktailIngredients(recipe.ingredients, shelves, trade.products);
        if (!ingredients) continue;
        const materialCost = calculateMenuMaterialCost(ingredients, trade.products);
        const metrics = cocktailMarketMetrics({ recipeId: recipe.id, venue, asset, market: state, menuItems, assets });
        if (existing) {
          const index = menuItems.findIndex((item) => item.id === existing.id);
          if (index >= 0) menuItems[index] = refreshMenuItemAvailability({
            ...existing,
            name: recipe.name,
            recipeId: recipe.id,
            method: recipe.method,
            glassware: recipe.glassware,
            ice: recipe.ice,
            garnish: [...recipe.garnish],
            preparationSeconds: recipe.preparationSeconds,
            complexity: recipe.complexity,
            ingredients,
            materialCost,
            salePrice: cocktailSalePrice(materialCost, recipe, concept.priceMultiplier, trade.products, ingredients),
            ...metrics,
          }, venue, trade, state.openContainers, state.pantryLots, day);
          continue;
        }
        if (!initialBuild || listedCocktailCount >= cocktailSlots) continue;
        const item = createCocktailMenuItem(venue, recipe, ingredients, materialCost, concept.priceMultiplier, trade, state, assets, day, nextMenuNumber++);
        menuItems.push(refreshMenuItemAvailability(item, venue, trade, state.openContainers, state.pantryLots, day));
        listedCocktailCount += 1;
      }
    }

    const ids = menuItems.filter((item) => item.venueId === venue.id).map((item) => item.id);
    return { ...venue, menuItemIds: ids };
  });
  const refreshed = menuItems.map((item) => {
    const venue = venues.find((candidate) => candidate.id === item.venueId);
    const asset = venue ? assets.find((candidate) => candidate.id === venue.assetId) : undefined;
    if (!venue) return item;
    const metrics = item.recipeId && asset
      ? cocktailMarketMetrics({ recipeId: item.recipeId, venue, asset, market: state, menuItems, assets })
      : { marketScore: item.marketScore, trendScore: item.trendScore, competitionPressure: item.competitionPressure };
    return refreshMenuItemAvailability({ ...item, ...metrics }, venue, trade, state.openContainers, state.pantryLots, day);
  });
  return { ...state, venues, menuItems: refreshed, nextMenuItemNumber: nextMenuNumber };
}

function createCocktailMenuItem(
  venue: HospitalityVenueState,
  recipe: CocktailRecipeDefinition,
  ingredients: HospitalityMenuIngredientState[],
  materialCost: number,
  priceMultiplier: number,
  trade: TradeState,
  market: HospitalityState,
  assets: WorldAssetState[],
  day: number,
  number: number,
): HospitalityMenuItemState {
  const asset = assets.find((item) => item.id === venue.assetId);
  const metrics = asset
    ? cocktailMarketMetrics({ recipeId: recipe.id, venue, asset, market, menuItems: market.menuItems, assets })
    : { marketScore: 1, trendScore: 1, competitionPressure: 0 };
  return {
    id: `hospitality-menu-${number}`,
    venueId: venue.id,
    name: recipe.name,
    kind: 'cocktail',
    recipeId: recipe.id,
    method: recipe.method,
    glassware: recipe.glassware,
    ice: recipe.ice,
    garnish: [...recipe.garnish],
    preparationSeconds: recipe.preparationSeconds,
    complexity: recipe.complexity,
    ingredients,
    materialCost,
    salePrice: cocktailSalePrice(materialCost, recipe, priceMultiplier, trade.products, ingredients),
    listed: true,
    active: true,
    availabilityReason: null,
    ...metrics,
    recentOrders: 0,
    recentRevenue: 0,
    lastSoldDay: null,
    weakReviewCount: 0,
    totalSold: 0,
    totalRevenue: 0,
    createdDay: day,
  };
}

function ensureHospitalityTrade(tradeInput: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): TradeState {
  const trade: TradeState = {
    ...tradeInput,
    inventory: tradeInput.inventory.map((item) => ({ ...item })),
    contracts: tradeInput.contracts.map((item) => ({ ...item })),
    shelves: tradeInput.shelves.map((item) => ({ ...item, lotAllocations: cloneAllocations(item.lotAllocations) })),
  };
  const distributorOrganizations = organizations.filter((item) => item.kind === 'distributor');
  const hospitalityAssets = assets.filter((asset) => isHospitalityAssetType(asset.type) && asset.operatorOrganizationId);
  for (const [assetIndex, asset] of hospitalityAssets.entries()) {
    const existingProducts = new Set(trade.shelves.filter((item) => item.assetId === asset.id).map((item) => item.productId));
    const concept = hospitalityConcept(hospitalityConceptForAssetType(asset.type));
    const preferred = trade.products
      .slice()
      .sort((left, right) => categoryRank(right, concept.preferredCategories) - categoryRank(left, concept.preferredCategories) || right.quality - left.quality)
      .slice(0, Math.min(concept.menuSlots >= 20 ? 9 : 6, trade.products.length));
    for (const [productIndex, product] of preferred.entries()) {
      if (existingProducts.has(product.id)) continue;
      const distributor = distributorOrganizations.find((item) => item.countryId === asset.countryId) ?? distributorOrganizations[assetIndex % Math.max(1, distributorOrganizations.length)];
      const distributorAsset = distributor
        ? assets.find((candidate) => candidate.operatorOrganizationId === distributor.id && candidate.status === 'operating')
        : undefined;
      if (distributor && distributorAsset && !trade.contracts.some((contract) =>
        contract.sellerOrganizationId === product.producerOrganizationId
        && contract.buyerOrganizationId === distributor.id
        && contract.commodityKind === 'product'
        && contract.commodityId === product.id
        && contract.status !== 'broken'
      )) {
        trade.contracts.push({
          id: `trade-contract-${trade.nextContractNumber++}`,
          sellerOrganizationId: product.producerOrganizationId,
          buyerOrganizationId: distributor.id,
          sellerAssetId: assets.find((candidate) => candidate.operatorOrganizationId === product.producerOrganizationId && candidate.status === 'operating')?.id ?? null,
          buyerAssetId: distributorAsset.id,
          commodityKind: 'product',
          commodityId: product.id,
          quantity: 120 + (productIndex % 4) * 36,
          unitPrice: product.wholesalePrice,
          intervalDays: 7 + (productIndex % 3),
          nextDeliveryDay: day + 1 + (productIndex % 2),
          status: 'active',
          failures: 0,
          lastResult: 'Дистрибьютор формирует региональный запас',
        });
      }
      const sellerOrganizationId = distributor?.id ?? product.producerOrganizationId;
      const units = 36 + ((assetIndex + productIndex) % 4) * 12;
      const seedLotId = `hospitality-seed-lot:${asset.id}:${product.id}`;
      trade.shelves.push({
        id: `trade-shelf-${trade.nextShelfNumber++}`,
        assetId: asset.id,
        productId: product.id,
        supplierOrganizationId: sellerOrganizationId,
        units,
        retailPrice: roundMoney(product.recommendedRetailPrice * concept.priceMultiplier),
        unitsSoldToday: 0,
        revenueToday: 0,
        totalUnitsSold: 0,
        lastRestockDay: day,
        stockoutDays: 0,
        lotAllocations: [{ lotId: seedLotId, quantity: units }],
        soldLotAllocationsToday: [],
      });
      if (!trade.inventory.some((item) => item.id === seedLotId)) trade.inventory.push({
        id: seedLotId,
        organizationId: asset.operatorOrganizationId ?? sellerOrganizationId,
        commodityKind: 'product',
        commodityId: product.id,
        quantity: units,
        unit: product.packageVolumeLiters >= 10 ? 'keg' : 'bottle',
        quality: product.quality,
        unitCost: product.unitCost,
        originOrganizationId: product.producerOrganizationId,
        receivedDay: day,
        expiresDay: day + shelfLifeAfterDelivery(product),
        status: 'available',
        sourceLotIds: [],
        productionBatchId: null,
        lotCode: `HOSP-${assetIndex + 1}-${productIndex + 1}`,
      });
      if (!trade.contracts.some((contract) => contract.buyerAssetId === asset.id && contract.commodityId === product.id && contract.status !== 'broken')) trade.contracts.push({
        id: `trade-contract-${trade.nextContractNumber++}`,
        sellerOrganizationId,
        buyerOrganizationId: asset.operatorOrganizationId ?? sellerOrganizationId,
        sellerAssetId: assets.find((candidate) => candidate.operatorOrganizationId === sellerOrganizationId && candidate.status === 'operating')?.id ?? null,
        buyerAssetId: asset.id,
        commodityKind: 'product',
        commodityId: product.id,
        quantity: 30 + (productIndex % 4) * 12,
        unitPrice: product.wholesalePrice,
        intervalDays: 4 + (productIndex % 4),
        nextDeliveryDay: day + 2 + (productIndex % 3),
        status: 'active',
        failures: 0,
        lastResult: 'Заведение получает ассортимент',
      });
      existingProducts.add(product.id);
    }
  }
  return trade;
}

function createProductMenuItem(venueId: string, product: TradeProductState, priceMultiplier: number, day: number, number: number): HospitalityMenuItemState {
  const category = product.beverageCategoryId ?? product.family;
  const kind = menuKindForProduct(product);
  const amount = servingMl(kind, product.packageVolumeLiters);
  const unitCost = product.unitCost * amount / Math.max(1, product.packageVolumeLiters * 1000);
  const basePrice = kind === 'bottle' || kind === 'non_alcoholic'
    ? product.recommendedRetailPrice
    : Math.max(2.8, unitCost * (kind === 'draft' ? 3.1 : 4.1));
  return {
    id: `hospitality-menu-${number}`,
    venueId,
    name: serviceName(product, kind),
    kind,
    recipeId: null,
    method: null,
    glassware: glasswareForKind(kind),
    ice: kind === 'shot' || kind === 'bottle' ? 'none' : null,
    garnish: [],
    preparationSeconds: kind === 'draft' ? 35 : kind === 'glass' ? 28 : kind === 'shot' ? 20 : 25,
    complexity: 1,
    ingredients: [{ productId: product.id, categoryId: category, pantryTag: null, amount, unit: 'ml' }],
    materialCost: roundMoney(unitCost),
    salePrice: roundMoney(basePrice * priceMultiplier),
    listed: true,
    active: true,
    availabilityReason: null,
    marketScore: 1,
    trendScore: 1,
    competitionPressure: 0,
    recentOrders: 0,
    recentRevenue: 0,
    lastSoldDay: null,
    weakReviewCount: 0,
    totalSold: 0,
    totalRevenue: 0,
    createdDay: day,
  };
}

function resolveCocktailIngredients(
  definitions: CocktailIngredientDefinition[],
  shelves: TradeShelfListingState[],
  products: TradeProductState[],
): HospitalityMenuIngredientState[] | null {
  const result: HospitalityMenuIngredientState[] = [];
  for (const definition of definitions) {
    const selectors: CocktailIngredientSelector[] = [definition, ...(definition.alternatives ?? [])];
    let resolved: HospitalityMenuIngredientState | null = null;
    for (const selector of selectors) {
      if (selector.productId) {
        const product = products.find((item) => item.id === selector.productId);
        if (product && shelves.some((shelf) => shelf.productId === product.id && shelf.units > 0)) {
          resolved = { productId: product.id, categoryId: product.beverageCategoryId ?? product.family, pantryTag: null, amount: definition.amount, unit: 'ml' };
          break;
        }
      }
      if (selector.categoryId) {
        const candidates = products.filter((item) => (item.beverageCategoryId ?? item.family) === selector.categoryId && shelves.some((shelf) => shelf.productId === item.id && shelf.units > 0));
        const product = candidates.sort((left, right) => {
          const leftUnits = shelves.filter((shelf) => shelf.productId === left.id).reduce((sum, shelf) => sum + shelf.units, 0);
          const rightUnits = shelves.filter((shelf) => shelf.productId === right.id).reduce((sum, shelf) => sum + shelf.units, 0);
          return Number(rightUnits > 0) - Number(leftUnits > 0) || right.quality - left.quality || left.unitCost - right.unitCost;
        })[0];
        if (product) {
          resolved = { productId: product.id, categoryId: selector.categoryId, pantryTag: null, amount: definition.amount, unit: 'ml' };
          break;
        }
      }
      if (selector.pantryTag && pantryDefinition(selector.pantryTag)) {
        resolved = { productId: null, categoryId: null, pantryTag: selector.pantryTag, amount: definition.amount, unit: definition.unit };
        break;
      }
    }
    if (!resolved && !definition.optional) return null;
    if (resolved) result.push(resolved);
  }
  return result.length ? result : null;
}

function scoreMenuItem(
  item: HospitalityMenuItemState,
  products: TradeProductState[],
  demand: DemandState,
  asset: WorldAssetState,
  organization: OrganizationState,
  venue: HospitalityVenueState,
): number {
  const product = products.find((candidate) => candidate.id === item.ingredients.find((ingredient) => ingredient.productId)?.productId);
  if (!product) return item.kind === 'cocktail' ? .12 : .05;
  const quality = calculateMenuItemQuality(item, products, venue);
  const result = calculateShelfDemand(demand, {
    day: demand.currentDay,
    regionId: asset.regionId,
    assetId: asset.id,
    assetType: asset.type,
    assetFootfall: asset.footfall,
    productId: product.id,
    beverageCategoryId: product.beverageCategoryId ?? product.family,
    quality,
    retailPrice: item.salePrice,
    referencePrice: Math.max(product.recommendedRetailPrice, item.materialCost * 3.2, item.salePrice * .58),
    organizationReputation: organization.reputation,
  });
  const concept = hospitalityConcept(venue.concept);
  const preferred = concept.preferredCategories.includes(product.beverageCategoryId ?? product.family) ? 1.28 : .86;
  const cocktailBonus = item.kind === 'cocktail'
    ? venue.concept === 'cocktail_bar' ? 1.58 : venue.concept === 'lounge' || venue.concept === 'hotel_bar' ? 1.34 : venue.concept === 'nightclub' ? 1.18 : .92
    : 1;
  const complexityFit = item.kind === 'cocktail' && venue.concept === 'nightclub' ? clamp(1.22 - item.complexity * .07, .78, 1.15) : 1;
  const marketFit = item.kind === 'cocktail' ? clamp(.58 + item.marketScore * .48, .55, 1.45) : 1;
  const trendFit = item.kind === 'cocktail' ? clamp(.68 + item.trendScore * .34, .55, 1.5) : 1;
  const competitionFit = item.kind === 'cocktail' ? clamp(1.08 - item.competitionPressure * .34, .52, 1.08) : 1;
  const promotionFit = 1 + venue.marketingIntensity * .08;
  return Math.max(.05, result.demandIndex * preferred * cocktailBonus * complexityFit * marketFit * trendFit * competitionFit * promotionFit * (.72 + quality / 175));
}

function availableMenuPortions(
  item: HospitalityMenuItemState,
  trade: TradeState,
  openContainers: HospitalityOpenContainerState[],
  pantryLots: HospitalityPantryLotState[],
  venueId: string,
  day: number,
): number {
  let available = Number.POSITIVE_INFINITY;
  for (const ingredient of item.ingredients) {
    if (ingredient.productId) {
      const product = trade.products.find((candidate) => candidate.id === ingredient.productId);
      if (!product || ingredient.unit !== 'ml') return 0;
      const openMl = openContainers.filter((container) => container.venueId === venueId && container.productId === product.id && container.expiresDay >= day).reduce((sum, container) => sum + container.remainingMl, 0);
      const shelfUnits = trade.shelves.filter((shelf) => shelf.assetId === venueId.replace('hospitality-venue:', '') && shelf.productId === product.id).reduce((sum, shelf) => sum + shelf.units, 0);
      const totalMl = openMl + shelfUnits * product.packageVolumeLiters * 1000;
      available = Math.min(available, Math.floor(totalMl / Math.max(.01, ingredient.amount)));
      continue;
    }
    if (ingredient.pantryTag) {
      const total = pantryLots
        .filter((lot) => lot.venueId === venueId && lot.ingredientTag === ingredient.pantryTag && lot.unit === ingredient.unit && lot.expiresDay >= day)
        .reduce((sum, lot) => sum + lot.quantity, 0);
      available = Math.min(available, Math.floor(total / Math.max(.01, ingredient.amount)));
    }
  }
  return Number.isFinite(available) ? Math.max(0, available) : 0;
}

function consumeProductMl(
  tradeInput: TradeState,
  openInput: HospitalityOpenContainerState[],
  venueId: string,
  productId: string,
  requestedMl: number,
  day: number,
  startContainerNumber: number,
): ConsumptionResult {
  const assetId = venueId.replace('hospitality-venue:', '');
  const product = tradeInput.products.find((item) => item.id === productId);
  if (!product || requestedMl <= 0) return { trade: tradeInput, openContainers: openInput, nextContainerNumber: startContainerNumber, consumedMl: 0, cost: 0, sourceLotIds: [] };
  const trade: TradeState = { ...tradeInput, inventory: tradeInput.inventory.map((item) => ({ ...item })), shelves: tradeInput.shelves.map((item) => ({ ...item, lotAllocations: cloneAllocations(item.lotAllocations), soldLotAllocationsToday: cloneAllocations(item.soldLotAllocationsToday) })) };
  const openContainers = openInput.map((item) => ({ ...item, sourceLotAllocations: cloneAllocations(item.sourceLotAllocations) }));
  let nextContainerNumber = startContainerNumber;
  let remaining = requestedMl;
  let consumedMl = 0;
  let cost = 0;
  const sourceLotIds: string[] = [];

  const consumeOpen = () => {
    for (let index = 0; index < openContainers.length && remaining > .01; index += 1) {
      const container = openContainers[index];
      if (!container || container.venueId !== venueId || container.productId !== productId || container.remainingMl <= 0) continue;
      const taken = Math.min(container.remainingMl, remaining);
      openContainers[index] = { ...container, remainingMl: roundToOne(container.remainingMl - taken) };
      remaining -= taken;
      consumedMl += taken;
      cost += container.costBasis * (taken / Math.max(1, container.initialMl));
      sourceLotIds.push(...container.sourceLotAllocations.map((allocation) => allocation.lotId));
    }
  };

  consumeOpen();
  while (remaining > .01) {
    const shelfIndex = trade.shelves.findIndex((shelf) => shelf.assetId === assetId && shelf.productId === productId && shelf.units > 0);
    if (shelfIndex < 0) break;
    const shelf = trade.shelves[shelfIndex];
    if (!shelf) break;
    const takenAllocation = consumePackageAllocation(shelf.lotAllocations ?? []);
    trade.shelves[shelfIndex] = {
      ...shelf,
      units: Math.max(0, shelf.units - 1),
      lotAllocations: takenAllocation.remaining,
      soldLotAllocationsToday: mergeAllocations(shelf.soldLotAllocationsToday ?? [], takenAllocation.taken),
    };
    const consumedByLot = new Map(takenAllocation.taken.map((allocation) => [allocation.lotId, allocation.quantity]));
    trade.inventory = trade.inventory.map((lot) => consumedByLot.has(lot.id) ? { ...lot, quantity: Math.max(0, lot.quantity - (consumedByLot.get(lot.id) ?? 0)) } : lot);
    const initialMl = Math.max(50, product.packageVolumeLiters * 1000);
    const container: HospitalityOpenContainerState = {
      id: `hospitality-container-${nextContainerNumber++}`,
      venueId,
      productId,
      sourceShelfId: shelf.id,
      sourceLotAllocations: takenAllocation.taken,
      openedDay: day,
      expiresDay: day + openLifeDays(product),
      initialMl,
      remainingMl: initialMl,
      costBasis: product.unitCost,
    };
    openContainers.push(container);
    consumeOpen();
  }

  return {
    trade,
    openContainers: openContainers.filter((container) => container.remainingMl > .01),
    nextContainerNumber,
    consumedMl: roundToOne(consumedMl),
    cost: roundMoney(cost),
    sourceLotIds: unique(sourceLotIds),
  };
}

function createInitialPantryLots(
  venues: HospitalityVenueState[],
  day: number,
  startNumber: number,
): { pantryLots: HospitalityPantryLotState[]; nextPantryLotNumber: number } {
  let nextPantryLotNumber = startNumber;
  const pantryLots: HospitalityPantryLotState[] = [];
  for (const venue of venues.filter((item) => supportsCocktails(item.concept))) {
    const scale = clamp(venue.capacity / 140, .65, 1.8);
    for (const definition of cocktailPantryCatalog) {
      pantryLots.push({
        id: `hospitality-pantry-${nextPantryLotNumber++}`,
        venueId: venue.id,
        ingredientTag: definition.tag,
        quantity: roundToOne(definition.openingStock * scale),
        unit: definition.unit,
        unitCost: definition.unitCost,
        receivedDay: day,
        expiresDay: day + definition.shelfLifeDays,
        source: 'opening_stock',
      });
    }
  }
  return { pantryLots, nextPantryLotNumber };
}

function restockVenuePantry(
  pantryInput: HospitalityPantryLotState[],
  venue: HospitalityVenueState,
  organizationsInput: OrganizationState[],
  day: number,
  startNumber: number,
): PantryRestockResult {
  if (!supportsCocktails(venue.concept)) return { pantryLots: pantryInput, organizations: organizationsInput, nextPantryLotNumber: startNumber, spend: 0 };
  const pantryLots = pantryInput.map((item) => ({ ...item }));
  const organizations = organizationsInput.map((item) => ({ ...item }));
  const organizationIndex = organizations.findIndex((item) => item.id === venue.operatorOrganizationId);
  const organization = organizations[organizationIndex];
  if (!organization || organization.cash <= 0) return { pantryLots, organizations, nextPantryLotNumber: startNumber, spend: 0 };
  let nextPantryLotNumber = startNumber;
  let spend = 0;
  let availableCash = organization.cash;
  const scale = clamp(venue.capacity / 140, .65, 1.8);
  for (const definition of cocktailPantryCatalog) {
    const current = pantryLots
      .filter((lot) => lot.venueId === venue.id && lot.ingredientTag === definition.tag && lot.unit === definition.unit && lot.expiresDay >= day)
      .reduce((sum, lot) => sum + lot.quantity, 0);
    const reorderPoint = definition.reorderPoint * scale;
    if (current > reorderPoint) continue;
    const requested = Math.max(0, definition.targetStock * scale - current);
    const affordable = definition.unitCost > 0 ? availableCash / definition.unitCost : requested;
    const quantity = roundToOne(Math.min(requested, affordable));
    if (quantity <= 0) continue;
    const cost = roundMoney(quantity * definition.unitCost);
    pantryLots.push({
      id: `hospitality-pantry-${nextPantryLotNumber++}`,
      venueId: venue.id,
      ingredientTag: definition.tag,
      quantity,
      unit: definition.unit,
      unitCost: definition.unitCost,
      receivedDay: day,
      expiresDay: day + definition.shelfLifeDays,
      source: 'restock',
    });
    spend += cost;
    availableCash = Math.max(0, availableCash - cost);
  }
  organizations[organizationIndex] = {
    ...organization,
    cash: roundMoney(organization.cash - spend),
    dailyCosts: roundMoney(organization.dailyCosts + spend),
  };
  return { pantryLots, organizations, nextPantryLotNumber, spend: roundMoney(spend) };
}

function removeExpiredPantryLots(
  pantryLots: HospitalityPantryLotState[],
  venueId: string,
  day: number,
): { pantryLots: HospitalityPantryLotState[]; quantity: number; cost: number } {
  let quantity = 0;
  let cost = 0;
  const next = pantryLots.filter((lot) => {
    if (lot.venueId !== venueId || lot.expiresDay >= day || lot.quantity <= 0) return lot.quantity > .01;
    quantity += lot.quantity;
    cost += lot.quantity * lot.unitCost;
    return false;
  });
  return { pantryLots: next, quantity: roundToOne(quantity), cost: roundMoney(cost) };
}

function consumePantryIngredient(
  pantryInput: HospitalityPantryLotState[],
  venueId: string,
  ingredientTag: string,
  unit: CocktailIngredientUnit,
  requested: number,
  day: number,
): PantryConsumptionResult {
  if (requested <= 0) return { pantryLots: pantryInput, consumed: 0, cost: 0 };
  const pantryLots = pantryInput.map((item) => ({ ...item }));
  const indices = pantryLots
    .map((lot, index) => ({ lot, index }))
    .filter(({ lot }) => lot.venueId === venueId && lot.ingredientTag === ingredientTag && lot.unit === unit && lot.expiresDay >= day && lot.quantity > .01)
    .sort((left, right) => left.lot.expiresDay - right.lot.expiresDay || left.lot.receivedDay - right.lot.receivedDay)
    .map((item) => item.index);
  let remaining = requested;
  let consumed = 0;
  let cost = 0;
  for (const index of indices) {
    if (remaining <= .01) break;
    const lot = pantryLots[index];
    if (!lot) continue;
    const taken = Math.min(lot.quantity, remaining);
    pantryLots[index] = { ...lot, quantity: roundToOne(lot.quantity - taken) };
    remaining -= taken;
    consumed += taken;
    cost += taken * lot.unitCost;
  }
  return {
    pantryLots: pantryLots.filter((lot) => lot.quantity > .01),
    consumed: roundToOne(consumed),
    cost: roundMoney(cost),
  };
}

function refreshVenueMenuAvailability(
  menuItems: HospitalityMenuItemState[],
  venue: HospitalityVenueState,
  trade: TradeState,
  openContainers: HospitalityOpenContainerState[],
  pantryLots: HospitalityPantryLotState[],
  day: number,
): HospitalityMenuItemState[] {
  return menuItems.map((item) => item.venueId === venue.id ? refreshMenuItemAvailability(item, venue, trade, openContainers, pantryLots, day) : item);
}

function refreshMenuItemAvailability(
  item: HospitalityMenuItemState,
  venue: HospitalityVenueState,
  trade: TradeState,
  openContainers: HospitalityOpenContainerState[],
  pantryLots: HospitalityPantryLotState[],
  day: number,
): HospitalityMenuItemState {
  const portions = item.listed ? availableMenuPortions(item, trade, openContainers, pantryLots, venue.id, day) : 0;
  return {
    ...cloneMenuItem(item),
    active: item.listed && portions > 0,
    availabilityReason: !item.listed ? item.availabilityReason ?? 'Снято после анализа меню' : portions > 0 ? null : menuAvailabilityReason(item, trade, openContainers, pantryLots, venue.id, day),
  };
}

function menuAvailabilityReason(
  item: HospitalityMenuItemState,
  trade: TradeState,
  openContainers: HospitalityOpenContainerState[],
  pantryLots: HospitalityPantryLotState[],
  venueId: string,
  day: number,
): string {
  for (const ingredient of item.ingredients) {
    if (ingredient.productId) {
      const product = trade.products.find((candidate) => candidate.id === ingredient.productId);
      if (!product) return 'Неизвестный товар';
      const openMl = openContainers.filter((container) => container.venueId === venueId && container.productId === product.id && container.expiresDay >= day).reduce((sum, container) => sum + container.remainingMl, 0);
      const shelfUnits = trade.shelves.filter((shelf) => shelf.assetId === venueId.replace('hospitality-venue:', '') && shelf.productId === product.id).reduce((sum, shelf) => sum + shelf.units, 0);
      if (openMl + shelfUnits * product.packageVolumeLiters * 1000 < ingredient.amount) return `Нет товара: ${product.name}`;
    }
    if (ingredient.pantryTag) {
      const total = pantryLots.filter((lot) => lot.venueId === venueId && lot.ingredientTag === ingredient.pantryTag && lot.unit === ingredient.unit && lot.expiresDay >= day).reduce((sum, lot) => sum + lot.quantity, 0);
      if (total < ingredient.amount) return `Нет ингредиента: ${pantryDefinition(ingredient.pantryTag)?.name ?? ingredient.pantryTag}`;
    }
  }
  return 'Недостаточно ингредиентов';
}

function calculateMenuMaterialCost(ingredients: HospitalityMenuIngredientState[], products: TradeProductState[]): number {
  return roundMoney(ingredients.reduce((sum, ingredient) => {
    if (ingredient.productId) {
      const product = products.find((item) => item.id === ingredient.productId);
      return sum + (product ? product.unitCost * ingredient.amount / Math.max(1, product.packageVolumeLiters * 1000) : 0);
    }
    if (ingredient.pantryTag) return sum + ingredient.amount * (pantryDefinition(ingredient.pantryTag)?.unitCost ?? 0);
    return sum;
  }, 0));
}

function cocktailSalePrice(
  materialCost: number,
  recipe: CocktailRecipeDefinition,
  priceMultiplier: number,
  products: TradeProductState[],
  ingredients: HospitalityMenuIngredientState[],
): number {
  const quality = weightedProductQuality(ingredients, products);
  const laborFloor = 6.5 + recipe.complexity * 1.15 + recipe.preparationSeconds / 95;
  const qualityPremium = .9 + quality / 220;
  return roundMoney(Math.max(laborFloor, materialCost * (3.5 + recipe.complexity * .28)) * priceMultiplier * qualityPremium);
}

function calculateMenuItemQuality(item: HospitalityMenuItemState, products: TradeProductState[], venue: HospitalityVenueState): number {
  const ingredientQuality = weightedProductQuality(item.ingredients, products);
  const execution = venue.serviceQuality - Math.max(0, item.complexity * 10 - venue.workforce.bartenders * 5 - venue.stations * 2);
  return Math.round(clamp(ingredientQuality * .72 + execution * .28, 20, 98));
}

function weightedProductQuality(ingredients: HospitalityMenuIngredientState[], products: TradeProductState[]): number {
  let totalMl = 0;
  let weighted = 0;
  for (const ingredient of ingredients) {
    if (!ingredient.productId) continue;
    const product = products.find((item) => item.id === ingredient.productId);
    if (!product) continue;
    totalMl += ingredient.amount;
    weighted += product.quality * ingredient.amount;
  }
  return totalMl > 0 ? weighted / totalMl : 55;
}

function effectivePreparationSeconds(item: HospitalityMenuItemState, venue: HospitalityVenueState): number {
  const skillFactor = clamp(1.18 - venue.serviceQuality / 260 - venue.workforce.bartenders * .018, .62, 1.12);
  const stationPenalty = venue.stations < Math.max(1, Math.ceil(venue.workforce.bartenders / 2)) ? 1.12 : 1;
  return Math.max(20, Math.round(item.preparationSeconds * skillFactor * stationPenalty));
}

function cocktailFitScore(recipe: CocktailRecipeDefinition, concept: HospitalityVenueConcept): number {
  let score = 10;
  if (recipe.tags.includes('classic')) score += concept === 'hotel_bar' || concept === 'cocktail_bar' || concept === 'lounge' ? 8 : 2;
  if (recipe.tags.includes('modern-classic')) score += concept === 'cocktail_bar' || concept === 'nightclub' ? 7 : 3;
  if (recipe.tags.includes('long') || recipe.tags.includes('spritz')) score += concept === 'nightclub' || concept === 'hotel_bar' ? 7 : 3;
  if (recipe.tags.includes('spirit-forward')) score += concept === 'lounge' || concept === 'cocktail_bar' ? 7 : 1;
  if (recipe.tags.includes('tropical') || recipe.tags.includes('fruity')) score += concept === 'nightclub' ? 6 : 2;
  if (recipe.tags.includes('brunch')) score += concept === 'hotel_bar' || concept === 'restaurant' ? 7 : 1;
  if (concept === 'nightclub') score += Math.max(0, 5 - recipe.complexity) * 2;
  if (concept === 'cocktail_bar') score += recipe.complexity * 1.4;
  return score;
}

function supportsCocktails(concept: HospitalityVenueConcept): boolean {
  return concept === 'cocktail_bar' || concept === 'lounge' || concept === 'hotel_bar' || concept === 'nightclub' || concept === 'restaurant';
}

function cloneMenuItem(item: HospitalityMenuItemState): HospitalityMenuItemState {
  return {
    ...item,
    garnish: [...item.garnish],
    ingredients: item.ingredients.map((ingredient) => ({ ...ingredient })),
  };
}

function removeExpiredContainers(openContainers: HospitalityOpenContainerState[], venueId: string, day: number): { openContainers: HospitalityOpenContainerState[]; wasteMl: number } {
  let wasteMl = 0;
  const next = openContainers.filter((container) => {
    if (container.venueId !== venueId || container.expiresDay >= day) return true;
    wasteMl += container.remainingMl;
    return false;
  });
  return { openContainers: next, wasteMl: roundToOne(wasteMl) };
}

function consumePackageAllocation(allocations: TradeLotAllocation[]): { taken: TradeLotAllocation[]; remaining: TradeLotAllocation[] } {
  let needed = 1;
  const taken: TradeLotAllocation[] = [];
  const remaining: TradeLotAllocation[] = [];
  for (const allocation of allocations) {
    if (needed <= 0) {
      remaining.push({ ...allocation });
      continue;
    }
    const amount = Math.min(needed, allocation.quantity);
    if (amount > 0) taken.push({ lotId: allocation.lotId, quantity: amount });
    const left = allocation.quantity - amount;
    if (left > 0) remaining.push({ lotId: allocation.lotId, quantity: left });
    needed -= amount;
  }
  if (taken.length === 0) taken.push({ lotId: 'untracked-hospitality-stock', quantity: 1 });
  return { taken, remaining };
}

function mergeAllocations(current: TradeLotAllocation[], added: TradeLotAllocation[]): TradeLotAllocation[] {
  const map = new Map<string, number>();
  for (const allocation of [...current, ...added]) map.set(allocation.lotId, (map.get(allocation.lotId) ?? 0) + allocation.quantity);
  return [...map.entries()].map(([lotId, quantity]) => ({ lotId, quantity }));
}

function cloneAllocations(value: TradeLotAllocation[] | undefined): TradeLotAllocation[] {
  return (value ?? []).map((item) => ({ ...item }));
}

function menuKindForProduct(product: TradeProductState): HospitalityMenuKind {
  const category = product.beverageCategoryId ?? product.family;
  if (category === 'beer' || category === 'cider' || category === 'perry') return product.packageVolumeLiters >= 5 ? 'draft' : 'bottle';
  if (category === 'still_wine' || category === 'sparkling_wine' || category === 'fortified_wine' || category === 'vermouth_aperitif' || category === 'sake') return 'glass';
  if (category === 'alcohol_free' || category === 'mixer') return 'non_alcoholic';
  if (category === 'rtd') return 'bottle';
  return 'shot';
}

function servingMl(kind: HospitalityMenuKind, packageVolumeLiters: number): number {
  if (kind === 'glass') return 150;
  if (kind === 'draft') return 500;
  if (kind === 'shot') return 40;
  if (kind === 'cocktail') return 120;
  return Math.round(packageVolumeLiters * 1000);
}

function glasswareForKind(kind: HospitalityMenuKind): string {
  if (kind === 'glass') return 'wine';
  if (kind === 'draft') return 'pint';
  if (kind === 'shot') return 'shot';
  if (kind === 'cocktail') return 'rocks';
  return 'bottle';
}

function serviceName(product: TradeProductState, kind: HospitalityMenuKind): string {
  const suffix: Record<HospitalityMenuKind, string> = {
    bottle: 'бутылка', glass: 'бокал', draft: 'разлив', shot: 'шот', cocktail: 'коктейль', non_alcoholic: 'подача',
  };
  return `${product.name} · ${suffix[kind]}`;
}

function categoryRank(product: TradeProductState, preferred: BeverageCategoryId[]): number {
  const category = product.beverageCategoryId ?? product.family;
  const index = preferred.indexOf(category);
  return index < 0 ? 0 : preferred.length - index;
}

function openLifeDays(product: TradeProductState): number {
  const category = product.beverageCategoryId ?? product.family;
  if (category === 'beer' || category === 'cider' || category === 'perry' || category === 'rtd') return product.packageVolumeLiters >= 5 ? 7 : 2;
  if (category === 'still_wine' || category === 'sparkling_wine' || category === 'fortified_wine' || category === 'vermouth_aperitif' || category === 'sake') return 4;
  if (category === 'mixer' || category === 'alcohol_free') return 3;
  if (product.alcoholByVolume >= 25) return 120;
  return 14;
}

function shelfLifeAfterDelivery(product: TradeProductState): number {
  const category = product.beverageCategoryId ?? product.family;
  if (category === 'beer' || category === 'cider' || category === 'rtd') return 180;
  if (category === 'mixer' || category === 'alcohol_free') return 240;
  return 720;
}

function dayOfWeek(day: number): number {
  return ((Math.max(1, day) - 1) % 7) + 1;
}

function deterministicFraction(key: string, min: number, max: number): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) / 0xffffffff) * (max - min);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}
