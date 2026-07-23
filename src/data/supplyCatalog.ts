import type { FlavorProfile, ProductFamily } from '../domain/production';

export type IngredientCategory = 'base_malt' | 'specialty_malt' | 'hops' | 'beer_yeast' | 'apples' | 'pears' | 'grapes' | 'cider_yeast' | 'wine_yeast' | 'distillers_yeast' | 'sugar' | 'honey' | 'botanicals' | 'neutral_spirit' | 'molasses' | 'agave' | 'rice' | 'mixer_base' | 'citrus' | 'bottles';
export type IngredientUnit = 'kg' | 'pack' | 'unit';

export interface IngredientDefinition {
  id: string;
  category: IngredientCategory;
  name: string;
  unit: IngredientUnit;
  shelfLifeDays: number;
  families: Array<ProductFamily | 'shared'>;
}

export interface SupplierDefinition {
  id: string;
  name: string;
  country: string;
  region: string;
  focus: string;
  summary: string;
  reliability: number;
}

export interface SupplierOfferDefinition {
  id: string;
  supplierId: string;
  ingredientId: string;
  variantName: string;
  origin: string;
  basePrice: number;
  minimumOrder: number;
  defaultOrder: number;
  qualityRange: [number, number];
  leadDays: [number, number];
  seasonalVolatility: number;
  flavorImpact: Partial<FlavorProfile>;
}

export const ingredients: IngredientDefinition[] = [
  { id: 'malt-base', category: 'base_malt', name: 'Базовый солод', unit: 'kg', shelfLifeDays: 240, families: ['beer'] },
  { id: 'malt-specialty', category: 'specialty_malt', name: 'Специальный солод', unit: 'kg', shelfLifeDays: 220, families: ['beer'] },
  { id: 'hops', category: 'hops', name: 'Хмель', unit: 'kg', shelfLifeDays: 180, families: ['beer'] },
  { id: 'beer-yeast', category: 'beer_yeast', name: 'Пивные дрожжи', unit: 'pack', shelfLifeDays: 90, families: ['beer'] },
  { id: 'apples', category: 'apples', name: 'Яблоки', unit: 'kg', shelfLifeDays: 35, families: ['cider'] },
  { id: 'cider-yeast', category: 'cider_yeast', name: 'Сидровые дрожжи', unit: 'pack', shelfLifeDays: 90, families: ['cider'] },
  { id: 'sugar', category: 'sugar', name: 'Сахар для ферментации', unit: 'kg', shelfLifeDays: 720, families: ['cider'] },
  { id: 'pears', category: 'pears', name: 'Груши для перри', unit: 'kg', shelfLifeDays: 28, families: ['cider'] },
  { id: 'wine-grapes', category: 'grapes', name: 'Винный виноград', unit: 'kg', shelfLifeDays: 18, families: ['shared'] },
  { id: 'wine-yeast', category: 'wine_yeast', name: 'Винные дрожжи', unit: 'pack', shelfLifeDays: 100, families: ['shared'] },
  { id: 'distillers-yeast', category: 'distillers_yeast', name: 'Дистиллерские дрожжи', unit: 'pack', shelfLifeDays: 100, families: ['shared'] },
  { id: 'honey', category: 'honey', name: 'Мёд', unit: 'kg', shelfLifeDays: 1000, families: ['shared'] },
  { id: 'botanicals', category: 'botanicals', name: 'Ботаникалы', unit: 'kg', shelfLifeDays: 540, families: ['shared'] },
  { id: 'neutral-spirit', category: 'neutral_spirit', name: 'Нейтральный спирт', unit: 'kg', shelfLifeDays: 3600, families: ['shared'] },
  { id: 'molasses', category: 'molasses', name: 'Меласса', unit: 'kg', shelfLifeDays: 720, families: ['shared'] },
  { id: 'agave', category: 'agave', name: 'Агава', unit: 'kg', shelfLifeDays: 30, families: ['shared'] },
  { id: 'rice', category: 'rice', name: 'Рис для саке', unit: 'kg', shelfLifeDays: 540, families: ['shared'] },
  { id: 'mixer-base', category: 'mixer_base', name: 'Основа миксера', unit: 'kg', shelfLifeDays: 180, families: ['shared'] },
  { id: 'citrus', category: 'citrus', name: 'Цитрусовый концентрат', unit: 'kg', shelfLifeDays: 90, families: ['shared'] },
  { id: 'bottles', category: 'bottles', name: 'Бутылки 0,5 л', unit: 'unit', shelfLifeDays: 3600, families: ['shared'] },
];

