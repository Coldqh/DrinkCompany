import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState } from './ecosystem';
import { migrateGameState, startCompany } from './game';
import { properties } from '../data/catalog';
import { advanceQualityDay, auditQuality, createQualitySector, productQualitySummary } from './quality';
import { normalizeTradeState } from './trade';

const companies = [
  { id: 'quality-brew', name: 'Quality Brewing', country: 'Германия', category: 'Пивоварня', reputation: 68, momentum: 58, status: 'stable' as const },
  { id: 'quality-spirit', name: 'Quality Spirits', country: 'Франция', category: 'Дистиллерия', reputation: 70, momentum: 61, status: 'stable' as const },
];

function createWorld() {
  return createEcosystemState({
    playerCompanyName: 'Quality Test',
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

describe('quality, certification and recalls', () => {
  it('создаёт независимые лаборатории и спецификации всех продуктов', () => {
    const state = createWorld();
    expect(state.organizations.filter((organization) => organization.kind === 'service').length).toBe(3);
    expect(state.quality.laboratories.length).toBe(3);
    expect(state.quality.specifications.length).toBe(state.trade.products.length);
    expect(state.assets.filter((asset) => asset.type === 'laboratory').length).toBeGreaterThanOrEqual(3);
  });

  it('выдаёт сертификат успешной партии и записывает оплату лаборатории', () => {
    let state = createWorld();
    for (let day = 2; day <= 5; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    expect(state.quality.results.some((result) => result.passed)).toBe(true);
    expect(state.quality.certificates.some((certificate) => certificate.status === 'valid')).toBe(true);
    expect(state.kernel.moneyLedger.some((entry) => entry.sourceType === 'quality_test')).toBe(true);
  });

  it('отзывает конкретный опасный лот со склада и полки', () => {
    const world = createWorld();
    const product = world.trade.products[0];
    if (!product) throw new Error('product missing');
    const badLot = world.trade.inventory.find((lot) => lot.commodityKind === 'product' && lot.commodityId === product.id);
    if (!badLot) throw new Error('lot missing');
    badLot.quality = 1;
    const quality = createQualitySector(world.organizations, world.assets, world.trade, 1).quality;
    quality.samples.push({
      id: 'quality-sample-forced', kind: 'release', organizationId: product.producerOrganizationId,
      laboratoryId: quality.laboratories[0]!.id, productId: product.id, lotId: badLot.id, shelfId: null,
      submittedDay: 1, dueDay: 2, status: 'queued', panels: ['identity', 'abv', 'microbiology', 'contaminants', 'packaging', 'label'], fee: 100,
    });
    const result = advanceQualityDay(quality, normalizeTradeState(world.trade), world.organizations, world.assets, 2);
    expect(result.quality.incidents.length).toBe(1);
    expect(result.quality.recalls.length).toBe(1);
    expect(result.trade.inventory.find((lot) => lot.id === badLot.id)?.status).toBe('recalled');
    expect(result.quality.recalls[0]?.destroyedUnits).toBeGreaterThan(0);
    expect(auditQuality(result.quality, result.trade)).toEqual([]);
  });

  it('показывает единый статус качества продукта', () => {
    let state = createWorld();
    for (let day = 2; day <= 5; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    const certifiedProduct = state.trade.products.find((product) => productQualitySummary(state.quality, product.id).status === 'certified');
    if (!certifiedProduct) throw new Error('certified product missing');
    expect(productQualitySummary(state.quality, certifiedProduct.id).certificateCount).toBeGreaterThan(0);
  });

  it('мигрирует schemaVersion 18 в quality ecosystem schemaVersion 24', () => {
    const property = properties[0];
    if (!property) throw new Error('property missing');
    const current = startCompany({ companyName: 'Legacy Quality', mode: 'standard', countryId: 'germany', regionId: property.regionId, property }, new Date('2026-01-01T00:00:00.000Z'));
    const legacy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
    legacy.schemaVersion = 18;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.quality;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(24);
    expect(migrated.ecosystem?.quality.laboratories.length).toBe(3);
    expect(migrated.ecosystem?.organizations.some((organization) => organization.kind === 'service')).toBe(true);
  });
});
