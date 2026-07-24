import { equipmentCatalog } from '../../data/productionCatalog';
import { equipmentAvailable, maxActiveBatches, maxFacilityBatchVolume } from '../../domain/facility';
import type { GameState } from '../../domain/game';
import { estimateProcessCost, requiredEquipmentIds, type RecipeDraft } from '../../domain/production';
import { buildSupplyPlan, getRecipeRequirements, type IngredientRequirement, type PurchaseOrder, type SupplierOfferState } from '../../domain/supply';

export type MaterialReadiness = 'ready' | 'in_transit' | 'partial' | 'missing';

export interface MaterialRequirementState {
  requirement: IngredientRequirement;
  available: number;
  ordered: number;
  uncovered: number;
  expectedDay: number | null;
  status: MaterialReadiness;
}

export interface ProcurementRecommendation {
  requirement: IngredientRequirement;
  offer: SupplierOfferState;
  quantity: number;
  cost: number;
}

export interface ProductionWorkflowState {
  materials: MaterialRequirementState[];
  recommendations: ProcurementRecommendation[];
  missingEquipmentIds: string[];
  unavailableEquipmentIds: string[];
  activeBatches: number;
  capacity: number;
  capacityReady: boolean;
  volumeReady: boolean;
  processCost: number;
  inventoryCost: number;
  procurementCost: number;
  plannedCost: number;
  predictedLaunchDay: number;
  predictedReadyDay: number;
  canOrderAll: boolean;
  canLaunch: boolean;
  blockers: string[];
}

const EPSILON = 0.0001;

export function buildProductionWorkflow(state: GameState, draft: RecipeDraft): ProductionWorkflowState {
  const requirements = getRecipeRequirements(draft);
  const supplyPlan = buildSupplyPlan(state.supply.inventory, requirements);
  const materials = requirements.map((requirement) => materialRequirementState(state, requirement, supplyPlan.missing));
  const recommendations = materials
    .filter((item) => item.uncovered > EPSILON)
    .map((item) => recommendProcurement(state.supply.offers, item.requirement, item.uncovered))
    .filter((item): item is ProcurementRecommendation => item !== null);

  const requiredIds = requiredEquipmentIds(draft.family);
  const missingEquipmentIds = requiredIds.filter((id) => !state.production.equipmentIds.includes(id));
  const unavailableEquipmentIds = requiredIds.filter((id) => state.production.equipmentIds.includes(id) && state.facility && !equipmentAvailable(state.facility, id));
  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).length;
  const capacity = state.facility ? maxActiveBatches(state.facility) : 1;
  const capacityReady = activeBatches < capacity;
  const facilityLimit = state.facility ? maxFacilityBatchVolume(state.facility) : draft.volumeLiters;
  const equipmentLimits = equipmentCatalog
    .filter((item) => requiredIds.includes(item.id) && state.production.equipmentIds.includes(item.id))
    .map((item) => item.capacityLiters)
    .filter((value) => value > 0);
  const equipmentLimit = equipmentLimits.length > 0 ? Math.min(...equipmentLimits) : draft.volumeLiters;
  const volumeReady = draft.volumeLiters <= Math.min(facilityLimit, equipmentLimit);
  const processCost = estimateProcessCost(draft);
  const inventoryCost = supplyPlan.totalCost;
  const procurementCost = roundMoney(recommendations.reduce((sum, item) => sum + item.cost, 0));
  const plannedCost = roundMoney(processCost + inventoryCost + procurementCost);
  const expectedDays = materials.map((item) => item.expectedDay).filter((day): day is number => day !== null);
  const recommendationDays = recommendations.map((item) => state.day + item.offer.currentLeadDays);
  const predictedLaunchDay = Math.max(state.day, ...expectedDays, ...recommendationDays);
  const predictedReadyDay = predictedLaunchDay + draft.primaryDays + draft.conditioningDays;
  const supplyReady = materials.every((item) => item.status === 'ready');
  const allOffersAvailable = materials.every((item) => item.uncovered <= EPSILON || recommendations.some((recommendation) => recommendation.requirement.ingredientId === item.requirement.ingredientId));
  const canOrderAll = !supplyReady && allOffersAvailable && state.finance.cash >= procurementCost + processCost;

  const blockers: string[] = [];
  if (missingEquipmentIds.length > 0) blockers.push('Не установлено обязательное оборудование');
  if (unavailableEquipmentIds.length > 0) blockers.push('Оборудование требует обслуживания');
  if (!capacityReady) blockers.push('Все производственные линии заняты');
  if (!volumeReady) blockers.push('Объём превышает возможности объекта или оборудования');
  if (!supplyReady) blockers.push(materials.some((item) => item.status === 'in_transit') ? 'Сырьё ещё в пути' : 'Не всё сырьё обеспечено');
  if (state.finance.cash < processCost) blockers.push('Не хватает денег на запуск процесса');

  return {
    materials,
    recommendations,
    missingEquipmentIds,
    unavailableEquipmentIds,
    activeBatches,
    capacity,
    capacityReady,
    volumeReady,
    processCost,
    inventoryCost,
    procurementCost,
    plannedCost,
    predictedLaunchDay,
    predictedReadyDay,
    canOrderAll,
    canLaunch: blockers.length === 0,
    blockers,
  };
}

