import {
  primaryCommodity,
  primaryProcessors,
  primarySites,
  type PrimaryProcessorDefinition,
  type PrimaryProcessorKind,
  type PrimarySiteKind,
} from '../data/primaryProductionCatalog';
import { ingredients } from '../data/supplyCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import { hashSeed } from './kernel';
import type { TradeInventoryLot, TradeState } from './trade';

export type CropStage = 'dormant' | 'growing' | 'flowering' | 'ripening' | 'harvest_ready' | 'harvested' | 'failed';
export type PrimaryOperationKind = 'harvest' | 'crop_loss' | 'raw_sale' | 'processing';

export interface PrimaryWeatherState {
  regionId: string;
  day: number;
  temperatureC: number;
  rainfallMm: number;
  droughtIndex: number;
  frost: boolean;
  storm: boolean;
}

export interface PrimarySiteState {
  id: string;
  assetId: string;
  organizationId: string;
  regionId: string;
  commodityId: string;
  kind: PrimarySiteKind;
  hectares: number;
  soilQuality: number;
  irrigation: number;
  storageCapacity: number;
  stage: CropStage;
  health: number;
  diseasePressure: number;
  moisture: number;
  seasonStress: number;
  rainAccumulation: number;
  expectedYield: number;
  expectedQuality: number;
  lastHarvestYear: number;
  lastHarvestDay: number | null;
}

export interface PrimaryRawLotState {
  id: string;
  organizationId: string;
  siteId: string;
  commodityId: string;
  quantity: number;
  quality: number;
  unitCost: number;
  harvestDay: number;
  expiresDay: number | null;
}

export interface PrimaryProcessorState {
  id: string;
  organizationId: string;
  assetId: string;
  kind: PrimaryProcessorKind;
  inputCommodityId: string;
  capacityPerDay: number;
  efficiency: number;
  condition: number;
  lastRunDay: number | null;
  totalInputProcessed: number;
  totalOutputProduced: number;
  blockedReason: string | null;
}

export interface PrimaryHarvestState {
  id: string;
  day: number;
  siteId: string;
  organizationId: string;
  commodityId: string;
  quantity: number;
  quality: number;
  weatherSummary: string;
}

export interface PrimaryOperationState {
  id: string;
  day: number;
  kind: PrimaryOperationKind;
  organizationId: string;
  counterpartyOrganizationId: string | null;
  siteId: string | null;
  processorId: string | null;
  commodityId: string;
  quantity: number;
  amount: number;
  inputLotIds: string[];
  outputLotIds: string[];
  headline: string;
  detail: string;
}

export interface PrimaryProductionState {
  sites: PrimarySiteState[];
  rawLots: PrimaryRawLotState[];
  processors: PrimaryProcessorState[];
  harvests: PrimaryHarvestState[];
  operations: PrimaryOperationState[];
  weather: PrimaryWeatherState[];
  nextRawLotNumber: number;
  nextHarvestNumber: number;
  nextOperationNumber: number;
}

export interface PrimarySectorSeed {
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  primaryProduction: PrimaryProductionState;
}

