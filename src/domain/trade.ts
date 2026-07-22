import { ingredients, supplierOffers, type IngredientUnit } from '../data/supplyCatalog';
import type { BeverageCategoryId } from '../data/beverageCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import { calculateShelfDemand, recordConsumerPurchase, type DemandState } from './demand';

export type TradeCommodityKind = 'ingredient' | 'product';
export type TradeProductFamily = 'beer' | 'cider' | 'wine' | 'spirit' | 'liqueur' | 'alcohol_free';
export type TradeShipmentStatus = 'awaiting_transport' | 'in_transit' | 'customs_hold' | 'delivered' | 'delayed' | 'failed';
export type TradeContractStatus = 'active' | 'paused' | 'broken';
export type TradeBatchStatus = 'producing' | 'ready' | 'blocked';
export type TradeProductStatus = 'active' | 'paused' | 'discontinued';
export type TradeOperationKind = 'purchase' | 'production' | 'delivery' | 'sale' | 'shortage' | 'stockout' | 'release' | 'discontinued';
export type TradeLotStatus = 'available' | 'quarantined' | 'recalled' | 'destroyed';

export interface TradeLotAllocation {
  lotId: string;
  quantity: number;
}

export interface TradeInventoryLot {
  id: string;
  organizationId: string;
  commodityKind: TradeCommodityKind;
  commodityId: string;
  quantity: number;
  unit: IngredientUnit | 'bottle';
  quality: number;
  unitCost: number;
  originOrganizationId: string;
  receivedDay: number;
  expiresDay: number | null;
  status?: TradeLotStatus;
  sourceLotIds?: string[];
  productionBatchId?: string | null;
  lotCode?: string;
}

export interface TradeProductState {
  id: string;
  producerOrganizationId: string;
  name: string;
  family: TradeProductFamily;
  beverageCategoryId?: BeverageCategoryId;
  style: string;
  quality: number;
  unitCost: number;
  wholesalePrice: number;
  recommendedRetailPrice: number;
  alcoholByVolume: number;
  packageVolumeLiters: number;
  status: TradeProductStatus;
  totalProduced: number;
  totalSold: number;
  slowDays: number;
  stockoutDays: number;
  createdDay: number;
}

export interface TradeProductionBatchState {
  id: string;
  producerOrganizationId: string;
  productId: string;
  status: TradeBatchStatus;
  startDay: number;
  readyDay: number;
  plannedUnits: number;
  producedUnits: number;
  ingredientLotIds: string[];
  cost: number;
  issue: string | null;
}

export interface TradeContractState {
  id: string;
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  sellerAssetId?: string | null;
  buyerAssetId: string | null;
  commodityKind: TradeCommodityKind;
  commodityId: string;
  quantity: number;
  unitPrice: number;
  intervalDays: number;
  nextDeliveryDay: number;
  status: TradeContractStatus;
  failures: number;
  lastResult: string;
}

export interface TradeShipmentState {
  id: string;
  contractId: string;
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  sellerAssetId?: string | null;
  buyerAssetId: string | null;
  commodityKind: TradeCommodityKind;
  commodityId: string;
  quantity: number;
  unitPrice: number;
  departDay: number;
  arrivalDay: number;
  status: TradeShipmentStatus;
  note: string;
  lotAllocations?: TradeLotAllocation[];
}

export interface TradeShelfListingState {
  id: string;
  assetId: string;
  productId: string;
  supplierOrganizationId: string;
  units: number;
  retailPrice: number;
  unitsSoldToday: number;
  revenueToday: number;
  totalUnitsSold: number;
  lastRestockDay: number;
  stockoutDays: number;
  lotAllocations?: TradeLotAllocation[];
  soldLotAllocationsToday?: TradeLotAllocation[];
}

export interface TradeOperationState {
  id: string;
  day: number;
  kind: TradeOperationKind;
  organizationId: string;
  counterpartyOrganizationId: string | null;
  assetId: string | null;
  headline: string;
  detail: string;
  amount: number;
}

export interface TradeState {
  inventory: TradeInventoryLot[];
  products: TradeProductState[];
  batches: TradeProductionBatchState[];
  contracts: TradeContractState[];
  shipments: TradeShipmentState[];
  shelves: TradeShelfListingState[];
  operations: TradeOperationState[];
  nextInventoryNumber: number;
  nextProductNumber: number;
  nextBatchNumber: number;
  nextContractNumber: number;
  nextShipmentNumber: number;
  nextShelfNumber: number;
  nextOperationNumber: number;
}

export interface TradeAdvanceResult {
  trade: TradeState;
  demand: DemandState;
  organizations: OrganizationState[];
  events: { title: string; detail: string; tone: 'market' | 'warning' | 'release' }[];
}

const PRODUCT_NAMES: Record<TradeProductFamily, string[]> = {
  beer: ['House Lager', 'Night Porter', 'Public Bitter', 'Dry Pale'],
  cider: ['Orchard Dry', 'Brut Apple', 'Farmhouse Blend', 'Bittersweet Reserve'],
  wine: ['Rouge Parcelle', 'Blanc Sec', 'Field Cuvée', 'Vin de Table'],
  spirit: ['Malt Reserve', 'Grain No. 4', 'Cask Cut', 'House Spirit'],
  liqueur: ['Herbal 31', 'Forest Bitter', 'Root & Bark', 'Night Amaro'],
  alcohol_free: ['Hop Zero', 'Fermented Tea', 'Dry Botanical', 'Malt Free'],
};

