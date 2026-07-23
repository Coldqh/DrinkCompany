import type { BeverageCategoryId, ProcessStageId } from './beverageCatalog';

export type IndustrialVesselType = 'tank' | 'open_fermenter' | 'still' | 'oak_barrel' | 'steel_vat' | 'bottle_conditioning' | 'mixing_tank';

export interface IndustrialStageTemplate {
  stageId: ProcessStageId;
  durationDays: number;
  yieldRatio: number;
  vesselType: IndustrialVesselType;
  qualityFocus: string;
  alcoholMode: 'none' | 'ferment' | 'distill' | 'fortify' | 'proof' | 'preserve';
  createsMaturationLot?: boolean;
}

export interface IndustrialInputTemplate {
  ingredientId: string;
  quantityPer240Units: number;
}

export interface IndustrialBlueprint {
  id: string;
  categoryId: BeverageCategoryId;
  name: string;
  stages: IndustrialStageTemplate[];
  defaultBatchLiters: number;
  minimumReleaseAgeDays: number;
  targetAgeDays: number;
  annualVolumeLossRate: number;
  supportsVintage: boolean;
  supportsSolera: boolean;
  inputs: IndustrialInputTemplate[];
}

const stage = (
  stageId: ProcessStageId,
  durationDays: number,
  yieldRatio: number,
  vesselType: IndustrialVesselType,
  qualityFocus: string,
  alcoholMode: IndustrialStageTemplate['alcoholMode'] = 'none',
  createsMaturationLot = false,
): IndustrialStageTemplate => ({ stageId, durationDays, yieldRatio, vesselType, qualityFocus, alcoholMode, createsMaturationLot });

