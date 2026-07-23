import { beverageCategories, type BeverageCategoryId } from '../data/beverageCatalog';
import {
  consumerSegmentTemplates,
  regionMarketProfiles,
  type ConsumerChannel,
  type ConsumerOccasion,
  type ConsumerSegmentTemplateId,
} from '../data/demandCatalog';

export type WeatherCondition = 'clear' | 'rain' | 'cold' | 'heat';
export type DemandEventKind = 'weekend' | 'payday' | 'festival' | 'tourism_wave' | 'cold_snap' | 'heat_wave' | 'quiet_week';

export interface ConsumerSegmentState {
  id: string;
  templateId: ConsumerSegmentTemplateId;
  regionId: string;
  name: string;
  adults: number;
  incomeIndex: number;
  priceSensitivity: number;
  moderation: number;
  exploration: number;
  channelWeights: Record<ConsumerChannel, number>;
  occasionWeights: Record<ConsumerOccasion, number>;
  categoryWeights: Partial<Record<BeverageCategoryId, number>>;
}

export interface RegionDemandSignal {
  categoryId: BeverageCategoryId;
  index: number;
  trend: 'falling' | 'stable' | 'rising';
}

export interface RegionDemandDay {
  day: number;
  temperatureC: number;
  weather: WeatherCondition;
  weekend: boolean;
  payday: boolean;
  tourismMultiplier: number;
  householdConfidence: number;
  channelTraffic: Record<ConsumerChannel, number>;
  categorySignals: RegionDemandSignal[];
  activeEventIds: string[];
}

export interface RegionPopulationState {
  regionId: string;
  countryId: string;
  population: number;
  adultPopulation: number;
  incomeIndex: number;
  urbanization: number;
  tourismIndex: number;
  segments: ConsumerSegmentState[];
  today: RegionDemandDay;
  history: RegionDemandDay[];
}

export interface DemandEventState {
  id: string;
  regionId: string;
  kind: DemandEventKind;
  title: string;
  startDay: number;
  endDay: number;
  channelModifiers: Partial<Record<ConsumerChannel, number>>;
  categoryModifiers: Partial<Record<BeverageCategoryId, number>>;
}

export interface ConsumerPurchaseState {
  id: string;
  day: number;
  regionId: string;
  assetId: string;
  productId: string;
  categoryId: BeverageCategoryId;
  channel: ConsumerChannel;
  units: number;
  unitPrice: number;
  revenue: number;
  primarySegmentId: ConsumerSegmentTemplateId;
  occasion: ConsumerOccasion;
}

export interface DemandState {
  demandVersion: 1;
  seed: number;
  currentDay: number;
  regions: RegionPopulationState[];
  events: DemandEventState[];
  purchases: ConsumerPurchaseState[];
  nextEventNumber: number;
  nextPurchaseNumber: number;
}

export interface ShelfDemandInput {
  day: number;
  regionId: string;
  assetId: string;
  assetType: string;
  assetFootfall: number;
  productId: string;
  beverageCategoryId: BeverageCategoryId;
  quality: number;
  retailPrice: number;
  referencePrice: number;
  organizationReputation: number;
}

export interface ShelfDemandResult {
  units: number;
  primarySegmentId: ConsumerSegmentTemplateId;
  occasion: ConsumerOccasion;
  channel: ConsumerChannel;
  demandIndex: number;
}

export function createDemandState(day: number, seedText: string): DemandState {
  const seed = hash(seedText);
  const regions = regionMarketProfiles.map((profile) => {
    const segments = consumerSegmentTemplates.map((template) => {
      const share = profile.segmentShares[template.id];
      return {
        id: `segment-${profile.regionId}-${template.id}`,
        templateId: template.id,
        regionId: profile.regionId,
        name: template.name,
        adults: Math.round(profile.population * profile.adultShare * share),
        incomeIndex: round(profile.incomeIndex * template.incomeIndex),
        priceSensitivity: template.priceSensitivity,
        moderation: template.moderation,
        exploration: template.exploration,
        channelWeights: { ...template.channelWeights },
        occasionWeights: { ...template.occasionWeights },
        categoryWeights: { ...template.categoryWeights },
      } satisfies ConsumerSegmentState;
    });
    const region: RegionPopulationState = {
      regionId: profile.regionId,
      countryId: profile.countryId,
      population: profile.population,
      adultPopulation: Math.round(profile.population * profile.adultShare),
      incomeIndex: profile.incomeIndex,
      urbanization: profile.urbanization,
      tourismIndex: profile.tourismIndex,
      segments,
      today: emptyDemandDay(day),
      history: [],
    };
    region.today = calculateRegionDay(region, day, seed, []);
    return region;
  });
  return { demandVersion: 1, seed, currentDay: day, regions, events: [], purchases: [], nextEventNumber: 1, nextPurchaseNumber: 1 };
}

