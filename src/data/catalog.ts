import countriesJson from './countries.json';
import propertiesJson from './properties.json';
import regionsJson from './regions.json';
import type { CountryDefinition, PropertyDefinition, RegionDefinition } from '../domain/game';

export const countries = countriesJson as CountryDefinition[];
export const regions = regionsJson as RegionDefinition[];
export const properties = propertiesJson as PropertyDefinition[];

export function getRegionsForCountry(countryId: string): RegionDefinition[] {
  return regions.filter((region) => region.countryId === countryId);
}

export function getPropertiesForRegion(regionId: string): PropertyDefinition[] {
  return properties.filter((property) => property.regionId === regionId);
}
