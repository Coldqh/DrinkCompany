import { describe, expect, it } from 'vitest';
import { advanceRegulationDay, calculateExcise, createRegulationState } from './regulation';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeState } from './trade';
import { createIndustrialProductionState } from './industrialProduction';
import { createEcosystemKernel, synchronizeKernelFromRegulation } from './kernel';

function organization(id: string, kind: OrganizationState['kind'], countryId: string, cash = 20_000): OrganizationState {
  return {
    id,
    name: id,
    kind,
    countryId,
    regionId: countryId === 'germany' ? 'hesse' : countryId === 'france' ? 'grand-est' : 'kent',
    ownerLabel: 'owner',
    status: 'active',
    cash,
    debt: 0,
    reputation: 60,
    strategy: 'test',
    employeeCount: 12,
    valuation: 100_000,
    dailyRevenue: 0,
    dailyCosts: 0,
    assetIds: [],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: 1,
  };
}

function emptyTrade(): TradeState {
  return {
    inventory: [], products: [], batches: [], contracts: [], shipments: [], shelves: [], operations: [], industrial: createIndustrialProductionState(),
    nextInventoryNumber: 1, nextProductNumber: 1, nextBatchNumber: 1, nextContractNumber: 1,
    nextShipmentNumber: 1, nextShelfNumber: 1, nextOperationNumber: 1,
  };
}

const noAssets: WorldAssetState[] = [];

describe('regulation', () => {
  it('считает немецкую пивную ставку через гектолитры и Plato', () => {
    const result = calculateExcise({ countryId: 'germany', categoryId: 'beer', alcoholByVolume: 5, volumeLiters: 50 });
    expect(result.amount).toBe(4.72);
    expect(result.currency).toBe('EUR');
  });

  it('считает французскую ставку тихого вина 2026', () => {
    const result = calculateExcise({ countryId: 'france', categoryId: 'still_wine', alcoholByVolume: 12.5, volumeLiters: 75 });
    expect(result.amount).toBe(3.14);
  });

  it('считает британскую ставку крепкого алкоголя по литрам чистого алкоголя', () => {
    const result = calculateExcise({ countryId: 'united-kingdom', categoryId: 'whisky', alcoholByVolume: 40, volumeLiters: 75 });
    expect(result.amount).toBe(1019.7);
    expect(result.currency).toBe('GBP');
  });

  it('создаёт обязательные лицензии для производителей и розницы', () => {
    const producer = organization('producer', 'producer', 'germany');
    const retailer = organization('retailer', 'retailer', 'france');
    const assets: WorldAssetState[] = [{
      id: 'shop', type: 'shop', name: 'Shop', city: 'Paris', countryId: 'france', regionId: 'grand-est', address: '1 rue',
      ownerOrganizationId: retailer.id, operatorOrganizationId: retailer.id, status: 'operating', condition: 90, capacity: 100,
      footfall: 60, askingPrice: 100_000, dailyRent: 100, dailyOperatingCost: 100, audience: 'all', marketOutletId: null, venue: null,
    }];
    const state = createRegulationState([producer, retailer], assets, emptyTrade(), 1);
    expect(state.licenses.some((license) => license.organizationId === producer.id && license.permitType === 'producer')).toBe(true);
    expect(state.licenses.some((license) => license.organizationId === retailer.id && license.permitType === 'premises' && license.assetId === 'shop')).toBe(true);
  });

  it('начисляет и затем списывает акциз по доставленной партии', () => {
    const seller = organization('seller', 'producer', 'germany', 10_000);
    const buyer = organization('buyer', 'retailer', 'germany', 10_000);
    const trade = emptyTrade();
    trade.products.push({
      id: 'beer-1', producerOrganizationId: seller.id, name: 'Beer', family: 'beer', beverageCategoryId: 'beer', style: 'lager',
      quality: 70, unitCost: 1, wholesalePrice: 2, recommendedRetailPrice: 4, alcoholByVolume: 5, packageVolumeLiters: .5,
      status: 'active', totalProduced: 100, totalSold: 0, slowDays: 0, stockoutDays: 0, createdDay: 1,
    });
    trade.shipments.push({
      id: 'shipment-1', contractId: 'contract-1', sellerOrganizationId: seller.id, buyerOrganizationId: buyer.id, buyerAssetId: null,
      commodityKind: 'product', commodityId: 'beer-1', quantity: 100, unitPrice: 2, departDay: 1, arrivalDay: 2, status: 'delivered', note: '',
    });
    let regulation = createRegulationState([seller, buyer], noAssets, trade, 1);
    let result = advanceRegulationDay(regulation, [seller, buyer], noAssets, trade, 2);
    regulation = result.regulation;
    expect(regulation.obligations).toHaveLength(1);
    expect(regulation.obligations[0]?.amount).toBe(4.72);
    result = advanceRegulationDay(regulation, result.organizations, noAssets, trade, 9);
    expect(result.regulation.obligations[0]?.status).toBe('paid');
    expect(result.regulation.payments).toHaveLength(1);
    expect(result.organizations.find((item) => item.id === seller.id)?.cash).toBe(9995.28);
  });

  it('записывает акцизную оплату в единый денежный журнал без дубля', () => {
    const kernel = createEcosystemKernel({ day: 1, seedText: 'regulation', organizations: [], assets: [], trade: emptyTrade() });
    const snapshot = {
      authorities: [{ id: 'authority-de', countryId: 'germany', name: 'Authority' }],
      licenses: [], obligations: [], inspections: [],
      payments: [{ id: 'payment-1', day: 2, organizationId: 'seller', authorityId: 'authority-de', amount: 10, currency: 'EUR', obligationId: 'obligation-1' }],
    };
    const once = synchronizeKernelFromRegulation(kernel, snapshot);
    const twice = synchronizeKernelFromRegulation(once, snapshot);
    expect(once.moneyLedger).toHaveLength(1);
    expect(twice.moneyLedger).toHaveLength(1);
    expect(once.moneyLedger[0]?.creditAccount).toBe('system:authority-de:tax_revenue');
  });

  it('останавливает внешнюю поставку без импортного разрешения', () => {
    const seller = organization('seller', 'producer', 'france');
    const buyer = organization('buyer', 'retailer', 'united-kingdom');
    const trade = emptyTrade();
    trade.products.push({
      id: 'wine-1', producerOrganizationId: seller.id, name: 'Wine', family: 'wine', beverageCategoryId: 'still_wine', style: 'red',
      quality: 75, unitCost: 3, wholesalePrice: 6, recommendedRetailPrice: 11, alcoholByVolume: 12.5, packageVolumeLiters: .75,
      status: 'active', totalProduced: 100, totalSold: 0, slowDays: 0, stockoutDays: 0, createdDay: 1,
    });
    trade.shipments.push({
      id: 'shipment-import', contractId: 'contract-import', sellerOrganizationId: seller.id, buyerOrganizationId: buyer.id, buyerAssetId: null,
      commodityKind: 'product', commodityId: 'wine-1', quantity: 12, unitPrice: 6, departDay: 2, arrivalDay: 4, status: 'in_transit', note: '',
    });
    const regulation = createRegulationState([seller, buyer], noAssets, emptyTrade(), 1);
    const result = advanceRegulationDay(regulation, [seller, buyer], noAssets, trade, 2);
    expect(result.regulation.movements[0]?.kind).toBe('customs_import');
    expect(result.regulation.movements[0]?.status).toBe('held');
    expect(result.regulation.violations.some((item) => item.code === 'import_without_permit')).toBe(true);
  });
});