export function normalizeDemandState(state: DemandState | undefined, day: number, seedText: string): DemandState {
  if (!state || state.demandVersion !== 1) return createDemandState(day, seedText);
  const base = createDemandState(day, seedText);
  const existing = new Map(state.regions.map((region) => [region.regionId, region]));
  return {
    ...state,
    currentDay: day,
    regions: base.regions.map((region) => {
      const old = existing.get(region.regionId);
      return old ? { ...region, ...old, segments: old.segments?.length ? old.segments : region.segments, today: old.today ?? region.today, history: old.history ?? [] } : region;
    }),
    events: state.events ?? [],
    purchases: state.purchases ?? [],
    nextEventNumber: state.nextEventNumber ?? 1,
    nextPurchaseNumber: state.nextPurchaseNumber ?? 1,
  };
}

export function advanceDemandDay(state: DemandState, day: number): DemandState {
  let next = normalizeDemandState(state, day, String(state.seed));
  let events = next.events.filter((event) => event.endDay >= day - 7);
  let nextEventNumber = next.nextEventNumber;
  for (const region of next.regions) {
    const generated = createDeterministicEvents(region, day, next.seed, nextEventNumber);
    events.push(...generated);
    nextEventNumber += generated.length;
  }
  events = uniqueBy(events, (event) => event.id).slice(-180);
  const regions = next.regions.map((region) => {
    const active = events.filter((event) => event.regionId === region.regionId && event.startDay <= day && event.endDay >= day);
    const today = calculateRegionDay(region, day, next.seed, active);
    return { ...region, today, history: [today, ...region.history.filter((item) => item.day !== day)].slice(0, 120) };
  });
  return { ...next, currentDay: day, regions, events, nextEventNumber };
}

export function calculateShelfDemand(state: DemandState, input: ShelfDemandInput): ShelfDemandResult {
  const region = state.regions.find((item) => item.regionId === input.regionId) ?? state.regions[0];
  if (!region) return { units: 0, primarySegmentId: 'value_households', occasion: 'home', channel: 'shop', demandIndex: 0 };
  const channel = channelForAsset(input.assetType);
  const signal = region.today.categorySignals.find((item) => item.categoryId === input.beverageCategoryId)?.index ?? 1;
  const candidates = region.segments.map((segment) => {
    const categoryWeight = segment.categoryWeights[input.beverageCategoryId] ?? familyFallback(input.beverageCategoryId, segment.categoryWeights);
    const channelWeight = segment.channelWeights[channel];
    const priceRatio = input.retailPrice / Math.max(.5, input.referencePrice);
    const affordability = clamp(1.35 - Math.max(0, priceRatio - segment.incomeIndex) * segment.priceSensitivity, .12, 1.35);
    const qualityFit = clamp(.45 + input.quality / 120 + segment.exploration * .18, .3, 1.45);
    const score = segment.adults * categoryWeight * channelWeight * affordability * qualityFit;
    return { segment, score };
  }).sort((a, b) => b.score - a.score);
  const primary = candidates[0]?.segment ?? region.segments[0];
  const populationWeight = candidates.reduce((sum, item) => sum + item.score, 0) / Math.max(1, region.adultPopulation);
  const footfallCapacity = input.assetFootfall / 15;
  const reputation = .65 + input.organizationReputation / 180;
  const deterministicNoise = ((hash(`${state.seed}:${input.assetId}:${input.productId}:${input.day}`) % 17) - 8) / 20;
  const units = Math.max(0, Math.round(footfallCapacity * populationWeight * signal * reputation + deterministicNoise));
  return {
    units,
    primarySegmentId: primary?.templateId ?? 'value_households',
    occasion: dominantOccasion(primary, region.today, channel),
    channel,
    demandIndex: round(populationWeight * signal),
  };
}

