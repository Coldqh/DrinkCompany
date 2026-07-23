import type { BeverageCategoryId } from './beverageCatalog';

export type PackagingMaterialId = 'glass_feedstock' | 'aluminum_coil' | 'steel_sheet' | 'paperboard' | 'cork' | 'label_stock' | 'ink';
export type PackagingComponentKind = 'container' | 'closure' | 'label' | 'carton' | 'pallet';
export type PackagingUnit = 'piece' | 'case' | 'pallet';
export type PackagingContainerType = 'bottle' | 'can' | 'keg';

export interface PackagingComponentDefinition {
  id: string;
  name: string;
  kind: PackagingComponentKind;
  unit: PackagingUnit;
  materialId: PackagingMaterialId;
  materialPerUnit: number;
  baseUnitCost: number;
  minimumOrder: number;
  reusable: boolean;
  expectedCycles: number;
  recycledContentTarget: number;
  containerType?: PackagingContainerType;
  volumeLiters?: number;
}

export interface PackagingProfileDefinition {
  id: string;
  name: string;
  containerComponentId: string;
  closureComponentId: string | null;
  labelComponentId: string | null;
  cartonComponentId: string | null;
  unitsPerCarton: number;
  palletComponentId: string | null;
  cartonsPerPallet: number;
  returnRate: number;
  depositPerUnit: number;
  environmentalFeePerUnit: number;
  supportedCategories: BeverageCategoryId[];
}

export interface PackagingPlantDefinition {
  id: string;
  organizationId: string;
  assetId: string;
  name: string;
  countryId: string;
  regionId: string;
  componentIds: string[];
  dailyCapacity: number;
  quality: number;
  reliability: number;
}

