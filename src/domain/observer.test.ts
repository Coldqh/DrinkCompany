import { describe, expect, it } from 'vitest';
import { properties } from '../data/catalog';
import { startCompany } from './game';
import { runObserverSimulation } from './observer';

describe('observer simulation', () => {
  it('runs nine autonomous months and reports kernel invariants', () => {
    const property = properties[0];
    expect(property).toBeDefined();
    const state = startCompany({
      companyName: 'Observer Company',
      mode: 'standard',
      countryId: 'germany',
      regionId: property!.regionId,
      property: property!,
    }, new Date('2026-01-01T00:00:00.000Z'));
    const result = runObserverSimulation(state, 270);
    expect(result.report.finalDay).toBe(271);
    expect(result.report.organizationCount).toBeGreaterThan(10);
    expect(result.report.productCount).toBeGreaterThan(0);
    expect(result.report.goodsEntries).toBeGreaterThan(0);
    expect(result.report.demandRegionCount).toBe(6);
    expect(result.report.consumerPurchases).toBeGreaterThan(0);
    expect(result.report.regulatoryAuthorities).toBe(3);
    expect(result.report.activeLicenses).toBeGreaterThan(0);
    expect(result.report.exciseObligations).toBeGreaterThan(0);
    expect(result.report.regulatoryPayments).toBeGreaterThan(0);
    expect(result.report.primarySiteCount).toBeGreaterThan(8);
    expect(result.report.harvestCount).toBeGreaterThan(0);
    expect(result.report.primaryProcessingOperations).toBeGreaterThan(0);
    expect(result.report.carrierCount).toBe(4);
    expect(result.report.distributorCount).toBe(3);
    expect(result.report.fleetVehicleCount).toBeGreaterThanOrEqual(10);
    expect(result.report.freightJobCount).toBeGreaterThan(0);
    expect(result.report.deliveredFreightJobs).toBeGreaterThan(0);
    expect(result.report.logisticsOperations).toBeGreaterThan(0);
    expect(result.report.invoiceCount).toBeGreaterThan(0);
    expect(result.report.financialStatementCount).toBeGreaterThan(0);
    expect(result.report.creditDrawn).toBeGreaterThanOrEqual(0);
    expect(result.report.packagingOrganizationCount).toBe(6);
    expect(result.report.packagingJobCount).toBeGreaterThan(0);
    expect(result.report.packagingComponentUnits).toBeGreaterThan(0);
    expect(result.report.industrialPlanCount).toBeGreaterThan(0);
    expect(result.report.industrialRunCount).toBeGreaterThan(0);
    expect(result.report.intermediateLotCount).toBeGreaterThan(0);
    expect(result.report.blendRecipeCount).toBeGreaterThan(0);
    expect(result.report.hospitalityVenueCount).toBeGreaterThanOrEqual(9);
    expect(result.report.hospitalityMenuItemCount).toBeGreaterThan(0);
    expect(result.report.hospitalityShiftCount).toBeGreaterThan(0);
    expect(result.report.hospitalityGuestCount).toBeGreaterThan(0);
    expect(result.report.hospitalityRevenue).toBeGreaterThan(0);
    expect(result.report.hospitalityTrendCount).toBe(360);
    expect(result.report.hospitalityTrendHistoryCount).toBeGreaterThan(0);
    expect(result.report.hospitalityMenuRevisionCount).toBeGreaterThan(0);
    expect(result.report.hospitalityMarketKnowledgeCount).toBeGreaterThan(0);
    expect(result.report.violations).toEqual([]);
  }, 90_000);
});
