export type PrimaryCommodityId = string;
export type PrimarySiteKind = 'field' | 'hop_yard' | 'orchard' | 'vineyard' | 'apiary' | 'botanical_farm';
export type PrimaryProcessorKind = 'malt_house' | 'hop_packer' | 'fruit_pool' | 'sugar_refinery' | 'culture_lab';

export interface PrimaryCommodityDefinition {
  id: PrimaryCommodityId;
  name: string;
  siteKind: PrimarySiteKind;
  unit: 'kg';
  plantDayOfYear: number;
  harvestDayOfYear: number;
  baseYieldPerHectare: number;
  shelfLifeDays: number;
  preferredTemperature: [number, number];
  preferredRain: [number, number];
  droughtSensitivity: number;
  diseaseSensitivity: number;
  futureBeverageUses: string[];
}

export interface PrimarySiteDefinition {
  id: string;
  organizationId: string;
  organizationName: string;
  assetId: string;
  assetName: string;
  countryId: string;
  regionId: string;
  city: string;
  address: string;
  commodityId: PrimaryCommodityId;
  hectares: number;
  soilQuality: number;
  irrigation: number;
  storageCapacity: number;
}

export interface PrimaryProcessorOutputDefinition {
  ingredientId: string;
  share: number;
  yieldPerInput: number;
  qualityModifier: number;
}

export interface PrimaryProcessorDefinition {
  id: string;
  organizationId: string;
  assetId: string;
  kind: PrimaryProcessorKind;
  inputCommodityId: PrimaryCommodityId;
  capacityPerDay: number;
  minimumInput: number;
  processingCostPerInput: number;
  outputs: PrimaryProcessorOutputDefinition[];
}

export const primaryCommodities: PrimaryCommodityDefinition[] = [
  {
    id: 'raw-barley', name: 'Пивоваренный ячмень', siteKind: 'field', unit: 'kg',
    plantDayOfYear: 72, harvestDayOfYear: 225, baseYieldPerHectare: 5_800, shelfLifeDays: 420,
    preferredTemperature: [9, 24], preferredRain: [1.2, 4.8], droughtSensitivity: .68, diseaseSensitivity: .42,
    futureBeverageUses: ['beer', 'whisky', 'vodka'],
  },
  {
    id: 'raw-hops', name: 'Шишки хмеля', siteKind: 'hop_yard', unit: 'kg',
    plantDayOfYear: 85, harvestDayOfYear: 245, baseYieldPerHectare: 1_950, shelfLifeDays: 70,
    preferredTemperature: [10, 26], preferredRain: [1.5, 5.5], droughtSensitivity: .78, diseaseSensitivity: .6,
    futureBeverageUses: ['beer', 'alcohol_free'],
  },
  {
    id: 'raw-apples', name: 'Сидровые яблоки', siteKind: 'orchard', unit: 'kg',
    plantDayOfYear: 1, harvestDayOfYear: 275, baseYieldPerHectare: 24_000, shelfLifeDays: 55,
    preferredTemperature: [6, 24], preferredRain: [1.8, 6.5], droughtSensitivity: .58, diseaseSensitivity: .66,
    futureBeverageUses: ['cider', 'brandy', 'alcohol_free'],
  },
  {
    id: 'raw-pears', name: 'Груши для перри', siteKind: 'orchard', unit: 'kg',
    plantDayOfYear: 1, harvestDayOfYear: 268, baseYieldPerHectare: 19_000, shelfLifeDays: 38,
    preferredTemperature: [7, 24], preferredRain: [1.8, 6.2], droughtSensitivity: .6, diseaseSensitivity: .64,
    futureBeverageUses: ['perry', 'brandy'],
  },
  {
    id: 'raw-sugar-beet', name: 'Сахарная свёкла', siteKind: 'field', unit: 'kg',
    plantDayOfYear: 90, harvestDayOfYear: 292, baseYieldPerHectare: 62_000, shelfLifeDays: 90,
    preferredTemperature: [8, 25], preferredRain: [1.4, 5.2], droughtSensitivity: .52, diseaseSensitivity: .35,
    futureBeverageUses: ['rum', 'rtd', 'liqueur', 'mixer'],
  },
  {
    id: 'raw-wine-grapes', name: 'Винный виноград', siteKind: 'vineyard', unit: 'kg',
    plantDayOfYear: 1, harvestDayOfYear: 258, baseYieldPerHectare: 8_200, shelfLifeDays: 12,
    preferredTemperature: [12, 29], preferredRain: [.6, 3.6], droughtSensitivity: .44, diseaseSensitivity: .72,
    futureBeverageUses: ['still_wine', 'sparkling_wine', 'fortified_wine', 'brandy', 'vermouth_aperitif'],
  },
  {
    id: 'raw-botanicals', name: 'Ботаникалы и травы', siteKind: 'botanical_farm', unit: 'kg',
    plantDayOfYear: 95, harvestDayOfYear: 220, baseYieldPerHectare: 2_600, shelfLifeDays: 260,
    preferredTemperature: [10, 27], preferredRain: [.8, 4.2], droughtSensitivity: .4, diseaseSensitivity: .32,
    futureBeverageUses: ['gin', 'liqueur', 'amaro_bitter', 'vermouth_aperitif', 'alcohol_free'],
  },
  {
    id: 'raw-honey', name: 'Мёд', siteKind: 'apiary', unit: 'kg',
    plantDayOfYear: 105, harvestDayOfYear: 235, baseYieldPerHectare: 420, shelfLifeDays: 1_800,
    preferredTemperature: [13, 30], preferredRain: [.4, 3.6], droughtSensitivity: .3, diseaseSensitivity: .48,
    futureBeverageUses: ['mead', 'liqueur'],
  },
];

