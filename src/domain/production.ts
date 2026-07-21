import type { BatchIngredientUse } from './supply';
export type ProductFamily = 'beer' | 'cider';
export type BatchStatus = 'fermenting' | 'conditioning' | 'ready' | 'tasted' | 'packaged' | 'discarded';

export interface EquipmentDefinition {
  id: string;
  family: ProductFamily | 'shared';
  name: string;
  category: string;
  cost: number;
  precision: number;
  capacityLiters: number;
  icon: 'kettle' | 'press' | 'tank' | 'bottle' | 'lab';
  summary: string;
  benefit: string;
}

export interface ProductStyleDefinition {
  id: string;
  family: ProductFamily;
  name: string;
  shortName: string;
  description: string;
  color: string;
  baseCostPerLiter: number;
  defaultProcessTemperature: number;
  processTemperatureRange: [number, number];
  defaultPrimaryDays: number;
  primaryDaysRange: [number, number];
  defaultConditioningDays: number;
  conditioningDaysRange: [number, number];
  target: FlavorProfile;
}

export interface FlavorProfile {
  sweetness: number;
  acidity: number;
  bitterness: number;
  body: number;
  aroma: number;
  originality: number;
}

export interface RecipeDraft extends FlavorProfile {
  name: string;
  family: ProductFamily;
  styleId: string;
  volumeLiters: number;
  processTemperature: number;
  primaryDays: number;
  conditioningDays: number;
  treatment: number;
}

export interface SavedRecipe extends RecipeDraft {
  id: string;
  version: number;
  createdDay: number;
  estimatedCost: number;
}

export interface QualityProfile {
  technicalPurity: number;
  balance: number;
  intensity: number;
  complexity: number;
  cohesion: number;
  originality: number;
  clarity: number;
  styleFit: number;
  character: number;
  defectRisk: number;
}

export interface TastingResult {
  tastedDay: number;
  headline: string;
  notes: string[];
  strengths: string[];
  weaknesses: string[];
  marketHint: string;
  confidence: number;
}

export interface BatchState {
  id: string;
  code: string;
  recipe: SavedRecipe;
  status: BatchStatus;
  startedDay: number;
  phaseStartedDay: number;
  readyDay: number;
  progress: number;
  productionCost: number;
  rawMaterialCost: number;
  processCost: number;
  supplyQuality: number;
  rawMaterials: BatchIngredientUse[];
  packagingMaterials: BatchIngredientUse[];
  packagingCost: number;
  packagedUnits: number;
  availableUnits: number;
  quality: QualityProfile;
  tasting: TastingResult | null;
}

