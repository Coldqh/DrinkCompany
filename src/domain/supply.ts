import {
  getIngredient,
  getSupplier,
  getSupplierOffer,
  supplierOffers,
  suppliers,
  type IngredientCategory,
  type IngredientUnit,
  type SupplierOfferDefinition,
} from '../data/supplyCatalog';
import type { FlavorProfile, RecipeDraft } from './production';

export interface SupplierOfferState extends SupplierOfferDefinition {
  currentPrice: number;
  availableQuantity: number;
  currentLeadDays: number;
  qualityEstimate: [number, number];
  trend: 'cheaper' | 'stable' | 'expensive';
  updatedDay: number;
}

export interface SupplierRelationshipState {
  supplierId: string;
  relationship: number;
  agreement: boolean;
  agreementDay: number | null;
}

export type PurchaseOrderStatus = 'pending' | 'delayed' | 'delivered' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  offerId: string;
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  unitPrice: number;
  totalCost: number;
  orderedDay: number;
  expectedDay: number;
  deliveredDay: number | null;
  status: PurchaseOrderStatus;
  qualityEstimate: [number, number];
  actualQuality: number | null;
  note: string;
}

export interface InventoryLot {
  id: string;
  supplierId: string;
  offerId: string;
  ingredientId: string;
  variantName: string;
  origin: string;
  unit: IngredientUnit;
  quantity: number;
  initialQuantity: number;
  quality: number;
  unitCost: number;
  receivedDay: number;
  expiresDay: number;
  flavorImpact: Partial<FlavorProfile>;
}

export interface SupplyState {
  offers: SupplierOfferState[];
  relationships: SupplierRelationshipState[];
  purchaseOrders: PurchaseOrder[];
  inventory: InventoryLot[];
  nextOrderNumber: number;
  nextLotNumber: number;
}