export function createTradeState(organizations: OrganizationState[], assets: WorldAssetState[], day: number): TradeState {
  let nextInventoryNumber = 1;
  let nextProductNumber = 1;
  let nextContractNumber = 1;
  let nextShelfNumber = 1;
  const inventory: TradeInventoryLot[] = [];
  const products: TradeProductState[] = [];
  const contracts: TradeContractState[] = [];
  const shelves: TradeShelfListingState[] = [];

  const supplierOrganizations = organizations.filter((organization) => organization.kind === 'supplier');
  for (const supplierOrganization of supplierOrganizations) {
    const supplierId = supplierOrganization.id.replace('org-supplier-', '');
    for (const offer of supplierOffers.filter((item) => item.supplierId === supplierId)) {
      const ingredient = ingredients.find((item) => item.id === offer.ingredientId);
      if (!ingredient) continue;
      inventory.push({
        id: `trade-lot-${nextInventoryNumber++}`,
        organizationId: supplierOrganization.id,
        commodityKind: 'ingredient',
        commodityId: offer.ingredientId,
        quantity: roundQuantity(offer.defaultOrder * 12),
        unit: ingredient.unit,
        quality: Math.round((offer.qualityRange[0] + offer.qualityRange[1]) / 2),
        unitCost: roundMoney(offer.basePrice * .62),
        originOrganizationId: supplierOrganization.id,
        receivedDay: day,
        expiresDay: day + ingredient.shelfLifeDays,
      });
    }
  }

  const producers = organizations.filter((organization) => organization.kind === 'producer');
  for (const [index, producer] of producers.entries()) {
    const family = familyForOrganization(producer);
    const product = createSeedProduct(producer, family, day, nextProductNumber++);
    products.push(product);
    inventory.push({
      id: `trade-lot-${nextInventoryNumber++}`,
      organizationId: producer.id,
      commodityKind: 'product',
      commodityId: product.id,
      quantity: 180 + (index % 4) * 60,
      unit: 'bottle',
      quality: product.quality,
      unitCost: product.unitCost,
      originOrganizationId: producer.id,
      receivedDay: day,
      expiresDay: day + 260,
    });

    for (const ingredientId of ingredientRequirements(family).map((item) => item.ingredientId)) {
      const seller = supplierForIngredient(ingredientId, supplierOrganizations);
      const offer = seller ? offerForSupplierIngredient(seller.id, ingredientId) : null;
      if (!seller || !offer) continue;
      contracts.push({
        id: `trade-contract-${nextContractNumber++}`,
        sellerOrganizationId: seller.id,
        buyerOrganizationId: producer.id,
        sellerAssetId: firstOperatingAssetId(assets, seller.id),
        buyerAssetId: null,
        commodityKind: 'ingredient',
        commodityId: ingredientId,
        quantity: Math.max(offer.minimumOrder, offer.defaultOrder),
        unitPrice: roundMoney(offer.basePrice * 1.02),
        intervalDays: ingredientId === 'bottles' ? 6 : 4 + (index % 3),
        nextDeliveryDay: day + 1 + (index % 2),
        status: 'active',
        failures: 0,
        lastResult: 'Контракт активен',
      });
    }
  }

  const distributorOrganizations = organizations.filter((organization) => organization.kind === 'distributor');
  for (const [index, distributor] of distributorOrganizations.entries()) {
    const warehouse = assets.find((asset) => asset.operatorOrganizationId === distributor.id && asset.type === 'distribution_center');
    const selectedProducts = products
      .slice()
      .sort((a, b) => {
        const aProducer = organizations.find((item) => item.id === a.producerOrganizationId);
        const bProducer = organizations.find((item) => item.id === b.producerOrganizationId);
        return Number(bProducer?.countryId === distributor.countryId) - Number(aProducer?.countryId === distributor.countryId);
      })
      .slice(0, Math.min(3, products.length));
    for (const [productIndex, product] of selectedProducts.entries()) {
      const initialUnits = 84 + ((index + productIndex) % 3) * 36;
      inventory.push({
        id: `trade-lot-${nextInventoryNumber++}`,
        organizationId: distributor.id,
        commodityKind: 'product',
        commodityId: product.id,
        quantity: initialUnits,
        unit: 'bottle',
        quality: product.quality,
        unitCost: roundMoney(product.wholesalePrice * .96),
        originOrganizationId: product.producerOrganizationId,
        receivedDay: day,
        expiresDay: day + 210,
      });
      contracts.push({
        id: `trade-contract-${nextContractNumber++}`,
        sellerOrganizationId: product.producerOrganizationId,
        buyerOrganizationId: distributor.id,
        sellerAssetId: firstOperatingAssetId(assets, product.producerOrganizationId),
        buyerAssetId: warehouse?.id ?? null,
        commodityKind: 'product',
        commodityId: product.id,
        quantity: 120 + productIndex * 36,
        unitPrice: product.wholesalePrice,
        intervalDays: 5 + productIndex,
        nextDeliveryDay: day + 2 + index,
        status: 'active',
        failures: 0,
        lastResult: 'Региональный склад снабжается',
      });
    }
  }

  const retailAssets = assets.filter((asset) => (asset.type === 'bar' || asset.type === 'shop') && asset.marketOutletId && asset.operatorOrganizationId);
  for (const [index, asset] of retailAssets.entries()) {
    const buyer = organizations.find((organization) => organization.id === asset.operatorOrganizationId);
    if (!buyer) continue;
    const preferredSellerIds = buyer.supplierOrganizationIds;
    const distributor = distributorOrganizations.find((item) => item.countryId === buyer.countryId) ?? distributorOrganizations[index % Math.max(1, distributorOrganizations.length)];
    const distributorProductIds = distributor ? inventory.filter((lot) => lot.organizationId === distributor.id && lot.commodityKind === 'product').map((lot) => lot.commodityId) : [];
    const product = products.find((item) => distributorProductIds.includes(item.id) && preferredSellerIds.includes(item.producerOrganizationId))
      ?? products.find((item) => distributorProductIds.includes(item.id))
      ?? products.find((item) => preferredSellerIds.includes(item.producerOrganizationId))
      ?? products[(index * 3) % Math.max(1, products.length)];
    if (!product) continue;
    const initialUnits = 18 + (index % 4) * 12;
    shelves.push({
      id: `trade-shelf-${nextShelfNumber++}`,
      assetId: asset.id,
      productId: product.id,
      supplierOrganizationId: distributor?.id ?? product.producerOrganizationId,
      units: initialUnits,
      retailPrice: roundMoney(product.recommendedRetailPrice * (asset.type === 'bar' ? 1.45 : 1)),
      unitsSoldToday: 0,
      revenueToday: 0,
      totalUnitsSold: 0,
      lastRestockDay: day,
      stockoutDays: 0,
      lotAllocations: [{ lotId: `seed-shelf-lot:${nextShelfNumber - 1}`, quantity: initialUnits }],
    });
    contracts.push({
      id: `trade-contract-${nextContractNumber++}`,
      sellerOrganizationId: distributor?.id ?? product.producerOrganizationId,
      buyerOrganizationId: buyer.id,
      sellerAssetId: distributor ? firstOperatingAssetId(assets, distributor.id) : firstOperatingAssetId(assets, product.producerOrganizationId),
      buyerAssetId: asset.id,
      commodityKind: 'product',
      commodityId: product.id,
      quantity: 24 + (index % 4) * 12,
      unitPrice: product.wholesalePrice,
      intervalDays: 3 + (index % 3),
      nextDeliveryDay: day + 2 + (index % 2),
      status: 'active',
      failures: 0,
      lastResult: 'Полка снабжается',
    });
  }

  return {
    inventory,
    products,
    batches: [],
    contracts,
    shipments: [],
    shelves,
    operations: [],
    nextInventoryNumber,
    nextProductNumber,
    nextBatchNumber: 1,
    nextContractNumber,
    nextShipmentNumber: 1,
    nextShelfNumber,
    nextOperationNumber: 1,
  };
}