export function recordConsumerPurchase(state: DemandState, input: Omit<ConsumerPurchaseState, 'id'>): DemandState {
  if (input.units <= 0) return state;
  const id = `consumer-purchase-${input.day}-${state.nextPurchaseNumber}`;
  return { ...state, purchases: [{ ...input, id }, ...state.purchases].slice(0, 1200), nextPurchaseNumber: state.nextPurchaseNumber + 1 };
}

export function regionDemandSummary(state: DemandState, regionId: string): { headline: string; detail: string } {
  const region = state.regions.find((item) => item.regionId === regionId);
  if (!region) return { headline: 'Нет данных', detail: 'Региональный спрос ещё не рассчитан.' };
  const strongest = [...region.today.categorySignals].sort((a, b) => b.index - a.index).slice(0, 3);
  const names = strongest.map((signal) => beverageCategories.find((item) => item.id === signal.categoryId)?.name ?? signal.categoryId).join(', ');
  const eventTitles = state.events.filter((event) => event.regionId === regionId && event.startDay <= state.currentDay && event.endDay >= state.currentDay).map((event) => event.title);
  return {
    headline: names || 'Стабильный рынок',
    detail: `${Math.round(region.today.temperatureC)}°C · ${region.today.weekend ? 'выходной спрос' : 'будний спрос'}${eventTitles.length ? ` · ${eventTitles.join(', ')}` : ''}`,
  };
}

function calculateRegionDay(region: RegionPopulationState, day: number, seed: number, events: DemandEventState[]): RegionDemandDay {
  const profile = regionMarketProfiles.find((item) => item.regionId === region.regionId)!;
  const phase = ((day - 1) % 365) / 365;
  const seasonal = Math.sin((phase - .25) * Math.PI * 2) * profile.seasonalAmplitudeC;
  const weatherNoise = ((hash(`${seed}:${region.regionId}:weather:${day}`) % 81) - 40) / 10;
  const temperatureC = round(profile.baseTemperatureC + seasonal + weatherNoise);
  const weather: WeatherCondition = temperatureC >= 25 ? 'heat' : temperatureC <= 1 ? 'cold' : hash(`${seed}:${region.regionId}:rain:${day}`) % 5 === 0 ? 'rain' : 'clear';
  const weekend = day % 7 === 6 || day % 7 === 0;
  const payday = day % 30 <= 2;
  const tourismMultiplier = round(1 + profile.tourismIndex * (temperatureC >= 15 ? .22 : .08) + (weekend ? .08 : 0));
  const householdConfidence = round(clamp(.92 + Math.sin(day / 47 + profile.incomeIndex) * .08 + (payday ? .06 : 0), .72, 1.12));
  const channelTraffic: Record<ConsumerChannel, number> = { bar: 1, shop: 1, club: 1, restaurant: 1 };
  if (weekend) { channelTraffic.bar += .22; channelTraffic.club += .38; channelTraffic.restaurant += .18; }
  if (payday) { channelTraffic.bar += .12; channelTraffic.club += .16; channelTraffic.shop += .08; }
  if (weather === 'heat') { channelTraffic.bar += .14; channelTraffic.club += .08; channelTraffic.shop += .12; }
  if (weather === 'rain') { channelTraffic.shop += .12; channelTraffic.bar -= .06; channelTraffic.restaurant -= .04; }
  for (const event of events) for (const [channel, modifier] of Object.entries(event.channelModifiers)) channelTraffic[channel as ConsumerChannel] += modifier ?? 0;

  const categorySignals = beverageCategories.map((category) => {
    let index = weightedCategoryInterest(region, category.id) * householdConfidence;
    if (category.id === 'beer' || category.id === 'cider' || category.id === 'rtd' || category.id === 'alcohol_free') index *= weather === 'heat' ? 1.22 : weather === 'cold' ? .82 : 1;
    if (category.id === 'whisky' || category.id === 'brandy' || category.id === 'fortified_wine') index *= weather === 'cold' ? 1.2 : weather === 'heat' ? .82 : 1;
    if (category.id === 'sparkling_wine') index *= payday || weekend ? 1.15 : .94;
    if (category.id === 'still_wine') index *= channelTraffic.restaurant;
    for (const event of events) index *= 1 + (event.categoryModifiers[category.id] ?? 0);
    index = round(clamp(index, .15, 1.85));
    const previous = region.today.categorySignals.find((item) => item.categoryId === category.id)?.index ?? index;
    return { categoryId: category.id, index, trend: index > previous + .05 ? 'rising' as const : index < previous - .05 ? 'falling' as const : 'stable' as const };
  });
  return { day, temperatureC, weather, weekend, payday, tourismMultiplier, householdConfidence, channelTraffic, categorySignals, activeEventIds: events.map((event) => event.id) };
}

