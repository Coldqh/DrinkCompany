import { cocktailRecipe, cocktailRecipes, type CocktailRecipeDefinition } from '../data/cocktailCatalog';
import type { HospitalityVenueConcept } from '../data/hospitalityCatalog';
import type { ConsumerSegmentTemplateId } from '../data/demandCatalog';
import type { DemandState, RegionPopulationState } from './demand';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { HospitalityMenuItemState, HospitalityVenueState } from './hospitality';

export type HospitalityTasteDimension = 'sweet' | 'sour' | 'bitter' | 'dry' | 'strong' | 'refreshing' | 'classic' | 'experimental';
export type CocktailTrendStage = 'dormant' | 'emerging' | 'rising' | 'stable' | 'peak' | 'saturated' | 'falling';
export type CocktailTrendCause = 'regional_taste' | 'season' | 'promotion' | 'venue_success' | 'oversupply' | 'cooldown';

export interface HospitalityRegionTasteState {
  regionId: string;
  day: number;
  dimensions: Record<HospitalityTasteDimension, number>;
  priceTolerance: number;
  qualityExpectation: number;
  exploration: number;
  dominantSegments: ConsumerSegmentTemplateId[];
}

export interface HospitalityCocktailTrendState {
  regionId: string;
  recipeId: string;
  popularity: number;
  momentum: number;
  saturation: number;
  stage: CocktailTrendStage;
  cause: CocktailTrendCause;
  startedDay: number;
  updatedDay: number;
}

export interface HospitalityTrendSnapshotState {
  id: string;
  day: number;
  regionId: string;
  recipeId: string;
  popularity: number;
  momentum: number;
  saturation: number;
  stage: CocktailTrendStage;
  cause: CocktailTrendCause;
}

export interface HospitalityMarketState {
  tasteProfiles: HospitalityRegionTasteState[];
  cocktailTrends: HospitalityCocktailTrendState[];
  trendHistory: HospitalityTrendSnapshotState[];
}