export function advanceTradeDay(state: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number, demand: DemandState): TradeAdvanceResult {
  let trade = normalizeTradeState(state);
  let nextDemand = demand;
  let nextOrganizations = organizations.map((organization) => ({ ...organization, dailyRevenue: 0, dailyCosts: baseOperatingCost(organization) }));
  const events: TradeAdvanceResult['events'] = [];
  const revenue = new Map<string, number>();
  const costs = new Map<string, number>();
  let operations = [...trade.operations];
  let nextOperationNumber = trade.nextOperationNumber;

  const record = (kind: TradeOperationKind, organizationId: string, counterpartyOrganizationId: string | null, assetId: string | null, headline: string, detail: string, amount = 0) => {
    const operation: TradeOperationState = {
      id: `trade-operation-${day}-${nextOperationNumber++}`,
      day,
      kind,
      organizationId,
      counterpartyOrganizationId,
      assetId,
      headline,
      detail,
      amount: roundMoney(amount),
    };
    operations = [operation, ...operations].slice(0, 240);
  };

  // 1. Приёмка уже отправленных поставок.
  const deliveredShipments: TradeShipmentState[] = [];
  trade.shipments = trade.shipments.map((shipment) => {
    if (shipment.status !== 'in_transit' && shipment.status !== 'delayed') return shipment;
    if (shipment.arrivalDay > day) return shipment;
    const buyer = nextOrganizations.find((organization) => organization.id === shipment.buyerOrganizationId);
    const seller = nextOrganizations.find((organization) => organization.id === shipment.sellerOrganizationId);
    const total = roundMoney(shipment.quantity * shipment.unitPrice);
    if (!buyer || !seller || buyer.status === 'acquired' || seller.status === 'acquired') {
      return { ...shipment, status: 'failed', note: 'Одна из сторон больше не ведёт операции' };
    }
    if (buyer.cash < total * .18) {
      record('shortage', buyer.id, seller.id, shipment.buyerAssetId, `${buyer.name} не смогла оплатить поставку`, `Поставка на ${shipment.quantity} ед. сорвана из-за кассового разрыва.`, total);
      events.push({ tone: 'warning', title: `${buyer.name}: сорвана поставка`, detail: 'Недостаточно оборотных средств для оплаты товара.' });
      return { ...shipment, status: 'failed', note: 'Покупатель не смог оплатить поставку' };
    }
    addMoneyDelta(revenue, seller.id, total);
    addMoneyDelta(costs, buyer.id, total);
    deliveredShipments.push(shipment);
    record('delivery', seller.id, buyer.id, shipment.buyerAssetId, `Доставлено ${commodityName(trade, shipment.commodityKind, shipment.commodityId)}`, `${shipment.quantity} ед. перешли от ${seller.name} к ${buyer.name}.`, total);
    return { ...shipment, status: 'delivered', note: 'Поставка принята и оплачена' };
  });

  for (const shipment of deliveredShipments) {
    if (shipment.commodityKind === 'ingredient') {
      const ingredient = ingredients.find((item) => item.id === shipment.commodityId);
      trade.inventory.push({
        id: `trade-lot-${trade.nextInventoryNumber++}`,
        organizationId: shipment.buyerOrganizationId,
        commodityKind: 'ingredient',
        commodityId: shipment.commodityId,
        quantity: shipment.quantity,
        unit: ingredient?.unit ?? 'kg',
        quality: 70 + hash(`${shipment.id}-${day}`) % 25,
        unitCost: shipment.unitPrice,
        originOrganizationId: shipment.sellerOrganizationId,
        receivedDay: day,
        expiresDay: ingredient ? day + ingredient.shelfLifeDays : null,
        status: 'available',
        sourceLotIds: shipment.lotAllocations?.map((allocation) => allocation.lotId) ?? [],
        productionBatchId: null,
        lotCode: `IN-${shipment.id}`,
      });
    } else if (shipment.buyerAssetId) {
      const product = trade.products.find((item) => item.id === shipment.commodityId);
      const buyerAsset = assets.find((item) => item.id === shipment.buyerAssetId);
      if (buyerAsset && (buyerAsset.type === 'bar' || buyerAsset.type === 'shop')) {
        const existing = trade.shelves.find((item) => item.assetId === shipment.buyerAssetId && item.productId === shipment.commodityId);
        if (existing) {
          existing.units += shipment.quantity;
          existing.lastRestockDay = day;
          existing.stockoutDays = 0;
          existing.lotAllocations = mergeLotAllocations(existing.lotAllocations ?? [], shipment.lotAllocations ?? [{ lotId: `shipment-lot:${shipment.id}`, quantity: shipment.quantity }]);
        } else if (product) {
          trade.shelves.push({
            id: `trade-shelf-${trade.nextShelfNumber++}`,
            assetId: shipment.buyerAssetId,
            productId: product.id,
            supplierOrganizationId: shipment.sellerOrganizationId,
            units: shipment.quantity,
            retailPrice: product.recommendedRetailPrice,
            unitsSoldToday: 0,
            revenueToday: 0,
            totalUnitsSold: 0,
            lastRestockDay: day,
            stockoutDays: 0,
            lotAllocations: shipment.lotAllocations ?? [{ lotId: `shipment-lot:${shipment.id}`, quantity: shipment.quantity }],
          });
        }
      } else {
        addInventory(trade, shipment.buyerOrganizationId, 'product', shipment.commodityId, shipment.quantity, shipment.unitPrice, shipment.sellerOrganizationId, day, { forceNew: true, sourceLotIds: shipment.lotAllocations?.map((allocation) => allocation.lotId) ?? [], lotCode: `IN-${shipment.id}` });
      }
    } else {
      addInventory(trade, shipment.buyerOrganizationId, 'product', shipment.commodityId, shipment.quantity, shipment.unitPrice, shipment.sellerOrganizationId, day, { forceNew: true, sourceLotIds: shipment.lotAllocations?.map((allocation) => allocation.lotId) ?? [], lotCode: `IN-${shipment.id}` });
    }
  }

  // 2. Продажи конечным покупателям из конкретных полок.
  trade.shelves = trade.shelves.map((listing) => {
    const asset = assets.find((item) => item.id === listing.assetId);
    const product = trade.products.find((item) => item.id === listing.productId);
    const operator = asset?.operatorOrganizationId ? nextOrganizations.find((item) => item.id === asset.operatorOrganizationId) : null;
    if (!asset || !product || !operator || asset.status !== 'operating' || listing.units <= 0) {
      const stockoutDays = listing.units <= 0 ? listing.stockoutDays + 1 : listing.stockoutDays;
      if (product && listing.units <= 0 && stockoutDays === 2) {
        record('stockout', operator?.id ?? product.producerOrganizationId, product.producerOrganizationId, asset?.id ?? null, `Пустая полка: ${product.name}`, `${asset?.name ?? 'Точка'} потеряла продажи из-за отсутствия товара.`);
      }
      return { ...listing, unitsSoldToday: 0, revenueToday: 0, stockoutDays, soldLotAllocationsToday: [] };
    }
    const demandResult = calculateShelfDemand(nextDemand, {
      day,
      regionId: asset.regionId,
      assetId: asset.id,
      assetType: asset.type,
      assetFootfall: asset.footfall,
      productId: product.id,
      beverageCategoryId: product.beverageCategoryId ?? legacyCategoryForFamily(product.family),
      quality: product.quality,
      retailPrice: listing.retailPrice,
      referencePrice: product.recommendedRetailPrice,
      organizationReputation: operator.reputation,
    });
    const sold = Math.min(listing.units, demandResult.units);
    const saleRevenue = roundMoney(sold * listing.retailPrice);
    const allocationResult = consumeLotAllocations(listing.lotAllocations ?? [{ lotId: `shelf-lot:${listing.id}`, quantity: listing.units }], sold);
    if (sold > 0) {
      addMoneyDelta(revenue, operator.id, saleRevenue);
      product.totalSold += sold;
      nextDemand = recordConsumerPurchase(nextDemand, {
        day,
        regionId: asset.regionId,
        assetId: asset.id,
        productId: product.id,
        categoryId: product.beverageCategoryId ?? legacyCategoryForFamily(product.family),
        channel: demandResult.channel,
        units: sold,
        unitPrice: listing.retailPrice,
        revenue: saleRevenue,
        primarySegmentId: demandResult.primarySegmentId,
        occasion: demandResult.occasion,
      });
      record('sale', operator.id, product.producerOrganizationId, asset.id, `${asset.name} продала ${product.name}`, `${sold} бутылок купила аудитория «${demandResult.primarySegmentId}» (${demandResult.occasion}).`, saleRevenue);
    }
    return {
      ...listing,
      units: listing.units - sold,
      unitsSoldToday: sold,
      revenueToday: saleRevenue,
      totalUnitsSold: listing.totalUnitsSold + sold,
      stockoutDays: listing.units - sold <= 0 ? listing.stockoutDays + 1 : 0,
      lotAllocations: allocationResult.remaining,
      soldLotAllocationsToday: allocationResult.consumed,
    };
  });

  // 3. Завершение производственных партий.
  trade.batches = trade.batches.map((batch) => {
    if (batch.status !== 'producing' || batch.readyDay > day) return batch;
    const product = trade.products.find((item) => item.id === batch.productId);
    if (!product) return { ...batch, status: 'blocked', issue: 'Продукт больше не существует' };
    addInventory(trade, batch.producerOrganizationId, 'product', product.id, batch.plannedUnits, product.unitCost, batch.producerOrganizationId, day, {
      forceNew: true,
      sourceLotIds: batch.ingredientLotIds,
      productionBatchId: batch.id,
      lotCode: `PK-${product.id}-${batch.id}`,
    });
    product.totalProduced += batch.plannedUnits;
    record('production', batch.producerOrganizationId, null, null, `Готова партия ${product.name}`, `${batch.plannedUnits} бутылок поступили на склад производителя.`, batch.cost);
    return { ...batch, status: 'ready', producedUnits: batch.plannedUnits, issue: null };
  });

  // 4. Планирование новых партий и реальное списание сырья.
  for (const producer of nextOrganizations.filter((organization) => organization.kind === 'producer' && organization.status !== 'acquired')) {
    const product = trade.products.find((item) => item.producerOrganizationId === producer.id && item.status === 'active');
    if (!product) continue;
    const activeBatch = trade.batches.some((batch) => batch.producerOrganizationId === producer.id && batch.status === 'producing');
    const stock = inventoryQuantity(trade, producer.id, 'product', product.id);
    const shelfDemand = trade.shelves.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.unitsSoldToday, 0);
    if (activeBatch || stock > Math.max(180, shelfDemand * 12)) continue;
    const plannedUnits = 180 + hash(`${producer.id}-${day}`) % 181;
    const requirements = ingredientRequirements(product.family).map((item) => ({ ...item, quantity: roundQuantity(item.quantity * plannedUnits / 240) }));
    const missing = requirements.filter((requirement) => inventoryQuantity(trade, producer.id, 'ingredient', requirement.ingredientId) < requirement.quantity);
    if (missing.length > 0) {
      const issue = `Не хватает: ${missing.map((item) => ingredientName(item.ingredientId)).join(', ')}`;
      const existingBlocked = trade.batches.find((batch) => batch.producerOrganizationId === producer.id && batch.productId === product.id && batch.status === 'blocked');
      if (existingBlocked) {
        existingBlocked.startDay = day;
        existingBlocked.readyDay = day;
        existingBlocked.plannedUnits = plannedUnits;
        existingBlocked.issue = issue;
      } else {
        trade.batches.push({
          id: `trade-batch-${trade.nextBatchNumber++}`,
          producerOrganizationId: producer.id,
          productId: product.id,
          status: 'blocked',
          startDay: day,
          readyDay: day,
          plannedUnits,
          producedUnits: 0,
          ingredientLotIds: [],
          cost: 0,
          issue,
        });
        record('shortage', producer.id, null, null, `${producer.name} остановила запуск`, `Не хватает сырья для ${product.name}: ${missing.map((item) => ingredientName(item.ingredientId)).join(', ')}.`);
        events.push({ tone: 'warning', title: `${producer.name}: дефицит сырья`, detail: `Партия ${product.name} не запущена.` });
      }
      continue;
    }
    const consumedLotIds: string[] = [];
    let batchCost = 0;
    for (const requirement of requirements) {
      const consumed = consumeInventory(trade, producer.id, 'ingredient', requirement.ingredientId, requirement.quantity);
      consumedLotIds.push(...consumed.lotIds);
      batchCost += consumed.cost;
    }
    addMoneyDelta(costs, producer.id, batchCost * .18);
    trade.batches = trade.batches.filter((batch) => !(batch.producerOrganizationId === producer.id && batch.status === 'blocked'));
    trade.batches.push({
      id: `trade-batch-${trade.nextBatchNumber++}`,
      producerOrganizationId: producer.id,
      productId: product.id,
      status: 'producing',
      startDay: day,
      readyDay: day + productionDays(product.family),
      plannedUnits,
      producedUnits: 0,
      ingredientLotIds: consumedLotIds,
      cost: roundMoney(batchCost),
      issue: null,
    });
    record('production', producer.id, null, null, `Запущена партия ${product.name}`, `${plannedUnits} бутылок будут готовы на ${day + productionDays(product.family)}-й день.`, batchCost);
  }

  // 5. Промышленная упаковка пока пополняется отдельным сектором.
  // Солод, хмель, яблоки, сахар и дрожжи больше не создаются здесь:
  // их производит первичный сектор и перерабатывающие предприятия.
  for (const supplier of nextOrganizations.filter((organization) => organization.kind === 'supplier' && organization.status !== 'acquired')) {
    for (const lot of trade.inventory.filter((item) => item.organizationId === supplier.id && item.commodityKind === 'ingredient' && item.commodityId === 'bottles')) {
      const target = 480 + hash(`${supplier.id}-${lot.commodityId}`) % 420;
      if (lot.quantity < target * .35) lot.quantity = roundQuantity(lot.quantity + target * .6);
    }
  }

  // 6. Формирование отправок по контрактам.
  trade.contracts = trade.contracts.map((contract) => {
    if (contract.status !== 'active' || contract.nextDeliveryDay > day) return contract;
    const activeForContract = trade.shipments.some((shipment) => shipment.contractId === contract.id && !['delivered', 'failed'].includes(shipment.status));
    if (activeForContract) return { ...contract, nextDeliveryDay: day + 1, lastResult: 'Предыдущая поставка ещё не завершена' };
    const available = inventoryQuantity(trade, contract.sellerOrganizationId, contract.commodityKind, contract.commodityId);
    if (available < contract.quantity) {
      const failures = contract.failures + 1;
      record('shortage', contract.sellerOrganizationId, contract.buyerOrganizationId, contract.buyerAssetId, `Поставка задержана`, `${commodityName(trade, contract.commodityKind, contract.commodityId)}: у продавца нет нужного объёма.`);
      if (failures >= 3) events.push({ tone: 'warning', title: 'Разрыв в цепочке поставок', detail: `${commodityName(trade, contract.commodityKind, contract.commodityId)} не поставляется третий цикл подряд.` });
      return { ...contract, failures, nextDeliveryDay: day + 1, lastResult: 'Дефицит у поставщика' };
    }
    const reserved = consumeInventory(trade, contract.sellerOrganizationId, contract.commodityKind, contract.commodityId, contract.quantity);
    trade.shipments.push({
      id: `trade-shipment-${trade.nextShipmentNumber++}`,
      contractId: contract.id,
      sellerOrganizationId: contract.sellerOrganizationId,
      buyerOrganizationId: contract.buyerOrganizationId,
      sellerAssetId: contract.sellerAssetId ?? firstOperatingAssetId(assets, contract.sellerOrganizationId),
      buyerAssetId: contract.buyerAssetId ?? firstOperatingAssetId(assets, contract.buyerOrganizationId),
      commodityKind: contract.commodityKind,
      commodityId: contract.commodityId,
      quantity: contract.quantity,
      unitPrice: contract.unitPrice,
      departDay: 0,
      arrivalDay: day,
      status: 'awaiting_transport',
      note: 'Ожидает назначения перевозчика',
      lotAllocations: reserved.allocations,
    });
    record('purchase', contract.sellerOrganizationId, contract.buyerOrganizationId, contract.buyerAssetId, `Отправлен товар`, `${commodityName(trade, contract.commodityKind, contract.commodityId)} · ${contract.quantity} ед.`, contract.quantity * contract.unitPrice);
    return { ...contract, failures: 0, nextDeliveryDay: day + contract.intervalDays, lastResult: 'Передано в логистическую очередь' };
  });

  // 7. Жизненный цикл продуктовых линеек.
  for (const product of trade.products) {
    const productShelves = trade.shelves.filter((item) => item.productId === product.id);
    const sold = productShelves.reduce((sum, item) => sum + item.unitsSoldToday, 0);
    const stockouts = productShelves.filter((item) => item.units <= 0).length;
    product.slowDays = sold <= 1 && productShelves.length > 0 ? product.slowDays + 1 : Math.max(0, product.slowDays - 1);
    product.stockoutDays = stockouts > 0 ? product.stockoutDays + 1 : Math.max(0, product.stockoutDays - 1);
    if (product.slowDays >= 12 && product.status === 'active') {
      product.status = 'discontinued';
      trade.contracts.forEach((contract) => { if (contract.commodityKind === 'product' && contract.commodityId === product.id) contract.status = 'broken'; });
      record('discontinued', product.producerOrganizationId, null, null, `${product.name} снят с производства`, 'Слабый оборот сделал продукт невыгодным.');
      events.push({ tone: 'warning', title: `${product.name} исчезает с рынка`, detail: 'Производитель остановил слабую линейку.' });
    }
  }

  // 8. Новый релиз заменяет снятый продукт или расширяет растущего производителя.
  if (day % 9 === 0) {
    const producer = nextOrganizations
      .filter((organization) => organization.kind === 'producer' && organization.status === 'active')
      .sort((a, b) => trade.products.filter((product) => product.producerOrganizationId === a.id && product.status === 'active').length - trade.products.filter((product) => product.producerOrganizationId === b.id && product.status === 'active').length)[0];
    if (producer && trade.products.filter((product) => product.producerOrganizationId === producer.id && product.status === 'active').length < 2) {
      const family = familyForOrganization(producer);
      const product = createSeedProduct(producer, family, day, trade.nextProductNumber++);
      product.name = `${PRODUCT_NAMES[family][hash(`${producer.id}-${day}`) % PRODUCT_NAMES[family].length]} ${String(day).padStart(2, '0')}`;
      trade.products.push(product);
      addInventory(trade, producer.id, 'product', product.id, 120, product.unitCost, producer.id, day);
      record('release', producer.id, null, null, `${producer.name} выпустила ${product.name}`, 'Новая линейка ищет место на полках города.');
      events.push({ tone: 'release', title: `${producer.name}: новый релиз`, detail: product.name });
    }
  }

  // 9. Применение денежного потока к организациям.
  nextOrganizations = nextOrganizations.map((organization) => {
    const dayRevenue = roundMoney(revenue.get(organization.id) ?? 0);
    const dayCosts = roundMoney((costs.get(organization.id) ?? 0) + baseOperatingCost(organization));
    return {
      ...organization,
      cash: roundMoney(organization.cash + dayRevenue - dayCosts),
      dailyRevenue: dayRevenue,
      dailyCosts: dayCosts,
      buyerOrganizationIds: unique(trade.contracts.filter((contract) => contract.sellerOrganizationId === organization.id && contract.status === 'active').map((contract) => contract.buyerOrganizationId)),
      supplierOrganizationIds: unique(trade.contracts.filter((contract) => contract.buyerOrganizationId === organization.id && contract.status === 'active').map((contract) => contract.sellerOrganizationId)),
    };
  });

  trade.operations = operations;
  trade.nextOperationNumber = nextOperationNumber;
  trade.inventory = trade.inventory.filter((lot) => lot.quantity > .001 && (lot.expiresDay === null || lot.expiresDay >= day));
  const activeShipments = trade.shipments.filter((shipment) => !['delivered', 'failed'].includes(shipment.status));
  const completedShipments = trade.shipments.filter((shipment) => ['delivered', 'failed'].includes(shipment.status)).slice(-240);
  trade.shipments = [...completedShipments, ...activeShipments];
  trade.batches = trade.batches.slice(-120);
  return { trade, demand: nextDemand, organizations: nextOrganizations, events };
}