export const packagingComponents: PackagingComponentDefinition[] = [
  { id: 'bottle-amber-500', name: 'Возвратная янтарная бутылка 500 мл', kind: 'container', unit: 'piece', materialId: 'glass_feedstock', materialPerUnit: .42, baseUnitCost: .22, minimumOrder: 240, reusable: true, expectedCycles: 18, recycledContentTarget: 72, containerType: 'bottle', volumeLiters: .5 },
  { id: 'bottle-amber-330', name: 'Янтарная бутылка 330 мл', kind: 'container', unit: 'piece', materialId: 'glass_feedstock', materialPerUnit: .29, baseUnitCost: .19, minimumOrder: 480, reusable: false, expectedCycles: 1, recycledContentTarget: 68, containerType: 'bottle', volumeLiters: .33 },
  { id: 'bottle-wine-750', name: 'Винная бутылка 750 мл', kind: 'container', unit: 'piece', materialId: 'glass_feedstock', materialPerUnit: .48, baseUnitCost: .31, minimumOrder: 300, reusable: false, expectedCycles: 1, recycledContentTarget: 55, containerType: 'bottle', volumeLiters: .75 },
  { id: 'bottle-sparkling-750', name: 'Усиленная бутылка для игристого 750 мл', kind: 'container', unit: 'piece', materialId: 'glass_feedstock', materialPerUnit: .82, baseUnitCost: .49, minimumOrder: 240, reusable: false, expectedCycles: 1, recycledContentTarget: 46, containerType: 'bottle', volumeLiters: .75 },
  { id: 'bottle-spirit-700', name: 'Бутылка для крепкого алкоголя 700 мл', kind: 'container', unit: 'piece', materialId: 'glass_feedstock', materialPerUnit: .61, baseUnitCost: .44, minimumOrder: 240, reusable: false, expectedCycles: 1, recycledContentTarget: 52, containerType: 'bottle', volumeLiters: .7 },
  { id: 'can-aluminum-330', name: 'Алюминиевая банка 330 мл', kind: 'container', unit: 'piece', materialId: 'aluminum_coil', materialPerUnit: .014, baseUnitCost: .14, minimumOrder: 960, reusable: false, expectedCycles: 1, recycledContentTarget: 76, containerType: 'can', volumeLiters: .33 },
  { id: 'can-aluminum-440', name: 'Алюминиевая банка 440 мл', kind: 'container', unit: 'piece', materialId: 'aluminum_coil', materialPerUnit: .018, baseUnitCost: .16, minimumOrder: 720, reusable: false, expectedCycles: 1, recycledContentTarget: 74, containerType: 'can', volumeLiters: .44 },
  { id: 'keg-steel-30', name: 'Оборотный кег 30 л', kind: 'container', unit: 'piece', materialId: 'steel_sheet', materialPerUnit: 9.4, baseUnitCost: 74, minimumOrder: 12, reusable: true, expectedCycles: 120, recycledContentTarget: 64, containerType: 'keg', volumeLiters: 30 },
  { id: 'closure-crown', name: 'Кроненпробка', kind: 'closure', unit: 'piece', materialId: 'steel_sheet', materialPerUnit: .0024, baseUnitCost: .018, minimumOrder: 1000, reusable: false, expectedCycles: 1, recycledContentTarget: 42 },
  { id: 'closure-screw', name: 'Винтовая крышка', kind: 'closure', unit: 'piece', materialId: 'aluminum_coil', materialPerUnit: .0032, baseUnitCost: .052, minimumOrder: 600, reusable: false, expectedCycles: 1, recycledContentTarget: 58 },
  { id: 'closure-cork', name: 'Натуральная пробка', kind: 'closure', unit: 'piece', materialId: 'cork', materialPerUnit: .004, baseUnitCost: .18, minimumOrder: 300, reusable: false, expectedCycles: 1, recycledContentTarget: 0 },
  { id: 'label-standard', name: 'Стандартная этикетка', kind: 'label', unit: 'piece', materialId: 'label_stock', materialPerUnit: .0018, baseUnitCost: .045, minimumOrder: 600, reusable: false, expectedCycles: 1, recycledContentTarget: 35 },
  { id: 'label-premium', name: 'Премиальная этикетка', kind: 'label', unit: 'piece', materialId: 'label_stock', materialPerUnit: .0032, baseUnitCost: .11, minimumOrder: 300, reusable: false, expectedCycles: 1, recycledContentTarget: 28 },
  { id: 'carton-6', name: 'Короб на 6 бутылок', kind: 'carton', unit: 'case', materialId: 'paperboard', materialPerUnit: .31, baseUnitCost: .38, minimumOrder: 100, reusable: false, expectedCycles: 1, recycledContentTarget: 82 },
  { id: 'carton-12', name: 'Короб на 12 единиц', kind: 'carton', unit: 'case', materialId: 'paperboard', materialPerUnit: .48, baseUnitCost: .52, minimumOrder: 100, reusable: false, expectedCycles: 1, recycledContentTarget: 84 },
  { id: 'pallet-euro', name: 'Оборотная европалета', kind: 'pallet', unit: 'pallet', materialId: 'paperboard', materialPerUnit: 18, baseUnitCost: 13, minimumOrder: 10, reusable: true, expectedCycles: 24, recycledContentTarget: 70 },
];