export const primarySites: PrimarySiteDefinition[] = [
  { id: 'site-bavaria-barley', organizationId: 'org-grower-bavaria-grain', organizationName: 'Bavaria Grain Cooperative', assetId: 'asset-primary-bavaria-barley', assetName: 'Bavaria Malting Barley Fields', countryId: 'germany', regionId: 'bavaria', city: 'Мюнхен', address: 'Аграрный пояс 14', commodityId: 'raw-barley', hectares: 54, soilQuality: 86, irrigation: 68, storageCapacity: 180_000 },
  { id: 'site-kent-barley', organizationId: 'org-grower-kent-grain', organizationName: 'Kent Barley Estates', assetId: 'asset-primary-kent-barley', assetName: 'Kent Brewing Grain Estate', countryId: 'united-kingdom', regionId: 'kent', city: 'Кентербери', address: 'North Field Road 8', commodityId: 'raw-barley', hectares: 38, soilQuality: 79, irrigation: 54, storageCapacity: 120_000 },
  { id: 'site-hallertau-hops', organizationId: 'org-grower-hallertau-hop', organizationName: 'Hallertau Growers Union', assetId: 'asset-primary-hallertau-hop', assetName: 'Hallertau Hop Yards', countryId: 'germany', regionId: 'bavaria', city: 'Вольнцах', address: 'Hopfenweg 31', commodityId: 'raw-hops', hectares: 29, soilQuality: 91, irrigation: 76, storageCapacity: 24_000 },
  { id: 'site-yakima-hops', organizationId: 'org-grower-yakima-hop', organizationName: 'Yakima Valley Growers', assetId: 'asset-primary-yakima-hop', assetName: 'Yakima Export Hop Yards', countryId: 'united-states', regionId: 'yakima', city: 'Якима', address: 'North Valley 42', commodityId: 'raw-hops', hectares: 44, soilQuality: 84, irrigation: 88, storageCapacity: 36_000 },
  { id: 'site-normandy-apples', organizationId: 'org-grower-normandy-fruit', organizationName: 'Normandy Cider Orchards', assetId: 'asset-primary-normandy-apples', assetName: 'Normandy Bittersweet Orchards', countryId: 'france', regionId: 'normandy', city: 'Руан', address: 'Route des Pommiers 17', commodityId: 'raw-apples', hectares: 46, soilQuality: 88, irrigation: 61, storageCapacity: 380_000 },
  { id: 'site-somerset-apples', organizationId: 'org-grower-somerset-fruit', organizationName: 'Somerset Orchard Association', assetId: 'asset-primary-somerset-apples', assetName: 'Somerset Dabinett Orchards', countryId: 'united-kingdom', regionId: 'somerset', city: 'Тонтон', address: 'Orchard Lane 12', commodityId: 'raw-apples', hectares: 41, soilQuality: 83, irrigation: 58, storageCapacity: 330_000 },
  { id: 'site-asturias-apples', organizationId: 'org-grower-asturias-fruit', organizationName: 'Asturias Orchard Union', assetId: 'asset-primary-asturias-apples', assetName: 'Asturias Sharp Orchards', countryId: 'spain', regionId: 'asturias', city: 'Овьедо', address: 'Camino de Sidra 9', commodityId: 'raw-apples', hectares: 34, soilQuality: 81, irrigation: 72, storageCapacity: 270_000 },
  { id: 'site-anjou-pears', organizationId: 'org-grower-anjou-perry', organizationName: 'Anjou Perry Growers', assetId: 'asset-primary-anjou-pears', assetName: 'Anjou Perry Orchards', countryId: 'france', regionId: 'grand-est', city: 'Анже', address: 'Route des Poiriers 11', commodityId: 'raw-pears', hectares: 31, soilQuality: 85, irrigation: 60, storageCapacity: 220_000 },
  { id: 'site-silesia-beet', organizationId: 'org-grower-silesia-beet', organizationName: 'Silesia Beet Cooperative', assetId: 'asset-primary-silesia-beet', assetName: 'Silesia Sugar Beet Fields', countryId: 'poland', regionId: 'silesia', city: 'Катовице', address: 'Agro Park 6', commodityId: 'raw-sugar-beet', hectares: 62, soilQuality: 76, irrigation: 63, storageCapacity: 1_100_000 },
  { id: 'site-grand-est-grapes', organizationId: 'org-grower-grand-est-vine', organizationName: 'Grand Est Vineyard Union', assetId: 'asset-primary-grand-est-grapes', assetName: 'Grand Est Mixed Vineyards', countryId: 'france', regionId: 'grand-est', city: 'Реймс', address: 'Route des Vignes 28', commodityId: 'raw-wine-grapes', hectares: 27, soilQuality: 90, irrigation: 49, storageCapacity: 80_000 },
  { id: 'site-kent-botanicals', organizationId: 'org-grower-kent-botanicals', organizationName: 'Kent Botanical Fields', assetId: 'asset-primary-kent-botanicals', assetName: 'Kent Juniper & Herb Fields', countryId: 'united-kingdom', regionId: 'kent', city: 'Мейдстон', address: 'Botanical Hill 5', commodityId: 'raw-botanicals', hectares: 15, soilQuality: 77, irrigation: 57, storageCapacity: 18_000 },
  { id: 'site-hesse-apiary', organizationId: 'org-grower-hesse-honey', organizationName: 'Hesse Apiary Network', assetId: 'asset-primary-hesse-apiary', assetName: 'Hesse Meadow Apiaries', countryId: 'germany', regionId: 'hesse', city: 'Франкфурт', address: 'Wiesenring 21', commodityId: 'raw-honey', hectares: 85, soilQuality: 80, irrigation: 50, storageCapacity: 24_000 },
];

