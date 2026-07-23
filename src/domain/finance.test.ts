import { describe, expect, it } from 'vitest';
import { advanceFinancialDay, auditFinancialSystem, createFinancialSystem, financialPosition } from './finance';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeState } from './trade';

function organization(id: string, kind: OrganizationState['kind'], cash: number): OrganizationState {
  return {
    id,
    name: id,
    kind,
    countryId: 'germany',
    regionId: 'bavaria',
    ownerLabel: 'owner',
    status: 'active',
    cash,
    debt: 0,
    reputation: 65,
    strategy: 'stable',
    employeeCount: 4,
    valuation: 50_000,
    dailyRevenue: 0,
    dailyCosts: 100,
    assetIds: [],
    supplierOrganizationIds: [],
    buyerOrganizationIds: [],
    foundedDay: 1,
  };
}

function trade(status: 'in_transit' | 'delivered'): TradeState {
  return {
    inventory: [],
    products: [],
    batches: [],
    contracts: [{
      id: 'contract-1', sellerOrganizationId: 'seller', buyerOrganizationId: 'buyer', sellerAssetId: null, buyerAssetId: null,
      commodityKind: 'ingredient', commodityId: 'malt', quantity: 10, unitPrice: 10, intervalDays: 14, nextDeliveryDay: 30,
      status: 'active', failures: 0, lastResult: 'ok',
    }],
    shipments: [{
      id: 'shipment-1', contractId: 'contract-1', sellerOrganizationId: 'seller', buyerOrganizationId: 'buyer', sellerAssetId: null,
      buyerAssetId: null, commodityKind: 'ingredient', commodityId: 'malt', quantity: 10, unitPrice: 10, departDay: 1,
      arrivalDay: 2, status, note: '', lotAllocations: [],
    }],
    shelves: [], operations: [],
    nextInventoryNumber: 1, nextProductNumber: 1, nextBatchNumber: 1, nextContractNumber: 2, nextShipmentNumber: 2,
    nextShelfNumber: 1, nextOperationNumber: 1,
  };
}

const assets: WorldAssetState[] = [];

describe('financial ecosystem', () => {
  it('turns a delivered shipment into receivables and payables instead of instant cash', () => {
    const seller = organization('seller', 'supplier', 1_100);
    const buyer = organization('buyer', 'producer', 900);
    const state = createFinancialSystem([seller, buyer], assets, 1);
    const result = advanceFinancialDay(state, [seller, buyer], assets, trade('in_transit'), trade('delivered'), 2);
    expect(result.financials.invoices).toHaveLength(1);
    expect(result.organizations.find((item) => item.id === 'seller')?.cash).toBe(1_000);
    expect(result.organizations.find((item) => item.id === 'buyer')?.cash).toBe(1_000);
    const position = financialPosition(result.financials, 'seller', result.trade, 1_000);
    expect(position.receivables).toBe(100);
  });

  it('uses a credit line when an invoice becomes due', () => {
    const seller = organization('seller', 'supplier', 1_100);
    const buyer = organization('buyer', 'producer', 900);
    let result = advanceFinancialDay(createFinancialSystem([seller, buyer], assets, 1), [seller, buyer], assets, trade('in_transit'), trade('delivered'), 2);
    result.organizations = result.organizations.map((item) => item.id === 'buyer' ? { ...item, cash: 100 } : item);
    result = advanceFinancialDay(result.financials, result.organizations, assets, result.trade, result.trade, 16);
    expect(result.financials.invoices[0]?.status).toBe('paid');
    expect(result.financials.creditFacilities.find((item) => item.organizationId === 'buyer')?.drawn).toBeGreaterThan(0);
  });

  it('defaults an unpaid invoice and pauses its contract', () => {
    const seller = organization('seller', 'supplier', 1_100);
    const buyer = organization('buyer', 'producer', 900);
    let result = advanceFinancialDay(createFinancialSystem([seller, buyer], assets, 1), [seller, buyer], assets, trade('in_transit'), trade('delivered'), 2);
    result.financials.creditFacilities = result.financials.creditFacilities.map((facility) => facility.organizationId === 'buyer' ? { ...facility, status: 'frozen', limit: 0, drawn: 0 } : facility);
    result.organizations = result.organizations.map((item) => item.id === 'buyer' ? { ...item, cash: 0, dailyCosts: 500 } : item);
    result = advanceFinancialDay(result.financials, result.organizations, assets, result.trade, result.trade, 32);
    expect(result.financials.invoices[0]?.status).toBe('defaulted');
    expect(result.trade.contracts[0]?.status).toBe('paused');
  });

  it('closes a monthly statement and preserves invariants', () => {
    const seller = organization('seller', 'supplier', 2_000);
    const buyer = organization('buyer', 'producer', 2_000);
    let state = createFinancialSystem([seller, buyer], assets, 1);
    let organizations = [seller, buyer];
    const currentTrade = trade('in_transit');
    for (let day = 2; day <= 30; day += 1) {
      const result = advanceFinancialDay(state, organizations, assets, currentTrade, currentTrade, day);
      state = result.financials;
      organizations = result.organizations;
    }
    expect(state.statements.length).toBeGreaterThan(0);
    expect(auditFinancialSystem(state, organizations)).toEqual([]);
  });
});
