import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState } from './ecosystem';
import { migrateGameState, startCompany } from './game';
import { properties } from '../data/catalog';

const companies = [
  { id: 'brew-logistics', name: 'Transit Brewing', country: 'Германия', category: 'Пивоварня', reputation: 68, momentum: 62, status: 'stable' as const },
  { id: 'cider-logistics', name: 'Route Cider', country: 'Великобритания', category: 'Сидрерия', reputation: 65, momentum: 55, status: 'stable' as const },
];

function createWorld() {
  return createEcosystemState({
    playerCompanyName: 'Logistics Test',
    countryId: 'germany',
    regionId: 'bavaria',
    propertyName: 'Test Facility',
    propertyId: 'property-rent',
    propertyDailyCost: 180,
    propertyOwned: false,
    companies,
    outlets: marketOutlets,
    day: 1,
  });
}

describe('logistics and distribution ecosystem', () => {
  it('создаёт перевозчиков, автопарк и региональных дистрибьюторов', () => {
    const state = createWorld();
    expect(state.organizations.filter((organization) => organization.kind === 'carrier').length).toBe(4);
    expect(state.organizations.filter((organization) => organization.kind === 'distributor').length).toBe(3);
    expect(state.assets.some((asset) => asset.type === 'depot')).toBe(true);
    expect(state.assets.some((asset) => asset.type === 'distribution_center')).toBe(true);
    expect(state.logistics.fleet.length).toBeGreaterThanOrEqual(10);
    expect(state.trade.contracts.some((contract) => contract.buyerOrganizationId.startsWith('org-distributor-'))).toBe(true);
    expect(state.trade.contracts.some((contract) => contract.sellerOrganizationId.startsWith('org-distributor-'))).toBe(true);
  });

  it('проводит поставку через очередь, перевозчика, маршрут и приёмку', () => {
    let state = createWorld();
    for (let day = 2; day <= 24; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    expect(state.logistics.jobs.length).toBeGreaterThan(0);
    expect(state.logistics.jobs.some((job) => job.status === 'delivered')).toBe(true);
    expect(state.logistics.operations.some((operation) => operation.kind === 'assigned')).toBe(true);
    expect(state.logistics.operations.some((operation) => operation.kind === 'departed')).toBe(true);
    expect(state.trade.shipments.some((shipment) => shipment.status === 'delivered')).toBe(true);
    expect(state.kernel.moneyLedger.some((entry) => entry.sourceType === 'freight_service')).toBe(true);
  });

  it('маршруты между ЕС и Великобританией требуют таможенного контроля', () => {
    let state = createWorld();
    for (let day = 2; day <= 8; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    const crossBorderRoute = state.logistics.routes.find((route) =>
      route.originCountryId !== route.destinationCountryId
      && (route.originCountryId === 'united-kingdom' || route.destinationCountryId === 'united-kingdom'));
    expect(crossBorderRoute?.customsRequired).toBe(true);
    expect(crossBorderRoute?.baseTransitDays).toBeGreaterThan(1);
  });

  it('мигрирует schemaVersion 17 в логистическое ядро schemaVersion 22', () => {
    const property = properties[0];
    if (!property) throw new Error('property missing');
    const current = startCompany({ companyName: 'Legacy Logistics', mode: 'standard', countryId: 'germany', regionId: property.regionId, property }, new Date('2026-01-01T00:00:00.000Z'));
    const legacy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
    legacy.schemaVersion = 17;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.logistics;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(22);
    expect(migrated.ecosystem?.organizations.some((organization) => organization.kind === 'carrier')).toBe(true);
    expect(migrated.ecosystem?.logistics.fleet.length).toBeGreaterThan(0);
  });
});
