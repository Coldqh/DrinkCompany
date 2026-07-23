import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState } from './ecosystem';
import { advancePrimaryProductionDay, primaryCommodityStock } from './primaryProduction';

const companies = [
  { id: 'brew-a', name: 'Brew A', country: 'Германия', category: 'Пивоварня', reputation: 64, momentum: 58, status: 'stable' as const },
  { id: 'cider-b', name: 'Cider B', country: 'Франция', category: 'Сидрерия', reputation: 61, momentum: 44, status: 'stable' as const },
];

function createWorld(day = 1) {
  return createEcosystemState({
    playerCompanyName: 'Primary Test',
    countryId: 'germany',
    regionId: 'bavaria',
    propertyName: 'Test Facility',
    propertyId: 'property-rent',
    propertyDailyCost: 180,
    propertyOwned: false,
    companies,
    outlets: marketOutlets,
    day,
  });
}

describe('primary production ecosystem', () => {
  it('создаёт хозяйства, процессоры и физические запасы урожая', () => {
    const state = createWorld();
    expect(state.primaryProduction.sites.length).toBeGreaterThan(8);
    expect(state.primaryProduction.processors.length).toBeGreaterThan(6);
    expect(state.assets.some((asset) => asset.type === 'orchard')).toBe(true);
    expect(state.assets.some((asset) => asset.type === 'hop_yard')).toBe(true);
    expect(primaryCommodityStock(state.primaryProduction, 'raw-barley')).toBeGreaterThan(0);
  });

  it('перерабатывает урожай в реальные ингредиенты и сохраняет происхождение', () => {
    let state = createWorld();
    for (let day = 2; day <= 14; day += 1) state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    const operations = state.primaryProduction.operations.filter((operation) => operation.kind === 'processing');
    expect(operations.length).toBeGreaterThan(0);
    expect(state.trade.inventory.some((lot) => lot.commodityKind === 'ingredient' && operations.some((operation) => operation.outputLotIds.includes(lot.id)))).toBe(true);
    const outputLotId = operations[0]?.outputLotIds[0];
    const trace = state.kernel.traceability.find((node) => node.entityId === outputLotId);
    expect(trace?.parentNodeIds.length).toBeGreaterThan(0);
  });

  it('создаёт урожай по сезону без отрицательных остатков', () => {
    const world = createWorld(218);
    let primaryProduction = world.primaryProduction;
    let organizations = world.organizations;
    let trade = world.trade;
    for (let day = 219; day <= 300; day += 1) {
      const advanced = advancePrimaryProductionDay(primaryProduction, organizations, trade, day);
      primaryProduction = advanced.primaryProduction;
      organizations = advanced.organizations;
      trade = advanced.trade;
    }
    expect(primaryProduction.harvests.length).toBeGreaterThan(0);
    expect(primaryProduction.rawLots.every((lot) => lot.quantity >= 0)).toBe(true);
    expect(primaryProduction.harvests.every((harvest) => harvest.quality >= 0 && harvest.quality <= 100)).toBe(true);
  });

  it('не восстанавливает сельскохозяйственное сырьё без урожая', () => {
    const state = createWorld();
    const depleted = {
      ...state,
      primaryProduction: { ...state.primaryProduction, rawLots: [] },
      trade: {
        ...state.trade,
        inventory: state.trade.inventory.filter((lot) => lot.commodityKind === 'product' || lot.commodityId === 'bottles'),
      },
    };
    const advanced = advanceEcosystemDay(depleted, createBrandState(), [], 2, 0).ecosystem;
    expect(advanced.trade.inventory.some((lot) => lot.commodityKind === 'ingredient' && lot.commodityId !== 'bottles')).toBe(false);
  });

  it('даёт одинаковый результат при одинаковом состоянии и дне', () => {
    const state = createWorld(90);
    const left = advanceEcosystemDay(structuredClone(state), createBrandState(), [], 91, 0).ecosystem.primaryProduction;
    const right = advanceEcosystemDay(structuredClone(state), createBrandState(), [], 91, 0).ecosystem.primaryProduction;
    expect(left.weather).toEqual(right.weather);
    expect(left.sites).toEqual(right.sites);
    expect(left.operations).toEqual(right.operations);
  });
});
