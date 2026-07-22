import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createBrandState } from './brand';
import { advanceEcosystemDay, createEcosystemState } from './ecosystem';
import { inventoryQuantity } from './trade';

const companies = [
  { id: 'brew-a', name: 'Brew A', country: 'Германия', category: 'Пивоварня', reputation: 64, momentum: 58, status: 'stable' as const },
  { id: 'cider-b', name: 'Cider B', country: 'Франция', category: 'Сидрерия', reputation: 61, momentum: 44, status: 'stable' as const },
];

function createWorld() {
  return createEcosystemState({
    playerCompanyName: 'Player Company',
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

describe('trade ecosystem', () => {
  it('создаёт поставщиков, продукты, контракты и реальные полки', () => {
    const state = createWorld();
    expect(state.organizations.some((organization) => organization.kind === 'supplier')).toBe(true);
    expect(state.assets.some((asset) => asset.type === 'warehouse' && asset.ownerOrganizationId?.startsWith('org-supplier-'))).toBe(true);
    expect(state.trade.products.length).toBeGreaterThanOrEqual(companies.length);
    expect(state.trade.contracts.some((contract) => contract.commodityKind === 'ingredient')).toBe(true);
    expect(state.trade.contracts.some((contract) => contract.commodityKind === 'product')).toBe(true);
    expect(state.trade.shelves.length).toBeGreaterThan(0);
  });

  it('проводит сырьё через доставку, производство, полку и конечную продажу', () => {
    let state = createWorld();
    for (let day = 2; day <= 12; day += 1) {
      state = advanceEcosystemDay(state, createBrandState(), [], day, 0).ecosystem;
    }
    expect(state.trade.shipments.some((shipment) => shipment.status === 'delivered')).toBe(true);
    expect(state.trade.batches.some((batch) => batch.status === 'ready' || batch.status === 'producing')).toBe(true);
    expect(state.trade.shelves.some((listing) => listing.totalUnitsSold > 0)).toBe(true);
    expect(state.trade.operations.some((operation) => operation.kind === 'sale')).toBe(true);
    expect(state.trade.operations.some((operation) => operation.kind === 'delivery')).toBe(true);
  });

  it('не создаёт сырьё у производителя без поставки', () => {
    const state = createWorld();
    const producer = state.organizations.find((organization) => organization.kind === 'producer');
    if (!producer) throw new Error('producer missing');
    expect(inventoryQuantity(state.trade, producer.id, 'ingredient', 'malt-base')).toBe(0);
    const advanced = advanceEcosystemDay(state, createBrandState(), [], 2, 0).ecosystem;
    expect(advanced.trade.shipments.some((shipment) => shipment.buyerOrganizationId === producer.id && shipment.commodityKind === 'ingredient')).toBe(true);
  });

  it('показывает дефицит и задерживает контракт, если товар у продавца закончился', () => {
    const state = createWorld();
    const productContract = state.trade.contracts.find((contract) => contract.commodityKind === 'product');
    if (!productContract) throw new Error('product contract missing');
    const depleted = {
      ...state,
      trade: {
        ...state.trade,
        inventory: state.trade.inventory.filter((lot) => !(lot.organizationId === productContract.sellerOrganizationId && lot.commodityKind === 'product' && lot.commodityId === productContract.commodityId)),
        contracts: state.trade.contracts.map((contract) => contract.id === productContract.id ? { ...contract, nextDeliveryDay: 2 } : contract),
      },
    };
    const advanced = advanceEcosystemDay(depleted, createBrandState(), [], 2, 0).ecosystem;
    const contract = advanced.trade.contracts.find((item) => item.id === productContract.id);
    expect(contract?.failures).toBe(1);
    expect(contract?.lastResult).toContain('Дефицит');
    expect(advanced.trade.operations.some((operation) => operation.kind === 'shortage')).toBe(true);
  });
});