function createDeterministicEvents(region: RegionPopulationState, day: number, seed: number, startNumber: number): DemandEventState[] {
  const result: DemandEventState[] = [];
  const add = (kind: DemandEventKind, title: string, duration: number, channels: Partial<Record<ConsumerChannel, number>>, categories: Partial<Record<BeverageCategoryId, number>>) => result.push({ id: `demand-event-${day}-${startNumber + result.length}`, regionId: region.regionId, kind, title, startDay: day, endDay: day + duration - 1, channelModifiers: channels, categoryModifiers: categories });
  const roll = hash(`${seed}:${region.regionId}:event:${day}`) % 1000;
  if (day % 7 === 6) add('weekend', 'Выходные в городе', 2, { bar: .16, club: .25, restaurant: .12 }, { beer: .08, cider: .06, rtd: .12 });
  if (day % 30 === 1) add('payday', 'Зарплатная неделя', 3, { shop: .08, bar: .1, restaurant: .08 }, { sparkling_wine: .1, whisky: .06, gin: .05 });
  if (roll < 16) add('festival', 'Городской фестиваль', 3, { bar: .28, club: .18, restaurant: .16 }, { beer: .18, cider: .16, rtd: .15, alcohol_free: .08 });
  else if (roll < 29) add('tourism_wave', 'Наплыв туристов', 5, { bar: .16, restaurant: .22, shop: .08 }, { still_wine: .1, cider: .12, whisky: .06 });
  else if (roll > 985) add('quiet_week', 'Тихая неделя', 4, { bar: -.14, club: -.18, restaurant: -.1 }, {});
  return result;
}

function weightedCategoryInterest(region: RegionPopulationState, categoryId: BeverageCategoryId): number {
  const sum = region.segments.reduce((total, segment) => total + segment.adults * (segment.categoryWeights[categoryId] ?? familyFallback(categoryId, segment.categoryWeights)), 0);
  return round(sum / Math.max(1, region.adultPopulation));
}

function familyFallback(categoryId: BeverageCategoryId, weights: Partial<Record<BeverageCategoryId, number>>): number {
  const category = beverageCategories.find((item) => item.id === categoryId);
  if (!category) return .25;
  const ids = beverageCategories.filter((item) => item.industryGroup === category.industryGroup).map((item) => item.id);
  const known = ids.map((id) => weights[id]).filter((value): value is number => typeof value === 'number');
  return known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : .25;
}

function channelForAsset(assetType: string): ConsumerChannel {
  if (assetType === 'nightclub' || assetType === 'music_venue') return 'club';
  if (assetType === 'restaurant') return 'restaurant';
  if (assetType === 'shop') return 'shop';
  if (assetType === 'bar' || assetType === 'pub' || assetType === 'cocktail_bar' || assetType === 'hotel_bar' || assetType === 'wine_bar' || assetType === 'lounge') return 'bar';
  return 'shop';
}

function dominantOccasion(segment: ConsumerSegmentState | undefined, day: RegionDemandDay, channel: ConsumerChannel): ConsumerOccasion {
  if (!segment) return channel === 'shop' ? 'home' : 'night_out';
  const weights = { ...segment.occasionWeights };
  if (day.weekend) { weights.night_out += .25; weights.celebration += .15; }
  if (day.payday) weights.celebration += .12;
  if (channel === 'shop') weights.home += .35;
  if (channel === 'restaurant') weights.meal += .45;
  if (channel === 'club') weights.night_out += .55;
  return (Object.entries(weights).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'home') as ConsumerOccasion;
}

function emptyDemandDay(day: number): RegionDemandDay {
  return { day, temperatureC: 10, weather: 'clear', weekend: false, payday: false, tourismMultiplier: 1, householdConfidence: 1, channelTraffic: { bar: 1, shop: 1, club: 1, restaurant: 1 }, categorySignals: [], activeEventIds: [] };
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); }
  return result >>> 0;
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function round(value: number): number { return Math.round(value * 1000) / 1000; }
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] { const seen = new Set<string>(); return items.filter((item) => { const id = key(item); if (seen.has(id)) return false; seen.add(id); return true; }); }