export const packagingProfiles: PackagingProfileDefinition[] = [
  { id: 'profile-returnable-500', name: 'Возвратная бутылка 500 мл', containerComponentId: 'bottle-amber-500', closureComponentId: 'closure-crown', labelComponentId: 'label-standard', cartonComponentId: 'carton-12', unitsPerCarton: 12, palletComponentId: 'pallet-euro', cartonsPerPallet: 60, returnRate: .68, depositPerUnit: .18, environmentalFeePerUnit: .018, supportedCategories: ['beer', 'cider', 'perry', 'mead'] },
  { id: 'profile-bottle-330', name: 'Бутылка 330 мл', containerComponentId: 'bottle-amber-330', closureComponentId: 'closure-crown', labelComponentId: 'label-standard', cartonComponentId: 'carton-12', unitsPerCarton: 12, palletComponentId: 'pallet-euro', cartonsPerPallet: 72, returnRate: .18, depositPerUnit: .08, environmentalFeePerUnit: .024, supportedCategories: ['beer', 'cider', 'rtd', 'alcohol_free', 'mixer'] },
  { id: 'profile-wine-750', name: 'Винная бутылка 750 мл', containerComponentId: 'bottle-wine-750', closureComponentId: 'closure-cork', labelComponentId: 'label-premium', cartonComponentId: 'carton-6', unitsPerCarton: 6, palletComponentId: 'pallet-euro', cartonsPerPallet: 80, returnRate: .12, depositPerUnit: .06, environmentalFeePerUnit: .032, supportedCategories: ['still_wine', 'fortified_wine', 'vermouth_aperitif', 'sake', 'mead'] },
  { id: 'profile-sparkling-750', name: 'Игристая бутылка 750 мл', containerComponentId: 'bottle-sparkling-750', closureComponentId: 'closure-cork', labelComponentId: 'label-premium', cartonComponentId: 'carton-6', unitsPerCarton: 6, palletComponentId: 'pallet-euro', cartonsPerPallet: 60, returnRate: .08, depositPerUnit: .05, environmentalFeePerUnit: .048, supportedCategories: ['sparkling_wine'] },
  { id: 'profile-spirit-700', name: 'Бутылка 700 мл', containerComponentId: 'bottle-spirit-700', closureComponentId: 'closure-screw', labelComponentId: 'label-premium', cartonComponentId: 'carton-6', unitsPerCarton: 6, palletComponentId: 'pallet-euro', cartonsPerPallet: 72, returnRate: .1, depositPerUnit: .05, environmentalFeePerUnit: .041, supportedCategories: ['whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter'] },
  { id: 'profile-can-330', name: 'Банка 330 мл', containerComponentId: 'can-aluminum-330', closureComponentId: null, labelComponentId: null, cartonComponentId: 'carton-12', unitsPerCarton: 12, palletComponentId: 'pallet-euro', cartonsPerPallet: 90, returnRate: .82, depositPerUnit: .12, environmentalFeePerUnit: .016, supportedCategories: ['rtd', 'alcohol_free', 'mixer', 'beer', 'cider'] },
  { id: 'profile-keg-30', name: 'Оборотный кег 30 л', containerComponentId: 'keg-steel-30', closureComponentId: null, labelComponentId: 'label-standard', cartonComponentId: null, unitsPerCarton: 1, palletComponentId: null, cartonsPerPallet: 1, returnRate: .94, depositPerUnit: 42, environmentalFeePerUnit: .09, supportedCategories: ['beer', 'cider', 'perry', 'rtd'] },
];

export const packagingPlants: PackagingPlantDefinition[] = [
  { id: 'plant-rhein-glass', organizationId: 'org-packaging-rhein-glass', assetId: 'asset-packaging-rhein-glass', name: 'Rhein Circular Glass', countryId: 'germany', regionId: 'rhine-ruhr', componentIds: ['bottle-amber-500', 'bottle-amber-330', 'bottle-wine-750'], dailyCapacity: 2100, quality: 88, reliability: 91 },
  { id: 'plant-champagne-glass', organizationId: 'org-packaging-champagne-glass', assetId: 'asset-packaging-champagne-glass', name: 'Champagne Heavy Glass', countryId: 'france', regionId: 'grand-est', componentIds: ['bottle-sparkling-750', 'bottle-spirit-700'], dailyCapacity: 980, quality: 94, reliability: 86 },
  { id: 'plant-midlands-can', organizationId: 'org-packaging-midlands-can', assetId: 'asset-packaging-midlands-can', name: 'Midlands Can Works', countryId: 'uk', regionId: 'west-midlands', componentIds: ['can-aluminum-330', 'can-aluminum-440'], dailyCapacity: 4200, quality: 86, reliability: 89 },
  { id: 'plant-north-keg', organizationId: 'org-packaging-north-keg', assetId: 'asset-packaging-north-keg', name: 'North Sea Keg Pool', countryId: 'germany', regionId: 'rhine-ruhr', componentIds: ['keg-steel-30'], dailyCapacity: 42, quality: 92, reliability: 93 },
  { id: 'plant-label-carton', organizationId: 'org-packaging-label-carton', assetId: 'asset-packaging-label-carton', name: 'Noir Label & Carton', countryId: 'france', regionId: 'grand-est', componentIds: ['label-standard', 'label-premium', 'carton-6', 'carton-12', 'pallet-euro'], dailyCapacity: 5200, quality: 90, reliability: 88 },
  { id: 'plant-closures', organizationId: 'org-packaging-closures', assetId: 'asset-packaging-closures', name: 'Continental Closures', countryId: 'uk', regionId: 'south-east', componentIds: ['closure-crown', 'closure-screw', 'closure-cork'], dailyCapacity: 6800, quality: 91, reliability: 90 },
];