export function normalizeTradeState(value: TradeState | null | undefined): TradeState {
  if (!value) return {
    inventory: [], products: [], batches: [], contracts: [], shipments: [], shelves: [], operations: [],
    nextInventoryNumber: 1, nextProductNumber: 1, nextBatchNumber: 1, nextContractNumber: 1,
    nextShipmentNumber: 1, nextShelfNumber: 1, nextOperationNumber: 1,
  };
  return {
    inventory: (value.inventory ?? []).map((lot) => ({ ...lot, status: lot.status ?? 'available', sourceLotIds: lot.sourceLotIds ?? [], productionBatchId: lot.productionBatchId ?? null, lotCode: lot.lotCode ?? `LOT-${lot.id}` })),
    products: (value.products ?? []).map((product) => { const categoryId = product.beverageCategoryId ?? legacyCategoryForFamily(product.family); return ({ ...product, beverageCategoryId: categoryId, alcoholByVolume: Number.isFinite(product.alcoholByVolume) ? product.alcoholByVolume : defaultAbvForCategory(categoryId), packageVolumeLiters: Number.isFinite(product.packageVolumeLiters) ? product.packageVolumeLiters : defaultPackageVolumeForCategory(categoryId) }); }),
    batches: value.batches ?? [],
    contracts: (value.contracts ?? []).map((contract) => ({ ...contract, sellerAssetId: contract.sellerAssetId ?? null })),
    shipments: (value.shipments ?? []).map((shipment) => ({ ...shipment, sellerAssetId: shipment.sellerAssetId ?? null, lotAllocations: shipment.lotAllocations ?? [] })),
    shelves: (value.shelves ?? []).map((shelf) => ({ ...shelf, lotAllocations: shelf.lotAllocations ?? [{ lotId: `legacy-shelf-lot:${shelf.id}`, quantity: shelf.units }], soldLotAllocationsToday: shelf.soldLotAllocationsToday ?? [] })),
    operations: value.operations ?? [],
    nextInventoryNumber: value.nextInventoryNumber ?? 1,
    nextProductNumber: value.nextProductNumber ?? 1,
    nextBatchNumber: value.nextBatchNumber ?? 1,
    nextContractNumber: value.nextContractNumber ?? 1,
    nextShipmentNumber: value.nextShipmentNumber ?? 1,
    nextShelfNumber: value.nextShelfNumber ?? 1,
    nextOperationNumber: value.nextOperationNumber ?? 1,
  };
}

