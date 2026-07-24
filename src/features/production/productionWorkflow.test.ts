import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../domain/game';
import { createRecipeDraft } from '../../domain/production';
import { buildProductionWorkflow, recommendProcurement } from './productionWorkflow';

describe('production workflow planner', () => {
  it('distinguishes missing material from material already in transit', () => {
    const state = createInitialState();
    state.phase = 'operating';
    const draft = createRecipeDraft('beer');
    const initial = buildProductionWorkflow(state, draft);
    expect(initial.materials.some((item) => item.status === 'missing')).toBe(true);

    const malt = initial.recommendations.find((item) => item.requirement.ingredientId === 'malt-base');
    expect(malt).toBeDefined();
    state.supply.purchaseOrders = [{
      id: 'purchase-test', supplierId: malt!.offer.supplierId, offerId: malt!.offer.id, ingredientId: 'malt-base',
      quantity: malt!.quantity, unit: 'kg', unitPrice: malt!.offer.currentPrice, totalCost: malt!.cost,
      orderedDay: 1, expectedDay: 3, deliveredDay: null, status: 'pending', qualityEstimate: malt!.offer.qualityEstimate,
      actualQuality: null, note: 'test',
    }];
    const planned = buildProductionWorkflow(state, draft);
    expect(planned.materials.find((item) => item.requirement.ingredientId === 'malt-base')?.status).toBe('in_transit');
    expect(planned.predictedLaunchDay).toBe(3);
  });

  it('selects a real offer and respects its minimum order', () => {
    const state = createInitialState();
    const requirement = { category: 'hops' as const, ingredientId: 'hops', label: 'Хмель', quantity: 0.4, unit: 'kg' as const };
    const recommendation = recommendProcurement(state.supply.offers, requirement);
    expect(recommendation).not.toBeNull();
    expect(recommendation!.quantity).toBeGreaterThanOrEqual(recommendation!.offer.minimumOrder);
    expect(recommendation!.cost).toBeGreaterThan(0);
  });
});
