import type { BeverageCategoryId } from './beverageCatalog';

export type ConsumerChannel = 'bar' | 'shop' | 'club' | 'restaurant';
export type ConsumerOccasion = 'home' | 'after_work' | 'night_out' | 'meal' | 'celebration' | 'festival' | 'gift';

export interface RegionMarketProfileDefinition {
  regionId: string;
  countryId: string;
  population: number;
  adultShare: number;
  incomeIndex: number;
  urbanization: number;
  tourismIndex: number;
  baseTemperatureC: number;
  seasonalAmplitudeC: number;
  segmentShares: Record<ConsumerSegmentTemplateId, number>;
}

export type ConsumerSegmentTemplateId = 'value_households' | 'urban_professionals' | 'students' | 'hospitality_regulars' | 'premium_buyers' | 'tourists';

export interface ConsumerSegmentTemplate {
  id: ConsumerSegmentTemplateId;
  name: string;
  incomeIndex: number;
  priceSensitivity: number;
  moderation: number;
  exploration: number;
  channelWeights: Record<ConsumerChannel, number>;
  occasionWeights: Record<ConsumerOccasion, number>;
  categoryWeights: Partial<Record<BeverageCategoryId, number>>;
}

export const consumerSegmentTemplates: ConsumerSegmentTemplate[] = [
  {
    id: 'value_households',
    name: 'Рациональные домохозяйства',
    incomeIndex: 0.82,
    priceSensitivity: 0.9,
    moderation: 0.66,
    exploration: 0.24,
    channelWeights: { bar: 0.18, shop: 1, club: 0.05, restaurant: 0.2 },
    occasionWeights: { home: 1, after_work: 0.25, night_out: 0.08, meal: 0.5, celebration: 0.45, festival: 0.18, gift: 0.2 },
    categoryWeights: { beer: 1, cider: 0.65, still_wine: 0.68, sparkling_wine: 0.32, vodka: 0.42, rtd: 0.35, alcohol_free: 0.55 },
  },
  {
    id: 'urban_professionals',
    name: 'Городские профессионалы',
    incomeIndex: 1.24,
    priceSensitivity: 0.42,
    moderation: 0.55,
    exploration: 0.72,
    channelWeights: { bar: 0.78, shop: 0.68, club: 0.38, restaurant: 0.82 },
    occasionWeights: { home: 0.58, after_work: 0.9, night_out: 0.62, meal: 0.82, celebration: 0.72, festival: 0.48, gift: 0.65 },
    categoryWeights: { beer: 0.72, cider: 0.58, still_wine: 0.9, sparkling_wine: 0.72, whisky: 0.64, gin: 0.78, rum: 0.48, liqueur: 0.5, vermouth_aperitif: 0.62, rtd: 0.42, alcohol_free: 0.68 },
  },
  {
    id: 'students',
    name: 'Студенты и молодая аудитория',
    incomeIndex: 0.62,
    priceSensitivity: 0.86,
    moderation: 0.38,
    exploration: 0.66,
    channelWeights: { bar: 0.78, shop: 0.86, club: 1, restaurant: 0.18 },
    occasionWeights: { home: 0.6, after_work: 0.2, night_out: 1, meal: 0.12, celebration: 0.78, festival: 0.9, gift: 0.08 },
    categoryWeights: { beer: 0.9, cider: 0.82, vodka: 0.5, rum: 0.45, gin: 0.42, liqueur: 0.58, rtd: 1, alcohol_free: 0.48, mixer: 0.65 },
  },
  {
    id: 'hospitality_regulars',
    name: 'Постоянные гости заведений',
    incomeIndex: 1.02,
    priceSensitivity: 0.58,
    moderation: 0.44,
    exploration: 0.48,
    channelWeights: { bar: 1, shop: 0.3, club: 0.48, restaurant: 0.72 },
    occasionWeights: { home: 0.2, after_work: 0.85, night_out: 0.82, meal: 0.68, celebration: 0.62, festival: 0.42, gift: 0.12 },
    categoryWeights: { beer: 1, cider: 0.7, still_wine: 0.62, whisky: 0.58, rum: 0.45, vodka: 0.42, gin: 0.6, liqueur: 0.35, vermouth_aperitif: 0.38, rtd: 0.42, alcohol_free: 0.42 },
  },
  {
    id: 'premium_buyers',
    name: 'Премиальные покупатели',
    incomeIndex: 1.78,
    priceSensitivity: 0.16,
    moderation: 0.7,
    exploration: 0.74,
    channelWeights: { bar: 0.64, shop: 0.72, club: 0.2, restaurant: 1 },
    occasionWeights: { home: 0.52, after_work: 0.42, night_out: 0.35, meal: 0.88, celebration: 1, festival: 0.25, gift: 1 },
    categoryWeights: { still_wine: 1, sparkling_wine: 0.95, fortified_wine: 0.58, whisky: 1, rum: 0.62, gin: 0.58, agave_spirit: 0.55, brandy: 0.82, liqueur: 0.42, vermouth_aperitif: 0.52, sake: 0.38, alcohol_free: 0.42 },
  },
  {
    id: 'tourists',
    name: 'Туристы',
    incomeIndex: 1.08,
    priceSensitivity: 0.38,
    moderation: 0.48,
    exploration: 0.86,
    channelWeights: { bar: 0.82, shop: 0.56, club: 0.42, restaurant: 0.9 },
    occasionWeights: { home: 0.05, after_work: 0.08, night_out: 0.76, meal: 0.82, celebration: 0.62, festival: 1, gift: 0.72 },
    categoryWeights: { beer: 0.76, cider: 0.78, still_wine: 0.8, sparkling_wine: 0.65, whisky: 0.54, gin: 0.5, brandy: 0.42, liqueur: 0.48, vermouth_aperitif: 0.45, alcohol_free: 0.38 },
  },
];

