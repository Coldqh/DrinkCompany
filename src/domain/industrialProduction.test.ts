import { describe, expect, it } from 'vitest';
import { beverageCategories } from '../data/beverageCatalog';
import { industrialBlueprints, validateIndustrialProcessCatalog } from '../data/industrialProcessCatalog';
import {
  advanceIndustrialProductionDay,
  createIndustrialProductionState,
  normalizeIndustrialProductionState,
  startIndustrialBatch,
  validateIndustrialProductionState,
} from './industrialProduction';
import type { TradeProductState, TradeProductionBatchState } from './trade';

function product(categoryId: string, alcoholByVolume: number): TradeProductState {
  const family: TradeProductState['family'] = categoryId === 'beer' ? 'beer' : categoryId === 'cider' ? 'cider' : categoryId.includes('wine') ? 'wine' : categoryId === 'liqueur' || categoryId === 'amaro_bitter' ? 'liqueur' : 'spirit';
  return {
    id: `product-${categoryId}`,
    producerOrganizationId: 'org-producer',
    name: `Test ${categoryId}`,
    family,
    beverageCategoryId: categoryId,
    style: categoryId,
    quality: 82,
    unitCost: 4,
    wholesalePrice: 8,
    recommendedRetailPrice: 14,
    alcoholByVolume,
    packageVolumeLiters: .75,
    packagingProfileId: 'profile-wine-750',
    status: 'active',
    totalProduced: 0,
    totalSold: 0,
    slowDays: 0,
    stockoutDays: 0,
    createdDay: 1,
  };
}

function batch(id = 'batch-1'): TradeProductionBatchState {
  return {
    id,
    producerOrganizationId: 'org-producer',
    productId: 'product-still_wine',
    status: 'producing',
    startDay: 1,
    readyDay: 2,
    plannedUnits: 600,
    producedUnits: 0,
    ingredientLotIds: ['ingredient-1', 'ingredient-2'],
    packagingLotIds: ['package-1'],
    cost: 3_000,
    issue: null,
  };
}

describe('industrial production engine', () => {
  it('covers every beverage category with a complete data-driven process', () => {
    expect(validateIndustrialProcessCatalog()).toEqual([]);
    const covered = new Set(industrialBlueprints.map((item) => item.categoryId));
    for (const category of beverageCategories) expect(covered.has(category.id)).toBe(true);
  });

  it('runs still wine through intermediate lots, maturation and packaging', () => {
    const wine = product('still_wine', 12.5);
    let state = createIndustrialProductionState();
    const started = startIndustrialBatch(state, batch(), wine, 1);
    state = started.industrial;
    let batches: TradeProductionBatchState[] = [{ ...batch(), industrialPlanId: started.planId, currentStageId: started.currentStageId, readyDay: started.estimatedReadyDay }];
    let completed = false;
    for (let day = 2; day <= 240; day += 1) {
      const result = advanceIndustrialProductionDay(state, batches, [wine], day);
      state = result.industrial;
      batches = result.batches;
      if (result.completedBatchIds.includes('batch-1')) {
        completed = true;
        break;
      }
    }
    expect(completed).toBe(true);
    expect(state.intermediateLots.length).toBeGreaterThan(3);
    expect(state.maturationLots.length).toBeGreaterThan(0);
    expect(state.runs.some((run) => run.stageId === 'age' && run.status === 'complete')).toBe(true);
    expect(validateIndustrialProductionState(state)).toEqual([]);
  });

  it('keeps long-aged whisky unfinished before its minimum aging window', () => {
    const whisky = product('whisky', 40);
    const whiskyBatch = { ...batch('batch-whisky'), productId: whisky.id };
    let state = createIndustrialProductionState();
    const started = startIndustrialBatch(state, whiskyBatch, whisky, 1);
    state = started.industrial;
    let batches: TradeProductionBatchState[] = [{ ...whiskyBatch, industrialPlanId: started.planId, currentStageId: started.currentStageId, readyDay: started.estimatedReadyDay }];
    for (let day = 2; day <= 180; day += 1) {
      const result = advanceIndustrialProductionDay(state, batches, [whisky], day);
      state = result.industrial;
      batches = result.batches;
      expect(result.completedBatchIds).not.toContain('batch-whisky');
    }
    const plan = state.plans.find((item) => item.batchId === 'batch-whisky');
    expect(plan?.status === 'running' || plan?.status === 'maturing').toBe(true);
    expect(state.maturationLots.every((lot) => lot.currentVolumeLiters <= lot.startingVolumeLiters)).toBe(true);
  });


  it('finishes a short RTD process in days without a category-specific engine', () => {
    const rtd = product('rtd', 6);
    const rtdBatch = { ...batch('batch-rtd'), productId: rtd.id };
    let state = createIndustrialProductionState();
    const started = startIndustrialBatch(state, rtdBatch, rtd, 1);
    state = started.industrial;
    let batches: TradeProductionBatchState[] = [{ ...rtdBatch, industrialPlanId: started.planId, currentStageId: started.currentStageId, readyDay: started.estimatedReadyDay }];
    let completedDay = 0;
    for (let day = 2; day <= 12; day += 1) {
      const result = advanceIndustrialProductionDay(state, batches, [rtd], day);
      state = result.industrial;
      batches = result.batches;
      if (result.completedBatchIds.includes('batch-rtd')) {
        completedDay = day;
        break;
      }
    }
    expect(completedDay).toBeGreaterThan(0);
    expect(completedDay).toBeLessThanOrEqual(8);
    expect(state.runs.map((run) => run.stageId)).toEqual(['blend', 'carbonate', 'stabilize', 'package']);
  });

  it('finishes whisky only after long maturation and loses volume during aging', () => {
    const whisky = product('whisky', 40);
    const whiskyBatch = { ...batch('batch-whisky-complete'), productId: whisky.id };
    let state = createIndustrialProductionState();
    const started = startIndustrialBatch(state, whiskyBatch, whisky, 1);
    state = started.industrial;
    let batches: TradeProductionBatchState[] = [{ ...whiskyBatch, industrialPlanId: started.planId, currentStageId: started.currentStageId, readyDay: started.estimatedReadyDay }];
    let completed = false;
    for (let day = 2; day <= 430; day += 1) {
      const result = advanceIndustrialProductionDay(state, batches, [whisky], day);
      state = result.industrial;
      batches = result.batches;
      if (result.completedBatchIds.includes('batch-whisky-complete')) {
        completed = true;
        break;
      }
    }
    const plan = state.plans.find((item) => item.batchId === 'batch-whisky-complete');
    expect(completed).toBe(true);
    expect(plan?.currentVolumeLiters ?? 0).toBeLessThan(plan?.startingVolumeLiters ?? 0);
    expect(state.runs.some((run) => run.stageId === 'distill')).toBe(true);
    expect(state.runs.some((run) => run.stageId === 'age')).toBe(true);
    expect(validateIndustrialProductionState(state)).toEqual([]);
  });

  it('normalizes legacy saves without an industrial state', () => {
    const state = normalizeIndustrialProductionState(undefined);
    expect(state.plans).toEqual([]);
    expect(state.nextPlanNumber).toBe(1);
  });
});
