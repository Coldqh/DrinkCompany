import { describe, expect, it } from 'vitest';
import { validatePackagingCatalog, packagingProfileForCategory, packagingRequirements } from '../data/packagingCatalog';
import { createDemandState } from './demand';
import { advancePackagingDay, createPackagingSector, ensurePackagingSector } from './packaging';
import { advanceTradeDay, createTradeState, type TradeState } from './trade';
import type { OrganizationState, WorldAssetState } from './ecosystem';

function producer(): OrganizationState {
  return {
    id: 'org-test-producer', name: 'Test Drinks', kind: 'producer', countryId: 'germany', regionId: 'rhine-ruhr', ownerLabel: 'Test', status: 'active',
    cash: 100_000, debt: 0, reputation: 72, strategy: 'пивоварня', employeeCount: 12, valuation: 180_000, dailyRevenue: 0, dailyCosts: 300,
    assetIds: ['asset-test-producer'], supplierOrganizationIds: [], buyerOrganizationIds: [], foundedDay: 1,
  };
}

function producerAsset(): WorldAssetState {
  return {
    id: 'asset-test-producer', type: 'production', name: 'Test Plant', city: 'Дюссельдорф', countryId: 'germany', regionId: 'rhine-ruhr', address: 'Test 1',
    ownerOrganizationId: 'org-test-producer', operatorOrganizationId: 'org-test-producer', status: 'operating', condition: 90, capacity: 500, footfall: 0,
    askingPrice: 100_000, dailyRent: 0, dailyOperatingCost: 300, audience: 'пиво', marketOutletId: null, venue: null,
  };
}

describe('packaging ecosystem', () => {
  it('keeps the packaging catalog internally consistent', () => {
    expect(validatePackagingCatalog()).toEqual([]);
    const profile = packagingProfileForCategory('whisky');
    expect(profile.id).toBe('profile-spirit-700');
    expect(packagingRequirements(profile.id, 120).some((item) => item.componentId === 'bottle-spirit-700')).toBe(true);
  });

  it('creates plants, packaging inventories and contracts for a producer', () => {
    const sector = createPackagingSector(1);
    const organizations = [producer(), ...sector.organizations];
    const assets = [producerAsset(), ...sector.assets];
    const trade = createTradeState(organizations, assets, 1);
    const ready = ensurePackagingSector({ state: sector.packaging, organizations, assets, trade, day: 1 });
    expect(ready.organizations.filter((item) => item.kind === 'packaging')).toHaveLength(6);
    expect(ready.trade.inventory.some((lot) => lot.commodityKind === 'packaging')).toBe(true);
    expect(ready.trade.contracts.some((contract) => contract.commodityKind === 'packaging' && contract.buyerOrganizationId === 'org-test-producer')).toBe(true);
  });

  it('blocks a production batch when physical packaging is missing', () => {
    const sector = createPackagingSector(1);
    const organizations = [producer(), ...sector.organizations];
    const assets = [producerAsset(), ...sector.assets];
    const trade = createTradeState(organizations, assets, 1);
    const ready = ensurePackagingSector({ state: sector.packaging, organizations, assets, trade, day: 1 });
    const withoutProducerPackaging: TradeState = {
      ...ready.trade,
      inventory: ready.trade.inventory.filter((lot) => !(lot.organizationId === 'org-test-producer' && lot.commodityKind === 'packaging')),
    };
    const result = advanceTradeDay(withoutProducerPackaging, ready.organizations, ready.assets, 2, createDemandState(1, 'packaging-test'));
    const blocked = result.trade.batches.find((batch) => batch.producerOrganizationId === 'org-test-producer' && batch.status === 'blocked');
    expect(blocked?.issue).toContain('бутылка');
  });

  it('manufactures packaging from finite material stocks and recycles returns', () => {
    const sector = createPackagingSector(1);
    const organizations = [producer(), ...sector.organizations];
    const assets = [producerAsset(), ...sector.assets];
    const trade = createTradeState(organizations, assets, 1);
    const ready = ensurePackagingSector({ state: sector.packaging, organizations, assets, trade, day: 1 });
    const product = ready.trade.products.find((item) => item.producerOrganizationId === 'org-test-producer');
    expect(product).toBeDefined();
    const shelfTrade: TradeState = {
      ...ready.trade,
      shelves: [{ id: 'shelf-test', assetId: 'asset-test-producer', productId: product!.id, supplierOrganizationId: producer().id, units: 100, retailPrice: 3, unitsSoldToday: 20, revenueToday: 60, totalUnitsSold: 20, lastRestockDay: 1, stockoutDays: 0, lotAllocations: [], soldLotAllocationsToday: [] }],
    };
    let packaging = ready.packaging;
    let nextTrade = shelfTrade;
    let nextOrganizations = ready.organizations;
    const initialMaterial = packaging.materialStocks.reduce((sum, item) => sum + item.quantity, 0);
    for (let day = 2; day <= 12; day += 1) {
      const result = advancePackagingDay(packaging, nextTrade, nextOrganizations, ready.assets, day);
      packaging = result.packaging;
      nextTrade = { ...result.trade, shelves: result.trade.shelves.map((item) => ({ ...item, unitsSoldToday: day === 2 ? item.unitsSoldToday : 0 })) };
      nextOrganizations = result.organizations;
    }
    expect(packaging.jobs.some((job) => job.status === 'completed')).toBe(true);
    expect(packaging.returns.some((item) => item.status === 'collected')).toBe(true);
    expect(packaging.materialStocks.every((item) => item.quantity >= 0)).toBe(true);
    expect(packaging.materialStocks.reduce((sum, item) => sum + item.quantity, 0)).not.toBe(initialMaterial);
  });
});
