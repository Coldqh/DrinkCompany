import type { BeverageCategoryId } from './beverageCatalog';

export type HospitalityAssetType = 'bar' | 'pub' | 'cocktail_bar' | 'nightclub' | 'restaurant' | 'hotel_bar' | 'wine_bar' | 'lounge' | 'music_venue';
export type HospitalityVenueConcept = Exclude<HospitalityAssetType, 'bar'> | 'pub';

export interface HospitalityConceptDefinition {
  id: HospitalityVenueConcept;
  name: string;
  channel: 'bar' | 'club' | 'restaurant';
  capacity: number;
  footfall: number;
  dailyOperatingCost: number;
  askingPrice: number;
  stations: number;
  bartenders: number;
  servers: number;
  security: number;
  openDays: number[];
  baseOccupancy: number;
  priceMultiplier: number;
  menuSlots: number;
  preferredCategories: BeverageCategoryId[];
  audience: string;
}

export interface HospitalitySeedDefinition {
  id: string;
  organizationId: string;
  organizationName: string;
  assetName: string;
  conceptId: HospitalityVenueConcept;
  countryId: string;
  regionId: string;
  city: string;
  address: string;
  ownerLabel: string;
  condition: number;
  reputation: number;
}

export const hospitalityConcepts: HospitalityConceptDefinition[] = [
  {
    id: 'pub', name: 'Паб', channel: 'bar', capacity: 130, footfall: 74, dailyOperatingCost: 430,
    askingPrice: 78_000, stations: 2, bartenders: 3, servers: 3, security: 1,
    openDays: [1, 2, 3, 4, 5, 6, 7], baseOccupancy: .58, priceMultiplier: 1.2, menuSlots: 14,
    preferredCategories: ['beer', 'cider', 'whisky', 'alcohol_free'], audience: 'местные гости, компании после работы, спортивные вечера',
  },
  {
    id: 'cocktail_bar', name: 'Коктейльный бар', channel: 'bar', capacity: 72, footfall: 59, dailyOperatingCost: 610,
    askingPrice: 128_000, stations: 2, bartenders: 4, servers: 3, security: 1,
    openDays: [2, 3, 4, 5, 6, 7], baseOccupancy: .66, priceMultiplier: 1.75, menuSlots: 22,
    preferredCategories: ['gin', 'rum', 'whisky', 'liqueur', 'vermouth_aperitif', 'amaro_bitter', 'mixer'], audience: 'городские профессионалы, свидания, любители авторских напитков',
  },
  {
    id: 'nightclub', name: 'Ночной клуб', channel: 'club', capacity: 520, footfall: 188, dailyOperatingCost: 2_450,
    askingPrice: 420_000, stations: 5, bartenders: 10, servers: 4, security: 9,
    openDays: [4, 5, 6], baseOccupancy: .64, priceMultiplier: 1.65, menuSlots: 18,
    preferredCategories: ['vodka', 'gin', 'rtd', 'sparkling_wine', 'mixer', 'alcohol_free'], audience: 'ночная аудитория, большие компании, мероприятия и гастрольные вечеринки',
  },
  {
    id: 'restaurant', name: 'Ресторан', channel: 'restaurant', capacity: 118, footfall: 83, dailyOperatingCost: 1_140,
    askingPrice: 238_000, stations: 1, bartenders: 2, servers: 9, security: 0,
    openDays: [1, 2, 3, 4, 5, 6, 7], baseOccupancy: .55, priceMultiplier: 1.55, menuSlots: 26,
    preferredCategories: ['still_wine', 'sparkling_wine', 'beer', 'brandy', 'alcohol_free'], audience: 'ужины, деловые встречи, семейные события и туристы',
  },
  {
    id: 'hotel_bar', name: 'Бар при отеле', channel: 'bar', capacity: 86, footfall: 64, dailyOperatingCost: 780,
    askingPrice: 176_000, stations: 2, bartenders: 3, servers: 4, security: 1,
    openDays: [1, 2, 3, 4, 5, 6, 7], baseOccupancy: .52, priceMultiplier: 1.8, menuSlots: 24,
    preferredCategories: ['whisky', 'gin', 'still_wine', 'sparkling_wine', 'brandy', 'mixer'], audience: 'деловые гости, туристы и поздние встречи',
  },
  {
    id: 'wine_bar', name: 'Винный бар', channel: 'bar', capacity: 58, footfall: 48, dailyOperatingCost: 520,
    askingPrice: 116_000, stations: 1, bartenders: 2, servers: 3, security: 0,
    openDays: [2, 3, 4, 5, 6, 7], baseOccupancy: .62, priceMultiplier: 1.72, menuSlots: 28,
    preferredCategories: ['still_wine', 'sparkling_wine', 'fortified_wine', 'vermouth_aperitif', 'brandy'], audience: 'винная аудитория, небольшие компании и гастрономические дегустации',
  },
  {
    id: 'lounge', name: 'Премиальный лаунж', channel: 'bar', capacity: 64, footfall: 41, dailyOperatingCost: 880,
    askingPrice: 194_000, stations: 2, bartenders: 3, servers: 4, security: 2,
    openDays: [3, 4, 5, 6, 7], baseOccupancy: .58, priceMultiplier: 2.15, menuSlots: 24,
    preferredCategories: ['whisky', 'brandy', 'rum', 'sparkling_wine', 'gin', 'liqueur'], audience: 'премиальные гости, переговоры и приватные мероприятия',
  },
  {
    id: 'music_venue', name: 'Музыкальная площадка', channel: 'club', capacity: 310, footfall: 132, dailyOperatingCost: 1_720,
    askingPrice: 306_000, stations: 3, bartenders: 7, servers: 2, security: 6,
    openDays: [3, 4, 5, 6, 7], baseOccupancy: .61, priceMultiplier: 1.48, menuSlots: 16,
    preferredCategories: ['beer', 'cider', 'rtd', 'vodka', 'alcohol_free', 'mixer'], audience: 'концерты, клубные события и фестивальная аудитория',
  },
];