export const suppliers: SupplierDefinition[] = [
  { id: 'rhein-malt', name: 'Rhein Malt Works', country: 'Германия', region: 'Бавария', focus: 'базовые и карамельные солода', reliability: 88, summary: 'Стабильный немецкий поставщик с ровным качеством и короткой доставкой.' },
  { id: 'kent-grain', name: 'Kent Grain Union', country: 'Великобритания', region: 'Кент', focus: 'пэйл- и портерные солода', reliability: 81, summary: 'Выразительное зерно для британских стилей, но партии отличаются сильнее.' },
  { id: 'hallertau-hop', name: 'Hallertau Hop Circle', country: 'Германия', region: 'Халлертау', focus: 'ароматический хмель', reliability: 90, summary: 'Чистая травянистая и цветочная ароматика, высокая предсказуемость.' },
  { id: 'yakima-hop', name: 'Yakima North Export', country: 'США', region: 'Вашингтон', focus: 'цитрусовый и тропический хмель', reliability: 76, summary: 'Яркие сорта для современных элей, выше цена и длиннее логистика.' },
  { id: 'normandy-orchard', name: 'Normandy Orchard Pool', country: 'Франция', region: 'Нормандия', focus: 'кисло-сладкие сидровые яблоки', reliability: 84, summary: 'Сбалансированные яблоки для чистых и понятных сидров.' },
  { id: 'somerset-fruit', name: 'Somerset Bittersweet', country: 'Великобритания', region: 'Сомерсет', focus: 'танинные яблоки', reliability: 73, summary: 'Много структуры и характера, но урожай сильнее влияет на качество.' },
  { id: 'asturias-fruit', name: 'Asturias Press Fruit', country: 'Испания', region: 'Астурия', focus: 'кислые яблоки', reliability: 79, summary: 'Высокая свежесть и кислотность для сухих сидров.' },
  { id: 'anjou-perry', name: 'Anjou Perry Cooperative', country: 'Франция', region: 'Анжу', focus: 'груши для перри', reliability: 81, summary: 'Танинные и ароматные груши для сухого и выдержанного перри.' },
  { id: 'ferment-lab', name: 'Ferment Lab Europe', country: 'Бельгия', region: 'Фландрия', focus: 'чистые культуры дрожжей', reliability: 94, summary: 'Дорогие, но очень стабильные культуры для пива и сидра.' },
  { id: 'pack-glass', name: 'Nord Glass Logistics', country: 'Германия', region: 'Северный Рейн', focus: 'стеклянная упаковка', reliability: 91, summary: 'Стандартные бутылки, короткие сроки и низкий процент брака.' },
  { id: 'bulk-sugar', name: 'Central Sugar Trade', country: 'Польша', region: 'Силезия', focus: 'пищевой сахар', reliability: 86, summary: 'Недорогой стабильный сахар без заметного вкусового следа.' },
  { id: 'grand-est-vine', name: 'Grand Est Must Exchange', country: 'Франция', region: 'Гранд-Эст', focus: 'виноград и виноматериалы', reliability: 84, summary: 'Сезонные виноградные лоты с происхождением и винтажом.' },
  { id: 'kent-botanical', name: 'Kent Botanical Exchange', country: 'Великобритания', region: 'Кент', focus: 'можжевельник, травы и специи', reliability: 79, summary: 'Ботаникалы для джина, вермута, амаро и барных ингредиентов.' },
  { id: 'hesse-honey', name: 'Hesse Honey Cooperative', country: 'Германия', region: 'Гессен', focus: 'мёд и ферментируемые сиропы', reliability: 82, summary: 'Лоты мёда с региональным происхождением.' },
  { id: 'euro-neutral-spirit', name: 'Euro Neutral Spirit Exchange', country: 'Германия', region: 'Гессен', focus: 'нейтральный пищевой спирт', reliability: 91, summary: 'Базовый спирт для джина, ликёров, вермутов и RTD.' },
  { id: 'global-fermentables', name: 'Global Fermentables Depot', country: 'Франция', region: 'Гранд-Эст', focus: 'меласса, рис и специализированные ферментируемые основы', reliability: 77, summary: 'Импортные основы для будущих отраслей рома, саке и агавовых напитков.' },
];