export interface PrimaryAdvanceResult {
  primaryProduction: PrimaryProductionState;
  organizations: OrganizationState[];
  trade: TradeState;
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export function createPrimarySector(day: number): PrimarySectorSeed {
  const organizationById = new Map<string, OrganizationState>();
  const assets: WorldAssetState[] = [];

  for (const [index, definition] of primarySites.entries()) {
    if (!organizationById.has(definition.organizationId)) {
      organizationById.set(definition.organizationId, {
        id: definition.organizationId,
        name: definition.organizationName,
        kind: 'supplier',
        countryId: definition.countryId,
        regionId: definition.regionId,
        ownerLabel: primaryOwner(index),
        status: 'active',
        cash: 74_000 + index * 3_700,
        debt: 11_000 + (index % 4) * 4_200,
        reputation: 64 + (index * 5) % 28,
        strategy: `${primaryCommodity(definition.commodityId).name}: выращивание и хранение`,
        employeeCount: 10 + Math.round(definition.hectares / 6),
        valuation: 120_000 + definition.hectares * 2_850,
        dailyRevenue: 0,
        dailyCosts: 0,
        assetIds: [definition.assetId],
        supplierOrganizationIds: [],
        buyerOrganizationIds: [],
        foundedDay: Math.max(1, day - 1_100 - index * 73),
      });
    }
    assets.push({
      id: definition.assetId,
      type: primaryCommodity(definition.commodityId).siteKind,
      name: definition.assetName,
      city: definition.city,
      countryId: definition.countryId,
      regionId: definition.regionId,
      address: definition.address,
      ownerOrganizationId: definition.organizationId,
      operatorOrganizationId: definition.organizationId,
      status: 'operating',
      condition: 72 + (index * 3) % 23,
      capacity: definition.storageCapacity,
      footfall: 0,
      askingPrice: 95_000 + definition.hectares * 3_200,
      dailyRent: 0,
      dailyOperatingCost: 260 + definition.hectares * 7,
      audience: `${primaryCommodity(definition.commodityId).name} · ${definition.hectares} га`,
      marketOutletId: null,
      venue: null,
    });
  }

  const primaryProduction = createPrimaryProductionState(day);
  return { organizations: [...organizationById.values()], assets, primaryProduction };
}

export function createPrimaryProductionState(day: number): PrimaryProductionState {
  const currentYear = yearIndex(day);
  let nextRawLotNumber = 1;
  const sites: PrimarySiteState[] = primarySites.map((definition, index) => {
    const commodity = primaryCommodity(definition.commodityId);
    const health = clamp(76 + definition.soilQuality * .16 + definition.irrigation * .08 - (index % 4) * 2, 55, 96);
    return {
      id: definition.id,
      assetId: definition.assetId,
      organizationId: definition.organizationId,
      regionId: definition.regionId,
      commodityId: definition.commodityId,
      kind: commodity.siteKind,
      hectares: definition.hectares,
      soilQuality: definition.soilQuality,
      irrigation: definition.irrigation,
      storageCapacity: definition.storageCapacity,
      stage: cropStage(day, commodity.plantDayOfYear, commodity.harvestDayOfYear),
      health,
      diseasePressure: 8 + (index * 7) % 19,
      moisture: 58 + (index * 9) % 24,
      seasonStress: 0,
      rainAccumulation: 0,
      expectedYield: roundQuantity(definition.hectares * commodity.baseYieldPerHectare * (health / 100)),
      expectedQuality: Math.round(clamp(health * .72 + definition.soilQuality * .28, 45, 98)),
      lastHarvestYear: currentYear - 1,
      lastHarvestDay: null,
    };
  });
  const rawLots: PrimaryRawLotState[] = sites.map((site) => {
    const commodity = primaryCommodity(site.commodityId);
    const quantity = Math.min(site.storageCapacity * .58, site.hectares * commodity.baseYieldPerHectare * .22);
    return {
      id: `primary-raw-lot-${nextRawLotNumber++}`,
      organizationId: site.organizationId,
      siteId: site.id,
      commodityId: site.commodityId,
      quantity: roundQuantity(quantity),
      quality: Math.round(clamp(site.expectedQuality - 3 + hash(`${site.id}:initial`) % 7, 45, 98)),
      unitCost: rawCommodityPrice(site.commodityId, site.expectedQuality),
      harvestDay: Math.max(1, day - 80 - hash(site.id) % 120),
      expiresDay: commodity.shelfLifeDays > 0 ? day + Math.max(20, Math.round(commodity.shelfLifeDays * .55)) : null,
    };
  });
  return {
    sites,
    rawLots,
    processors: primaryProcessors.map((definition, index) => ({
      id: definition.id,
      organizationId: definition.organizationId,
      assetId: definition.assetId,
      kind: definition.kind,
      inputCommodityId: definition.inputCommodityId,
      capacityPerDay: definition.capacityPerDay,
      efficiency: 78 + (index * 5) % 18,
      condition: 72 + (index * 4) % 22,
      lastRunDay: null,
      totalInputProcessed: 0,
      totalOutputProduced: 0,
      blockedReason: null,
    })),
    harvests: [],
    operations: [],
    weather: uniqueRegions().map((regionId) => weatherFor(regionId, day)),
    nextRawLotNumber,
    nextHarvestNumber: 1,
    nextOperationNumber: 1,
  };
}

export function normalizePrimaryProductionState(value: PrimaryProductionState | undefined, day: number): PrimaryProductionState {
  if (!value || !Array.isArray(value.sites)) return createPrimaryProductionState(day);
  const baseline = createPrimaryProductionState(day);
  const sitesById = new Map((value.sites ?? []).map((site) => [site.id, site]));
  const processorsById = new Map((value.processors ?? []).map((processor) => [processor.id, processor]));
  return {
    sites: baseline.sites.map((site) => ({ ...site, ...sitesById.get(site.id) })),
    rawLots: value.rawLots ?? baseline.rawLots,
    processors: baseline.processors.map((processor) => ({ ...processor, ...processorsById.get(processor.id) })),
    harvests: value.harvests ?? [],
    operations: value.operations ?? [],
    weather: value.weather?.length ? value.weather : baseline.weather,
    nextRawLotNumber: value.nextRawLotNumber ?? baseline.nextRawLotNumber,
    nextHarvestNumber: value.nextHarvestNumber ?? 1,
    nextOperationNumber: value.nextOperationNumber ?? 1,
  };
}

export function ensurePrimarySector(input: {
  state: PrimaryProductionState | undefined;
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  day: number;
}): { primaryProduction: PrimaryProductionState; organizations: OrganizationState[]; assets: WorldAssetState[] } {
  const seed = createPrimarySector(input.day);
  const organizationIds = new Set(input.organizations.map((organization) => organization.id));
  const assetIds = new Set(input.assets.map((asset) => asset.id));
  return {
    primaryProduction: normalizePrimaryProductionState(input.state, input.day),
    organizations: [...input.organizations, ...seed.organizations.filter((organization) => !organizationIds.has(organization.id))],
    assets: [...input.assets, ...seed.assets.filter((asset) => !assetIds.has(asset.id))],
  };
}

export function advancePrimaryProductionDay(
  state: PrimaryProductionState,
  organizations: OrganizationState[],
  trade: TradeState,
  day: number,
): PrimaryAdvanceResult {
  const next = clonePrimaryState(normalizePrimaryProductionState(state, day));
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  const nextTrade: TradeState = {
    ...trade,
    inventory: trade.inventory.map((lot) => ({ ...lot })),
    operations: [...trade.operations],
  };
  const events: PrimaryAdvanceResult['events'] = [];
  const weather = uniqueRegions().map((regionId) => weatherFor(regionId, day));
  next.weather = weather;
  const currentYear = yearIndex(day);
  const currentDayOfYear = dayOfYear(day);

  next.sites = next.sites.map((site) => {
    const commodity = primaryCommodity(site.commodityId);
    const localWeather = weather.find((item) => item.regionId === site.regionId) ?? weatherFor(site.regionId, day);
    const preferredTemperature = localWeather.temperatureC >= commodity.preferredTemperature[0] && localWeather.temperatureC <= commodity.preferredTemperature[1];
    const preferredRain = localWeather.rainfallMm >= commodity.preferredRain[0] && localWeather.rainfallMm <= commodity.preferredRain[1];
    const droughtStress = localWeather.droughtIndex * commodity.droughtSensitivity * (1 - site.irrigation / 140);
    const climateStress = (preferredTemperature ? 0 : 1.4) + (preferredRain ? 0 : .8) + droughtStress * 2.2 + (localWeather.frost ? 4.5 : 0) + (localWeather.storm ? 2.2 : 0);
    const diseaseRoll = hash(`${site.id}:disease:${day}`) % 10_000 / 10_000;
    const diseaseChance = commodity.diseaseSensitivity * (site.diseasePressure / 100) * (localWeather.rainfallMm > 5 ? 1.6 : .8) * .025;
    const diseaseHit = diseaseRoll < diseaseChance;
    const health = clamp(site.health + (preferredTemperature && preferredRain ? .12 : -.08) - climateStress * .09 - (diseaseHit ? 7 + commodity.diseaseSensitivity * 6 : 0), 12, 100);
    const moisture = clamp(site.moisture + localWeather.rainfallMm * 1.7 + site.irrigation * .015 - Math.max(0, localWeather.temperatureC - 18) * .6, 0, 100);
    const seasonStress = site.seasonStress + climateStress + (diseaseHit ? 10 : 0);
    const rainAccumulation = site.rainAccumulation + localWeather.rainfallMm;
    const stage = cropStage(day, commodity.plantDayOfYear, commodity.harvestDayOfYear);
    const expectedYield = roundQuantity(site.hectares * commodity.baseYieldPerHectare * clamp(.35 + health / 145 - seasonStress / 1_800, .18, 1.12));
    const expectedQuality = Math.round(clamp(42 + health * .38 + site.soilQuality * .28 - seasonStress / 24, 25, 99));

    if (diseaseHit) {
      recordOperation(next, {
        day, kind: 'crop_loss', organizationId: site.organizationId, counterpartyOrganizationId: null,
        siteId: site.id, processorId: null, commodityId: site.commodityId, quantity: 0, amount: 0,
        inputLotIds: [], outputLotIds: [], headline: `${primaryCommodity(site.commodityId).name}: вспышка болезни`,
        detail: `${site.id} потерял часть здоровья урожая.`,
      });
      if (health < 48) events.push({ tone: 'warning', title: 'Риск урожая', detail: `${primaryCommodity(site.commodityId).name}: здоровье участка снизилось до ${Math.round(health)}%.` });
    }

    let updated: PrimarySiteState = { ...site, health, moisture, seasonStress, rainAccumulation, stage, expectedYield, expectedQuality };
    const shouldHarvest = currentDayOfYear >= commodity.harvestDayOfYear && currentDayOfYear <= commodity.harvestDayOfYear + 4 && site.lastHarvestYear < currentYear;
    if (shouldHarvest) {
      const yieldVariation = .9 + (hash(`${site.id}:yield:${currentYear}`) % 210) / 1_000;
      const quantity = roundQuantity(Math.min(site.storageCapacity, expectedYield * yieldVariation));
      const quality = Math.round(clamp(expectedQuality + (hash(`${site.id}:quality:${currentYear}`) % 9) - 4, 20, 99));
      if (quantity > 0) {
        const lot: PrimaryRawLotState = {
          id: `primary-raw-lot-${next.nextRawLotNumber++}`,
          organizationId: site.organizationId,
          siteId: site.id,
          commodityId: site.commodityId,
          quantity,
          quality,
          unitCost: rawCommodityPrice(site.commodityId, quality),
          harvestDay: day,
          expiresDay: commodity.shelfLifeDays > 0 ? day + commodity.shelfLifeDays : null,
        };
        next.rawLots.push(lot);
        const harvest: PrimaryHarvestState = {
          id: `primary-harvest-${next.nextHarvestNumber++}`,
          day,
          siteId: site.id,
          organizationId: site.organizationId,
          commodityId: site.commodityId,
          quantity,
          quality,
          weatherSummary: weatherSummary(localWeather, seasonStress),
        };
        next.harvests = [harvest, ...next.harvests].slice(0, 180);
        recordOperation(next, {
          day, kind: 'harvest', organizationId: site.organizationId, counterpartyOrganizationId: null,
          siteId: site.id, processorId: null, commodityId: site.commodityId, quantity, amount: 0,
          inputLotIds: [], outputLotIds: [lot.id], headline: `Собран урожай: ${commodity.name}`,
          detail: `${Math.round(quantity)} кг · качество ${quality}/100 · ${harvest.weatherSummary}`,
        });
        events.push({ tone: quality >= 82 ? 'release' : quality < 58 ? 'warning' : 'market', title: `${commodity.name}: урожай собран`, detail: `${Math.round(quantity)} кг, качество ${quality}/100.` });
      }
      updated = { ...updated, lastHarvestYear: currentYear, lastHarvestDay: day, stage: 'harvested', seasonStress: 0, rainAccumulation: 0, health: clamp(health + 4, 12, 100) };
    }
    return updated;
  });

  next.rawLots = next.rawLots.filter((lot) => lot.quantity > .001 && (lot.expiresDay === null || lot.expiresDay >= day));

  for (const processor of next.processors) {
    const definition = primaryProcessors.find((item) => item.id === processor.id);
    if (!definition) continue;
    const totalOutputStock = definition.outputs.reduce((sum, output) => sum + tradeIngredientQuantity(nextTrade, processor.organizationId, output.ingredientId), 0);
    const contractDemand = definition.outputs.reduce((sum, output) => sum + nextTrade.contracts
      .filter((contract) => contract.status === 'active' && contract.sellerOrganizationId === processor.organizationId && contract.commodityKind === 'ingredient' && contract.commodityId === output.ingredientId)
      .reduce((inner, contract) => inner + contract.quantity * Math.max(2, 12 / Math.max(1, contract.intervalDays)), 0), 0);
    const targetStock = Math.max(160, contractDemand * 1.35);
    if (totalOutputStock >= targetStock) {
      processor.blockedReason = null;
      continue;
    }
    const availableRaw = next.rawLots
      .filter((lot) => lot.commodityId === definition.inputCommodityId && lot.quantity > 0)
      .sort((a, b) => b.quality - a.quality || (a.expiresDay ?? Infinity) - (b.expiresDay ?? Infinity));
    const availableQuantity = availableRaw.reduce((sum, lot) => sum + lot.quantity, 0);
    const desiredInput = Math.min(processor.capacityPerDay * (processor.condition / 100), Math.max(definition.minimumInput, (targetStock - totalOutputStock) / Math.max(.1, weightedYield(definition))));
    if (availableQuantity < definition.minimumInput) {
      processor.blockedReason = `Нет ${primaryCommodity(definition.inputCommodityId).name.toLowerCase()}`;
      continue;
    }
    const inputQuantity = Math.min(availableQuantity, desiredInput);
    const consumption = consumeRawLots(next.rawLots, definition.inputCommodityId, inputQuantity);
    if (consumption.quantity < definition.minimumInput) {
      processor.blockedReason = 'Недостаточный объём сырья';
      continue;
    }
    const weightedQuality = consumption.quality;
    const rawCost = consumption.cost;
    const processingCost = roundMoney(consumption.quantity * definition.processingCostPerInput);
    const sourceOwners = Object.keys(consumption.sourceQuantities);
    nextOrganizations = nextOrganizations.map((organization) => {
      if (organization.id === processor.organizationId) return { ...organization, cash: roundMoney(organization.cash - rawCost - processingCost) };
      const sourcePayment = consumption.sourceCosts[organization.id] ?? 0;
      if (sourcePayment > 0) return { ...organization, cash: roundMoney(organization.cash + sourcePayment) };
      return organization;
    });
    for (const sourceOrganizationId of sourceOwners) {
      const sourceQuantity = consumption.sourceQuantities[sourceOrganizationId] ?? 0;
      const sourcePayment = consumption.sourceCosts[sourceOrganizationId] ?? 0;
      recordOperation(next, {
        day, kind: 'raw_sale', organizationId: sourceOrganizationId, counterpartyOrganizationId: processor.organizationId,
        siteId: null, processorId: processor.id, commodityId: definition.inputCommodityId,
        quantity: sourceQuantity, amount: sourcePayment,
        inputLotIds: consumption.lotIds, outputLotIds: [],
        headline: `${primaryCommodity(definition.inputCommodityId).name}: сырьё продано`,
        detail: `${processorLabel(definition.kind)} закупил ${Math.round(sourceQuantity)} кг сырья для переработки.`,
      });
    }
    const outputLotIds: string[] = [];
    let totalOutput = 0;
    for (const output of definition.outputs) {
      const quantity = roundQuantity(consumption.quantity * output.share * output.yieldPerInput * (processor.efficiency / 100));
      if (quantity <= 0) continue;
      const ingredient = ingredients.find((item) => item.id === output.ingredientId);
      const unitCost = roundMoney((rawCost + processingCost) / Math.max(.001, consumption.quantity * weightedYield(definition)));
      const tradeLot: TradeInventoryLot = {
        id: `trade-lot-${nextTrade.nextInventoryNumber++}`,
        organizationId: processor.organizationId,
        commodityKind: 'ingredient',
        commodityId: output.ingredientId,
        quantity,
        unit: ingredient?.unit ?? 'kg',
        quality: Math.round(clamp(weightedQuality + output.qualityModifier + (processor.efficiency - 80) * .12, 25, 99)),
        unitCost,
        originOrganizationId: sourceOwners[0] ?? processor.organizationId,
        receivedDay: day,
        expiresDay: ingredient ? day + ingredient.shelfLifeDays : null,
      };
      nextTrade.inventory.push(tradeLot);
      outputLotIds.push(tradeLot.id);
      totalOutput += quantity;
    }
    processor.lastRunDay = day;
    processor.totalInputProcessed = roundQuantity(processor.totalInputProcessed + consumption.quantity);
    processor.totalOutputProduced = roundQuantity(processor.totalOutputProduced + totalOutput);
    processor.condition = clamp(processor.condition - .08 - consumption.quantity / Math.max(1, processor.capacityPerDay) * .18, 20, 100);
    processor.blockedReason = null;
    recordOperation(next, {
      day, kind: 'processing', organizationId: processor.organizationId, counterpartyOrganizationId: sourceOwners[0] ?? null,
      siteId: null, processorId: processor.id, commodityId: definition.inputCommodityId, quantity: consumption.quantity,
      amount: processingCost, inputLotIds: consumption.lotIds, outputLotIds,
      headline: `${processorLabel(definition.kind)} переработал сырьё`,
      detail: `${Math.round(consumption.quantity)} кг → ${Math.round(totalOutput)} ед. ингредиентов, качество ${Math.round(weightedQuality)}/100.`,
    });
  }

  next.rawLots = next.rawLots.filter((lot) => lot.quantity > .001 && (lot.expiresDay === null || lot.expiresDay >= day));
  next.operations = next.operations.slice(0, 320);
  return { primaryProduction: next, organizations: nextOrganizations, trade: nextTrade, events };
}

export function primaryCommodityStock(state: PrimaryProductionState, commodityId: string): number {
  return roundQuantity(state.rawLots.filter((lot) => lot.commodityId === commodityId).reduce((sum, lot) => sum + lot.quantity, 0));
}

export function primarySiteLabel(kind: PrimarySiteKind): string {
  const labels: Record<PrimarySiteKind, string> = {
    field: 'Поле', hop_yard: 'Хмельник', orchard: 'Сад', vineyard: 'Виноградник', apiary: 'Пасека', botanical_farm: 'Ботаническое хозяйство',
  };
  return labels[kind];
}

export function processorLabel(kind: PrimaryProcessorKind): string {
  const labels: Record<PrimaryProcessorKind, string> = {
    malt_house: 'Солодовня', hop_packer: 'Хмелевой центр', fruit_pool: 'Фруктовый кооператив', sugar_refinery: 'Сахарный завод', culture_lab: 'Дрожжевая лаборатория',
  };
  return labels[kind];
}

function clonePrimaryState(state: PrimaryProductionState): PrimaryProductionState {
  return {
    ...state,
    sites: state.sites.map((site) => ({ ...site })),
    rawLots: state.rawLots.map((lot) => ({ ...lot })),
    processors: state.processors.map((processor) => ({ ...processor })),
    harvests: state.harvests.map((harvest) => ({ ...harvest })),
    operations: state.operations.map((operation) => ({ ...operation, inputLotIds: [...operation.inputLotIds], outputLotIds: [...operation.outputLotIds] })),
    weather: state.weather.map((weather) => ({ ...weather })),
  };
}

function recordOperation(state: PrimaryProductionState, input: Omit<PrimaryOperationState, 'id'>): void {
  state.operations = [{ ...input, id: `primary-operation-${input.day}-${state.nextOperationNumber++}` }, ...state.operations];
}

function consumeRawLots(lots: PrimaryRawLotState[], commodityId: string, requested: number): { quantity: number; cost: number; quality: number; lotIds: string[]; sourceQuantities: Record<string, number>; sourceCosts: Record<string, number> } {
  let remaining = requested;
  let quantity = 0;
  let cost = 0;
  let qualityWeighted = 0;
  const lotIds: string[] = [];
  const sourceQuantities: Record<string, number> = {};
  const sourceCosts: Record<string, number> = {};
  for (const lot of lots.filter((item) => item.commodityId === commodityId && item.quantity > 0).sort((a, b) => (a.expiresDay ?? Infinity) - (b.expiresDay ?? Infinity))) {
    if (remaining <= .001) break;
    const used = Math.min(remaining, lot.quantity);
    lot.quantity = roundQuantity(lot.quantity - used);
    remaining = roundQuantity(remaining - used);
    quantity += used;
    cost += used * lot.unitCost;
    qualityWeighted += used * lot.quality;
    lotIds.push(lot.id);
    sourceQuantities[lot.organizationId] = roundQuantity((sourceQuantities[lot.organizationId] ?? 0) + used);
    sourceCosts[lot.organizationId] = roundMoney((sourceCosts[lot.organizationId] ?? 0) + used * lot.unitCost);
  }
  return { quantity: roundQuantity(quantity), cost: roundMoney(cost), quality: quantity > 0 ? qualityWeighted / quantity : 0, lotIds, sourceQuantities, sourceCosts };
}

function tradeIngredientQuantity(trade: TradeState, organizationId: string, ingredientId: string): number {
  return trade.inventory.filter((lot) => lot.organizationId === organizationId && lot.commodityKind === 'ingredient' && lot.commodityId === ingredientId).reduce((sum, lot) => sum + lot.quantity, 0);
}

function weightedYield(definition: PrimaryProcessorDefinition): number {
  return definition.outputs.reduce((sum, output) => sum + output.share * output.yieldPerInput, 0);
}

function rawCommodityPrice(commodityId: string, quality: number): number {
  const base: Record<string, number> = {
    'raw-barley': .31,
    'raw-hops': 5.8,
    'raw-apples': .24,
    'raw-sugar-beet': .055,
    'raw-wine-grapes': 1.1,
    'raw-botanicals': 4.4,
    'raw-honey': 4.8,
  };
  return roundMoney((base[commodityId] ?? .5) * (.72 + quality / 170));
}

function weatherFor(regionId: string, day: number): PrimaryWeatherState {
  const seasonalAngle = ((dayOfYear(day) - 172) / 365) * Math.PI * 2;
  const profile = climateProfile(regionId);
  const noise = (hash(`${regionId}:temperature:${day}`) % 1_000) / 1_000 - .5;
  const rainNoise = (hash(`${regionId}:rain:${day}`) % 1_000) / 1_000;
  const temperatureC = roundQuantity(profile.meanTemperature + Math.cos(seasonalAngle) * profile.amplitude + noise * 6);
  const rainfallMm = roundQuantity(Math.max(0, rainNoise < profile.rainChance ? (hash(`${regionId}:rain-mm:${day}`) % 95) / 10 : 0));
  const droughtIndex = clamp((temperatureC - 18) / 18 + Math.max(0, 2.2 - rainfallMm) / 7 + profile.dryness, 0, 1);
  return {
    regionId,
    day,
    temperatureC,
    rainfallMm,
    droughtIndex: roundQuantity(droughtIndex),
    frost: temperatureC < -1,
    storm: rainfallMm > 7.2 && hash(`${regionId}:storm:${day}`) % 5 === 0,
  };
}

function climateProfile(regionId: string): { meanTemperature: number; amplitude: number; rainChance: number; dryness: number } {
  const profiles: Record<string, { meanTemperature: number; amplitude: number; rainChance: number; dryness: number }> = {
    bavaria: { meanTemperature: 10, amplitude: 10, rainChance: .42, dryness: .04 },
    hesse: { meanTemperature: 11, amplitude: 9, rainChance: .4, dryness: .05 },
    normandy: { meanTemperature: 11.5, amplitude: 6.5, rainChance: .54, dryness: 0 },
    'grand-est': { meanTemperature: 11, amplitude: 10, rainChance: .39, dryness: .06 },
    somerset: { meanTemperature: 11.5, amplitude: 6.5, rainChance: .52, dryness: 0 },
    kent: { meanTemperature: 12, amplitude: 7, rainChance: .36, dryness: .08 },
    yakima: { meanTemperature: 12.5, amplitude: 13, rainChance: .18, dryness: .28 },
    asturias: { meanTemperature: 13, amplitude: 5.5, rainChance: .58, dryness: 0 },
    silesia: { meanTemperature: 10, amplitude: 11, rainChance: .38, dryness: .07 },
  };
  return profiles[regionId] ?? { meanTemperature: 12, amplitude: 9, rainChance: .38, dryness: .08 };
}

function cropStage(day: number, plantDay: number, harvestDay: number): CropStage {
  const current = dayOfYear(day);
  if (current < plantDay) return 'dormant';
  const progress = (current - plantDay) / Math.max(1, harvestDay - plantDay);
  if (progress < .45) return 'growing';
  if (progress < .68) return 'flowering';
  if (progress < .96) return 'ripening';
  if (current <= harvestDay + 4) return 'harvest_ready';
  return 'harvested';
}

function weatherSummary(weather: PrimaryWeatherState, seasonStress: number): string {
  if (seasonStress > 220) return 'тяжёлый сезон';
  if (weather.droughtIndex > .72) return 'сухой сезон';
  if (weather.rainfallMm > 6) return 'влажный сезон';
  return 'стабильный сезон';
}

function uniqueRegions(): string[] {
  return [...new Set(primarySites.map((site) => site.regionId))];
}

function primaryOwner(index: number): string {
  const names = ['Кооператив семейных хозяйств', 'Семья Хофман', 'Семья Уитмор', 'Региональный аграрный фонд', 'Союз фермеров', 'Частное хозяйство'];
  return names[index % names.length] ?? 'Частный владелец';
}

function dayOfYear(day: number): number { return ((Math.max(1, day) - 1) % 365) + 1; }
function yearIndex(day: number): number { return Math.floor((Math.max(1, day) - 1) / 365); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function roundQuantity(value: number): number { return Math.round(value * 1_000) / 1_000; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function hash(value: string): number { return hashSeed(value); }