export const primaryProcessors: PrimaryProcessorDefinition[] = [
  { id: 'processor-rhein-malt', organizationId: 'org-supplier-rhein-malt', assetId: 'asset-supplier-rhein-malt', kind: 'malt_house', inputCommodityId: 'raw-barley', capacityPerDay: 1_450, minimumInput: 400, processingCostPerInput: .19, outputs: [{ ingredientId: 'malt-base', share: .84, yieldPerInput: .79, qualityModifier: 3 }, { ingredientId: 'malt-specialty', share: .16, yieldPerInput: .71, qualityModifier: 1 }] },
  { id: 'processor-kent-malt', organizationId: 'org-supplier-kent-grain', assetId: 'asset-supplier-kent-grain', kind: 'malt_house', inputCommodityId: 'raw-barley', capacityPerDay: 1_050, minimumInput: 320, processingCostPerInput: .22, outputs: [{ ingredientId: 'malt-base', share: .72, yieldPerInput: .78, qualityModifier: 2 }, { ingredientId: 'malt-specialty', share: .28, yieldPerInput: .68, qualityModifier: 2 }] },
  { id: 'processor-hallertau-hop', organizationId: 'org-supplier-hallertau-hop', assetId: 'asset-supplier-hallertau-hop', kind: 'hop_packer', inputCommodityId: 'raw-hops', capacityPerDay: 190, minimumInput: 45, processingCostPerInput: 1.8, outputs: [{ ingredientId: 'hops', share: 1, yieldPerInput: .82, qualityModifier: 4 }] },
  { id: 'processor-yakima-hop', organizationId: 'org-supplier-yakima-hop', assetId: 'asset-supplier-yakima-hop', kind: 'hop_packer', inputCommodityId: 'raw-hops', capacityPerDay: 230, minimumInput: 55, processingCostPerInput: 2.2, outputs: [{ ingredientId: 'hops', share: 1, yieldPerInput: .81, qualityModifier: 3 }] },
  { id: 'processor-normandy-fruit', organizationId: 'org-supplier-normandy-orchard', assetId: 'asset-supplier-normandy-orchard', kind: 'fruit_pool', inputCommodityId: 'raw-apples', capacityPerDay: 6_800, minimumInput: 1_100, processingCostPerInput: .04, outputs: [{ ingredientId: 'apples', share: 1, yieldPerInput: .94, qualityModifier: 3 }] },
  { id: 'processor-somerset-fruit', organizationId: 'org-supplier-somerset-fruit', assetId: 'asset-supplier-somerset-fruit', kind: 'fruit_pool', inputCommodityId: 'raw-apples', capacityPerDay: 5_900, minimumInput: 900, processingCostPerInput: .05, outputs: [{ ingredientId: 'apples', share: 1, yieldPerInput: .93, qualityModifier: 2 }] },
  { id: 'processor-asturias-fruit', organizationId: 'org-supplier-asturias-fruit', assetId: 'asset-supplier-asturias-fruit', kind: 'fruit_pool', inputCommodityId: 'raw-apples', capacityPerDay: 5_200, minimumInput: 850, processingCostPerInput: .05, outputs: [{ ingredientId: 'apples', share: 1, yieldPerInput: .92, qualityModifier: 2 }] },
  { id: 'processor-anjou-perry', organizationId: 'org-supplier-anjou-perry', assetId: 'asset-supplier-anjou-perry', kind: 'fruit_pool', inputCommodityId: 'raw-pears', capacityPerDay: 4_900, minimumInput: 800, processingCostPerInput: .055, outputs: [{ ingredientId: 'pears', share: 1, yieldPerInput: .91, qualityModifier: 3 }] },
  { id: 'processor-central-sugar', organizationId: 'org-supplier-bulk-sugar', assetId: 'asset-supplier-bulk-sugar', kind: 'sugar_refinery', inputCommodityId: 'raw-sugar-beet', capacityPerDay: 9_500, minimumInput: 2_000, processingCostPerInput: .035, outputs: [{ ingredientId: 'sugar', share: 1, yieldPerInput: .155, qualityModifier: 1 }] },
  { id: 'processor-ferment-beer', organizationId: 'org-supplier-ferment-lab', assetId: 'asset-supplier-ferment-lab', kind: 'culture_lab', inputCommodityId: 'raw-sugar-beet', capacityPerDay: 80, minimumInput: 20, processingCostPerInput: .75, outputs: [{ ingredientId: 'beer-yeast', share: .3, yieldPerInput: .18, qualityModifier: 8 }, { ingredientId: 'cider-yeast', share: .24, yieldPerInput: .18, qualityModifier: 8 }, { ingredientId: 'wine-yeast', share: .24, yieldPerInput: .18, qualityModifier: 8 }, { ingredientId: 'distillers-yeast', share: .22, yieldPerInput: .18, qualityModifier: 8 }] },
  { id: 'processor-grand-est-vine', organizationId: 'org-supplier-grand-est-vine', assetId: 'asset-supplier-grand-est-vine', kind: 'fruit_pool', inputCommodityId: 'raw-wine-grapes', capacityPerDay: 4_800, minimumInput: 900, processingCostPerInput: .08, outputs: [{ ingredientId: 'wine-grapes', share: 1, yieldPerInput: .93, qualityModifier: 3 }] },
  { id: 'processor-kent-botanical', organizationId: 'org-supplier-kent-botanical', assetId: 'asset-supplier-kent-botanical', kind: 'fruit_pool', inputCommodityId: 'raw-botanicals', capacityPerDay: 420, minimumInput: 80, processingCostPerInput: .65, outputs: [{ ingredientId: 'botanicals', share: 1, yieldPerInput: .84, qualityModifier: 4 }] },
  { id: 'processor-hesse-honey', organizationId: 'org-supplier-hesse-honey', assetId: 'asset-supplier-hesse-honey', kind: 'fruit_pool', inputCommodityId: 'raw-honey', capacityPerDay: 500, minimumInput: 90, processingCostPerInput: .24, outputs: [{ ingredientId: 'honey', share: 1, yieldPerInput: .96, qualityModifier: 3 }] },
];

export function primaryCommodity(id: PrimaryCommodityId): PrimaryCommodityDefinition {
  const commodity = primaryCommodities.find((item) => item.id === id);
  if (!commodity) throw new Error(`Неизвестное первичное сырьё: ${id}`);
  return commodity;
}
