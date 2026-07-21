import type { FlavorProfile, ProductFamily } from '../domain/production';

export type IngredientCategory = 'base_malt' | 'specialty_malt' | 'hops' | 'beer_yeast' | 'apples' | 'cider_yeast' | 'sugar' | 'bottles';
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
  { id: 'ferment-lab', name: 'Ferment Lab Europe', country: 'Бельгия', region: 'Фландрия', focus: 'чистые культуры дрожжей', reliability: 94, summary: 'Дорогие, но очень стабильные культуры для пива и сидра.' },
  { id: 'pack-glass', name: 'Nord Glass Logistics', country: 'Германия', region: 'Северный Рейн', focus: 'стеклянная упаковка', reliability: 91, summary: 'Стандартные бутылки, короткие сроки и низкий процент брака.' },
  { id: 'bulk-sugar', name: 'Central Sugar Trade', country: 'Польша', region: 'Силезия', focus: 'пищевой сахар', reliability: 86, summary: 'Недорогой стабильный сахар без заметного вкусового следа.' },
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
  { id: 'ferment-cider', supplierId: 'ferment-lab', ingredientId: 'cider-yeast', variantName: 'Cider Clean 12', origin: 'Фландрия, Бельгия', basePrice: 17.2, minimumOrder: 1, defaultOrder: 3, qualityRange: [84, 98], leadDays: [1, 3], seasonalVolatility: 0.04, flavorImpact: { clarity: 0.5, aroma: 0.2 } as Partial<FlavorProfile> },
  { id: 'central-sugar', supplierId: 'bulk-sugar', ingredientId: 'sugar', variantName: 'Fermentation Sugar', origin: 'Силезия, Польша', basePrice: 0.88, minimumOrder: 10, defaultOrder: 25, qualityRange: [82, 96], leadDays: [2, 4], seasonalVolatility: 0.08, flavorImpact: { sweetness: 0.25, body: -0.1 } },
  { id: 'nord-bottle', supplierId: 'pack-glass', ingredientId: 'bottles', variantName: 'Amber 500', origin: 'Северный Рейн, Германия', basePrice: 0.31, minimumOrder: 100, defaultOrder: 300, qualityRange: [82, 97], leadDays: [1, 3], seasonalVolatility: 0.06, flavorImpact: {} },
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