export const industrialBlueprints: IndustrialBlueprint[] = [
  {
    id: 'industrial-beer', categoryId: 'beer', name: 'Пивоваренный цикл', defaultBatchLiters: 180, minimumReleaseAgeDays: 10, targetAgeDays: 14, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'malt-base', quantityPer240Units: 42 }, { ingredientId: 'hops', quantityPer240Units: 2.2 }, { ingredientId: 'beer-yeast', quantityPer240Units: 2 }],
    stages: [stage('mill', 1, .995, 'tank', 'помол'), stage('mash', 1, .94, 'tank', 'экстракция'), stage('boil', 1, .91, 'tank', 'стерильность'), stage('ferment', 7, .97, 'steel_vat', 'чистота брожения', 'ferment'), stage('carbonate', 2, .995, 'tank', 'карбонизация'), stage('stabilize', 1, .99, 'steel_vat', 'стабильность'), stage('package', 1, .985, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-cider', categoryId: 'cider', name: 'Сидровый цикл', defaultBatchLiters: 180, minimumReleaseAgeDays: 14, targetAgeDays: 30, annualVolumeLossRate: 0, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'apples', quantityPer240Units: 260 }, { ingredientId: 'cider-yeast', quantityPer240Units: 2 }, { ingredientId: 'sugar', quantityPer240Units: 8 }],
    stages: [stage('press', 1, .72, 'tank', 'выход сока'), stage('ferment', 10, .96, 'open_fermenter', 'ароматика', 'ferment'), stage('blend', 2, .99, 'mixing_tank', 'баланс'), stage('carbonate', 2, .995, 'tank', 'карбонизация'), stage('stabilize', 2, .99, 'steel_vat', 'стабильность'), stage('package', 1, .985, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-perry', categoryId: 'perry', name: 'Цикл перри', defaultBatchLiters: 160, minimumReleaseAgeDays: 21, targetAgeDays: 45, annualVolumeLossRate: 0, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'pears', quantityPer240Units: 260 }, { ingredientId: 'cider-yeast', quantityPer240Units: 2 }, { ingredientId: 'sugar', quantityPer240Units: 6 }],
    stages: [stage('press', 1, .7, 'tank', 'выход сока'), stage('ferment', 12, .96, 'open_fermenter', 'ароматика', 'ferment'), stage('age', 21, .99, 'steel_vat', 'созревание', 'preserve', true), stage('blend', 2, .99, 'mixing_tank', 'баланс'), stage('package', 1, .985, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-still-wine', categoryId: 'still_wine', name: 'Винодельческий цикл', defaultBatchLiters: 600, minimumReleaseAgeDays: 90, targetAgeDays: 270, annualVolumeLossRate: .018, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'wine-grapes', quantityPer240Units: 320 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }],
    stages: [stage('press', 2, .68, 'tank', 'экстракция'), stage('ferment', 14, .96, 'open_fermenter', 'брожение', 'ferment'), stage('age', 90, .982, 'oak_barrel', 'выдержка', 'preserve', true), stage('blend', 4, .99, 'mixing_tank', 'купаж'), stage('stabilize', 4, .99, 'steel_vat', 'стабильность'), stage('package', 2, .982, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-sparkling-wine', categoryId: 'sparkling_wine', name: 'Игристый цикл', defaultBatchLiters: 500, minimumReleaseAgeDays: 120, targetAgeDays: 365, annualVolumeLossRate: .012, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'wine-grapes', quantityPer240Units: 320 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }, { ingredientId: 'sugar', quantityPer240Units: 8 }],
    stages: [stage('press', 2, .65, 'tank', 'деликатный пресс'), stage('ferment', 14, .96, 'steel_vat', 'первичное брожение', 'ferment'), stage('blend', 4, .99, 'mixing_tank', 'ассамбляж'), stage('carbonate', 45, .985, 'bottle_conditioning', 'вторичное брожение', 'ferment'), stage('age', 60, .99, 'bottle_conditioning', 'выдержка на осадке', 'preserve', true), stage('package', 3, .975, 'mixing_tank', 'дегоржаж и укупорка', 'preserve')],
  },
  {
    id: 'industrial-fortified-wine', categoryId: 'fortified_wine', name: 'Креплёное вино', defaultBatchLiters: 450, minimumReleaseAgeDays: 180, targetAgeDays: 730, annualVolumeLossRate: .025, supportsVintage: true, supportsSolera: true,
    inputs: [{ ingredientId: 'wine-grapes', quantityPer240Units: 320 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }, { ingredientId: 'neutral-spirit', quantityPer240Units: 18 }],
    stages: [stage('press', 2, .67, 'tank', 'экстракция'), stage('ferment', 9, .97, 'open_fermenter', 'брожение', 'ferment'), stage('fortify', 1, .995, 'mixing_tank', 'крепление', 'fortify'), stage('age', 180, .965, 'oak_barrel', 'окислительная выдержка', 'preserve', true), stage('blend', 5, .99, 'mixing_tank', 'солера и купаж'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-whisky', categoryId: 'whisky', name: 'Виски', defaultBatchLiters: 800, minimumReleaseAgeDays: 365, targetAgeDays: 1095, annualVolumeLossRate: .025, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'malt-base', quantityPer240Units: 55 }, { ingredientId: 'distillers-yeast', quantityPer240Units: 2 }],
    stages: [stage('mill', 1, .995, 'tank', 'помол'), stage('mash', 2, .9, 'tank', 'затор'), stage('ferment', 4, .95, 'open_fermenter', 'брожение', 'ferment'), stage('distill', 3, .31, 'still', 'отбор фракций', 'distill'), stage('age', 365, .94, 'oak_barrel', 'бочковая выдержка', 'preserve', true), stage('blend', 7, .99, 'mixing_tank', 'купаж'), stage('stabilize', 2, .995, 'steel_vat', 'снижение крепости', 'proof'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-rum', categoryId: 'rum', name: 'Ром', defaultBatchLiters: 700, minimumReleaseAgeDays: 120, targetAgeDays: 730, annualVolumeLossRate: .035, supportsVintage: false, supportsSolera: true,
    inputs: [{ ingredientId: 'molasses', quantityPer240Units: 180 }, { ingredientId: 'distillers-yeast', quantityPer240Units: 2 }],
    stages: [stage('ferment', 5, .94, 'open_fermenter', 'эфиры', 'ferment'), stage('distill', 3, .34, 'still', 'дистилляция', 'distill'), stage('age', 180, .92, 'oak_barrel', 'тропическая выдержка', 'preserve', true), stage('blend', 5, .99, 'mixing_tank', 'купаж'), stage('stabilize', 2, .995, 'steel_vat', 'снижение крепости', 'proof'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-vodka', categoryId: 'vodka', name: 'Водка', defaultBatchLiters: 900, minimumReleaseAgeDays: 7, targetAgeDays: 14, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'malt-base', quantityPer240Units: 55 }, { ingredientId: 'distillers-yeast', quantityPer240Units: 2 }],
    stages: [stage('mash', 2, .91, 'tank', 'затор'), stage('ferment', 4, .95, 'open_fermenter', 'брожение', 'ferment'), stage('distill', 4, .36, 'still', 'ректификация', 'distill'), stage('blend', 2, .995, 'mixing_tank', 'водоподготовка', 'proof'), stage('stabilize', 2, .995, 'steel_vat', 'фильтрация'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-gin', categoryId: 'gin', name: 'Джин', defaultBatchLiters: 500, minimumReleaseAgeDays: 5, targetAgeDays: 14, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'neutral-spirit', quantityPer240Units: 140 }, { ingredientId: 'botanicals', quantityPer240Units: 8 }],
    stages: [stage('distill', 2, .92, 'still', 'нейтральная база', 'distill'), stage('infuse', 3, .98, 'steel_vat', 'ботаникалы'), stage('blend', 2, .995, 'mixing_tank', 'сведение профиля', 'proof'), stage('stabilize', 1, .995, 'steel_vat', 'отдых'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-agave-spirit', categoryId: 'agave_spirit', name: 'Агавовый дистиллят', defaultBatchLiters: 600, minimumReleaseAgeDays: 60, targetAgeDays: 365, annualVolumeLossRate: .04, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'agave', quantityPer240Units: 260 }, { ingredientId: 'distillers-yeast', quantityPer240Units: 2 }],
    stages: [stage('mash', 2, .86, 'tank', 'термообработка'), stage('ferment', 6, .94, 'open_fermenter', 'брожение', 'ferment'), stage('distill', 3, .32, 'still', 'дистилляция', 'distill'), stage('age', 90, .93, 'oak_barrel', 'выдержка', 'preserve', true), stage('blend', 3, .99, 'mixing_tank', 'купаж'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-brandy', categoryId: 'brandy', name: 'Бренди', defaultBatchLiters: 650, minimumReleaseAgeDays: 180, targetAgeDays: 730, annualVolumeLossRate: .028, supportsVintage: true, supportsSolera: true,
    inputs: [{ ingredientId: 'wine-grapes', quantityPer240Units: 340 }, { ingredientId: 'distillers-yeast', quantityPer240Units: 2 }],
    stages: [stage('press', 2, .68, 'tank', 'сок'), stage('ferment', 10, .96, 'open_fermenter', 'виноматериал', 'ferment'), stage('distill', 3, .3, 'still', 'дистилляция', 'distill'), stage('age', 180, .94, 'oak_barrel', 'выдержка', 'preserve', true), stage('blend', 5, .99, 'mixing_tank', 'ассамбляж'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-liqueur', categoryId: 'liqueur', name: 'Ликёр', defaultBatchLiters: 350, minimumReleaseAgeDays: 14, targetAgeDays: 45, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'neutral-spirit', quantityPer240Units: 120 }, { ingredientId: 'botanicals', quantityPer240Units: 8 }, { ingredientId: 'sugar', quantityPer240Units: 32 }],
    stages: [stage('infuse', 14, .97, 'steel_vat', 'экстракция'), stage('blend', 3, .99, 'mixing_tank', 'сахар и крепость', 'proof'), stage('age', 7, .995, 'steel_vat', 'отдых', 'preserve', true), stage('stabilize', 2, .99, 'steel_vat', 'стабильность'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-amaro', categoryId: 'amaro_bitter', name: 'Амаро и биттеры', defaultBatchLiters: 300, minimumReleaseAgeDays: 45, targetAgeDays: 180, annualVolumeLossRate: .01, supportsVintage: false, supportsSolera: true,
    inputs: [{ ingredientId: 'neutral-spirit', quantityPer240Units: 120 }, { ingredientId: 'botanicals', quantityPer240Units: 10 }, { ingredientId: 'sugar', quantityPer240Units: 24 }],
    stages: [stage('infuse', 21, .96, 'steel_vat', 'горькие ботаникалы'), stage('blend', 4, .99, 'mixing_tank', 'баланс'), stage('age', 30, .985, 'oak_barrel', 'округление', 'preserve', true), stage('stabilize', 2, .99, 'steel_vat', 'стабильность'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-vermouth', categoryId: 'vermouth_aperitif', name: 'Вермут и аперитивы', defaultBatchLiters: 450, minimumReleaseAgeDays: 30, targetAgeDays: 90, annualVolumeLossRate: .006, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'wine-grapes', quantityPer240Units: 240 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }, { ingredientId: 'neutral-spirit', quantityPer240Units: 16 }, { ingredientId: 'botanicals', quantityPer240Units: 5 }, { ingredientId: 'sugar', quantityPer240Units: 10 }],
    stages: [stage('ferment', 10, .96, 'steel_vat', 'винная база', 'ferment'), stage('fortify', 1, .995, 'mixing_tank', 'крепление', 'fortify'), stage('infuse', 14, .97, 'steel_vat', 'ароматизация'), stage('blend', 3, .99, 'mixing_tank', 'купаж'), stage('stabilize', 3, .99, 'steel_vat', 'стабильность'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-sake', categoryId: 'sake', name: 'Саке', defaultBatchLiters: 500, minimumReleaseAgeDays: 30, targetAgeDays: 120, annualVolumeLossRate: 0, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'rice', quantityPer240Units: 190 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }],
    stages: [stage('mill', 2, .82, 'tank', 'шлифовка'), stage('ferment', 18, .95, 'open_fermenter', 'параллельное брожение', 'ferment'), stage('blend', 2, .99, 'mixing_tank', 'сведение'), stage('age', 30, .995, 'steel_vat', 'созревание', 'preserve', true), stage('stabilize', 2, .99, 'steel_vat', 'пастеризация'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-mead', categoryId: 'mead', name: 'Медовый напиток', defaultBatchLiters: 350, minimumReleaseAgeDays: 45, targetAgeDays: 180, annualVolumeLossRate: .006, supportsVintage: true, supportsSolera: false,
    inputs: [{ ingredientId: 'honey', quantityPer240Units: 120 }, { ingredientId: 'wine-yeast', quantityPer240Units: 2 }],
    stages: [stage('ferment', 18, .96, 'open_fermenter', 'брожение', 'ferment'), stage('age', 45, .99, 'steel_vat', 'созревание', 'preserve', true), stage('blend', 3, .99, 'mixing_tank', 'баланс'), stage('package', 2, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-rtd', categoryId: 'rtd', name: 'RTD и bottled cocktail', defaultBatchLiters: 600, minimumReleaseAgeDays: 2, targetAgeDays: 5, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'mixer-base', quantityPer240Units: 130 }, { ingredientId: 'citrus', quantityPer240Units: 16 }, { ingredientId: 'sugar', quantityPer240Units: 20 }, { ingredientId: 'neutral-spirit', quantityPer240Units: 24 }],
    stages: [stage('blend', 1, .995, 'mixing_tank', 'дозирование'), stage('carbonate', 1, .995, 'tank', 'карбонизация'), stage('stabilize', 1, .99, 'steel_vat', 'пастеризация'), stage('package', 1, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-alcohol-free', categoryId: 'alcohol_free', name: 'Безалкогольный напиток', defaultBatchLiters: 600, minimumReleaseAgeDays: 2, targetAgeDays: 5, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'malt-base', quantityPer240Units: 36 }, { ingredientId: 'hops', quantityPer240Units: 1.5 }, { ingredientId: 'beer-yeast', quantityPer240Units: 1 }],
    stages: [stage('blend', 1, .995, 'mixing_tank', 'сведение'), stage('stabilize', 1, .99, 'steel_vat', 'стабильность'), stage('carbonate', 1, .995, 'tank', 'карбонизация'), stage('package', 1, .98, 'mixing_tank', 'розлив', 'preserve')],
  },
  {
    id: 'industrial-mixer', categoryId: 'mixer', name: 'Миксер', defaultBatchLiters: 800, minimumReleaseAgeDays: 1, targetAgeDays: 3, annualVolumeLossRate: 0, supportsVintage: false, supportsSolera: false,
    inputs: [{ ingredientId: 'mixer-base', quantityPer240Units: 130 }, { ingredientId: 'citrus', quantityPer240Units: 16 }, { ingredientId: 'sugar', quantityPer240Units: 20 }],
    stages: [stage('blend', 1, .997, 'mixing_tank', 'рецептура'), stage('stabilize', 1, .995, 'steel_vat', 'стабильность'), stage('carbonate', 1, .995, 'tank', 'карбонизация'), stage('package', 1, .985, 'mixing_tank', 'розлив', 'preserve')],
  },
];

export function industrialBlueprintForCategory(categoryId: BeverageCategoryId): IndustrialBlueprint {
  return industrialBlueprints.find((item) => item.categoryId === categoryId)
    ?? industrialBlueprints.find((item) => item.categoryId === 'beer')!;
}

export function validateIndustrialProcessCatalog(): string[] {
  const violations: string[] = [];
  const ids = new Set<string>();
  for (const blueprint of industrialBlueprints) {
    if (ids.has(blueprint.id)) violations.push(`duplicate blueprint ${blueprint.id}`);
    ids.add(blueprint.id);
    if (blueprint.stages.length === 0) violations.push(`${blueprint.id}: no stages`);
    if (blueprint.inputs.length === 0) violations.push(`${blueprint.id}: no ingredients`);
    if (blueprint.inputs.some((input) => !input.ingredientId || input.quantityPer240Units <= 0)) violations.push(`${blueprint.id}: invalid ingredient input`);
    if (blueprint.stages.at(-1)?.stageId !== 'package') violations.push(`${blueprint.id}: final stage must be package`);
    if (blueprint.stages.some((item) => item.durationDays < 0 || item.yieldRatio <= 0 || item.yieldRatio > 1)) violations.push(`${blueprint.id}: invalid stage values`);
    if (blueprint.minimumReleaseAgeDays > blueprint.targetAgeDays) violations.push(`${blueprint.id}: minimum age exceeds target`);
  }
  return violations;
}
