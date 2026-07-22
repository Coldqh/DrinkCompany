import type { ProductRelease, BrandState } from './brand';
import type { BatchState } from './production';
import { averageQuality } from './production';
import { calculateShelfDemand, recordConsumerPurchase, type DemandState, type ShelfDemandResult } from './demand';

export type RetailVenueType = 'bar' | 'shop';
export type RetailVenueStatus = 'open' | 'closed';

export interface RetailStockItem {
  id: string;
  releaseId: string;
  batchId: string;
  units: number;
  price: number;
  stockedDay: number;
}

export interface RetailVenue {
  id: string;
  type: RetailVenueType;
  name: string;
  regionId: string;
  openedDay: number;
  status: RetailVenueStatus;
  level: number;
  reputation: number;
  cleanliness: number;
  dailyCost: number;
  stock: RetailStockItem[];
  totalVisitors: number;
  totalUnitsSold: number;
  totalRevenue: number;
}

export interface RetailSaleLine {
  releaseId: string;
  batchId: string;
  units: number;
  unitPrice: number;
  revenue: number;
  satisfaction: number;
}

export interface RetailDayReport {
  id: string;
  venueId: string;
  day: number;
  visitors: number;
  unitsSold: number;
  revenue: number;
  satisfaction: number;
  headline: string;
  lines: RetailSaleLine[];
}

export interface RetailState {
  venues: RetailVenue[];
  reports: RetailDayReport[];
  nextVenueNumber: number;
  nextStockNumber: number;
  nextReportNumber: number;
  directSalesRevenue: number;
  directUnitsSold: number;
}


export interface RetailDemandContext {
  demand: DemandState;
  footfallByVenueId: Record<string, number>;
}

export interface RetailAdvanceResult {
  retail: RetailState;
  demand?: DemandState;
  revenue: number;
  unitsSold: number;
  reports: RetailDayReport[];
}

const VENUE_DEFINITIONS: Record<RetailVenueType, { label: string; openCost: number; dailyCost: number; baseVisitors: number; stockLimit: number }> = {
  bar: { label: 'Бар', openCost: 18_000, dailyCost: 240, baseVisitors: 24, stockLimit: 180 },
  shop: { label: 'Магазин', openCost: 13_500, dailyCost: 170, baseVisitors: 19, stockLimit: 260 },
};

export function createRetailState(): RetailState {
  return { venues: [], reports: [], nextVenueNumber: 1, nextStockNumber: 1, nextReportNumber: 1, directSalesRevenue: 0, directUnitsSold: 0 };
}

export function venueLabel(type: RetailVenueType): string { return VENUE_DEFINITIONS[type].label; }
export function retailOpenCost(type: RetailVenueType): number { return VENUE_DEFINITIONS[type].openCost; }
export function retailDailyCost(retail: RetailState): number { return roundMoney(retail.venues.filter((venue) => venue.status === 'open').reduce((sum, venue) => sum + venue.dailyCost, 0)); }
export function retailStockLimit(venue: RetailVenue): number { return VENUE_DEFINITIONS[venue.type].stockLimit + (venue.level - 1) * (venue.type === 'bar' ? 90 : 140); }
export function retailStockUnits(venue: RetailVenue): number { return venue.stock.reduce((sum, item) => sum + item.units, 0); }

export function openRetailVenue(retail: RetailState, input: { type: RetailVenueType; name: string; regionId: string }, day: number): { retail: RetailState; venue: RetailVenue; cost: number } {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Название точки должно содержать минимум 2 символа');
  if (retail.venues.some((venue) => venue.name.toLowerCase() === name.toLowerCase())) throw new Error('Точка с таким названием уже существует');
  if (retail.venues.filter((venue) => venue.type === input.type && venue.status === 'open').length >= 2) throw new Error(`На текущем этапе можно открыть не более двух точек типа «${venueLabel(input.type)}»`);
  const definition = VENUE_DEFINITIONS[input.type];
  const venue: RetailVenue = {
    id: `retail-${day}-${retail.nextVenueNumber}`,
    type: input.type,
    name,
    regionId: input.regionId,
    openedDay: day,
    status: 'open',
    level: 1,
    reputation: 8,
    cleanliness: 88,
    dailyCost: definition.dailyCost,
    stock: [],
    totalVisitors: 0,
    totalUnitsSold: 0,
    totalRevenue: 0,
  };
  return { retail: { ...retail, venues: [venue, ...retail.venues], nextVenueNumber: retail.nextVenueNumber + 1 }, venue, cost: definition.openCost };
}