export const PRODUCT_STYLES: ProductStyleDefinition[] = [
  {
    id: 'modern-pale-ale',
    family: 'beer',
    name: 'Modern Pale Ale',
    shortName: 'Pale Ale',
    description: 'Сухое, ароматное пиво с заметным хмелем и чистой ферментацией.',
    color: '#752039',
    baseCostPerLiter: 1.72,
    defaultProcessTemperature: 19,
    processTemperatureRange: [15, 24],
    defaultPrimaryDays: 8,
    primaryDaysRange: [5, 15],
    defaultConditioningDays: 7,
    conditioningDaysRange: [3, 20],
    target: { sweetness: 2, acidity: 2, bitterness: 4, body: 3, aroma: 5, originality: 3 },
  },
  {
    id: 'dark-porter',
    family: 'beer',
    name: 'Dark Porter',
    shortName: 'Porter',
    description: 'Плотный тёмный профиль, обжаренное зерно, умеренная горечь и длинное тело.',
    color: '#4c202b',
    baseCostPerLiter: 1.94,
    defaultProcessTemperature: 20,
    processTemperatureRange: [16, 24],
    defaultPrimaryDays: 10,
    primaryDaysRange: [6, 18],
    defaultConditioningDays: 12,
    conditioningDaysRange: [5, 30],
    target: { sweetness: 3, acidity: 1, bitterness: 3, body: 5, aroma: 3, originality: 2 },
  },
  {
    id: 'wheat-beer',
    family: 'beer',
    name: 'Wheat Beer',
    shortName: 'Wheat',
    description: 'Мягкое пшеничное пиво с яркой дрожжевой ароматикой и лёгкой кислотностью.',
    color: '#8b4b5d',
    baseCostPerLiter: 1.64,
    defaultProcessTemperature: 21,
    processTemperatureRange: [17, 25],
    defaultPrimaryDays: 7,
    primaryDaysRange: [5, 13],
    defaultConditioningDays: 5,
    conditioningDaysRange: [2, 14],
    target: { sweetness: 3, acidity: 3, bitterness: 1, body: 3, aroma: 4, originality: 2 },
  },
  {
    id: 'dry-orchard-cider',
    family: 'cider',
    name: 'Dry Orchard Cider',
    shortName: 'Dry Cider',
    description: 'Сухой яблочный сидр с высокой свежестью, кислотностью и чистым послевкусием.',
    color: '#68263a',
    baseCostPerLiter: 1.48,
    defaultProcessTemperature: 16,
    processTemperatureRange: [10, 22],
    defaultPrimaryDays: 12,
    primaryDaysRange: [7, 28],
    defaultConditioningDays: 10,
    conditioningDaysRange: [4, 35],
    target: { sweetness: 1, acidity: 4, bitterness: 1, body: 2, aroma: 4, originality: 2 },
  },
  {
    id: 'bittersweet-cider',
    family: 'cider',
    name: 'Bittersweet Cider',
    shortName: 'Bittersweet',
    description: 'Структурный сидр с танинами, мягкой сладостью и выраженным яблочным телом.',
    color: '#7c3147',
    baseCostPerLiter: 1.69,
    defaultProcessTemperature: 15,
    processTemperatureRange: [9, 21],
    defaultPrimaryDays: 16,
    primaryDaysRange: [9, 35],
    defaultConditioningDays: 18,
    conditioningDaysRange: [7, 45],
    target: { sweetness: 3, acidity: 3, bitterness: 3, body: 4, aroma: 4, originality: 3 },
  },
  {
    id: 'wild-cider',
    family: 'cider',
    name: 'Wild Farmhouse Cider',
    shortName: 'Wild Cider',
    description: 'Рискованный фермерский стиль: сложная ферментация, высокая выразительность и шанс дефектов.',
    color: '#3d252d',
    baseCostPerLiter: 1.57,
    defaultProcessTemperature: 18,
    processTemperatureRange: [10, 26],
    defaultPrimaryDays: 21,
    primaryDaysRange: [10, 45],
    defaultConditioningDays: 24,
    conditioningDaysRange: [7, 60],
    target: { sweetness: 2, acidity: 5, bitterness: 2, body: 3, aroma: 5, originality: 5 },
  },
];

export function getStylesForFamily(family: ProductFamily): ProductStyleDefinition[] {
  return PRODUCT_STYLES.filter((style) => style.family === family);
}

export function getStyle(styleId: string): ProductStyleDefinition {
  const style = PRODUCT_STYLES.find((item) => item.id === styleId);
  if (!style) throw new Error('Неизвестный стиль напитка');
  return style;
}

export function createRecipeDraft(family: ProductFamily): RecipeDraft {
  const style = getStylesForFamily(family)[0];
  if (!style) throw new Error('Для категории не настроены стили');
  return {
    name: family === 'beer' ? 'Первая варка' : 'Первый урожай',
    family,
    styleId: style.id,
    volumeLiters: 120,
    ...style.target,
    processTemperature: style.defaultProcessTemperature,
    primaryDays: style.defaultPrimaryDays,
    conditioningDays: style.defaultConditioningDays,
    treatment: 2,
  };
}

export function adaptDraftToStyle(draft: RecipeDraft, styleId: string): RecipeDraft {
  const style = getStyle(styleId);
  if (style.family !== draft.family) throw new Error('Стиль не относится к выбранной категории');
  return {
    ...draft,
    styleId,
    ...style.target,
    processTemperature: style.defaultProcessTemperature,
    primaryDays: style.defaultPrimaryDays,
    conditioningDays: style.defaultConditioningDays,
  };
}

export function requiredEquipmentIds(family: ProductFamily): string[] {
  return family === 'beer'
    ? ['micro-brewhouse', 'fermentation-bank']
    : ['apple-press', 'fermentation-bank'];
}