export interface HospitalityMarketAdvanceResult extends HospitalityMarketState {
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export interface CocktailMarketMetrics {
  marketScore: number;
  trendScore: number;
  competitionPressure: number;
}

const dimensions: HospitalityTasteDimension[] = ['sweet', 'sour', 'bitter', 'dry', 'strong', 'refreshing', 'classic', 'experimental'];

const segmentTaste: Record<ConsumerSegmentTemplateId, Record<HospitalityTasteDimension, number>> = {
  value_households: { sweet: .7, sour: .42, bitter: .28, dry: .38, strong: .5, refreshing: .62, classic: .76, experimental: .22 },
  urban_professionals: { sweet: .54, sour: .68, bitter: .72, dry: .76, strong: .62, refreshing: .71, classic: .68, experimental: .82 },
  students: { sweet: .92, sour: .72, bitter: .28, dry: .3, strong: .78, refreshing: .9, classic: .3, experimental: .86 },
  hospitality_regulars: { sweet: .52, sour: .6, bitter: .58, dry: .65, strong: .72, refreshing: .7, classic: .82, experimental: .48 },
  premium_buyers: { sweet: .4, sour: .58, bitter: .74, dry: .88, strong: .72, refreshing: .52, classic: .9, experimental: .66 },
  tourists: { sweet: .68, sour: .7, bitter: .48, dry: .58, strong: .58, refreshing: .86, classic: .56, experimental: .88 },
};

const regionalTaste: Partial<Record<string, Partial<Record<HospitalityTasteDimension, number>>>> = {
  bavaria: { classic: .12, strong: .08, refreshing: .08, experimental: -.05 },
  hesse: { dry: .1, bitter: .07, experimental: .08 },
  normandy: { sour: .1, refreshing: .1, classic: .06, strong: -.04 },
  'grand-est': { dry: .09, bitter: .1, classic: .08 },
  somerset: { sweet: .08, refreshing: .11, experimental: .06 },
  kent: { dry: .1, classic: .08, experimental: .05 },
};

const conceptTargets: Record<HospitalityVenueConcept, ConsumerSegmentTemplateId> = {
  pub: 'hospitality_regulars',
  cocktail_bar: 'urban_professionals',
  nightclub: 'students',
  restaurant: 'premium_buyers',
  hotel_bar: 'tourists',
  wine_bar: 'premium_buyers',
  lounge: 'premium_buyers',
  music_venue: 'students',
};

export function targetSegmentForConcept(concept: HospitalityVenueConcept): ConsumerSegmentTemplateId {
  return conceptTargets[concept];
}

export function createHospitalityMarketState(
  demand: DemandState,
  assets: WorldAssetState[],
  venues: HospitalityVenueState[],
  menuItems: HospitalityMenuItemState[],
  organizations: OrganizationState[],
  day: number,
): HospitalityMarketState {
  const tasteProfiles = demand.regions.map((region) => createTasteProfile(region, day));
  const cocktailTrends = demand.regions.flatMap((region) => cocktailRecipes.map((recipe) => createInitialTrend(
    region,
    recipe,
    tasteProfiles.find((profile) => profile.regionId === region.regionId)!,
    assets,
    venues,
    menuItems,
    organizations,
    day,
  )));
  return { tasteProfiles, cocktailTrends, trendHistory: [] };
}

export function normalizeHospitalityMarketState(
  current: Partial<HospitalityMarketState> | undefined,
  demand: DemandState,
  assets: WorldAssetState[],
  venues: HospitalityVenueState[],
  menuItems: HospitalityMenuItemState[],
  organizations: OrganizationState[],
  day: number,
): HospitalityMarketState {
  const base = createHospitalityMarketState(demand, assets, venues, menuItems, organizations, day);
  const currentProfiles = new Map((current?.tasteProfiles ?? []).map((profile) => [profile.regionId, profile]));
  const currentTrends = new Map((current?.cocktailTrends ?? []).map((trend) => [`${trend.regionId}:${trend.recipeId}`, trend]));
  return {
    tasteProfiles: base.tasteProfiles.map((profile) => {
      const stored = currentProfiles.get(profile.regionId);
      return stored ? { ...profile, ...stored, dimensions: { ...profile.dimensions, ...stored.dimensions } } : profile;
    }),
    cocktailTrends: base.cocktailTrends.map((trend) => {
      const stored = currentTrends.get(`${trend.regionId}:${trend.recipeId}`);
      return stored ? { ...trend, ...stored } : trend;
    }),
    trendHistory: (current?.trendHistory ?? []).filter((snapshot) => cocktailRecipe(snapshot.recipeId)).slice(0, 2400),
  };
}

export function advanceHospitalityMarketDay(input: {
  market: HospitalityMarketState;
  demand: DemandState;
  assets: WorldAssetState[];
  venues: HospitalityVenueState[];
  menuItems: HospitalityMenuItemState[];
  organizations: OrganizationState[];
  day: number;
}): HospitalityMarketAdvanceResult {
  const normalized = normalizeHospitalityMarketState(input.market, input.demand, input.assets, input.venues, input.menuItems, input.organizations, input.day);
  const tasteProfiles = input.demand.regions.map((region) => createTasteProfile(region, input.day));
  const previousByKey = new Map(normalized.cocktailTrends.map((trend) => [`${trend.regionId}:${trend.recipeId}`, trend]));
  const nextTrends: HospitalityCocktailTrendState[] = [];
  const newSnapshots: HospitalityTrendSnapshotState[] = [];
  const eventCandidates: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release'; weight: number }> = [];

  for (const region of input.demand.regions) {
    const profile = tasteProfiles.find((item) => item.regionId === region.regionId);
    if (!profile) continue;
    const regionVenues = input.venues.filter((venue) => input.assets.some((asset) => asset.id === venue.assetId && asset.regionId === region.regionId));
    const venueIds = new Set(regionVenues.map((venue) => venue.id));
    for (const recipe of cocktailRecipes) {
      const key = `${region.regionId}:${recipe.id}`;
      const previous = previousByKey.get(key) ?? createInitialTrend(region, recipe, profile, input.assets, input.venues, input.menuItems, input.organizations, input.day);
      const listedItems = input.menuItems.filter((item) => venueIds.has(item.venueId) && item.recipeId === recipe.id && item.listed);
      const listedVenueIds = new Set(listedItems.map((item) => item.venueId));
      const saturationTarget = clamp(
        listedVenueIds.size / Math.max(1, regionVenues.length) * 1.2 + listedItems.reduce((sum, item) => sum + item.recentOrders, 0) / Math.max(30, regionVenues.length * 75),
        0,
        1.5,
      );
      const saturation = round3(clamp(previous.saturation * .78 + saturationTarget * .22, 0, 1.5));
      const taste = recipeTasteScore(recipe, profile);
      const season = seasonalRecipeMultiplier(recipe, region);
      const category = categorySignalMultiplier(recipe, region);
      const promotion = promotionLift(recipe.id, region.regionId, listedItems, input.venues, input.assets, input.organizations);
      const venueSuccess = venueSuccessLift(listedItems);
      const hype = deterministicHype(region.regionId, recipe.id, input.day, profile.exploration);
      const oversupplyPenalty = Math.max(0, saturation - .62) * .52;
      const targetPopularity = clamp(.18 + taste * .58 + season * .18 + category * .22 + promotion + venueSuccess + hype - oversupplyPenalty, .05, 2.2);
      const momentum = round3(clamp(previous.momentum * .52 + (targetPopularity - previous.popularity) * .28, -.24, .24));
      const popularity = round3(clamp(previous.popularity + momentum, .05, 2.2));
      const proposedStage = trendStage(popularity, momentum, saturation);
      const stage = proposedStage !== previous.stage && input.day - previous.startedDay < 14 ? previous.stage : proposedStage;
      const cause = trendCause({ hype, season, promotion, venueSuccess, saturation, momentum });
      const next: HospitalityCocktailTrendState = {
        regionId: region.regionId,
        recipeId: recipe.id,
        popularity,
        momentum,
        saturation,
        stage,
        cause,
        startedDay: stage !== previous.stage ? input.day : previous.startedDay,
        updatedDay: input.day,
      };
      nextTrends.push(next);

      const stageChanged = stage !== previous.stage;
      const monthlyLeaderCandidate = input.day % 30 === 0 && popularity >= 1.18;
      if (stageChanged || monthlyLeaderCandidate) {
        newSnapshots.push({
          id: `hospitality-trend:${region.regionId}:${recipe.id}:${input.day}`,
          day: input.day,
          regionId: region.regionId,
          recipeId: recipe.id,
          popularity,
          momentum,
          saturation,
          stage,
          cause,
        });
      }
      if (stageChanged && (stage === 'rising' || stage === 'peak' || stage === 'saturated' || stage === 'falling')) {
        eventCandidates.push(trendEvent(recipe, region.regionId, next));
      }
    }
  }

  return {
    tasteProfiles,
    cocktailTrends: nextTrends,
    trendHistory: uniqueSnapshots([...newSnapshots, ...normalized.trendHistory]).slice(0, 2400),
    events: eventCandidates.sort((left, right) => right.weight - left.weight).slice(0, 3).map(({ title, detail, tone }) => ({ title, detail, tone })),
  };
}

export function cocktailMarketMetrics(input: {
  recipeId: string;
  venue: HospitalityVenueState;
  asset: WorldAssetState;
  market: HospitalityMarketState;
  menuItems: HospitalityMenuItemState[];
  assets: WorldAssetState[];
}): CocktailMarketMetrics {
  const trend = input.market.cocktailTrends.find((item) => item.regionId === input.asset.regionId && item.recipeId === input.recipeId);
  const profile = input.market.tasteProfiles.find((item) => item.regionId === input.asset.regionId);
  const recipe = cocktailRecipe(input.recipeId);
  if (!trend || !profile || !recipe) return { marketScore: 1, trendScore: 1, competitionPressure: 0 };
  const regionVenueIds = new Set(input.assets.filter((asset) => asset.regionId === input.asset.regionId).map((asset) => `hospitality-venue:${asset.id}`));
  const sameRecipeCompetitors = new Set(input.menuItems
    .filter((item) => item.recipeId === input.recipeId && item.listed && item.venueId !== input.venue.id && regionVenueIds.has(item.venueId))
    .map((item) => item.venueId));
  const audienceCompetitorIds = new Set(input.menuItems
    .filter((item) => item.listed && item.venueId !== input.venue.id && regionVenueIds.has(item.venueId))
    .map((item) => item.venueId));
  const competitionPressure = round3(clamp(trend.saturation * .58 + sameRecipeCompetitors.size * .08 + audienceCompetitorIds.size * .012, 0, 1.35));
  return {
    marketScore: round3(clamp(recipeAudienceScore(recipe, profile, input.venue.targetSegmentId), .2, 1.8)),
    trendScore: round3(clamp(trend.popularity, .05, 2.2)),
    competitionPressure,
  };
}

export function audienceCompetitionMultiplier(input: {
  venue: HospitalityVenueState;
  asset: WorldAssetState;
  venues: HospitalityVenueState[];
  assets: WorldAssetState[];
  organizations: OrganizationState[];
}): number {
  const competitors = input.venues.filter((venue) => {
    if (venue.id === input.venue.id || venue.status !== 'open' || venue.targetSegmentId !== input.venue.targetSegmentId) return false;
    const asset = input.assets.find((item) => item.id === venue.assetId);
    return asset?.regionId === input.asset.regionId;
  });
  if (!competitors.length) return 1.08;
  const ownOrganization = input.organizations.find((organization) => organization.id === input.venue.operatorOrganizationId);
  const ownAppeal = venueAppeal(input.venue, ownOrganization);
  const competitorAppeal = competitors.reduce((sum, venue) => {
    const organization = input.organizations.find((item) => item.id === venue.operatorOrganizationId);
    return sum + venueAppeal(venue, organization);
  }, 0) / competitors.length;
  return round3(clamp(.82 + ownAppeal / Math.max(30, competitorAppeal) * .2 - competitors.length * .018, .62, 1.28));
}

export function recipeRegionalScore(
  recipe: CocktailRecipeDefinition,
  regionId: string,
  market: HospitalityMarketState,
): number {
  const profile = market.tasteProfiles.find((item) => item.regionId === regionId);
  const trend = market.cocktailTrends.find((item) => item.regionId === regionId && item.recipeId === recipe.id);
  if (!profile || !trend) return 1;
  return round3(recipeTasteScore(recipe, profile) * (.72 + trend.popularity * .42) * (1 - clamp(trend.saturation - .65, 0, .65) * .28));
}

function createTasteProfile(region: RegionPopulationState, day: number): HospitalityRegionTasteState {
  const totalAdults = Math.max(1, region.segments.reduce((sum, segment) => sum + segment.adults, 0));
  const values = Object.fromEntries(dimensions.map((dimension) => [dimension, 0])) as Record<HospitalityTasteDimension, number>;
  for (const segment of region.segments) {
    const weight = segment.adults / totalAdults;
    for (const dimension of dimensions) values[dimension] += segmentTaste[segment.templateId][dimension] * weight;
  }
  const local = regionalTaste[region.regionId] ?? {};
  for (const dimension of dimensions) values[dimension] = round3(clamp(values[dimension] + (local[dimension] ?? 0), .12, 1.2));
  const dominantSegments = region.segments.slice().sort((left, right) => right.adults - left.adults).slice(0, 3).map((segment) => segment.templateId);
  const priceTolerance = round3(clamp(region.segments.reduce((sum, segment) => sum + segment.adults * (segment.incomeIndex * (1.15 - segment.priceSensitivity * .45)), 0) / totalAdults, .35, 1.8));
  const qualityExpectation = round3(clamp(.45 + region.incomeIndex * .33 + region.tourismIndex * .12 + values.dry * .12, .45, 1.35));
  const exploration = round3(clamp(region.segments.reduce((sum, segment) => sum + segment.adults * segment.exploration, 0) / totalAdults + region.tourismIndex * .08, .2, 1.15));
  return { regionId: region.regionId, day, dimensions: values, priceTolerance, qualityExpectation, exploration, dominantSegments };
}

function createInitialTrend(
  region: RegionPopulationState,
  recipe: CocktailRecipeDefinition,
  profile: HospitalityRegionTasteState,
  assets: WorldAssetState[],
  venues: HospitalityVenueState[],
  menuItems: HospitalityMenuItemState[],
  organizations: OrganizationState[],
  day: number,
): HospitalityCocktailTrendState {
  const taste = recipeTasteScore(recipe, profile);
  const season = seasonalRecipeMultiplier(recipe, region);
  const base = clamp(.42 + taste * .48 + season * .12 + deterministicFraction(`${region.regionId}:${recipe.id}:initial`, -.08, .08), .12, 1.55);
  const assetIds = new Set(assets.filter((asset) => asset.regionId === region.regionId).map((asset) => asset.id));
  const venueIds = new Set(venues.filter((venue) => assetIds.has(venue.assetId)).map((venue) => venue.id));
  const listedItems = menuItems.filter((item) => venueIds.has(item.venueId) && item.recipeId === recipe.id && item.listed);
  const saturation = clamp(listedItems.length / Math.max(1, venueIds.size), 0, 1.2);
  const promotion = promotionLift(recipe.id, region.regionId, listedItems, venues, assets, organizations);
  const popularity = round3(clamp(base + promotion, .08, 1.7));
  return {
    regionId: region.regionId,
    recipeId: recipe.id,
    popularity,
    momentum: 0,
    saturation: round3(saturation),
    stage: trendStage(popularity, 0, saturation),
    cause: 'regional_taste',
    startedDay: day,
    updatedDay: day,
  };
}

function recipeAudienceScore(
  recipe: CocktailRecipeDefinition,
  profile: HospitalityRegionTasteState,
  targetSegmentId: ConsumerSegmentTemplateId,
): number {
  const audience = segmentTaste[targetSegmentId];
  const blendedProfile: HospitalityRegionTasteState = {
    ...profile,
    dimensions: Object.fromEntries(dimensions.map((dimension) => [
      dimension,
      round3(profile.dimensions[dimension] * .58 + audience[dimension] * .42),
    ])) as Record<HospitalityTasteDimension, number>,
    exploration: round3(profile.exploration * .58 + audience.experimental * .42),
  };
  return recipeTasteScore(recipe, blendedProfile);
}

function recipeTasteScore(recipe: CocktailRecipeDefinition, profile: HospitalityRegionTasteState): number {
  const tagSet = new Set(recipe.tags);
  const weights: Array<[HospitalityTasteDimension, number]> = [];
  if (hasAny(tagSet, ['dessert', 'fruity', 'tropical', 'brunch', 'coffee'])) weights.push(['sweet', 1]);
  if (hasAny(tagSet, ['sour', 'citrus'])) weights.push(['sour', 1]);
  if (hasAny(tagSet, ['bitter', 'aperitif'])) weights.push(['bitter', 1]);
  if (hasAny(tagSet, ['dry', 'wine'])) weights.push(['dry', 1]);
  if (hasAny(tagSet, ['strong', 'spirit-forward', 'smoky'])) weights.push(['strong', 1]);
  if (hasAny(tagSet, ['refreshing', 'long', 'spritz', 'sparkling', 'tropical'])) weights.push(['refreshing', 1]);
  if (tagSet.has('classic')) weights.push(['classic', 1.15]);
  if (hasAny(tagSet, ['modern-classic', 'mixed-base', 'tropical'])) weights.push(['experimental', 1]);
  if (!weights.length) weights.push(['classic', .5], ['experimental', .5]);
  const weighted = weights.reduce((sum, [dimension, weight]) => sum + profile.dimensions[dimension] * weight, 0) / weights.reduce((sum, [, weight]) => sum + weight, 0);
  const complexityFit = recipe.complexity >= 4 ? .84 + profile.exploration * .26 : 1.02;
  return round3(clamp(weighted * complexityFit, .18, 1.55));
}

function seasonalRecipeMultiplier(recipe: CocktailRecipeDefinition, region: RegionPopulationState): number {
  const tags = new Set(recipe.tags);
  let result = 1;
  if (region.today.temperatureC >= 22 && hasAny(tags, ['refreshing', 'long', 'spritz', 'tropical', 'fruity'])) result += .28;
  if (region.today.temperatureC <= 5 && hasAny(tags, ['hot', 'coffee', 'spirit-forward', 'smoky', 'dessert'])) result += .25;
  if (region.today.weekend && hasAny(tags, ['strong', 'long', 'sparkling', 'tropical'])) result += .12;
  if (region.today.payday && hasAny(tags, ['classic', 'sparkling', 'spirit-forward'])) result += .08;
  if (region.today.weather === 'rain' && hasAny(tags, ['spritz', 'tropical'])) result -= .12;
  return round3(clamp(result, .65, 1.45));
}

function categorySignalMultiplier(recipe: CocktailRecipeDefinition, region: RegionPopulationState): number {
  const categories = recipe.ingredients.map((ingredient) => ingredient.categoryId).filter((value): value is NonNullable<typeof value> => Boolean(value));
  if (!categories.length) return 1;
  const values = categories.map((categoryId) => region.today.categorySignals.find((signal) => signal.categoryId === categoryId)?.index ?? 1);
  return round3(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function promotionLift(
  recipeId: string,
  regionId: string,
  listedItems: HospitalityMenuItemState[],
  venues: HospitalityVenueState[],
  assets: WorldAssetState[],
  organizations: OrganizationState[],
): number {
  if (!listedItems.length) return 0;
  let total = 0;
  let count = 0;
  for (const item of listedItems) {
    if (item.recipeId !== recipeId) continue;
    const venue = venues.find((candidate) => candidate.id === item.venueId);
    const asset = venue ? assets.find((candidate) => candidate.id === venue.assetId) : undefined;
    if (!venue || asset?.regionId !== regionId) continue;
    const organization = organizations.find((candidate) => candidate.id === venue.operatorOrganizationId);
    total += venue.marketingIntensity * (.55 + (organization?.reputation ?? 50) / 130);
    count += 1;
  }
  return count ? round3(clamp(total / count * .16, 0, .28)) : 0;
}

function venueSuccessLift(items: HospitalityMenuItemState[]): number {
  if (!items.length) return 0;
  const averageOrders = items.reduce((sum, item) => sum + item.recentOrders, 0) / items.length;
  return round3(clamp(averageOrders / 180, 0, .22));
}

function deterministicHype(regionId: string, recipeId: string, day: number, exploration: number): number {
  const cycle = Math.floor(Math.max(1, day) / 21);
  const roll = hash(`${regionId}:${recipeId}:hype:${cycle}`) % 1000;
  const threshold = 12 + Math.round(exploration * 20);
  if (roll < threshold) return .28 + (threshold - roll) / 160;
  if (roll > 992) return -.12;
  return 0;
}

function trendStage(popularity: number, momentum: number, saturation: number): CocktailTrendStage {
  if (popularity < .42) return 'dormant';
  if (momentum > .045 && popularity < .95) return 'emerging';
  if (momentum > .025 && popularity < 1.45) return 'rising';
  if (saturation >= .82 && popularity >= .9) return 'saturated';
  if (momentum < -.025) return 'falling';
  if (popularity >= 1.28) return 'peak';
  return 'stable';
}

function trendCause(input: { hype: number; season: number; promotion: number; venueSuccess: number; saturation: number; momentum: number }): CocktailTrendCause {
  if (input.saturation > .86 && input.momentum <= 0) return 'oversupply';
  if (input.hype >= .2) return 'venue_success';
  if (input.promotion >= .12) return 'promotion';
  if (input.season >= 1.18) return 'season';
  if (input.momentum < -.04) return 'cooldown';
  if (input.venueSuccess >= .1) return 'venue_success';
  return 'regional_taste';
}

function trendEvent(recipe: CocktailRecipeDefinition, regionId: string, trend: HospitalityCocktailTrendState): { title: string; detail: string; tone: 'market' | 'warning' | 'release'; weight: number } {
  if (trend.stage === 'saturated') return {
    tone: 'warning',
    title: `${recipe.name}: рынок перенасыщен`,
    detail: `${regionId}: коктейль есть почти у всех конкурентов, спрос перестал расти.`,
    weight: trend.saturation + trend.popularity,
  };
  if (trend.stage === 'falling') return {
    tone: 'warning',
    title: `${recipe.name}: интерес падает`,
    detail: `${regionId}: меню копируют друг друга, гости переключаются на другие позиции.`,
    weight: Math.abs(trend.momentum) + trend.popularity,
  };
  return {
    tone: trend.stage === 'peak' ? 'release' : 'market',
    title: `${recipe.name}: ${trend.stage === 'peak' ? 'пик популярности' : 'новый тренд'}`,
    detail: `${regionId}: популярность ${Math.round(trend.popularity * 100)}%, насыщение ${Math.round(trend.saturation * 100)}%.`,
    weight: trend.popularity + Math.max(0, trend.momentum) * 3,
  };
}

function venueAppeal(venue: HospitalityVenueState, organization: OrganizationState | undefined): number {
  return venue.reputation * .28 + venue.serviceQuality * .22 + venue.cleanliness * .08 + venue.marketingIntensity * 24 + (organization?.reputation ?? 50) * .22;
}

function hasAny(tags: Set<string>, values: string[]): boolean {
  return values.some((value) => tags.has(value));
}

function uniqueSnapshots(items: HospitalityTrendSnapshotState[]): HospitalityTrendSnapshotState[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function deterministicFraction(key: string, min: number, max: number): number {
  return min + (hash(key) / 0xffffffff) * (max - min);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