export function stockRetailVenue(
  retail: RetailState,
  venueId: string,
  release: ProductRelease,
  batch: BatchState,
  units: number,
  price: number,
  day: number,
): { retail: RetailState; batch: BatchState } {
  const venue = getVenue(retail, venueId);
  if (venue.status !== 'open') throw new Error('Точка закрыта');
  if (release.batchId !== batch.id || release.status !== 'active') throw new Error('Активный релиз не связан с выбранной партией');
  if (!Number.isInteger(units) || units < 6) throw new Error('Минимальная выкладка — 6 бутылок');
  if (units > batch.availableUnits) throw new Error('На складе готовой продукции недостаточно бутылок');
  if (!Number.isFinite(price) || price <= release.wholesalePrice) throw new Error('Розничная цена должна быть выше оптовой');
  if (retailStockUnits(venue) + units > retailStockLimit(venue)) throw new Error('В торговой точке не хватает места под выбранный объём');

  const existing = venue.stock.find((item) => item.releaseId === release.id && Math.abs(item.price - price) < 0.01);
  const stock = existing
    ? venue.stock.map((item) => item.id === existing.id ? { ...item, units: item.units + units, stockedDay: day } : item)
    : [{ id: `retail-stock-${day}-${retail.nextStockNumber}`, releaseId: release.id, batchId: batch.id, units, price: roundMoney(price), stockedDay: day }, ...venue.stock];
  return {
    retail: {
      ...retail,
      venues: retail.venues.map((item) => item.id === venue.id ? { ...item, stock } : item),
      nextStockNumber: existing ? retail.nextStockNumber : retail.nextStockNumber + 1,
    },
    batch: { ...batch, availableUnits: batch.availableUnits - units },
  };
}

export function cleanRetailVenue(retail: RetailState, venueId: string): { retail: RetailState; cost: number } {
  const venue = getVenue(retail, venueId);
  if (venue.cleanliness >= 96) throw new Error('Точка уже в хорошем санитарном состоянии');
  const cost = 180 + venue.level * 75;
  return { retail: { ...retail, venues: retail.venues.map((item) => item.id === venueId ? { ...item, cleanliness: Math.min(100, item.cleanliness + 34) } : item) }, cost };
}

export function upgradeRetailVenue(retail: RetailState, venueId: string): { retail: RetailState; cost: number } {
  const venue = getVenue(retail, venueId);
  if (venue.level >= 3) throw new Error('Точка уже развита до максимального уровня');
  const cost = venue.type === 'bar' ? 11_500 * venue.level : 8_500 * venue.level;
  return {
    retail: {
      ...retail,
      venues: retail.venues.map((item) => item.id === venueId ? {
        ...item,
        level: item.level + 1,
        dailyCost: roundMoney(item.dailyCost + (item.type === 'bar' ? 85 : 60)),
        reputation: Math.min(100, item.reputation + 5),
      } : item),
    },
    cost,
  };
}

export function setRetailVenueStatus(retail: RetailState, venueId: string, status: RetailVenueStatus): RetailState {
  const venue = getVenue(retail, venueId);
  if (venue.status === status) return retail;
  return { ...retail, venues: retail.venues.map((item) => item.id === venueId ? { ...item, status } : item) };
}

