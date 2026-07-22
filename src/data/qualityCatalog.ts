import type { BeverageCategoryId } from './beverageCatalog';

export type QualityPanelId = 'identity' | 'abv' | 'microbiology' | 'contaminants' | 'packaging' | 'label';

export interface QualityCategoryRule {
  categoryId: BeverageCategoryId;
  requiredPanels: QualityPanelId[];
  abvTolerance: number;
  minimumQuality: number;
  microbiologyLimit: number;
  contaminantLimit: number;
  certificateDays: number;
}

const FERMENTED: BeverageCategoryId[] = ['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', 'sake', 'mead', 'rtd', 'alcohol_free'];
const DISTILLED: BeverageCategoryId[] = ['whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter', 'vermouth_aperitif'];

export const qualityCategoryRules: QualityCategoryRule[] = [
  ...FERMENTED.map((categoryId): QualityCategoryRule => ({
    categoryId,
    requiredPanels: ['identity', 'abv', 'microbiology', 'packaging', 'label'],
    abvTolerance: categoryId === 'alcohol_free' ? .15 : .6,
    minimumQuality: 35,
    microbiologyLimit: categoryId === 'still_wine' || categoryId === 'fortified_wine' ? 24 : 18,
    contaminantLimit: 14,
    certificateDays: 180,
  })),
  ...DISTILLED.map((categoryId): QualityCategoryRule => ({
    categoryId,
    requiredPanels: ['identity', 'abv', 'contaminants', 'packaging', 'label'],
    abvTolerance: .8,
    minimumQuality: 35,
    microbiologyLimit: 40,
    contaminantLimit: categoryId === 'agave_spirit' || categoryId === 'brandy' ? 18 : 12,
    certificateDays: 365,
  })),
  {
    categoryId: 'mixer',
    requiredPanels: ['identity', 'microbiology', 'packaging', 'label'],
    abvTolerance: .1,
    minimumQuality: 35,
    microbiologyLimit: 14,
    contaminantLimit: 10,
    certificateDays: 180,
  },
];

export function qualityRuleForCategory(categoryId: BeverageCategoryId): QualityCategoryRule {
  return qualityCategoryRules.find((rule) => rule.categoryId === categoryId) ?? qualityCategoryRules[0]!;
}