export function packagingComponent(id: string): PackagingComponentDefinition {
  const value = packagingComponents.find((item) => item.id === id);
  if (!value) throw new Error(`Неизвестный компонент упаковки: ${id}`);
  return value;
}

export function packagingProfile(id: string): PackagingProfileDefinition {
  const value = packagingProfiles.find((item) => item.id === id);
  if (!value) throw new Error(`Неизвестный профиль упаковки: ${id}`);
  return value;
}

export function packagingProfileForCategory(categoryId: BeverageCategoryId): PackagingProfileDefinition {
  if (categoryId === 'sparkling_wine') return packagingProfile('profile-sparkling-750');
  if (['still_wine', 'fortified_wine', 'vermouth_aperitif', 'sake', 'mead'].includes(categoryId)) return packagingProfile('profile-wine-750');
  if (['whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter'].includes(categoryId)) return packagingProfile('profile-spirit-700');
  if (['rtd', 'alcohol_free', 'mixer'].includes(categoryId)) return packagingProfile('profile-can-330');
  return packagingProfile('profile-returnable-500');
}

export function packagingRequirements(profileId: string, packagedUnits: number): Array<{ componentId: string; quantity: number }> {
  const profile = packagingProfile(profileId);
  const result = [{ componentId: profile.containerComponentId, quantity: packagedUnits }];
  if (profile.closureComponentId) result.push({ componentId: profile.closureComponentId, quantity: packagedUnits });
  if (profile.labelComponentId) result.push({ componentId: profile.labelComponentId, quantity: packagedUnits });
  if (profile.cartonComponentId) result.push({ componentId: profile.cartonComponentId, quantity: Math.ceil(packagedUnits / profile.unitsPerCarton) });
  if (profile.palletComponentId) result.push({ componentId: profile.palletComponentId, quantity: Math.max(1, Math.ceil(packagedUnits / (profile.unitsPerCarton * profile.cartonsPerPallet))) });
  return result;
}

export function validatePackagingCatalog(): string[] {
  const errors: string[] = [];
  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label}: повторяющийся id ${id}`);
      seen.add(id);
    }
  };
  unique('components', packagingComponents.map((item) => item.id));
  unique('profiles', packagingProfiles.map((item) => item.id));
  unique('plants', packagingPlants.map((item) => item.id));
  for (const profile of packagingProfiles) {
    for (const id of [profile.containerComponentId, profile.closureComponentId, profile.labelComponentId, profile.cartonComponentId, profile.palletComponentId].filter(Boolean) as string[]) {
      if (!packagingComponents.some((item) => item.id === id)) errors.push(`${profile.id}: отсутствует компонент ${id}`);
    }
  }
  for (const plant of packagingPlants) for (const id of plant.componentIds) if (!packagingComponents.some((item) => item.id === id)) errors.push(`${plant.id}: отсутствует компонент ${id}`);
  return errors;
}
