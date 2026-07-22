export type LogisticsVehicleType = 'cargo_van' | 'rigid_truck' | 'articulated_truck' | 'temperature_truck';

export interface LogisticsCarrierDefinition {
  id: string;
  organizationId: string;
  organizationName: string;
  depotAssetId: string;
  depotName: string;
  countryId: string;
  regionId: string;
  city: string;
  address: string;
  reliability: number;
  customsCapability: boolean;
  refrigeratedCapability: boolean;
  baseRatePerKm: number;
  vehicleMix: LogisticsVehicleType[];
}

export interface DistributorDefinition {
  id: string;
  organizationId: string;
  organizationName: string;
  warehouseAssetId: string;
  warehouseName: string;
  countryId: string;
  regionId: string;
  city: string;
  address: string;
  capacity: number;
  focus: string;
}

export interface RegionLogisticsNode {
  regionId: string;
  countryId: string;
  x: number;
  y: number;
  portAccess: number;
  borderFriction: number;
}

export const logisticsCarriers: LogisticsCarrierDefinition[] = [
  {
    id: 'rhein-cargo', organizationId: 'org-carrier-rhein-cargo', organizationName: 'Rhein Cargo Network',
    depotAssetId: 'asset-depot-rhein-cargo', depotName: 'Rhein Central Depot', countryId: 'germany', regionId: 'hesse',
    city: 'Франкфурт', address: 'Cargo Ring 18', reliability: 89, customsCapability: true, refrigeratedCapability: true,
    baseRatePerKm: 1.08, vehicleMix: ['cargo_van', 'rigid_truck', 'articulated_truck', 'temperature_truck'],
  },
  {
    id: 'alsace-freight', organizationId: 'org-carrier-alsace-freight', organizationName: 'Alsace Beverage Freight',
    depotAssetId: 'asset-depot-alsace-freight', depotName: 'Alsace Cross-Border Hub', countryId: 'france', regionId: 'grand-est',
    city: 'Страсбург', address: 'Rue du Fret 7', reliability: 84, customsCapability: true, refrigeratedCapability: false,
    baseRatePerKm: 1.02, vehicleMix: ['cargo_van', 'rigid_truck', 'articulated_truck'],
  },
  {
    id: 'channel-drinks', organizationId: 'org-carrier-channel-drinks', organizationName: 'Channel Drinks Logistics',
    depotAssetId: 'asset-depot-channel-drinks', depotName: 'Kent Beverage Terminal', countryId: 'united-kingdom', regionId: 'kent',
    city: 'Дувр', address: 'Harbour Freight 4', reliability: 81, customsCapability: true, refrigeratedCapability: true,
    baseRatePerKm: 1.24, vehicleMix: ['cargo_van', 'rigid_truck', 'temperature_truck'],
  },
  {
    id: 'normandy-local', organizationId: 'org-carrier-normandy-local', organizationName: 'Normandy Local Distribution',
    depotAssetId: 'asset-depot-normandy-local', depotName: 'Rouen Local Depot', countryId: 'france', regionId: 'normandy',
    city: 'Руан', address: 'Zone Logistique 11', reliability: 76, customsCapability: false, refrigeratedCapability: false,
    baseRatePerKm: .88, vehicleMix: ['cargo_van', 'rigid_truck'],
  },
];

export const distributors: DistributorDefinition[] = [
  {
    id: 'rhein-beverage-distribution', organizationId: 'org-distributor-rhein', organizationName: 'Rhein Beverage Distribution',
    warehouseAssetId: 'asset-distributor-rhein', warehouseName: 'Rhein Drinks Warehouse', countryId: 'germany', regionId: 'hesse',
    city: 'Франкфурт', address: 'Handelslager 22', capacity: 16_000, focus: 'Бары, магазины и локальные сети Германии',
  },
  {
    id: 'grand-est-drinks', organizationId: 'org-distributor-grand-est', organizationName: 'Grand Est Drinks Distribution',
    warehouseAssetId: 'asset-distributor-grand-est', warehouseName: 'Grand Est Regional Warehouse', countryId: 'france', regionId: 'grand-est',
    city: 'Реймс', address: 'Parc Distribution 9', capacity: 14_000, focus: 'Вино, пиво и премиальные специализированные магазины',
  },
  {
    id: 'west-country-beverage', organizationId: 'org-distributor-west-country', organizationName: 'West Country Beverage Supply',
    warehouseAssetId: 'asset-distributor-west-country', warehouseName: 'West Country Drinks Hub', countryId: 'united-kingdom', regionId: 'somerset',
    city: 'Бристоль', address: 'Trade Estate 16', capacity: 13_500, focus: 'Сидр, бары и независимая розница Великобритании',
  },
];

export const regionLogisticsNodes: RegionLogisticsNode[] = [
  { regionId: 'bavaria', countryId: 'germany', x: 7.4, y: 5.6, portAccess: .2, borderFriction: .08 },
  { regionId: 'hesse', countryId: 'germany', x: 5.9, y: 6.6, portAccess: .15, borderFriction: .06 },
  { regionId: 'normandy', countryId: 'france', x: 2.3, y: 6.1, portAccess: .72, borderFriction: .08 },
  { regionId: 'grand-est', countryId: 'france', x: 5.1, y: 5.8, portAccess: .08, borderFriction: .07 },
  { regionId: 'somerset', countryId: 'united-kingdom', x: 1.1, y: 7.4, portAccess: .58, borderFriction: .18 },
  { regionId: 'kent', countryId: 'united-kingdom', x: 2.6, y: 7.3, portAccess: .82, borderFriction: .2 },
  { regionId: 'asturias', countryId: 'spain', x: .3, y: 3.8, portAccess: .7, borderFriction: .13 },
  { regionId: 'silesia', countryId: 'poland', x: 8.5, y: 6.7, portAccess: .05, borderFriction: .1 },
  { regionId: 'yakima', countryId: 'united-states', x: -18, y: 8.5, portAccess: .25, borderFriction: .75 },
];

export function logisticsNode(regionId: string, countryIdFallback = 'germany'): RegionLogisticsNode {
  return regionLogisticsNodes.find((item) => item.regionId === regionId)
    ?? { regionId, countryId: countryIdFallback, x: 5, y: 5, portAccess: .1, borderFriction: .12 };
}

export function vehicleCapacity(type: LogisticsVehicleType): number {
  return ({ cargo_van: 900, rigid_truck: 4_500, articulated_truck: 11_000, temperature_truck: 3_600 })[type];
}

export function vehicleLabel(type: LogisticsVehicleType): string {
  return ({ cargo_van: 'грузовой фургон', rigid_truck: 'средний грузовик', articulated_truck: 'магистральная фура', temperature_truck: 'температурный грузовик' })[type];
}