export function estimateRecipeCost(draft: RecipeDraft): number {
  const style = getStyle(draft.styleId);
  const treatmentMultiplier = 1 + draft.treatment * 0.035;
  const originalityMultiplier = 1 + Math.max(0, draft.originality - 2) * 0.045;
  const conditioningCost = draft.conditioningDays * draft.volumeLiters * 0.0025;
  return roundMoney(draft.volumeLiters * style.baseCostPerLiter * treatmentMultiplier * originalityMultiplier + conditioningCost);
}

export function estimateProcessCost(draft: RecipeDraft): number {
  const treatmentCost = draft.volumeLiters * draft.treatment * 0.045;
  const conditioningCost = draft.conditioningDays * draft.volumeLiters * 0.0025;
  return roundMoney(38 + treatmentCost + conditioningCost);
}

export function estimatePackagingCost(batch: BatchState): number {
  return roundMoney(Math.floor(batch.recipe.volumeLiters / 0.5) * 0.42);
}

export function createSavedRecipe(draft: RecipeDraft, day: number, existingRecipes: SavedRecipe[], estimatedCost = estimateRecipeCost(draft)): SavedRecipe {
  validateRecipe(draft);
  const version = existingRecipes.filter((recipe) => recipe.name.trim().toLocaleLowerCase() === draft.name.trim().toLocaleLowerCase()).length + 1;
  return {
    ...draft,
    id: `recipe-${day}-${existingRecipes.length + 1}-${slugify(draft.name)}`,
    version,
    createdDay: day,
    estimatedCost,
  };
}

export function createBatch(
  recipe: SavedRecipe,
  day: number,
  batchNumber: number,
  equipmentPrecision: number,
  sourcing: { rawMaterials: BatchIngredientUse[]; rawMaterialCost: number; qualityScore: number; flavorImpact: Partial<FlavorProfile>; environmentModifier?: number },
): BatchState {
  const processCost = estimateProcessCost(recipe);
  const productionCost = roundMoney(processCost + sourcing.rawMaterialCost);
  const quality = calculateQuality(recipe, equipmentPrecision, day + batchNumber, sourcing.qualityScore, sourcing.flavorImpact, sourcing.environmentModifier ?? 0);
  const totalDays = recipe.primaryDays + recipe.conditioningDays;
  return {
    id: `batch-${day}-${batchNumber}`,
    code: `${recipe.family === 'beer' ? 'BR' : 'CD'}-${String(batchNumber).padStart(3, '0')}`,
    recipe,
    status: 'fermenting',
    startedDay: day,
    phaseStartedDay: day,
    readyDay: day + totalDays,
    progress: 0,
    productionCost,
    rawMaterialCost: sourcing.rawMaterialCost,
    processCost,
    supplyQuality: sourcing.qualityScore,
    rawMaterials: sourcing.rawMaterials,
    packagingMaterials: [],
    packagingCost: 0,
    packagedUnits: 0,
    availableUnits: 0,
    quality,
    tasting: null,
  };
}

export function advanceBatch(batch: BatchState, day: number): BatchState {
  if (['ready', 'tasted', 'packaged', 'discarded'].includes(batch.status)) return batch;

  const elapsed = Math.max(0, day - batch.startedDay);
  const totalDays = batch.recipe.primaryDays + batch.recipe.conditioningDays;
  const progress = clamp(Math.round((elapsed / totalDays) * 100), 0, 100);

  if (elapsed >= totalDays) {
    return { ...batch, status: 'ready', phaseStartedDay: day, progress: 100 };
  }

  if (elapsed >= batch.recipe.primaryDays) {
    return { ...batch, status: 'conditioning', phaseStartedDay: batch.startedDay + batch.recipe.primaryDays, progress };
  }

  return { ...batch, status: 'fermenting', progress };
}

export function tasteBatch(batch: BatchState, day: number, hasLabKit: boolean): BatchState {
  if (batch.status !== 'ready') throw new Error('Дегустация доступна после завершения созревания');
  const tasting = buildTasting(batch.quality, day, hasLabKit);
  return { ...batch, status: 'tasted', tasting };
}