export const supplierOffers: SupplierOfferDefinition[] = [
  { id: 'rhein-pils', supplierId: 'rhein-malt', ingredientId: 'malt-base', variantName: 'Pilsner Base', origin: 'Бавария, Германия', basePrice: 1.28, minimumOrder: 25, defaultOrder: 50, qualityRange: [78, 92], leadDays: [1, 3], seasonalVolatility: 0.08, flavorImpact: { clarity: 1, body: -0.2 } as Partial<FlavorProfile> },
  { id: 'kent-pale', supplierId: 'kent-grain', ingredientId: 'malt-base', variantName: 'Maris Pale', origin: 'Кент, Великобритания', basePrice: 1.42, minimumOrder: 25, defaultOrder: 50, qualityRange: [72, 94], leadDays: [2, 5], seasonalVolatility: 0.14, flavorImpact: { body: 0.5, aroma: 0.2 } },
  { id: 'rhein-caramel', supplierId: 'rhein-malt', ingredientId: 'malt-specialty', variantName: 'Caramel 80', origin: 'Бавария, Германия', basePrice: 1.76, minimumOrder: 10, defaultOrder: 20, qualityRange: [76, 91], leadDays: [1, 3], seasonalVolatility: 0.1, flavorImpact: { sweetness: 0.5, body: 0.5 } },
  { id: 'kent-roast', supplierId: 'kent-grain', ingredientId: 'malt-specialty', variantName: 'Black Roast', origin: 'Кент, Великобритания', basePrice: 1.92, minimumOrder: 10, defaultOrder: 20, qualityRange: [70, 93], leadDays: [2, 5], seasonalVolatility: 0.13, flavorImpact: { bitterness: 0.4, body: 0.6, aroma: 0.2 } },
  { id: 'hallertau-mittelfruh', supplierId: 'hallertau-hop', ingredientId: 'hops', variantName: 'Mittelfrüh', origin: 'Халлертау, Германия', basePrice: 15.8, minimumOrder: 1, defaultOrder: 3, qualityRange: [80, 94], leadDays: [1, 3], seasonalVolatility: 0.18, flavorImpact: { aroma: 0.35, bitterness: 0.15 } },
  { id: 'yakima-cascade', supplierId: 'yakima-hop', ingredientId: 'hops', variantName: 'Cascade Export', origin: 'Вашингтон, США', basePrice: 20.6, minimumOrder: 1, defaultOrder: 3, qualityRange: [72, 96], leadDays: [4, 8], seasonalVolatility: 0.24, flavorImpact: { aroma: 0.8, originality: 0.35, bitterness: 0.25 } },
  { id: 'ferment-ale', supplierId: 'ferment-lab', ingredientId: 'beer-yeast', variantName: 'Clean Ale 04', origin: 'Фландрия, Бельгия', basePrice: 18.5, minimumOrder: 1, defaultOrder: 3, qualityRange: [86, 98], leadDays: [1, 3], seasonalVolatility: 0.04, flavorImpact: { clarity: 0.5, aroma: 0.15 } as Partial<FlavorProfile> },
  { id: 'normandy-blend', supplierId: 'normandy-orchard', ingredientId: 'apples', variantName: 'Normandy Blend', origin: 'Нормандия, Франция', basePrice: 0.74, minimumOrder: 100, defaultOrder: 250, qualityRange: [76, 93], leadDays: [2, 5], seasonalVolatility: 0.26, flavorImpact: { sweetness: 0.2, acidity: 0.25, aroma: 0.3 } },
  { id: 'somerset-bittersweet', supplierId: 'somerset-fruit', ingredientId: 'apples', variantName: 'Dabinett Mix', origin: 'Сомерсет, Великобритания', basePrice: 0.86, minimumOrder: 100, defaultOrder: 250, qualityRange: [68, 96], leadDays: [3, 6], seasonalVolatility: 0.31, flavorImpact: { bitterness: 0.7, body: 0.5, aroma: 0.25 } },
  { id: 'asturias-sharp', supplierId: 'asturias-fruit', ingredientId: 'apples', variantName: 'Asturias Sharp', origin: 'Астурия, Испания', basePrice: 0.69, minimumOrder: 100, defaultOrder: 250, qualityRange: [72, 92], leadDays: [3, 7], seasonalVolatility: 0.27, flavorImpact: { acidity: 0.8, clarity: 0.2 } as Partial<FlavorProfile> },
  { id: 'anjou-perry-pear', supplierId: 'anjou-perry', ingredientId: 'pears', variantName: 'Anjou Perry Pears', origin: 'Анжу, Франция', basePrice: 0.82, minimumOrder: 100, defaultOrder: 260, qualityRange: [72, 95], leadDays: [2, 5], seasonalVolatility: 0.29, flavorImpact: { bitterness: 0.35, acidity: 0.45, aroma: 0.4 } },
  { id: 'ferment-cider', supplierId: 'ferment-lab', ingredientId: 'cider-yeast', variantName: 'Cider Clean 12', origin: 'Фландрия, Бельгия', basePrice: 17.2, minimumOrder: 1, defaultOrder: 3, qualityRange: [84, 98], leadDays: [1, 3], seasonalVolatility: 0.04, flavorImpact: { clarity: 0.5, aroma: 0.2 } as Partial<FlavorProfile> },
  { id: 'central-sugar', supplierId: 'bulk-sugar', ingredientId: 'sugar', variantName: 'Fermentation Sugar', origin: 'Силезия, Польша', basePrice: 0.88, minimumOrder: 10, defaultOrder: 25, qualityRange: [82, 96], leadDays: [2, 4], seasonalVolatility: 0.08, flavorImpact: { sweetness: 0.25, body: -0.1 } },
  { id: 'nord-bottle', supplierId: 'pack-glass', ingredientId: 'bottles', variantName: 'Amber 500', origin: 'Северный Рейн, Германия', basePrice: 0.31, minimumOrder: 100, defaultOrder: 300, qualityRange: [82, 97], leadDays: [1, 3], seasonalVolatility: 0.06, flavorImpact: {} },
  { id: 'grand-est-grapes', supplierId: 'grand-est-vine', ingredientId: 'wine-grapes', variantName: 'Grand Est Vintage Lot', origin: 'Гранд-Эст, Франция', basePrice: 1.42, minimumOrder: 200, defaultOrder: 600, qualityRange: [68, 96], leadDays: [1, 4], seasonalVolatility: 0.38, flavorImpact: { acidity: 0.3, aroma: 0.5, body: 0.3 } },
  { id: 'ferment-wine', supplierId: 'ferment-lab', ingredientId: 'wine-yeast', variantName: 'Wine Culture 18', origin: 'Фландрия, Бельгия', basePrice: 20.5, minimumOrder: 1, defaultOrder: 4, qualityRange: [84, 98], leadDays: [1, 3], seasonalVolatility: 0.04, flavorImpact: { aroma: 0.3, clarity: 0.35 } as Partial<FlavorProfile> },
  { id: 'ferment-distill', supplierId: 'ferment-lab', ingredientId: 'distillers-yeast', variantName: 'Distillers Culture 9', origin: 'Фландрия, Бельгия', basePrice: 22.5, minimumOrder: 1, defaultOrder: 4, qualityRange: [84, 98], leadDays: [1, 3], seasonalVolatility: 0.05, flavorImpact: { clarity: 0.2, aroma: 0.2 } as Partial<FlavorProfile> },
  { id: 'kent-juniper', supplierId: 'kent-botanical', ingredientId: 'botanicals', variantName: 'Juniper & Herb Lot', origin: 'Кент, Великобритания', basePrice: 9.8, minimumOrder: 5, defaultOrder: 18, qualityRange: [70, 95], leadDays: [2, 5], seasonalVolatility: 0.22, flavorImpact: { aroma: 0.8, originality: 0.5 } },
  { id: 'hesse-meadow-honey', supplierId: 'hesse-honey', ingredientId: 'honey', variantName: 'Meadow Honey', origin: 'Гессен, Германия', basePrice: 5.4, minimumOrder: 20, defaultOrder: 80, qualityRange: [72, 96], leadDays: [2, 5], seasonalVolatility: 0.24, flavorImpact: { sweetness: 0.6, aroma: 0.4, body: 0.2 } },
  { id: 'neutral-spirit-96', supplierId: 'euro-neutral-spirit', ingredientId: 'neutral-spirit', variantName: 'Neutral Spirit 96', origin: 'Германия', basePrice: 3.8, minimumOrder: 100, defaultOrder: 300, qualityRange: [82, 98], leadDays: [2, 4], seasonalVolatility: 0.1, flavorImpact: { clarity: 0.4 } as Partial<FlavorProfile> },
  { id: 'global-molasses', supplierId: 'global-fermentables', ingredientId: 'molasses', variantName: 'Cane Molasses', origin: 'Импортный пул', basePrice: 0.95, minimumOrder: 200, defaultOrder: 700, qualityRange: [66, 92], leadDays: [5, 12], seasonalVolatility: 0.28, flavorImpact: { body: 0.5, aroma: 0.5 } },
  { id: 'global-agave', supplierId: 'global-fermentables', ingredientId: 'agave', variantName: 'Blue Agave Hearts', origin: 'Халиско, Мексика', basePrice: 1.75, minimumOrder: 200, defaultOrder: 650, qualityRange: [68, 95], leadDays: [8, 16], seasonalVolatility: 0.34, flavorImpact: { aroma: 0.55, originality: 0.45, body: 0.25 } },
  { id: 'global-rice', supplierId: 'global-fermentables', ingredientId: 'rice', variantName: 'Sake Rice', origin: 'Импортный пул', basePrice: 1.6, minimumOrder: 200, defaultOrder: 600, qualityRange: [72, 95], leadDays: [5, 11], seasonalVolatility: 0.2, flavorImpact: { clarity: 0.4, body: 0.2 } as Partial<FlavorProfile> },
  { id: 'global-mixer-base', supplierId: 'global-fermentables', ingredientId: 'mixer-base', variantName: 'RTD Mixer Base', origin: 'Европейский пул', basePrice: 1.2, minimumOrder: 100, defaultOrder: 400, qualityRange: [78, 96], leadDays: [3, 7], seasonalVolatility: 0.12, flavorImpact: { acidity: 0.3, sweetness: 0.3 } },
  { id: 'global-citrus', supplierId: 'global-fermentables', ingredientId: 'citrus', variantName: 'Citrus Concentrate', origin: 'Средиземноморский пул', basePrice: 3.4, minimumOrder: 30, defaultOrder: 100, qualityRange: [70, 95], leadDays: [4, 9], seasonalVolatility: 0.3, flavorImpact: { acidity: 0.7, aroma: 0.6 } },
];

export function getIngredient(id: string): IngredientDefinition {
  const ingredient = ingredients.find((item) => item.id === id);
  if (!ingredient) throw new Error('Неизвестный тип сырья');
  return ingredient;
}

export function getSupplier(id: string): SupplierDefinition {
  const supplier = suppliers.find((item) => item.id === id);
  if (!supplier) throw new Error('Поставщик не найден');
  return supplier;
}

export function getSupplierOffer(id: string): SupplierOfferDefinition {
  const offer = supplierOffers.find((item) => item.id === id);
  if (!offer) throw new Error('Предложение поставщика не найдено');
  return offer;
}
