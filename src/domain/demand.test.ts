import { describe, expect, it } from 'vitest';
import { advanceDemandDay, calculateShelfDemand, createDemandState, recordConsumerPurchase } from './demand';

const baseInput = {
  day: 6,
  regionId: 'bavaria',
  assetId: 'asset-bar',
  assetType: 'bar',
  assetFootfall: 90,
  productId: 'product-beer',
  beverageCategoryId: 'beer',
  quality: 82,
  retailPrice: 5,
  referencePrice: 5,
  organizationReputation: 70,
};

describe('population demand', () => {
  it('creates population segments for every supported region', () => {
    const state = createDemandState(1, 'world-a');
    expect(state.regions).toHaveLength(6);
    expect(state.regions.every((region) => region.segments.length === 6)).toBe(true);
    expect(state.regions.reduce((sum, region) => sum + region.adultPopulation, 0)).toBeGreaterThan(1_000_000);
  });

  it('is deterministic for the same seed and day', () => {
    const first = advanceDemandDay(createDemandState(1, 'world-a'), 6);
    const second = advanceDemandDay(createDemandState(1, 'world-a'), 6);
    expect(first.regions.find((region) => region.regionId === 'bavaria')?.today).toEqual(second.regions.find((region) => region.regionId === 'bavaria')?.today);
  });

  it('uses segment, price, weather and channel instead of random footfall only', () => {
    const state = advanceDemandDay(createDemandState(1, 'world-a'), 6);
    const affordable = calculateShelfDemand(state, baseInput);
    const expensive = calculateShelfDemand(state, { ...baseInput, retailPrice: 18 });
    expect(affordable.units).toBeGreaterThanOrEqual(expensive.units);
    expect(affordable.primarySegmentId).toBeTruthy();
    expect(affordable.channel).toBe('bar');
  });

  it('records a concrete consumer purchase', () => {
    const state = createDemandState(1, 'world-a');
    const next = recordConsumerPurchase(state, { day: 2, regionId: 'bavaria', assetId: 'asset-bar', productId: 'product-beer', categoryId: 'beer', channel: 'bar', units: 3, unitPrice: 5, revenue: 15, primarySegmentId: 'hospitality_regulars', occasion: 'after_work' });
    expect(next.purchases[0]).toMatchObject({ units: 3, revenue: 15, primarySegmentId: 'hospitality_regulars' });
  });
});