export function packageBatch(batch: BatchState, packagingMaterials: BatchIngredientUse[] = [], efficiency = 0.94): BatchState {
  if (batch.status !== 'tasted') throw new Error('Сначала продегустируй партию');
  const packagedUnits = Math.max(0, Math.floor((batch.recipe.volumeLiters * Math.max(0.86, Math.min(0.99, efficiency))) / 0.5));
  const packagingCost = packagingMaterials.length > 0
    ? roundMoney(packagingMaterials.reduce((sum, item) => sum + item.totalCost, 0))
    : estimatePackagingCost(batch);
  return { ...batch, status: 'packaged', packagedUnits, availableUnits: packagedUnits, packagingMaterials, packagingCost };
}

export function discardBatch(batch: BatchState): BatchState {
  if (batch.status === 'packaged') throw new Error('Уже разлитую партию нельзя списать целиком');
  return { ...batch, status: 'discarded', packagedUnits: 0, availableUnits: 0 };
}

export function statusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    fermenting: 'Ферментация',
    conditioning: 'Созревание',
    ready: 'Готово к дегустации',
    tasted: 'Продегустировано',
    packaged: 'Разлито',
    discarded: 'Списано',
  };
  return labels[status];
}

export function averageQuality(quality: QualityProfile): number {
  return Math.round((quality.technicalPurity + quality.balance + quality.cohesion + quality.styleFit + quality.character) / 5);
}

function validateRecipe(draft: RecipeDraft): void {
  if (draft.name.trim().length < 2) throw new Error('Дай рецепту название');
  if (draft.volumeLiters < 40 || draft.volumeLiters > 500) throw new Error('Объём партии должен быть от 40 до 500 литров');
  const style = getStyle(draft.styleId);
  if (style.family !== draft.family) throw new Error('Категория рецепта не совпадает со стилем');
  for (const value of [draft.sweetness, draft.acidity, draft.bitterness, draft.body, draft.aroma, draft.originality, draft.treatment]) {
    if (value < 1 || value > 5) throw new Error('Параметры рецепта должны быть от 1 до 5');
  }
}

function calculateQuality(recipe: SavedRecipe, equipmentPrecision: number, seed: number, supplyQuality = 75, flavorImpact: Partial<FlavorProfile> = {}, environmentModifier = 0): QualityProfile {
  const style = getStyle(recipe.styleId);
  const temperatureCenter = style.defaultProcessTemperature;
  const temperatureDeviation = Math.abs(recipe.processTemperature - temperatureCenter);
  const durationDeviation = Math.abs(recipe.primaryDays - style.defaultPrimaryDays) / 2;
  const profileDistance = average([
    distance(recipe.sweetness, style.target.sweetness),
    distance(recipe.acidity, style.target.acidity),
    distance(recipe.bitterness, style.target.bitterness),
    distance(recipe.body, style.target.body),
    distance(recipe.aroma, style.target.aroma),
  ]);
  const noise = deterministicNoise(`${recipe.name}-${recipe.styleId}-${seed}`);
  const supplyBonus = (supplyQuality - 75) * 0.28;
  const flavorStrength = Object.values(flavorImpact).reduce((sum, value) => sum + Math.abs(value ?? 0), 0);
  const defectRisk = clamp(Math.round(
    10 + temperatureDeviation * 7 + durationDeviation * 3 + Math.max(0, recipe.originality - 3) * 5 - equipmentPrecision * 4 - recipe.treatment * 2 - supplyBonus * 0.55 - environmentModifier * 0.85 + Math.max(0, noise),
  ), 1, 72);
  const technicalPurity = clamp(Math.round(89 - defectRisk * 0.65 + equipmentPrecision * 2 + recipe.treatment * 1.5 + supplyBonus + environmentModifier * 1.15 + noise), 18, 99);
  const styleFit = clamp(Math.round(96 - profileDistance * 16 - temperatureDeviation * 4 - durationDeviation * 2 + environmentModifier * 0.35), 10, 99);
  const balance = clamp(Math.round(92 - balanceSpread(recipe) * 9 - defectRisk * 0.18 + supplyBonus * 0.45 + environmentModifier * 0.45 - flavorStrength * 1.4 + noise * 0.4), 12, 98);
  const intensity = clamp(Math.round(35 + average([recipe.bitterness, recipe.body, recipe.aroma, recipe.acidity]) * 11 + noise), 20, 98);
  const complexity = clamp(Math.round(28 + recipe.originality * 10 + recipe.aroma * 5 + recipe.conditioningDays * 0.45 - defectRisk * 0.15 + flavorStrength * 5 + supplyBonus * 0.25 + noise), 12, 98);
  const cohesion = clamp(Math.round(88 - profileDistance * 11 - Math.max(0, recipe.originality - 3) * 4 - defectRisk * 0.2 + recipe.treatment * 2 + noise * 0.3), 8, 98);
  const clarity = clamp(Math.round(96 - recipe.originality * 5 - profileDistance * 7 + technicalPurity * 0.12), 15, 98);
  const character = clamp(Math.round(34 + recipe.originality * 9 + recipe.aroma * 6 + recipe.body * 4 - Math.max(0, 65 - cohesion) * 0.35 + flavorStrength * 6 + supplyBonus * 0.35 + noise), 15, 99);

  return {
    technicalPurity,
    balance,
    intensity,
    complexity,
    cohesion,
    originality: clamp(Math.round(recipe.originality * 18 + noise), 12, 99),
    clarity,
    styleFit,
    character,
    defectRisk,
  };
}

