import { describe, expect, it } from 'vitest';
import { cocktailPantryCatalog, cocktailRecipes } from '../data/cocktailCatalog';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState, normalizeEcosystemState } from './ecosystem';
import { advanceHospitalityDay } from './hospitality';

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
  it('валидирует каталог из 60 полноценных коктейлей', () => {
    expect(cocktailRecipes).toHaveLength(60);
    expect(new Set(cocktailRecipes.map((recipe) => recipe.id)).size).toBe(60);
    expect(cocktailRecipes.every((recipe) => recipe.ingredients.length > 1)).toBe(true);
    expect(cocktailRecipes.every((recipe) => recipe.preparationSeconds >= 20 && recipe.glassware.length > 0 && recipe.complexity >= 1)).toBe(true);
    expect(cocktailPantryCatalog.every((ingredient) => ingredient.openingStock > ingredient.reorderPoint && ingredient.targetStock >= ingredient.openingStock)).toBe(true);
  });

  it('создаёт разные форматы заведений с физической кладовой и меню', () => {
    const state = createWorld();
    const concepts = new Set(state.hospitality.venues.map((venue) => venue.concept));
    const cocktails = state.hospitality.menuItems.filter((item) => item.kind === 'cocktail');
    expect(state.hospitality.hospitalityVersion).toBe(2);
    expect(state.hospitality.venues.length).toBeGreaterThanOrEqual(9);
    expect(concepts.has('pub')).toBe(true);
    expect(concepts.has('cocktail_bar')).toBe(true);
    expect(concepts.has('nightclub')).toBe(true);
    expect(concepts.has('restaurant')).toBe(true);
    expect(state.hospitality.pantryLots.length).toBeGreaterThan(0);
    expect(state.hospitality.menuItems.length).toBeGreaterThan(state.hospitality.venues.length);
    expect(cocktails.every((item) => item.recipeId && item.preparationSeconds > 0 && item.materialCost > 0)).toBe(true);
    expect(state.hospitality.venues.every((venue) => state.assets.some((asset) => asset.id === venue.assetId))).toBe(true);
  });

  it('проводит смены, точно списывает бутылки и pantry-ингредиенты', () => {
    let state = createWorld();
    const initialShelfUnits = state.trade.shelves.reduce((sum, shelf) => sum + shelf.units, 0);
    for (let day = 2; day <= 9; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    const finalShelfUnits = state.trade.shelves.reduce((sum, shelf) => sum + shelf.units, 0);
    const pantrySales = state.hospitality.shiftReports.flatMap((report) => report.items).filter((item) => item.pantryConsumed > 0);
    expect(state.hospitality.shiftReports.length).toBeGreaterThan(0);
    expect(state.hospitality.shiftReports.some((report) => report.orders > 0 && report.revenue > 0)).toBe(true);
    expect(state.hospitality.shiftReports.some((report) => report.averageServeQuality > 0 && report.serviceUtilization > 0)).toBe(true);
    expect(pantrySales.length).toBeGreaterThan(0);
    for (const sale of pantrySales) {
      const menuItem = state.hospitality.menuItems.find((item) => item.id === sale.menuItemId);
      const expectedPantry = (menuItem?.ingredients ?? [])
        .filter((ingredient) => ingredient.pantryTag)
        .reduce((sum, ingredient) => sum + ingredient.amount * sale.orders, 0);
      expect(sale.pantryConsumed).toBeCloseTo(expectedPantry, 1);
    }
    expect(state.hospitality.venues.reduce((sum, venue) => sum + venue.totalGuests, 0)).toBeGreaterThan(0);
    expect(finalShelfUnits).toBeLessThan(initialShelfUnits);
    expect(state.hospitality.openContainers.every((container) => container.remainingMl >= 0 && container.remainingMl <= container.initialMl)).toBe(true);
    expect(state.kernel.goodsLedger.some((entry) => entry.sourceType === 'hospitality_service')).toBe(true);
  });

  it('создаёт коктейли из конкретных продуктов и доступных замен', () => {
    const state = createWorld();
    const cocktails = state.hospitality.menuItems.filter((item) => item.kind === 'cocktail');
    expect(cocktails.length).toBeGreaterThan(0);
    expect(cocktails.some((item) => item.ingredients.some((ingredient) => ingredient.productId) && item.ingredients.some((ingredient) => ingredient.pantryTag))).toBe(true);
    expect(cocktails.every((item) => item.ingredients.filter((ingredient) => ingredient.productId).every((ingredient) => state.trade.products.some((product) => product.id === ingredient.productId)))).toBe(true);
  });

  it('снимает коктейль с продажи при пустой кладовой и отсутствии денег', () => {
    const state = createWorld();
    const cocktailVenue = state.hospitality.venues.find((venue) => venue.concept === 'cocktail_bar');
    expect(cocktailVenue).toBeDefined();
    const result = advanceHospitalityDay(
      { ...state.hospitality, pantryLots: [] },
      state.trade,
      state.demand,
      state.organizations.map((organization) => ({ ...organization, cash: 0 })),
      state.assets,
      2,
    );
    const disabledCocktails = result.hospitality.menuItems.filter((item) => item.venueId === cocktailVenue?.id && item.kind === 'cocktail' && !item.active);
    expect(disabledCocktails.length).toBeGreaterThan(0);
    expect(disabledCocktails.some((item) => item.availabilityReason?.includes('Нет ингредиента'))).toBe(true);
  });

  it('восстанавливает hospitality-сектор при миграции старого сохранения', () => {
    const state = createWorld();
    const legacy = { ...state, hospitality: undefined } as unknown as typeof state;
    const migrated = normalizeEcosystemState(legacy, 14);
    expect(migrated.hospitality.hospitalityVersion).toBe(2);
    expect(migrated.hospitality.venues.length).toBeGreaterThanOrEqual(9);
    expect(migrated.hospitality.pantryLots.length).toBeGreaterThan(0);
    expect(migrated.trade.contracts.some((contract) => migrated.hospitality.venues.some((venue) => venue.assetId === contract.buyerAssetId))).toBe(true);
  });

  it('мигрирует hospitalityVersion 1 без потери заведений и меню', () => {
    const state = createWorld();
    const legacyHospitality = {
      ...state.hospitality,
      hospitalityVersion: 1,
      pantryLots: undefined,
      nextPantryLotNumber: undefined,
    } as unknown as typeof state.hospitality;
    const migrated = normalizeEcosystemState({ ...state, hospitality: legacyHospitality }, 23);
    expect(migrated.hospitality.hospitalityVersion).toBe(2);
    expect(migrated.hospitality.venues).toHaveLength(state.hospitality.venues.length);
    expect(migrated.hospitality.menuItems.length).toBeGreaterThanOrEqual(state.hospitality.menuItems.length);
    expect(migrated.hospitality.pantryLots.length).toBeGreaterThan(0);
  });
});