export function productFamilyLabel(family: TradeProductFamily): string {
  return ({ beer: 'пиво', cider: 'сидр', wine: 'вино', spirit: 'дистиллят', liqueur: 'ликёр', alcohol_free: 'безалкогольный напиток' })[family];
}

export function commodityName(state: Pick<TradeState, 'products'>, kind: TradeCommodityKind, commodityId: string): string {
  if (kind === 'ingredient') return ingredientName(commodityId);
  return state.products.find((product) => product.id === commodityId)?.name ?? 'Неизвестный продукт';
}

export function inventoryQuantity(state: Pick<TradeState, 'inventory'>, organizationId: string, kind: TradeCommodityKind, commodityId: string): number {
  return roundQuantity(state.inventory.filter((lot) => lot.organizationId === organizationId && lot.commodityKind === kind && lot.commodityId === commodityId && (lot.status ?? 'available') === 'available').reduce((sum, lot) => sum + lot.quantity, 0));
}

export function restoreShipmentInventory(state: TradeState, shipment: TradeShipmentState, day: number): TradeState {
  const next = { ...state, inventory: state.inventory.map((lot) => ({ ...lot })) };
  addInventory(next, shipment.sellerOrganizationId, shipment.commodityKind, shipment.commodityId, shipment.quantity, shipment.unitPrice, shipment.sellerOrganizationId, day, { forceNew: true, sourceLotIds: shipment.lotAllocations?.map((allocation) => allocation.lotId) ?? [], lotCode: `RETURN-${shipment.id}` });
  return next;
}