export const hospitalitySeeds: HospitalitySeedDefinition[] = [
  { id: 'hafen-pub', organizationId: 'org-hospitality-hafen-pub', organizationName: 'Hafen Hospitality', assetName: 'Hafen Pub', conceptId: 'pub', countryId: 'germany', regionId: 'hesse', city: 'Франкфурт', address: 'Schifferstraße 18', ownerLabel: 'семья Фогель', condition: 78, reputation: 66 },
  { id: 'kesselhaus', organizationId: 'org-hospitality-kesselhaus', organizationName: 'Kesselhaus Betrieb', assetName: 'Kesselhaus Cocktails', conceptId: 'cocktail_bar', countryId: 'germany', regionId: 'bavaria', city: 'Мюнхен', address: 'Westendstraße 41', ownerLabel: 'Леон Хартман', condition: 84, reputation: 74 },
  { id: 'volt-club', organizationId: 'org-hospitality-volt-club', organizationName: 'Volt Night Operations', assetName: 'VOLT', conceptId: 'nightclub', countryId: 'germany', regionId: 'hesse', city: 'Франкфурт', address: 'Hanauer Landstraße 93', ownerLabel: 'Volt Beteiligung', condition: 71, reputation: 69 },
  { id: 'table-noire', organizationId: 'org-hospitality-table-noire', organizationName: 'Table Noire Groupe', assetName: 'Table Noire', conceptId: 'restaurant', countryId: 'france', regionId: 'grand-est', city: 'Страсбург', address: 'Rue des Tonneliers 12', ownerLabel: 'Клэр Бернар', condition: 88, reputation: 79 },
  { id: 'verre-fin', organizationId: 'org-hospitality-verre-fin', organizationName: 'Maison Verre Fin', assetName: 'Le Verre Fin', conceptId: 'wine_bar', countryId: 'france', regionId: 'normandy', city: 'Руан', address: 'Rue Eau-de-Robec 27', ownerLabel: 'семья Леруа', condition: 82, reputation: 76 },
  { id: 'grand-hotel-bar', organizationId: 'org-hospitality-grand-hotel', organizationName: 'Grand Hôtel Services', assetName: 'Bar du Grand Hôtel', conceptId: 'hotel_bar', countryId: 'france', regionId: 'grand-est', city: 'Реймс', address: 'Boulevard Foch 8', ownerLabel: 'Grand Hôtel Holdings', condition: 91, reputation: 83 },
  { id: 'anchor-yard', organizationId: 'org-hospitality-anchor-yard', organizationName: 'Anchor Yard Taverns', assetName: 'The Anchor Yard', conceptId: 'pub', countryId: 'united-kingdom', regionId: 'somerset', city: 'Бристоль', address: 'King Street 24', ownerLabel: 'Bennett Taverns', condition: 76, reputation: 68 },
  { id: 'black-room', organizationId: 'org-hospitality-black-room', organizationName: 'Black Room Leisure', assetName: 'Black Room', conceptId: 'lounge', countryId: 'united-kingdom', regionId: 'kent', city: 'Кентербери', address: 'Burgate 16', ownerLabel: 'Mason Leisure Group', condition: 86, reputation: 77 },
  { id: 'foundry-live', organizationId: 'org-hospitality-foundry-live', organizationName: 'Foundry Live Events', assetName: 'Foundry Live', conceptId: 'music_venue', countryId: 'united-kingdom', regionId: 'somerset', city: 'Бристоль', address: 'Temple Gate 63', ownerLabel: 'Foundry Events PLC', condition: 73, reputation: 72 },
];

export function hospitalityConcept(id: HospitalityVenueConcept): HospitalityConceptDefinition {
  const found = hospitalityConcepts.find((item) => item.id === id);
  if (!found) throw new Error(`Неизвестный формат заведения: ${id}`);
  return found;
}

export function isHospitalityAssetType(value: string): value is HospitalityAssetType {
  return value === 'bar' || hospitalityConcepts.some((item) => item.id === value);
}

export function hospitalityConceptForAssetType(value: string): HospitalityVenueConcept {
  if (value === 'bar') return 'pub';
  if (isHospitalityAssetType(value)) return value as HospitalityVenueConcept;
  return 'pub';
}

export function hospitalityPreferredCategories(value: string): BeverageCategoryId[] {
  return hospitalityConcept(hospitalityConceptForAssetType(value)).preferredCategories;
}
