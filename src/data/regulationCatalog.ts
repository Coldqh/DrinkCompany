import type { BeverageCategoryId } from './beverageCatalog';

export type ExciseModel = 'none' | 'per_hl' | 'per_hl_degree' | 'per_hl_plato' | 'per_hl_pure_alcohol' | 'per_litre_pure_alcohol';
export type PermitType = 'producer' | 'excise_warehouse' | 'wholesale' | 'retail' | 'premises' | 'import_export' | 'advertising';

export interface ExciseRule {
  id: string;
  categoryIds: BeverageCategoryId[];
  model: ExciseModel;
  rate: number;
  currency: 'EUR' | 'GBP';
  maximumAbv?: number;
  minimumAbv?: number;
  smallProducerRate?: number;
  label: string;
}

export interface CountryRuleset {
  countryId: 'germany' | 'france' | 'united-kingdom';
  name: string;
  currency: 'EUR' | 'GBP';
  vatRate: number;
  minimumPurchaseAge: number;
  lowerStrengthPurchaseAge?: number;
  emcsMember: boolean;
  customsBorder: boolean;
  advertisingStrictness: number;
  inspectionBaseChance: number;
  permitRequirements: {
    producer: PermitType[];
    supplier: PermitType[];
    retailer: PermitType[];
    hospitality: PermitType[];
  };
  exciseRules: ExciseRule[];
  sourceYear: number;
  note: string;
}

const spiritCategories = ['whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter', 'rtd'];

