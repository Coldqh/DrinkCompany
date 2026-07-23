import { validateCocktailCatalog } from './cocktailCatalog';
export { cocktailRecipes } from './cocktailCatalog';
export type { CocktailRecipeDefinition, ServeMethod } from './cocktailCatalog';

export type BeverageCategoryId = string;
export type ProcessStageId = string;
export type IngredientRole = 'fermentable' | 'botanical' | 'fruit' | 'spirit_base' | 'sweetener' | 'acid' | 'bittering' | 'mixer' | 'water' | 'packaging';

export interface BeverageCategoryDefinition {
  id: BeverageCategoryId;
  name: string;
  industryGroup: 'beer' | 'cider' | 'wine' | 'spirit' | 'liqueur' | 'fermented' | 'rtd' | 'alcohol_free' | 'mixer';
  legalClassKey: string;
  defaultAlcoholRange: [number, number];
  processStageIds: ProcessStageId[];
  ingredientRoles: IngredientRole[];
  serviceModes: Array<'bottle' | 'can' | 'keg' | 'glass' | 'cocktail'>;
  canAge: boolean;
  canBlend: boolean;
  canBeCocktailIngredient: boolean;
}

export interface ProcessStageDefinition {
  id: ProcessStageId;
  name: string;
  inputKinds: Array<'ingredient' | 'bulk_liquid' | 'packaged_product'>;
  outputKind: 'bulk_liquid' | 'packaged_product';
  durationModel: 'instant' | 'hours' | 'days' | 'months' | 'years';
  capacityUnit: 'kg' | 'l' | 'unit';
  qualityAxes: string[];
}

export interface CatalogIngredientDefinition {
  id: string;
  name: string;
  role: IngredientRole;
  unit: 'kg' | 'l' | 'unit' | 'g' | 'ml';
  tags: string[];
  perishable: boolean;
  canCarryOrigin: boolean;
}

export interface BeverageBlueprintDefinition {
  id: string;
  name: string;
  categoryId: BeverageCategoryId;
  requiredStages: ProcessStageId[];
  ingredientSlots: Array<{
    role: IngredientRole;
    minimum: number;
    maximum: number;
    unit: 'kg' | 'l' | 'unit' | 'g' | 'ml';
    optional?: boolean;
    allowedIngredientTags?: string[];
  }>;
  outputUnit: 'l' | 'bottle' | 'can' | 'keg';
  shelfLifeDays: number | null;
}