function buildTasting(quality: QualityProfile, day: number, hasLabKit: boolean): TastingResult {
  const score = averageQuality(quality);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const notes: string[] = [];

  if (quality.technicalPurity >= 82) strengths.push('чистая ферментация');
  if (quality.balance >= 78) strengths.push('собранный баланс');
  if (quality.character >= 78) strengths.push('выраженный характер');
  if (quality.complexity >= 76) strengths.push('развитие вкуса');
  if (quality.styleFit >= 84) strengths.push('точное попадание в стиль');
  if (quality.originality >= 78) strengths.push('самобытный профиль');

  if (quality.defectRisk >= 40) weaknesses.push('заметный риск дефектов');
  if (quality.balance < 58) weaknesses.push('разрозненный баланс');
  if (quality.cohesion < 58) weaknesses.push('компоненты спорят между собой');
  if (quality.clarity < 52) weaknesses.push('профиль трудно считать');
  if (quality.styleFit < 48) weaknesses.push('слабое соответствие заявленному стилю');
  if (weaknesses.length === 0) weaknesses.push('серьёзных провалов не обнаружено');

  if (quality.intensity > 78) notes.push('Яркий первый глоток и высокая насыщенность.');
  else if (quality.intensity < 48) notes.push('Сдержанная интенсивность, напиток раскрывается медленно.');
  else notes.push('Умеренная интенсивность без резкого давления на рецепторы.');

  if (quality.complexity > 76) notes.push('Профиль меняется во времени и оставляет несколько слоёв послевкусия.');
  else notes.push('Профиль читается быстро и почти не меняется после первого впечатления.');

  if (quality.defectRisk > 45) notes.push('Есть нестабильная нота, которую стоит проверить лабораторно и повторной дегустацией.');
  else notes.push('Критических признаков заражения или грубой ошибки не замечено.');

  const headline = score >= 84
    ? 'Сильная партия с реальным рыночным потенциалом'
    : score >= 70
      ? 'Уверенный продукт, которому нужна точная аудитория'
      : score >= 56
        ? 'Рабочая партия с заметными ограничениями'
        : 'Слабая партия: продажа потребует скидки или другого позиционирования';

  const marketHint = quality.clarity >= 72 && quality.balance >= 70
    ? 'Понятный профиль подойдёт обычным барам и независимым магазинам.'
    : quality.character >= 76 && quality.cohesion >= 62
      ? 'Массовый рынок может пройти мимо, но специализированные точки способны заинтересоваться.'
      : 'Сначала лучше доработать рецепт или искать точку с очень конкретной аудиторией.';

  return {
    tastedDay: day,
    headline,
    notes,
    strengths,
    weaknesses,
    marketHint,
    confidence: hasLabKit ? 88 : 62,
  };
}

function balanceSpread(profile: FlavorProfile): number {
  const values = [profile.sweetness, profile.acidity, profile.bitterness, profile.body, profile.aroma];
  return Math.max(...values) - Math.min(...values);
}

function distance(a: number, b: number): number {
  return Math.abs(a - b);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function deterministicNoise(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((Math.abs(hash) % 1301) / 100) - 6.5;
}

function slugify(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'recipe';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