export const countryRulesets: CountryRuleset[] = [
  {
    countryId: 'germany',
    name: 'Германия',
    currency: 'EUR',
    vatRate: .19,
    minimumPurchaseAge: 18,
    lowerStrengthPurchaseAge: 16,
    emcsMember: true,
    customsBorder: false,
    advertisingStrictness: 54,
    inspectionBaseChance: .018,
    permitRequirements: {
      producer: ['producer', 'excise_warehouse'],
      supplier: ['wholesale'],
      retailer: ['retail', 'premises'],
      hospitality: ['retail', 'premises'],
    },
    exciseRules: [
      { id: 'de-beer', categoryIds: ['beer'], model: 'per_hl_plato', rate: .787, currency: 'EUR', label: 'Пиво: €/hl/°Plato' },
      { id: 'de-sparkling', categoryIds: ['sparkling_wine'], model: 'per_hl', rate: 136, currency: 'EUR', label: 'Игристое: €/hl' },
      { id: 'de-intermediate', categoryIds: ['fortified_wine', 'vermouth_aperitif'], model: 'per_hl', rate: 153, currency: 'EUR', label: 'Промежуточные продукты: €/hl' },
      { id: 'de-spirits', categoryIds: spiritCategories, model: 'per_hl_pure_alcohol', rate: 1303, currency: 'EUR', label: 'Спиртные напитки: €/hl чистого алкоголя' },
      { id: 'de-zero', categoryIds: ['cider', 'perry', 'still_wine', 'mead', 'sake', 'alcohol_free', 'mixer'], model: 'none', rate: 0, currency: 'EUR', label: 'Нулевая ставка в базовой модели' },
    ],
    sourceYear: 2026,
    note: 'Федеральные ставки; разрешения и часы розницы дополнительно зависят от земель и муниципалитетов.',
  },
  {
    countryId: 'france',
    name: 'Франция',
    currency: 'EUR',
    vatRate: .20,
    minimumPurchaseAge: 18,
    emcsMember: true,
    customsBorder: false,
    advertisingStrictness: 78,
    inspectionBaseChance: .024,
    permitRequirements: {
      producer: ['producer', 'excise_warehouse'],
      supplier: ['wholesale'],
      retailer: ['retail', 'premises'],
      hospitality: ['retail', 'premises'],
    },
    exciseRules: [
      { id: 'fr-beer-low', categoryIds: ['beer'], model: 'per_hl_degree', rate: 4.12, currency: 'EUR', maximumAbv: 2.8, label: 'Пиво ≤2,8%: €/hl/градус' },
      { id: 'fr-beer', categoryIds: ['beer'], model: 'per_hl_degree', rate: 8.24, smallProducerRate: 4.12, currency: 'EUR', minimumAbv: 2.8, label: 'Пиво >2,8%: €/hl/градус' },
      { id: 'fr-still-wine', categoryIds: ['still_wine'], model: 'per_hl', rate: 4.19, currency: 'EUR', label: 'Тихое вино: €/hl' },
      { id: 'fr-sparkling', categoryIds: ['sparkling_wine'], model: 'per_hl', rate: 10.38, currency: 'EUR', label: 'Игристое: €/hl' },
      { id: 'fr-cider', categoryIds: ['cider', 'perry', 'mead'], model: 'per_hl', rate: 1.46, currency: 'EUR', label: 'Сидр, перри, медовые напитки: €/hl' },
      { id: 'fr-fermented', categoryIds: ['sake'], model: 'per_hl', rate: 4.19, currency: 'EUR', label: 'Прочие ферментированные: €/hl' },
      { id: 'fr-intermediate', categoryIds: ['fortified_wine', 'vermouth_aperitif'], model: 'per_hl', rate: 52.39, currency: 'EUR', label: 'Льготные промежуточные продукты: €/hl' },
      { id: 'fr-spirits', categoryIds: spiritCategories, model: 'per_hl_pure_alcohol', rate: 1932.42, currency: 'EUR', label: 'Прочий алкоголь: €/hl чистого алкоголя' },
      { id: 'fr-zero', categoryIds: ['alcohol_free', 'mixer'], model: 'none', rate: 0, currency: 'EUR', label: 'Безалкогольные продукты' },
    ],
    sourceYear: 2026,
    note: 'Ставки 2026; реклама алкоголя моделируется как более строгая, чем в других стартовых странах.',
  },
  {
    countryId: 'united-kingdom',
    name: 'Великобритания',
    currency: 'GBP',
    vatRate: .20,
    minimumPurchaseAge: 18,
    emcsMember: false,
    customsBorder: true,
    advertisingStrictness: 64,
    inspectionBaseChance: .022,
    permitRequirements: {
      producer: ['producer'],
      supplier: ['wholesale'],
      retailer: ['retail', 'premises'],
      hospitality: ['retail', 'premises'],
    },
    exciseRules: [
      { id: 'uk-nil', categoryIds: ['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', ...spiritCategories, 'mead', 'sake'], model: 'none', rate: 0, currency: 'GBP', maximumAbv: 1.2, label: '≤1,2%: нулевая ставка' },
      { id: 'uk-low', categoryIds: ['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', ...spiritCategories, 'mead', 'sake'], model: 'per_litre_pure_alcohol', rate: 9.96, currency: 'GBP', minimumAbv: 1.2, maximumAbv: 3.5, label: '1,3–3,4%: £/LPA' },
      { id: 'uk-beer', categoryIds: ['beer'], model: 'per_litre_pure_alcohol', rate: 22.58, currency: 'GBP', minimumAbv: 3.5, maximumAbv: 8.5, label: 'Пиво 3,5–8,4%: £/LPA' },
      { id: 'uk-cider', categoryIds: ['cider', 'perry'], model: 'per_litre_pure_alcohol', rate: 10.39, currency: 'GBP', minimumAbv: 3.5, maximumAbv: 8.5, label: 'Сидр 3,5–8,4%: £/LPA' },
      { id: 'uk-mid-low', categoryIds: ['still_wine', 'sparkling_wine', 'mead', 'sake', ...spiritCategories], model: 'per_litre_pure_alcohol', rate: 26.61, currency: 'GBP', minimumAbv: 3.5, maximumAbv: 8.5, label: 'Остальные 3,5–8,4%: £/LPA' },
      { id: 'uk-mid', categoryIds: ['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', ...spiritCategories, 'mead', 'sake'], model: 'per_litre_pure_alcohol', rate: 30.62, currency: 'GBP', minimumAbv: 8.5, maximumAbv: 22.1, label: '8,5–22%: £/LPA' },
      { id: 'uk-strong', categoryIds: ['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', ...spiritCategories, 'mead', 'sake'], model: 'per_litre_pure_alcohol', rate: 33.99, currency: 'GBP', minimumAbv: 22, label: '>22%: £/LPA' },
      { id: 'uk-zero-products', categoryIds: ['alcohol_free', 'mixer'], model: 'none', rate: 0, currency: 'GBP', label: 'Безалкогольные продукты' },
    ],
    sourceYear: 2026,
    note: 'Единая система ставок по литрам чистого алкоголя; импорт из ЕС проходит отдельную таможенную границу.',
  },
];

export function getCountryRuleset(countryId: string): CountryRuleset {
  return countryRulesets.find((ruleset) => ruleset.countryId === countryId) ?? countryRulesets[0]!;
}
