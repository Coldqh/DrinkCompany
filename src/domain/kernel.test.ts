import { describe, expect, it } from 'vitest';
import { beverageCategories, cocktailRecipes, validateBeverageCatalog } from '../data/beverageCatalog';
import { addTraceNode, advanceKernelDay, auditKernel, createEcosystemKernel, hashSeed, nextRandom, recordGoodsMovement, recordMoneyTransfer, runObserverKernelSimulation, synchronizeKernelFromTrade, traceAncestors } from './kernel';

const input = {
  day: 1,
  seedText: 'kernel-test',
  organizations: [
    { id: 'org-a', name: 'A', countryId: 'de', regionId: 'he' },
    { id: 'org-b', name: 'B', countryId: 'de', regionId: 'he' },
  ],
  assets: [{ id: 'asset-a', ownerOrganizationId: 'org-a', operatorOrganizationId: 'org-a', countryId: 'de', regionId: 'he', type: 'production' }],
  demand: { regions: [{ regionId: 'he', countryId: 'de', population: 1000, segments: [{ id: 'segment-he-urban', name: 'Urban' }] }] },
  trade: {
    products: [{ id: 'product-a', producerOrganizationId: 'org-a', name: 'Bottle A', family: 'spirit', beverageCategoryId: 'gin' }],
    inventory: [{ id: 'lot-a', organizationId: 'org-a', commodityKind: 'ingredient', commodityId: 'juniper', quantity: 10, unit: 'kg', originOrganizationId: 'org-a' }],
    contracts: [{ id: 'contract-a', sellerOrganizationId: 'org-a', buyerOrganizationId: 'org-b', commodityKind: 'product', commodityId: 'product-a' }],
  },
};

describe('ecosystem kernel', () => {
  it('validates the extensible beverage and cocktail catalog', () => {
    expect(validateBeverageCatalog()).toEqual([]);
    expect(beverageCategories.length).toBeGreaterThanOrEqual(20);
    expect(cocktailRecipes).toHaveLength(60);
    expect(cocktailRecipes.every((recipe) => recipe.ingredients.length > 1 && recipe.preparationSeconds >= 20 && recipe.glassware.length > 0)).toBe(true);
  });

  it('creates one registry and maps legacy products to generic beverage specifications', () => {
    const kernel = createEcosystemKernel(input);
    expect(kernel.entities.some((entity) => entity.id === 'org-a' && entity.kind === 'organization')).toBe(true);
    expect(kernel.entities.some((entity) => entity.id === 'region:he' && entity.kind === 'region')).toBe(true);
    expect(kernel.entities.some((entity) => entity.id === 'segment-he-urban' && entity.kind === 'consumer_segment')).toBe(true);
    expect(kernel.productSpecifications[0]?.beverageCategoryId).toBe('gin');
    expect(auditKernel(kernel, input.trade).violations).toEqual([]);
  });

  it('uses deterministic random state and scheduling', () => {
    const seed = hashSeed('same-world');
    expect(nextRandom(seed)).toEqual(nextRandom(seed));
    const kernel = createEcosystemKernel(input);
    const next = advanceKernelDay(kernel, 2, input.trade);
    expect(next.audits.at(-1)?.day).toBe(2);
  });

  it('records balanced money and explicit goods movements', () => {
    let kernel = createEcosystemKernel(input);
    kernel = recordMoneyTransfer(kernel, { day: 1, debitAccount: 'org:org-b:expense', creditAccount: 'org:org-a:revenue', amount: 100, currency: 'EUR', sourceType: 'contract', sourceId: 'contract-a', memo: 'Shipment' });
    kernel = recordGoodsMovement(kernel, { day: 1, commodityId: 'product-a', lotId: null, quantity: 12, unit: 'bottle', fromOrganizationId: 'org-a', toOrganizationId: 'org-b', fromAssetId: 'asset-a', toAssetId: null, sourceType: 'shipment', sourceId: 'shipment-a' });
    expect(kernel.moneyLedger).toHaveLength(1);
    expect(kernel.goodsLedger[0]?.quantity).toBe(12);
  });


  it('records delivered goods but waits for a financial invoice before booking B2B money', () => {
    const trade = {
      ...input.trade,
      shipments: [{ id: 'shipment-a', sellerOrganizationId: 'org-a', buyerOrganizationId: 'org-b', buyerAssetId: null, commodityId: 'product-a', quantity: 24, unitPrice: 4, status: 'delivered', arrivalDay: 2 }],
      shelves: [],
      operations: [{ id: 'operation-a', day: 2, kind: 'delivery', organizationId: 'org-a', counterpartyOrganizationId: 'org-b', assetId: null, amount: 96, headline: 'Delivery' }],
    };
    let kernel = createEcosystemKernel({ ...input, trade });
    kernel = synchronizeKernelFromTrade(kernel, trade, 2);
    kernel = synchronizeKernelFromTrade(kernel, trade, 2);
    expect(kernel.moneyLedger).toHaveLength(0);
    expect(kernel.goodsLedger).toHaveLength(1);
  });

  it('can observe three deterministic years without economic invariant violations', () => {
    const kernel = createEcosystemKernel(input);
    const observed = runObserverKernelSimulation(kernel, input.trade, 1095);
    expect(observed.currentDay).toBe(1096);
    expect(observed.audits.at(-1)?.violations).toEqual([]);
    expect(observed.audits.length).toBeLessThanOrEqual(48);
  });

  it('builds a traceability graph from ingredients to a packaged lot', () => {
    let kernel = createEcosystemKernel(input);
    const ingredientNode = kernel.traceability[0];
    expect(ingredientNode).toBeDefined();
    kernel = addTraceNode(kernel, { entityKind: 'production_batch', entityId: 'batch-a', parentNodeIds: [ingredientNode!.id], organizationId: 'org-a', createdDay: 2 });
    kernel = addTraceNode(kernel, { entityKind: 'package_lot', entityId: 'package-a', parentNodeIds: ['trace-2'], organizationId: 'org-a', createdDay: 3 });
    expect(traceAncestors(kernel, 'trace-3').map((node) => node.entityId)).toEqual(['package-a', 'batch-a', 'lot-a']);
  });
});
