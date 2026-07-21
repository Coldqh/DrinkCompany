import { describe, expect, it } from 'vitest';
import { applyPurchaseOrder, advanceSupplyDay, buildSupplyPlan, consumeInventory, createPurchaseOrder, createSupplyState, getRecipeRequirements } from './supply';
import { createRecipeDraft } from './production';

describe('supply chain', () => {
  it('не принимает заказ меньше минимальной партии', () => {
    const supply = createSupplyState();
    expect(() => createPurchaseOrder(supply, 'rhein-pils', 5, 1)).toThrow('Минимальный заказ');
  });

  it('доставляет закупку и раскрывает фактическое качество', () => {
    let supply = createSupplyState();
    const order = createPurchaseOrder(supply, 'rhein-pils', 50, 1);
    supply = applyPurchaseOrder(supply, order);
    for (let day = 2; day <= 6; day += 1) supply = advanceSupplyDay(supply, day).supply;
    const delivered = supply.purchaseOrders.find((item) => item.id === order.id);
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.actualQuality).toBeGreaterThanOrEqual(order.qualityEstimate[0]);
    expect(supply.inventory[0]?.quantity).toBe(50);
  });

  it('собирает план партии из конкретных складских лотов и списывает их', () => {
    let supply = createSupplyState();
    for (const [offerId, quantity] of [['rhein-pils', 50], ['hallertau-mittelfruh', 3], ['ferment-ale', 3]] as const) {
      supply = applyPurchaseOrder(supply, createPurchaseOrder(supply, offerId, quantity, 1));
    }
    for (let day = 2; day <= 6; day += 1) supply = advanceSupplyDay(supply, day).supply;
    const requirements = getRecipeRequirements({ ...createRecipeDraft('beer'), volumeLiters: 100 });
    const plan = buildSupplyPlan(supply.inventory, requirements);
    expect(plan.missing).toEqual([]);
    expect(plan.totalCost).toBeGreaterThan(0);
    expect(plan.qualityScore).toBeGreaterThan(60);
    const nextInventory = consumeInventory(supply.inventory, plan.uses);
    expect(nextInventory.reduce((sum, lot) => sum + lot.quantity, 0)).toBeLessThan(supply.inventory.reduce((sum, lot) => sum + lot.quantity, 0));
  });

  it('учитывает яблоки и сахар в сладком сидре', () => {
    const requirements = getRecipeRequirements({ ...createRecipeDraft('cider'), volumeLiters: 120, sweetness: 4 });
    expect(requirements.some((item) => item.ingredientId === 'apples')).toBe(true);
    expect(requirements.some((item) => item.ingredientId === 'sugar')).toBe(true);
  });
});