export const regionMarketProfiles: RegionMarketProfileDefinition[] = [
  { regionId: 'bavaria', countryId: 'germany', population: 1_590_000, adultShare: 0.79, incomeIndex: 1.18, urbanization: 0.78, tourismIndex: 0.82, baseTemperatureC: 9, seasonalAmplitudeC: 11, segmentShares: { value_households: .25, urban_professionals: .24, students: .13, hospitality_regulars: .18, premium_buyers: .11, tourists: .09 } },
  { regionId: 'hesse', countryId: 'germany', population: 1_180_000, adultShare: 0.8, incomeIndex: 1.15, urbanization: 0.84, tourismIndex: 0.48, baseTemperatureC: 10, seasonalAmplitudeC: 10, segmentShares: { value_households: .27, urban_professionals: .29, students: .12, hospitality_regulars: .16, premium_buyers: .11, tourists: .05 } },
  { regionId: 'normandy', countryId: 'france', population: 920_000, adultShare: 0.81, incomeIndex: .98, urbanization: 0.62, tourismIndex: .78, baseTemperatureC: 11, seasonalAmplitudeC: 7, segmentShares: { value_households: .31, urban_professionals: .17, students: .09, hospitality_regulars: .17, premium_buyers: .1, tourists: .16 } },
  { regionId: 'grand-est', countryId: 'france', population: 1_060_000, adultShare: .8, incomeIndex: 1.03, urbanization: .72, tourismIndex: .62, baseTemperatureC: 10, seasonalAmplitudeC: 11, segmentShares: { value_households: .3, urban_professionals: .22, students: .12, hospitality_regulars: .17, premium_buyers: .1, tourists: .09 } },
  { regionId: 'somerset', countryId: 'united-kingdom', population: 810_000, adultShare: .79, incomeIndex: 1.02, urbanization: .67, tourismIndex: .72, baseTemperatureC: 11, seasonalAmplitudeC: 7, segmentShares: { value_households: .28, urban_professionals: .2, students: .15, hospitality_regulars: .18, premium_buyers: .08, tourists: .11 } },
  { regionId: 'kent', countryId: 'united-kingdom', population: 1_240_000, adultShare: .79, incomeIndex: 1.12, urbanization: .76, tourismIndex: .68, baseTemperatureC: 11, seasonalAmplitudeC: 8, segmentShares: { value_households: .27, urban_professionals: .25, students: .1, hospitality_regulars: .16, premium_buyers: .11, tourists: .11 } },
];