export function materialRequirementState(
  state: Pick<GameState, 'day' | 'supply'>,
  requirement: IngredientRequirement,
  missingRequirements?: IngredientRequirement[],
): MaterialRequirementState {
  const available = roundQuantity(state.supply.inventory
    .filter((lot) => lot.ingredientId === requirement.ingredientId)
    .reduce((sum, lot) => sum + Math.max(0, lot.quantity), 0));
  const missing = missingRequirements?.find((item) => item.ingredientId === requirement.ingredientId)?.quantity
    ?? Math.max(0, requirement.quantity - available);
  const relevantOrders = activeOrders(state.supply.purchaseOrders, requirement.ingredientId);
  const ordered = roundQuantity(relevantOrders.reduce((sum, order) => sum + order.quantity, 0));
  const uncovered = roundQuantity(Math.max(0, missing - ordered));
  const expectedDay = relevantOrders.length > 0 ? Math.max(...relevantOrders.map((order) => order.expectedDay)) : null;
  const status: MaterialReadiness = missing <= EPSILON
    ? 'ready'
    : uncovered <= EPSILON
      ? 'in_transit'
      : ordered > EPSILON
        ? 'partial'
        : 'missing';
  return { requirement, available, ordered, uncovered, expectedDay, status };
}

export function recommendProcurement(
  offers: SupplierOfferState[],
  requirement: IngredientRequirement,
  uncoveredQuantity = requirement.quantity,
): ProcurementRecommendation | null {
  const requiredOrder = Math.max(1, Math.ceil(uncoveredQuantity));
  const eligible = offers.filter((offer) => offer.ingredientId === requirement.ingredientId && offer.availableQuantity >= Math.max(offer.minimumOrder, requiredOrder));
  const ranked = eligible
    .map((offer) => {
      const quantity = Math.max(offer.minimumOrder, requiredOrder);
      const quality = (offer.qualityEstimate[0] + offer.qualityEstimate[1]) / 2;
      const cost = roundMoney(quantity * offer.currentPrice);
      const score = cost + offer.currentLeadDays * Math.max(1, offer.currentPrice * 2) - quality * 0.08;
      return { offer, quantity, cost, score };
    })
    .sort((a, b) => a.score - b.score || a.offer.currentLeadDays - b.offer.currentLeadDays || b.offer.qualityEstimate[0] - a.offer.qualityEstimate[0]);
  const best = ranked[0];
  return best ? { requirement, offer: best.offer, quantity: best.quantity, cost: best.cost } : null;
}

function activeOrders(orders: PurchaseOrder[], ingredientId: string): PurchaseOrder[] {
  return orders.filter((order) => order.ingredientId === ingredientId && ['pending', 'delayed'].includes(order.status));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