export const processStages: ProcessStageDefinition[] = [
  { id: 'mill', name: 'Дробление', inputKinds: ['ingredient'], outputKind: 'bulk_liquid', durationModel: 'hours', capacityUnit: 'kg', qualityAxes: ['extraction'] },
  { id: 'mash', name: 'Затирание', inputKinds: ['ingredient', 'bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'hours', capacityUnit: 'l', qualityAxes: ['body', 'fermentability'] },
  { id: 'press', name: 'Прессование', inputKinds: ['ingredient'], outputKind: 'bulk_liquid', durationModel: 'hours', capacityUnit: 'kg', qualityAxes: ['yield', 'oxidation'] },
  { id: 'boil', name: 'Кипячение', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'hours', capacityUnit: 'l', qualityAxes: ['bitterness', 'sterility'] },
  { id: 'ferment', name: 'Брожение', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['attenuation', 'aroma', 'cleanliness'] },
  { id: 'distill', name: 'Дистилляция', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['cuts', 'purity', 'congeners'] },
  { id: 'infuse', name: 'Настаивание', inputKinds: ['ingredient', 'bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['extraction', 'balance'] },
  { id: 'fortify', name: 'Крепление', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'instant', capacityUnit: 'l', qualityAxes: ['integration'] },
  { id: 'age', name: 'Выдержка', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'years', capacityUnit: 'l', qualityAxes: ['oak', 'oxidation', 'maturity'] },
  { id: 'blend', name: 'Купажирование', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['consistency', 'complexity'] },
  { id: 'carbonate', name: 'Карбонизация', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['carbonation'] },
  { id: 'stabilize', name: 'Стабилизация', inputKinds: ['bulk_liquid'], outputKind: 'bulk_liquid', durationModel: 'days', capacityUnit: 'l', qualityAxes: ['stability', 'clarity'] },
  { id: 'package', name: 'Розлив', inputKinds: ['bulk_liquid'], outputKind: 'packaged_product', durationModel: 'hours', capacityUnit: 'unit', qualityAxes: ['oxygen', 'fill_level', 'seal'] },
];

export const beverageCategories: BeverageCategoryDefinition[] = [
  ['beer', 'Пиво', 'beer', 'beer', [0, 15], ['mill', 'mash', 'boil', 'ferment', 'carbonate', 'package'], ['fermentable', 'bittering', 'water'], ['bottle', 'can', 'keg', 'glass'], false, true, true],
  ['cider', 'Сидр', 'cider', 'cider', [0, 12], ['press', 'ferment', 'blend', 'carbonate', 'package'], ['fruit', 'water'], ['bottle', 'can', 'keg', 'glass'], true, true, true],
  ['perry', 'Перри', 'cider', 'perry', [0, 12], ['press', 'ferment', 'blend', 'carbonate', 'package'], ['fruit', 'water'], ['bottle', 'glass'], true, true, true],
  ['still_wine', 'Тихое вино', 'wine', 'wine', [5, 20], ['press', 'ferment', 'age', 'blend', 'stabilize', 'package'], ['fruit'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['sparkling_wine', 'Игристое вино', 'wine', 'sparkling_wine', [5, 20], ['press', 'ferment', 'blend', 'carbonate', 'age', 'package'], ['fruit'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['fortified_wine', 'Креплёное вино', 'wine', 'fortified_wine', [12, 25], ['press', 'ferment', 'fortify', 'age', 'blend', 'package'], ['fruit', 'spirit_base'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['whisky', 'Виски', 'spirit', 'whisky', [35, 75], ['mill', 'mash', 'ferment', 'distill', 'age', 'blend', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['rum', 'Ром', 'spirit', 'rum', [35, 75], ['ferment', 'distill', 'age', 'blend', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['vodka', 'Водка', 'spirit', 'vodka', [35, 60], ['mash', 'ferment', 'distill', 'blend', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], false, true, true],
  ['gin', 'Джин', 'spirit', 'gin', [35, 60], ['distill', 'infuse', 'blend', 'package'], ['spirit_base', 'botanical', 'water'], ['bottle', 'glass', 'cocktail'], false, true, true],
  ['agave_spirit', 'Агавовый дистиллят', 'spirit', 'agave_spirit', [35, 75], ['mash', 'ferment', 'distill', 'age', 'blend', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['brandy', 'Бренди', 'spirit', 'brandy', [35, 75], ['press', 'ferment', 'distill', 'age', 'blend', 'package'], ['fruit'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['liqueur', 'Ликёр', 'liqueur', 'liqueur', [10, 55], ['infuse', 'blend', 'stabilize', 'package'], ['spirit_base', 'sweetener', 'botanical', 'fruit'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['amaro_bitter', 'Амаро и биттеры', 'liqueur', 'amaro', [10, 55], ['infuse', 'blend', 'age', 'package'], ['spirit_base', 'botanical', 'sweetener', 'bittering'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['vermouth_aperitif', 'Вермут и аперитивы', 'wine', 'aromatized_wine', [8, 25], ['ferment', 'fortify', 'infuse', 'blend', 'stabilize', 'package'], ['fruit', 'spirit_base', 'botanical', 'sweetener'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['sake', 'Саке', 'fermented', 'sake', [5, 22], ['mill', 'ferment', 'blend', 'stabilize', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['mead', 'Медовуха и мёдовые напитки', 'fermented', 'mead', [0, 25], ['ferment', 'age', 'blend', 'package'], ['fermentable', 'water'], ['bottle', 'glass', 'cocktail'], true, true, true],
  ['rtd', 'RTD и хард-зельцер', 'rtd', 'rtd', [0, 15], ['blend', 'carbonate', 'stabilize', 'package'], ['spirit_base', 'mixer', 'water'], ['bottle', 'can', 'glass'], false, true, true],
  ['alcohol_free', 'Безалкогольные аналоги', 'alcohol_free', 'alcohol_free', [0, 1], ['blend', 'stabilize', 'carbonate', 'package'], ['botanical', 'fruit', 'mixer', 'water'], ['bottle', 'can', 'glass', 'cocktail'], false, true, true],
  ['mixer', 'Миксеры', 'mixer', 'soft_drink', [0, 1], ['blend', 'stabilize', 'carbonate', 'package'], ['mixer', 'sweetener', 'acid', 'water'], ['bottle', 'can', 'glass', 'cocktail'], false, true, true],
].map(([id, name, industryGroup, legalClassKey, defaultAlcoholRange, processStageIds, ingredientRoles, serviceModes, canAge, canBlend, canBeCocktailIngredient]) => ({
  id, name, industryGroup, legalClassKey, defaultAlcoholRange, processStageIds, ingredientRoles, serviceModes, canAge, canBlend, canBeCocktailIngredient,
})) as BeverageCategoryDefinition[];

export const beverageBlueprints: BeverageBlueprintDefinition[] = beverageCategories.map((category) => ({
  id: `blueprint-${category.id}`,
  name: category.name,
  categoryId: category.id,
  requiredStages: category.processStageIds,
  ingredientSlots: category.ingredientRoles.map((role) => ({ role, minimum: 0, maximum: 10_000, unit: role === 'packaging' ? 'unit' : 'kg', optional: role === 'botanical' || role === 'sweetener' || role === 'acid' || role === 'bittering' || role === 'mixer' })),
  outputUnit: category.serviceModes.includes('can') ? 'can' : category.serviceModes.includes('keg') ? 'keg' : 'bottle',
  shelfLifeDays: category.canAge ? null : 365,
}));

export function validateBeverageCatalog(): string[] {
  const errors: string[] = [];
  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label}: повторяющийся id ${id}`);
      seen.add(id);
    }
  };
  unique('category', beverageCategories.map((item) => item.id));
  unique('stage', processStages.map((item) => item.id));
  unique('blueprint', beverageBlueprints.map((item) => item.id));
  const stageIds = new Set(processStages.map((item) => item.id));
  const categoryIds = new Set(beverageCategories.map((item) => item.id));
  for (const category of beverageCategories) for (const stageId of category.processStageIds) if (!stageIds.has(stageId)) errors.push(`${category.id}: неизвестный этап ${stageId}`);
  for (const blueprint of beverageBlueprints) if (!categoryIds.has(blueprint.categoryId)) errors.push(`${blueprint.id}: неизвестная категория ${blueprint.categoryId}`);
  errors.push(...validateCocktailCatalog(categoryIds));
  return errors;
}
