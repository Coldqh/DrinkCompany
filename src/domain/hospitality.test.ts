import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState, normalizeEcosystemState } from './ecosystem';

const companies = [
  { id: 'producer-a', name: 'Producer A', country: 'Германия', category: 'Пивоварня', reputation: 64, momentum: 57, status: 'stable' as const },
  { id: 'producer-b', name: 'Producer B', country: 'Франция', category: 'Винодельня', reputation: 71, momentum: 49, status: 'stable' as const },
  { id: 'producer-c', name: 'Producer C', country: 'Великобритания', category: 'Дистиллерия', reputation: 68, momentum: 43, status: 'stable' as const },
];

function createWorld() {
  return createEcosystemState({
    playerCompanyName: 'Hospitality Observer',
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

describe('hospitality ecosystem', () => {
  it('создаёт разные форматы заведений с реальными объектами и меню', () => {
    const state = createWorld();
    const concepts = new Set(state.hospitality.venues.map((venue) => venue.concept));
    expect(state.hospitality.venues.length).toBeGreaterThanOrEqual(9);
    expect(concepts.has('pub')).toBe(true);
    expect(concepts.has('cocktail_bar')).toBe(true);
    expect(concepts.has('nightclub')).toBe(true);
    expect(concepts.has('restaurant')).toBe(true);
    expect(state.hospitality.menuItems.length).toBeGreaterThan(state.hospitality.venues.length);
    expect(state.hospitality.venues.every((venue) => state.assets.some((asset) => asset.id === venue.assetId))).toBe(true);
  });

  it('проводит смены, расходует реальные бутылки и сохраняет порционные продажи', () => {
    let state = createWorld();
    const initialShelfUnits = state.trade.shelves.reduce((sum, shelf) => sum + shelf.units, 0);
    for (let day = 2; day <= 9; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    const finalShelfUnits = state.trade.shelves.reduce((sum, shelf) => sum + shelf.units, 0);
    expect(state.hospitality.shiftReports.length).toBeGreaterThan(0);
    expect(state.hospitality.shiftReports.some((report) => report.orders > 0 && report.revenue > 0)).toBe(true);
    expect(state.hospitality.venues.reduce((sum, venue) => sum + venue.totalGuests, 0)).toBeGreaterThan(0);
    expect(finalShelfUnits).toBeLessThan(initialShelfUnits);
    expect(state.hospitality.openContainers.every((container) => container.remainingMl >= 0 && container.remainingMl <= container.initialMl)).toBe(true);
    expect(state.kernel.goodsLedger.some((entry) => entry.sourceType === 'hospitality_service')).toBe(true);
  });

  it('создаёт составные позиции меню из реальных продуктов', () => {
    const state = createWorld();
    const cocktails = state.hospitality.menuItems.filter((item) => item.kind === 'cocktail');
    expect(cocktails.length).toBeGreaterThan(0);
    expect(cocktails.some((item) => item.ingredients.some((ingredient) => ingredient.productId) && item.ingredients.some((ingredient) => ingredient.pantryTag))).toBe(true);
    expect(cocktails.every((item) => item.ingredients.filter((ingredient) => ingredient.productId).every((ingredient) => state.trade.products.some((product) => product.id === ingredient.productId)))).toBe(true);
  });

  it('восстанавливает hospitality-сектор при миграции старого сохранения', () => {
    const state = createWorld();
    const legacy = { ...state, hospitality: undefined } as unknown as typeof state;
    const migrated = normalizeEcosystemState(legacy, 14);
    expect(migrated.hospitality.hospitalityVersion).toBe(1);
    expect(migrated.hospitality.venues.length).toBeGreaterThanOrEqual(9);
    expect(migrated.trade.contracts.some((contract) => migrated.hospitality.venues.some((venue) => venue.assetId === contract.buyerAssetId))).toBe(true);
  });
});