function firstOperatingAssetId(assets: WorldAssetState[], organizationId: string): string | null {
  return assets.find((asset) => asset.operatorOrganizationId === organizationId && asset.status === 'operating')?.id
    ?? assets.find((asset) => asset.ownerOrganizationId === organizationId)?.id
    ?? null;
}

function createSeedProduct(producer: OrganizationState, family: TradeProductFamily, day: number, number: number): TradeProductState {
  const namePool = PRODUCT_NAMES[family];
  const baseQuality = clamp(Math.round(producer.reputation * .72 + 22 + hash(producer.id) % 9), 48, 94);
  const unitCost = roundMoney(family === 'spirit' ? 4.8 : family === 'wine' ? 3.1 : family === 'liqueur' ? 3.6 : 1.15 + baseQuality / 100);
  const wholesalePrice = roundMoney(unitCost * (1.52 + producer.reputation / 280));
  return {
    id: `trade-product-${number}`,
    producerOrganizationId: producer.id,
    name: producer.strategy.includes('безалког') ? 'Hop Zero' : (namePool[number % namePool.length] ?? 'House Release'),
    family,
    beverageCategoryId: legacyCategoryForFamily(family),
    style: producer.strategy,
    quality: baseQuality,
    unitCost,
    wholesalePrice,
    recommendedRetailPrice: roundMoney(wholesalePrice * 1.72),
    alcoholByVolume: defaultAbvForCategory(legacyCategoryForFamily(family)),
    packageVolumeLiters: defaultPackageVolumeForCategory(legacyCategoryForFamily(family)),
    status: 'active',
    totalProduced: 0,
    totalSold: 0,
    slowDays: 0,
    stockoutDays: 0,
    createdDay: day,
  };
}