export function advanceRetailDay(retail: RetailState, brand: BrandState, batches: BatchState[], day: number, staffBonus = 0, demandContext?: RetailDemandContext): RetailAdvanceResult {
  let nextDemand = demandContext?.demand;
  let totalRevenue = 0;
  let totalUnits = 0;
  const newReports: RetailDayReport[] = [];
  let reportNumber = retail.nextReportNumber;

  const venues = retail.venues.map((venue) => {
    if (venue.status !== 'open') return venue;
    const definition = VENUE_DEFINITIONS[venue.type];
    const activeStock = venue.stock.filter((item) => item.units > 0);
    const visitorPotential = Math.max(4, Math.round(definition.baseVisitors + venue.level * 7 + venue.reputation * 0.22 + staffBonus * 0.8 - Math.max(0, 65 - venue.cleanliness) * 0.22));
    if (activeStock.length === 0) {
      const report: RetailDayReport = {
        id: `retail-report-${day}-${reportNumber++}`,
        venueId: venue.id,
        day,
        visitors: Math.max(2, Math.round(visitorPotential * 0.35)),
        unitsSold: 0,
        revenue: 0,
        satisfaction: 35,
        headline: 'Полки пусты — посетители ушли без покупки',
        lines: [],
      };
      newReports.push(report);
      return { ...venue, cleanliness: Math.max(0, venue.cleanliness - 1), reputation: Math.max(0, venue.reputation - 2), totalVisitors: venue.totalVisitors + report.visitors };
    }

    const weighted = activeStock.map((stock) => {
      const release = brand.releases.find((item) => item.id === stock.releaseId);
      const batch = batches.find((item) => item.id === stock.batchId);
      if (!release || !batch) return { stock, score: 0, satisfaction: 30, demandResult: null, batch: null };
      const quality = averageQuality(batch.quality);
      const channelFit = venue.type === 'bar'
        ? (release.positioning === 'bar' ? 15 : release.positioning === 'experimental' || release.positioning === 'local' ? 8 : 0)
        : (release.positioning === 'mass' ? 14 : release.positioning === 'local' || release.positioning === 'premium' ? 8 : 0);
      const pricePressure = Math.max(0, (stock.price - release.retailPrice) / Math.max(0.1, release.retailPrice) * 36);
      const score = clamp(quality * 0.42 + release.awareness * 0.2 + release.visualAppeal * 0.12 + release.audienceClarity * 0.1 + channelFit + venue.reputation * 0.09 - pricePressure - batch.quality.defectRisk * 0.08, 1, 100);
      const satisfaction = clamp(Math.round(quality * 0.62 + release.visualAppeal * 0.12 + release.audienceClarity * 0.1 + channelFit * 0.5 - pricePressure * 0.7 - batch.quality.defectRisk * 0.12), 20, 98);
      const demandResult: ShelfDemandResult | null = nextDemand ? calculateShelfDemand(nextDemand, {
        day,
        regionId: venue.regionId,
        assetId: venue.id,
        assetType: venue.type,
        assetFootfall: demandContext?.footfallByVenueId[venue.id] ?? visitorPotential,
        productId: release.id,
        beverageCategoryId: batch.recipe.family,
        quality,
        retailPrice: stock.price,
        referencePrice: release.retailPrice,
        organizationReputation: venue.reputation,
      }) : null;
      return { stock, score, satisfaction, demandResult, batch };
    });
    const scoreTotal = Math.max(1, weighted.reduce((sum, item) => sum + item.score, 0));
    const purchaseRate = clamp(0.38 + venue.reputation / 250 + venue.cleanliness / 500 + staffBonus / 90, 0.25, 0.88);
    let remainingDemand = Math.max(1, Math.round(visitorPotential * purchaseRate));
    const lines: RetailSaleLine[] = [];
    const stock = venue.stock.map((stockItem) => {
      const item = weighted.find((entry) => entry.stock.id === stockItem.id);
      if (!item || remainingDemand <= 0 || stockItem.units <= 0) return stockItem;
      const share = item.score / scoreTotal;
      const deterministic = ((day + stockItem.id.length + venue.id.length) % 3) - 1;
      const desired = item.demandResult
        ? Math.max(0, Math.round(item.demandResult.units * clamp(item.score / 72, .45, 1.35)))
        : Math.max(0, Math.round(visitorPotential * purchaseRate * share) + deterministic);
      const units = Math.min(stockItem.units, Math.min(remainingDemand, desired));
      if (units <= 0) return stockItem;
      remainingDemand -= units;
      const revenue = roundMoney(units * stockItem.price);
      lines.push({ releaseId: stockItem.releaseId, batchId: stockItem.batchId, units, unitPrice: stockItem.price, revenue, satisfaction: item.satisfaction });
      if (nextDemand && item.demandResult) nextDemand = recordConsumerPurchase(nextDemand, {
        day,
        regionId: venue.regionId,
        assetId: venue.id,
        productId: stockItem.releaseId,
        categoryId: item.batch?.recipe.family ?? 'beer',
        channel: item.demandResult.channel,
        units,
        unitPrice: stockItem.price,
        revenue,
        primarySegmentId: item.demandResult.primarySegmentId,
        occasion: item.demandResult.occasion,
      });
      return { ...stockItem, units: stockItem.units - units };
    });
    const unitsSold = lines.reduce((sum, line) => sum + line.units, 0);
    const revenue = roundMoney(lines.reduce((sum, line) => sum + line.revenue, 0));
    const satisfaction = lines.length > 0 ? Math.round(lines.reduce((sum, line) => sum + line.satisfaction * line.units, 0) / Math.max(1, unitsSold)) : 42;
    const visitors = visitorPotential + ((day + venue.id.length) % 5) - 2;
    const reputationDelta = unitsSold === 0 ? -1 : satisfaction >= 78 ? 2 : satisfaction < 55 ? -2 : 0;
    const report: RetailDayReport = {
      id: `retail-report-${day}-${reportNumber++}`,
      venueId: venue.id,
      day,
      visitors,
      unitsSold,
      revenue,
      satisfaction,
      headline: unitsSold === 0 ? 'Продаж не было' : satisfaction >= 82 ? 'Гости приняли ассортимент очень тепло' : satisfaction >= 65 ? 'Смена прошла стабильно' : 'Цена или продукт вызвали вопросы',
      lines,
    };
    newReports.push(report);
    totalRevenue += revenue;
    totalUnits += unitsSold;
    return {
      ...venue,
      stock: stock.filter((item) => item.units > 0),
      cleanliness: Math.max(0, venue.cleanliness - Math.max(1, Math.ceil(visitors / 22))),
      reputation: clamp(venue.reputation + reputationDelta, 0, 100),
      totalVisitors: venue.totalVisitors + visitors,
      totalUnitsSold: venue.totalUnitsSold + unitsSold,
      totalRevenue: roundMoney(venue.totalRevenue + revenue),
    };
  });

  return {
    demand: nextDemand,
    retail: {
      ...retail,
      venues,
      reports: [...newReports, ...retail.reports].slice(0, 120),
      nextReportNumber: reportNumber,
      directSalesRevenue: roundMoney(retail.directSalesRevenue + totalRevenue),
      directUnitsSold: retail.directUnitsSold + totalUnits,
    },
    revenue: roundMoney(totalRevenue),
    unitsSold: totalUnits,
    reports: newReports,
  };
}

export function retailVenueUpgradeCost(venue: RetailVenue): number {
  if (venue.level >= 3) return 0;
  return venue.type === 'bar' ? 11_500 * venue.level : 8_500 * venue.level;
}

function getVenue(retail: RetailState, venueId: string): RetailVenue {
  const venue = retail.venues.find((item) => item.id === venueId);
  if (!venue) throw new Error('Розничная точка не найдена');
  return venue;
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