export interface IngredientRequirement {
  category: IngredientCategory;
  ingredientId: string;
  label: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface BatchIngredientUse {
  lotId: string;
  ingredientId: string;
  supplierId: string;
  variantName: string;
  origin: string;
  unit: IngredientUnit;
  quantity: number;
  quality: number;
  unitCost: number;
  totalCost: number;
  flavorImpact: Partial<FlavorProfile>;
}

export interface SupplyPlan {
  requirements: IngredientRequirement[];
  uses: BatchIngredientUse[];
  missing: IngredientRequirement[];
  totalCost: number;
  qualityScore: number;
  flavorImpact: Partial<FlavorProfile>;
}

export interface SupplyAdvanceResult {
  supply: SupplyState;
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export function createSupplyState(day = 1): SupplyState {
  return {
    offers: supplierOffers.map((offer, index) => createOfferState(offer, day, index)),
    relationships: suppliers.map((supplier) => ({ supplierId: supplier.id, relationship: 20, agreement: false, agreementDay: null })),
    purchaseOrders: [],
    inventory: [],
    nextOrderNumber: 1,
    nextLotNumber: 1,
  };
}

export function createPurchaseOrder(supply: SupplyState, offerId: string, quantity: number, day: number): PurchaseOrder {
  const offer = supply.offers.find((item) => item.id === offerId);
  if (!offer) throw new Error('Предложение поставщика не найдено');
  if (quantity < offer.minimumOrder) throw new Error(`Минимальный заказ — ${formatQuantity(offer.minimumOrder, getIngredient(offer.ingredientId).unit)}`);
  if (quantity > offer.availableQuantity) throw new Error('У поставщика нет такого объёма');
  const relationship = supply.relationships.find((item) => item.supplierId === offer.supplierId);
  const discount = relationship?.agreement ? 0.94 : 1;
  const unitPrice = roundMoney(offer.currentPrice * discount);
  const totalCost = roundMoney(unitPrice * quantity);
  return {
    id: `purchase-${day}-${supply.nextOrderNumber}`,
    supplierId: offer.supplierId,
    offerId: offer.id,
    ingredientId: offer.ingredientId,
    quantity: roundQuantity(quantity),
    unit: getIngredient(offer.ingredientId).unit,
    unitPrice,
    totalCost,
    orderedDay: day,
    expectedDay: day + Math.max(1, offer.currentLeadDays - (relationship?.agreement ? 1 : 0)),
    deliveredDay: null,
    status: 'pending',
    qualityEstimate: offer.qualityEstimate,
    actualQuality: null,
    note: relationship?.agreement ? 'Цена по постоянному договору.' : 'Разовая закупка.',
  };
}

export function applyPurchaseOrder(supply: SupplyState, order: PurchaseOrder): SupplyState {
  return {
    ...supply,
    offers: supply.offers.map((offer) => offer.id === order.offerId ? { ...offer, availableQuantity: roundQuantity(Math.max(0, offer.availableQuantity - order.quantity)) } : offer),
    relationships: supply.relationships.map((item) => item.supplierId === order.supplierId ? { ...item, relationship: clamp(item.relationship + 2, 0, 100) } : item),
    purchaseOrders: [order, ...supply.purchaseOrders],
    nextOrderNumber: supply.nextOrderNumber + 1,
  };
}

export function signSupplierAgreement(supply: SupplyState, supplierId: string, day: number): SupplyState {
  const supplier = getSupplier(supplierId);
  const relation = supply.relationships.find((item) => item.supplierId === supplierId);
  if (!relation) throw new Error('Поставщик не найден');
  if (relation.agreement) return supply;
  if (relation.relationship < 35) throw new Error(`${supplier.name} пока не готова к постоянному договору`);
  return {
    ...supply,
    relationships: supply.relationships.map((item) => item.supplierId === supplierId ? { ...item, agreement: true, agreementDay: day } : item),
  };
}

export function advanceSupplyDay(supply: SupplyState, day: number): SupplyAdvanceResult {
  let inventory = supply.inventory;
  let nextLotNumber = supply.nextLotNumber;
  const events: SupplyAdvanceResult['events'] = [];
  const purchaseOrders = supply.purchaseOrders.map((order) => {
    if (!['pending', 'delayed'].includes(order.status) || order.expectedDay > day) return order;
    const supplier = getSupplier(order.supplierId);
    const reliabilityRoll = deterministic(`${order.id}-${day}`) * 100;
    if (order.status === 'pending' && reliabilityRoll > supplier.reliability) {
      events.push({ title: `${supplier.name}: задержка`, detail: `Поставка ${order.id} сдвинулась на один день.`, tone: 'warning' });
      return { ...order, status: 'delayed' as const, expectedDay: day + 1, note: 'Логистика задержала поставку.' };
    }
    const offer = getSupplierOffer(order.offerId);
    const quality = clamp(Math.round(order.qualityEstimate[0] + deterministic(`${order.id}-quality`) * (order.qualityEstimate[1] - order.qualityEstimate[0])), 1, 100);
    const ingredient = getIngredient(order.ingredientId);
    const lot: InventoryLot = {
      id: `lot-${day}-${nextLotNumber}`,
      supplierId: order.supplierId,
      offerId: order.offerId,
      ingredientId: order.ingredientId,
      variantName: offer.variantName,
      origin: offer.origin,
      unit: ingredient.unit,
      quantity: order.quantity,
      initialQuantity: order.quantity,
      quality,
      unitCost: order.unitPrice,
      receivedDay: day,
      expiresDay: day + ingredient.shelfLifeDays,
      flavorImpact: offer.flavorImpact,
    };
    nextLotNumber += 1;
    inventory = [lot, ...inventory];
    events.push({ title: `${offer.variantName} доставлено`, detail: `${formatQuantity(order.quantity, ingredient.unit)} · качество ${quality}/100.`, tone: 'release' });
    return { ...order, status: 'delivered' as const, deliveredDay: day, actualQuality: quality, note: 'Поставка принята на склад.' };
  });

  const expired = inventory.filter((lot) => lot.quantity > 0 && lot.expiresDay < day);
  if (expired.length > 0) {
    for (const lot of expired) events.push({ title: `${lot.variantName} испорчено`, detail: `Списано ${formatQuantity(lot.quantity, lot.unit)} просроченного сырья.`, tone: 'warning' });
    inventory = inventory.map((lot) => lot.expiresDay < day ? { ...lot, quantity: 0 } : lot);
  }

  const offers = day % 2 === 0
    ? supply.offers.map((offer, index) => refreshOffer(offer, day, index))
    : supply.offers;

  return {
    supply: { ...supply, offers, purchaseOrders, inventory, nextLotNumber, relationships: supply.relationships.map((item) => purchaseOrders.some((order) => order.supplierId === item.supplierId && order.deliveredDay === day) ? { ...item, relationship: clamp(item.relationship + 3, 0, 100) } : item) },
    events,
  };
}

export function getRecipeRequirements(draft: RecipeDraft): IngredientRequirement[] {
  if (draft.family === 'beer') {
    const specialtyRatio = draft.styleId === 'dark-porter' ? 0.055 : draft.styleId === 'wheat-beer' ? 0.07 : 0;
    const hopRatio = draft.styleId === 'modern-pale-ale' ? 0.006 : draft.styleId === 'dark-porter' ? 0.0032 : 0.0024;
    return [
      requirement('base_malt', 'malt-base', 'Базовый солод', draft.volumeLiters * (0.19 - specialtyRatio * 0.25), 'kg'),
      ...(specialtyRatio > 0 ? [requirement('specialty_malt', 'malt-specialty', 'Специальный солод', draft.volumeLiters * specialtyRatio, 'kg')] : []),
      requirement('hops', 'hops', 'Хмель', draft.volumeLiters * hopRatio, 'kg'),
      requirement('beer_yeast', 'beer-yeast', 'Пивные дрожжи', Math.max(1, Math.ceil(draft.volumeLiters / 80)), 'pack'),
    ];
  }
  const sugarQuantity = Math.max(0, draft.sweetness - 1) * draft.volumeLiters * 0.018;
  return [
    requirement('apples', 'apples', 'Яблоки', draft.volumeLiters * 1.62, 'kg'),
    requirement('cider_yeast', 'cider-yeast', 'Сидровые дрожжи', Math.max(1, Math.ceil(draft.volumeLiters / 100)), 'pack'),
    ...(sugarQuantity >= 0.5 ? [requirement('sugar', 'sugar', 'Сахар', sugarQuantity, 'kg')] : []),
  ];
}

export function getPackagingRequirement(volumeLiters: number): IngredientRequirement {
  return requirement('bottles', 'bottles', 'Бутылки 0,5 л', Math.max(1, Math.floor((volumeLiters * 0.94) / 0.5)), 'unit');
}

export function buildSupplyPlan(inventory: InventoryLot[], requirements: IngredientRequirement[], selectedLots: Partial<Record<IngredientCategory, string>> = {}): SupplyPlan {
  const uses: BatchIngredientUse[] = [];
  const missing: IngredientRequirement[] = [];
  for (const item of requirements) {
    let remaining = item.quantity;
    const eligible = inventory
      .filter((lot) => lot.ingredientId === item.ingredientId && lot.quantity > 0)
      .sort((a, b) => {
        const selectedA = selectedLots[item.category] === a.id ? -1 : 0;
        const selectedB = selectedLots[item.category] === b.id ? -1 : 0;
        if (selectedA !== selectedB) return selectedA - selectedB;
        return a.expiresDay - b.expiresDay || b.quality - a.quality;
      });
    for (const lot of eligible) {
      if (remaining <= 0.0001) break;
      const quantity = roundQuantity(Math.min(remaining, lot.quantity));
      if (quantity <= 0) continue;
      uses.push({
        lotId: lot.id,
        ingredientId: lot.ingredientId,
        supplierId: lot.supplierId,
        variantName: lot.variantName,
        origin: lot.origin,
        unit: lot.unit,
        quantity,
        quality: lot.quality,
        unitCost: lot.unitCost,
        totalCost: roundMoney(quantity * lot.unitCost),
        flavorImpact: lot.flavorImpact,
      });
      remaining = roundQuantity(remaining - quantity);
    }
    if (remaining > 0.0001) missing.push({ ...item, quantity: remaining });
  }
  const totalQuantity = uses.reduce((sum, item) => sum + item.quantity, 0);
  const qualityScore = totalQuantity > 0 ? Math.round(uses.reduce((sum, item) => sum + item.quality * item.quantity, 0) / totalQuantity) : 0;
  const totalCost = roundMoney(uses.reduce((sum, item) => sum + item.totalCost, 0));
  const flavorImpact = combineFlavorImpact(uses);
  return { requirements, uses, missing, totalCost, qualityScore, flavorImpact };
}

export function consumeInventory(inventory: InventoryLot[], uses: BatchIngredientUse[]): InventoryLot[] {
  const usedByLot = new Map<string, number>();
  for (const use of uses) usedByLot.set(use.lotId, (usedByLot.get(use.lotId) ?? 0) + use.quantity);
  return inventory.map((lot) => ({ ...lot, quantity: roundQuantity(Math.max(0, lot.quantity - (usedByLot.get(lot.id) ?? 0))) }));
}

export function inventoryQuantity(inventory: InventoryLot[], ingredientId: string): number {
  return roundQuantity(inventory.filter((lot) => lot.ingredientId === ingredientId).reduce((sum, lot) => sum + lot.quantity, 0));
}

export function inventoryValue(inventory: InventoryLot[]): number {
  return roundMoney(inventory.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0));
}

export function formatQuantity(value: number, unit: IngredientUnit): string {
  const digits = unit === 'kg' && value < 10 ? 1 : 0;
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)} ${unit === 'kg' ? 'кг' : unit === 'pack' ? 'уп.' : 'шт.'}`;
}

function createOfferState(offer: SupplierOfferDefinition, day: number, index: number): SupplierOfferState {
  const fluctuation = seasonalFactor(day, index, offer.seasonalVolatility);
  return {
    ...offer,
    currentPrice: roundMoney(offer.basePrice * fluctuation),
    availableQuantity: offer.defaultOrder * (4 + (index % 4)),
    currentLeadDays: offer.leadDays[0] + (index % (offer.leadDays[1] - offer.leadDays[0] + 1)),
    qualityEstimate: offer.qualityRange,
    trend: fluctuation > 1.06 ? 'expensive' : fluctuation < 0.96 ? 'cheaper' : 'stable',
    updatedDay: day,
  };
}

function refreshOffer(offer: SupplierOfferState, day: number, index: number): SupplierOfferState {
  const definition = getSupplierOffer(offer.id);
  const fluctuation = seasonalFactor(day, index, definition.seasonalVolatility);
  const relationshipNoise = deterministic(`${offer.id}-${day}`);
  const lowerShift = Math.round((relationshipNoise - 0.5) * 6);
  const minQuality = clamp(definition.qualityRange[0] + lowerShift, 55, 96);
  const maxQuality = clamp(definition.qualityRange[1] + lowerShift, minQuality + 2, 99);
  const restock = day % 6 === index % 6 ? definition.defaultOrder * 2 : 0;
  return {
    ...offer,
    currentPrice: roundMoney(definition.basePrice * fluctuation),
    availableQuantity: roundQuantity(Math.min(definition.defaultOrder * 10, offer.availableQuantity + restock)),
    currentLeadDays: definition.leadDays[0] + Math.floor(deterministic(`${day}-${offer.id}-lead`) * (definition.leadDays[1] - definition.leadDays[0] + 1)),
    qualityEstimate: [minQuality, maxQuality],
    trend: fluctuation > 1.06 ? 'expensive' : fluctuation < 0.96 ? 'cheaper' : 'stable',
    updatedDay: day,
  };
}

function seasonalFactor(day: number, index: number, volatility: number): number {
  const cycle = Math.sin((day + index * 4) / 8) * volatility;
  const noise = (deterministic(`${day}-${index}-price`) - 0.5) * volatility * 0.7;
  return clamp(1 + cycle + noise, 0.68, 1.42);
}

function combineFlavorImpact(uses: BatchIngredientUse[]): Partial<FlavorProfile> {
  const result: Partial<FlavorProfile> = {};
  const keys: Array<keyof FlavorProfile> = ['sweetness', 'acidity', 'bitterness', 'body', 'aroma', 'originality'];
  const ingredientIds = [...new Set(uses.map((item) => item.ingredientId))];
  if (ingredientIds.length === 0) return result;
  for (const key of keys) {
    const perIngredient = ingredientIds.map((ingredientId) => {
      const group = uses.filter((item) => item.ingredientId === ingredientId);
      const quantity = group.reduce((sum, item) => sum + item.quantity, 0);
      return quantity > 0 ? group.reduce((sum, item) => sum + (item.flavorImpact[key] ?? 0) * item.quantity, 0) / quantity : 0;
    });
    const value = perIngredient.reduce((sum, item) => sum + item, 0);
    if (Math.abs(value) > 0.01) result[key] = Math.round(value * 100) / 100;
  }
  return result;
}

function requirement(category: IngredientCategory, ingredientId: string, label: string, quantity: number, unit: IngredientUnit): IngredientRequirement {
  return { category, ingredientId, label, quantity: roundQuantity(quantity), unit };
}

function deterministic(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 10_000) / 10_000;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