function defaultAbvForCategory(categoryId: BeverageCategoryId): number {
  const values: Record<string, number> = {
    beer: 5.0, cider: 5.5, perry: 5.5, still_wine: 12.5, sparkling_wine: 12,
    fortified_wine: 18, whisky: 40, rum: 40, vodka: 40, gin: 40, agave_spirit: 40,
    brandy: 40, liqueur: 24, amaro_bitter: 28, vermouth_aperitif: 16, sake: 15,
    mead: 12, rtd: 5, alcohol_free: .5, mixer: 0,
  };
  return values[categoryId] ?? 5;
}

function defaultPackageVolumeForCategory(categoryId: BeverageCategoryId): number {
  if (['still_wine', 'sparkling_wine', 'fortified_wine', 'whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter', 'vermouth_aperitif', 'sake', 'mead'].includes(categoryId)) return .75;
  return .5;
}

function legacyCategoryForFamily(family: TradeProductFamily): BeverageCategoryId {
  if (family === 'wine') return 'still_wine';
  if (family === 'spirit') return 'whisky';
  return family;
}

function familyForOrganization(organization: Pick<OrganizationState, 'strategy' | 'name'>): TradeProductFamily {
  const value = `${organization.strategy} ${organization.name}`.toLowerCase();
  if (value.includes('сидр') || value.includes('ябл') || value.includes('пуаре')) return 'cider';
  if (value.includes('вин')) return 'wine';
  if (value.includes('дистилл') || value.includes('виски') || value.includes('зернов')) return 'spirit';
  if (value.includes('ликёр') || value.includes('биттер') || value.includes('трав')) return 'liqueur';
  if (value.includes('безалког') || value.includes('zero')) return 'alcohol_free';
  return 'beer';
}

function ingredientRequirements(family: TradeProductFamily): { ingredientId: string; quantity: number }[] {
  if (family === 'beer' || family === 'alcohol_free') return [
    { ingredientId: 'malt-base', quantity: 42 },
    { ingredientId: 'hops', quantity: 2.2 },
    { ingredientId: 'beer-yeast', quantity: 2 },
    { ingredientId: 'bottles', quantity: 240 },
  ];
  if (family === 'cider' || family === 'wine') return [
    { ingredientId: 'apples', quantity: 260 },
    { ingredientId: 'cider-yeast', quantity: 2 },
    { ingredientId: 'sugar', quantity: 8 },
    { ingredientId: 'bottles', quantity: 240 },
  ];
  return [
    { ingredientId: 'malt-base', quantity: 55 },
    { ingredientId: 'sugar', quantity: 18 },
    { ingredientId: 'beer-yeast', quantity: 2 },
    { ingredientId: 'bottles', quantity: 180 },
  ];
}

function supplierForIngredient(ingredientId: string, suppliers: OrganizationState[]): OrganizationState | undefined {
  const offer = supplierOffers.find((item) => item.ingredientId === ingredientId);
  return offer ? suppliers.find((organization) => organization.id === `org-supplier-${offer.supplierId}`) : undefined;
}

function offerForSupplierIngredient(organizationId: string, ingredientId: string) {
  const supplierId = organizationId.replace('org-supplier-', '');
  return supplierOffers.find((item) => item.supplierId === supplierId && item.ingredientId === ingredientId);
}

interface AddInventoryOptions {
  forceNew?: boolean;
  sourceLotIds?: string[];
  productionBatchId?: string | null;
  lotCode?: string;
}

function addInventory(state: TradeState, organizationId: string, kind: TradeCommodityKind, commodityId: string, quantity: number, unitCost: number, originOrganizationId: string, day: number, options: AddInventoryOptions = {}): string {
  const existing = !options.forceNew ? state.inventory.find((lot) => lot.organizationId === organizationId && lot.commodityKind === kind && lot.commodityId === commodityId && lot.unitCost === unitCost && (lot.status ?? 'available') === 'available' && (lot.sourceLotIds ?? []).length === 0) : undefined;
  if (existing) {
    existing.quantity = roundQuantity(existing.quantity + quantity);
    return existing.id;
  }
  const ingredient = kind === 'ingredient' ? ingredients.find((item) => item.id === commodityId) : null;
  const id = `trade-lot-${state.nextInventoryNumber++}`;
  state.inventory.push({
    id,
    organizationId,
    commodityKind: kind,
    commodityId,
    quantity: roundQuantity(quantity),
    unit: ingredient?.unit ?? 'bottle',
    quality: 78,
    unitCost: roundMoney(unitCost),
    originOrganizationId,
    receivedDay: day,
    expiresDay: kind === 'ingredient' && ingredient ? day + ingredient.shelfLifeDays : day + 280,
    status: 'available',
    sourceLotIds: options.sourceLotIds ?? [],
    productionBatchId: options.productionBatchId ?? null,
    lotCode: options.lotCode ?? `LOT-${id}`,
  });
  return id;
}

function consumeInventory(state: TradeState, organizationId: string, kind: TradeCommodityKind, commodityId: string, quantity: number): { cost: number; lotIds: string[]; allocations: TradeLotAllocation[] } {
  let remaining = quantity;
  let cost = 0;
  const lotIds: string[] = [];
  const allocations: TradeLotAllocation[] = [];
  const lots = state.inventory
    .filter((lot) => lot.organizationId === organizationId && lot.commodityKind === kind && lot.commodityId === commodityId && lot.quantity > 0 && (lot.status ?? 'available') === 'available')
    .sort((a, b) => (a.expiresDay ?? Infinity) - (b.expiresDay ?? Infinity));
  for (const lot of lots) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, lot.quantity);
    lot.quantity = roundQuantity(lot.quantity - used);
    remaining = roundQuantity(remaining - used);
    cost += used * lot.unitCost;
    lotIds.push(lot.id);
    allocations.push({ lotId: lot.id, quantity: used });
  }
  return { cost: roundMoney(cost), lotIds, allocations };
}

function mergeLotAllocations(current: TradeLotAllocation[], incoming: TradeLotAllocation[]): TradeLotAllocation[] {
  const byLot = new Map(current.map((allocation) => [allocation.lotId, allocation.quantity]));
  for (const allocation of incoming) byLot.set(allocation.lotId, roundQuantity((byLot.get(allocation.lotId) ?? 0) + allocation.quantity));
  return [...byLot.entries()].map(([lotId, quantity]) => ({ lotId, quantity })).filter((allocation) => allocation.quantity > 0);
}

function consumeLotAllocations(current: TradeLotAllocation[], quantity: number): { remaining: TradeLotAllocation[]; consumed: TradeLotAllocation[] } {
  let pending = quantity;
  const consumed: TradeLotAllocation[] = [];
  const remaining = current.map((allocation) => {
    if (pending <= 0) return allocation;
    const used = Math.min(pending, allocation.quantity);
    pending = roundQuantity(pending - used);
    if (used > 0) consumed.push({ lotId: allocation.lotId, quantity: used });
    return { ...allocation, quantity: roundQuantity(allocation.quantity - used) };
  }).filter((allocation) => allocation.quantity > 0);
  return { remaining, consumed };
}

function baseOperatingCost(organization: OrganizationState): number {
  if (organization.kind === 'player') return 0;
  const employeeCost = organization.employeeCount * 9.5;
  const kindCost = organization.kind === 'producer' ? 320 : organization.kind === 'supplier' ? 240 : organization.kind === 'holding' ? 120 : 210;
  return roundMoney(employeeCost + kindCost + organization.debt * .00038);
}

function productionDays(family: TradeProductFamily): number {
  if (family === 'spirit') return 6;
  if (family === 'wine') return 5;
  if (family === 'liqueur') return 4;
  return 3;
}

function ingredientName(id: string): string {
  return ingredients.find((item) => item.id === id)?.name ?? id;
}

function addMoneyDelta(target: Map<string, number>, organizationId: string, amount: number): void {
  target.set(organizationId, roundMoney((target.get(organizationId) ?? 0) + amount));
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function roundQuantity(value: number): number { return Math.round(value * 1000) / 1000; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}
