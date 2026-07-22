import {
  distributors,
  logisticsCarriers,
  logisticsNode,
  vehicleCapacity,
  type LogisticsVehicleType,
} from '../data/logisticsCatalog';
import { hashSeed } from './kernel';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import { restoreShipmentInventory, type TradeShipmentState, type TradeState } from './trade';

export type FreightJobStatus = 'queued' | 'loading' | 'in_transit' | 'customs_hold' | 'delivered' | 'failed';
export type LogisticsOperationKind = 'assigned' | 'departed' | 'delay' | 'customs_hold' | 'damage' | 'delivered' | 'failed';

export interface LogisticsCarrierState {
  id: string;
  organizationId: string;
  depotAssetId: string;
  reliability: number;
  customsCapability: boolean;
  refrigeratedCapability: boolean;
  baseRatePerKm: number;
  totalJobs: number;
  deliveredJobs: number;
  delayedJobs: number;
  damagedUnits: number;
}

export interface LogisticsVehicleState {
  id: string;
  carrierId: string;
  type: LogisticsVehicleType;
  capacity: number;
  condition: number;
  refrigerated: boolean;
  currentRegionId: string;
  availableDay: number;
  activeJobId: string | null;
}

export interface LogisticsRouteState {
  id: string;
  originRegionId: string;
  destinationRegionId: string;
  originCountryId: string;
  destinationCountryId: string;
  distanceKm: number;
  borderCrossings: number;
  customsRequired: boolean;
  baseTransitDays: number;
  tollCost: number;
}

export interface FreightJobState {
  id: string;
  shipmentId: string;
  carrierId: string | null;
  vehicleId: string | null;
  routeId: string;
  status: FreightJobStatus;
  createdDay: number;
  assignedDay: number | null;
  departDay: number | null;
  expectedArrivalDay: number | null;
  deliveredDay: number | null;
  quantity: number;
  capacityUsed: number;
  transportCost: number;
  insuranceCost: number;
  delayDays: number;
  damageUnits: number;
  damageApplied: boolean;
  customsCleared: boolean;
  lastProcessedDay: number;
  note: string;
}

export interface LogisticsOperationState {
  id: string;
  day: number;
  kind: LogisticsOperationKind;
  jobId: string;
  shipmentId: string;
  carrierOrganizationId: string | null;
  organizationId: string | null;
  amount: number;
  headline: string;
  detail: string;
}

export interface LogisticsState {
  carriers: LogisticsCarrierState[];
  fleet: LogisticsVehicleState[];
  routes: LogisticsRouteState[];
  jobs: FreightJobState[];
  operations: LogisticsOperationState[];
  nextJobNumber: number;
  nextOperationNumber: number;
}

export interface LogisticsSectorSeed {
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  logistics: LogisticsState;
}

export interface LogisticsAdvanceResult {
  logistics: LogisticsState;
  trade: TradeState;
  organizations: OrganizationState[];
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export function createLogisticsSector(day: number): LogisticsSectorSeed {
  const organizations: OrganizationState[] = [];
  const assets: WorldAssetState[] = [];

  logisticsCarriers.forEach((definition, index) => {
    organizations.push({
      id: definition.organizationId,
      name: definition.organizationName,
      kind: 'carrier',
      countryId: definition.countryId,
      regionId: definition.regionId,
      ownerLabel: logisticsOwner(index),
      status: 'active',
      cash: 94_000 + index * 18_000,
      debt: 21_000 + index * 6_500,
      reputation: definition.reliability,
      strategy: 'Контрактная перевозка напитков и сырья',
      employeeCount: 24 + definition.vehicleMix.length * 3,
      valuation: 190_000 + definition.vehicleMix.length * 48_000,
      dailyRevenue: 0,
      dailyCosts: 760 + definition.vehicleMix.length * 110,
      assetIds: [definition.depotAssetId],
      supplierOrganizationIds: [],
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, day - 1_600 - index * 119),
    });
    assets.push({
      id: definition.depotAssetId,
      type: 'depot',
      name: definition.depotName,
      city: definition.city,
      countryId: definition.countryId,
      regionId: definition.regionId,
      address: definition.address,
      ownerOrganizationId: definition.organizationId,
      operatorOrganizationId: definition.organizationId,
      status: 'operating',
      condition: 77 + index * 4,
      capacity: definition.vehicleMix.reduce((sum, type) => sum + vehicleCapacity(type), 0),
      footfall: 0,
      askingPrice: 210_000 + index * 35_000,
      dailyRent: 0,
      dailyOperatingCost: 620 + index * 90,
      audience: 'Перевозка подакцизных товаров и сырья',
      marketOutletId: null,
      venue: null,
    });
  });

  distributors.forEach((definition, index) => {
    organizations.push({
      id: definition.organizationId,
      name: definition.organizationName,
      kind: 'distributor',
      countryId: definition.countryId,
      regionId: definition.regionId,
      ownerLabel: distributionOwner(index),
      status: 'active',
      cash: 118_000 + index * 24_000,
      debt: 28_000 + index * 9_000,
      reputation: 72 + index * 6,
      strategy: definition.focus,
      employeeCount: 28 + index * 7,
      valuation: 250_000 + definition.capacity * 9,
      dailyRevenue: 0,
      dailyCosts: 980 + index * 170,
      assetIds: [definition.warehouseAssetId],
      supplierOrganizationIds: [],
      buyerOrganizationIds: [],
      foundedDay: Math.max(1, day - 1_250 - index * 173),
    });
    assets.push({
      id: definition.warehouseAssetId,
      type: 'distribution_center',
      name: definition.warehouseName,
      city: definition.city,
      countryId: definition.countryId,
      regionId: definition.regionId,
      address: definition.address,
      ownerOrganizationId: definition.organizationId,
      operatorOrganizationId: definition.organizationId,
      status: 'operating',
      condition: 82 - index * 3,
      capacity: definition.capacity,
      footfall: 0,
      askingPrice: 260_000 + index * 42_000,
      dailyRent: 0,
      dailyOperatingCost: 790 + index * 120,
      audience: definition.focus,
      marketOutletId: null,
      venue: null,
    });
  });

  return { organizations, assets, logistics: createLogisticsState() };
}

export function createLogisticsState(): LogisticsState {
  const carriers: LogisticsCarrierState[] = logisticsCarriers.map((definition) => ({
    id: definition.id,
    organizationId: definition.organizationId,
    depotAssetId: definition.depotAssetId,
    reliability: definition.reliability,
    customsCapability: definition.customsCapability,
    refrigeratedCapability: definition.refrigeratedCapability,
    baseRatePerKm: definition.baseRatePerKm,
    totalJobs: 0,
    deliveredJobs: 0,
    delayedJobs: 0,
    damagedUnits: 0,
  }));
  const fleet: LogisticsVehicleState[] = [];
  logisticsCarriers.forEach((definition) => {
    const fleetScale = definition.customsCapability ? 6 : 5;
    for (let copy = 0; copy < fleetScale; copy += 1) {
      definition.vehicleMix.forEach((type, index) => {
        fleet.push({
          id: `vehicle-${definition.id}-${copy + 1}-${index + 1}`,
          carrierId: definition.id,
          type,
          capacity: vehicleCapacity(type),
          condition: 76 + hash(`${definition.id}:${type}:${copy}:${index}`) % 21,
          refrigerated: type === 'temperature_truck',
          currentRegionId: definition.regionId,
          availableDay: 1,
          activeJobId: null,
        });
      });
    }
  });
  return { carriers, fleet, routes: [], jobs: [], operations: [], nextJobNumber: 1, nextOperationNumber: 1 };
}

export function ensureLogisticsSector(input: {
  state: LogisticsState | undefined;
  organizations: OrganizationState[];
  assets: WorldAssetState[];
  trade: TradeState;
  day: number;
}): LogisticsSectorSeed {
  const seed = createLogisticsSector(input.day);
  const organizationIds = new Set(input.organizations.map((item) => item.id));
  const assetIds = new Set(input.assets.map((item) => item.id));
  const organizations = [...input.organizations, ...seed.organizations.filter((item) => !organizationIds.has(item.id))];
  const assets = [...input.assets, ...seed.assets.filter((item) => !assetIds.has(item.id))];
  const logistics = normalizeLogisticsState(input.state, input.trade, organizations, assets, input.day);
  return { organizations, assets, logistics };
}

export function normalizeLogisticsState(value: LogisticsState | undefined, trade: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): LogisticsState {
  const baseline = createLogisticsState();
  const state: LogisticsState = value && Array.isArray(value.carriers) ? {
    carriers: baseline.carriers.map((carrier) => ({ ...carrier, ...(value.carriers.find((item) => item.id === carrier.id) ?? {}) })),
    fleet: baseline.fleet.map((vehicle) => ({ ...vehicle, ...(value.fleet?.find((item) => item.id === vehicle.id) ?? {}) })),
    routes: value.routes ?? [],
    jobs: value.jobs ?? [],
    operations: value.operations ?? [],
    nextJobNumber: value.nextJobNumber ?? 1,
    nextOperationNumber: value.nextOperationNumber ?? 1,
  } : baseline;

  const knownShipmentIds = new Set(state.jobs.map((job) => job.shipmentId));
  for (const shipment of trade.shipments) {
    if (knownShipmentIds.has(shipment.id) || shipment.status === 'delivered' || shipment.status === 'failed') continue;
    const route = ensureRoute(state, routeForShipment(shipment, organizations, assets));
    state.jobs.push({
      id: `freight-job-${state.nextJobNumber++}`,
      shipmentId: shipment.id,
      carrierId: null,
      vehicleId: null,
      routeId: route.id,
      status: 'queued',
      createdDay: shipment.departDay || day,
      assignedDay: null,
      departDay: null,
      expectedArrivalDay: shipment.arrivalDay > day ? shipment.arrivalDay : null,
      deliveredDay: null,
      quantity: shipment.quantity,
      capacityUsed: 0,
      transportCost: 0,
      insuranceCost: 0,
      delayDays: shipment.status === 'delayed' ? 1 : 0,
      damageUnits: 0,
      damageApplied: false,
      customsCleared: !route.customsRequired,
      lastProcessedDay: day - 1,
      note: 'Ожидает назначения перевозчика',
    });
  }
  return state;
}

export function advanceLogisticsTransit(state: LogisticsState, trade: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): LogisticsAdvanceResult {
  const logistics = normalizeLogisticsState(state, trade, organizations, assets, day);
  const nextTrade: TradeState = { ...trade, shipments: trade.shipments.map((shipment) => ({ ...shipment })) };
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  const events: LogisticsAdvanceResult['events'] = [];

  for (const job of logistics.jobs) {
    if (job.status === 'delivered' || job.status === 'failed') continue;
    const shipment = nextTrade.shipments.find((item) => item.id === job.shipmentId);
    if (!shipment) {
      job.status = job.deliveredDay !== null ? 'delivered' : 'failed';
      job.note = job.deliveredDay !== null ? 'Груз ранее доставлен' : 'Связанная поставка не найдена';
      releaseVehicle(logistics, job, null, day);
      continue;
    }
    if (shipment.status === 'delivered') {
      job.status = 'delivered';
      job.deliveredDay = day;
      job.note = 'Груз принят получателем';
      releaseVehicle(logistics, job, routeById(logistics, job.routeId)?.destinationRegionId ?? null, day);
      const carrier = logistics.carriers.find((item) => item.id === job.carrierId);
      if (carrier) carrier.deliveredJobs += 1;
      recordOperation(logistics, day, 'delivered', job, shipment.buyerOrganizationId, 0, 'Груз доставлен', `${shipment.quantity} ед. приняты получателем.`);
      continue;
    }
    if (shipment.status === 'failed') {
      job.status = 'failed';
      job.note = shipment.note;
      releaseVehicle(logistics, job, null, day);
      recordOperation(logistics, day, 'failed', job, shipment.buyerOrganizationId, 0, 'Перевозка сорвана', shipment.note);
      continue;
    }
    if (job.lastProcessedDay >= day || !job.carrierId || !job.vehicleId) continue;
    job.lastProcessedDay = day;
    const route = routeById(logistics, job.routeId);
    const vehicle = logistics.fleet.find((item) => item.id === job.vehicleId);
    const carrier = logistics.carriers.find((item) => item.id === job.carrierId);
    if (!route || !vehicle || !carrier) continue;

    if (job.status === 'loading' && job.departDay !== null && job.departDay <= day) {
      job.status = 'in_transit';
      shipment.status = 'in_transit';
      shipment.departDay = day;
      shipment.arrivalDay = job.expectedArrivalDay ?? day + route.baseTransitDays;
      shipment.note = `Перевозчик: ${carrierName(carrier.organizationId)}`;
      job.note = 'Груз вышел на маршрут';
      recordOperation(logistics, day, 'departed', job, shipment.buyerOrganizationId, 0, 'Груз вышел на маршрут', `${route.distanceKm} км · прибытие день ${shipment.arrivalDay}.`);
      continue;
    }

    if (job.status === 'customs_hold') {
      if (job.expectedArrivalDay !== null && day >= job.expectedArrivalDay - Math.max(1, route.baseTransitDays - 1)) {
        job.status = 'in_transit';
        job.customsCleared = true;
        shipment.status = 'in_transit';
        job.note = 'Таможенный контроль завершён';
      }
      continue;
    }

    if (job.status !== 'in_transit') continue;
    const incidentRoll = hash(`${job.id}:incident:${day}`) % 1000;
    const reliabilityRisk = Math.max(7, 112 - carrier.reliability - Math.round(vehicle.condition * .35));
    if (route.customsRequired && !job.customsCleared && incidentRoll < 95 + route.borderCrossings * 22) {
      job.status = 'customs_hold';
      job.delayDays += 1;
      job.expectedArrivalDay = (job.expectedArrivalDay ?? day + 1) + 1;
      shipment.status = 'customs_hold';
      shipment.arrivalDay = job.expectedArrivalDay;
      shipment.note = 'Груз удержан для таможенной проверки';
      carrier.delayedJobs += 1;
      recordOperation(logistics, day, 'customs_hold', job, shipment.buyerOrganizationId, 0, 'Таможенная проверка', `Маршрут задержан на границе на 1 день.`);
      events.push({ tone: 'warning', title: 'Груз задержан на границе', detail: `${shipment.quantity} ед. проходят дополнительный контроль.` });
      continue;
    }
    if (incidentRoll >= 95 && incidentRoll < 95 + reliabilityRisk) {
      job.delayDays += 1;
      job.expectedArrivalDay = (job.expectedArrivalDay ?? day + 1) + 1;
      shipment.status = 'delayed';
      shipment.arrivalDay = job.expectedArrivalDay;
      shipment.note = vehicle.condition < 45 ? 'Техническая задержка транспорта' : 'Маршрут перегружен';
      carrier.delayedJobs += 1;
      vehicle.condition = clamp(vehicle.condition - 2.2, 10, 100);
      recordOperation(logistics, day, 'delay', job, shipment.buyerOrganizationId, 0, 'Перевозка задержана', shipment.note);
      continue;
    }
    if (!job.damageApplied && incidentRoll > 965 && shipment.quantity >= 12) {
      const damaged = Math.max(1, Math.floor(shipment.quantity * (.01 + (100 - vehicle.condition) / 2500)));
      shipment.quantity = Math.max(0, shipment.quantity - damaged);
      job.damageUnits += damaged;
      job.damageApplied = true;
      carrier.damagedUnits += damaged;
      const claim = roundMoney(damaged * shipment.unitPrice * .82);
      nextOrganizations = transferMoney(nextOrganizations, carrier.organizationId, shipment.buyerOrganizationId, claim, 'claim');
      recordOperation(logistics, day, 'damage', job, shipment.buyerOrganizationId, claim, 'Повреждение груза', `${damaged} ед. списано, страховое возмещение ${claim}.`);
      events.push({ tone: 'warning', title: 'Часть груза повреждена', detail: `${damaged} ед. потеряно в перевозке.` });
    }
    if (job.expectedArrivalDay !== null && day >= job.expectedArrivalDay) {
      shipment.status = 'in_transit';
      shipment.arrivalDay = day;
      shipment.note = 'Прибыл на разгрузку';
      job.note = 'Ожидает приёмки получателем';
    }
    vehicle.condition = clamp(vehicle.condition - Math.max(.15, route.distanceKm / 2600), 10, 100);
  }

  pruneCompletedJobs(logistics);
  return { logistics, trade: nextTrade, organizations: nextOrganizations, events };
}

export function assignPendingShipments(state: LogisticsState, trade: TradeState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): LogisticsAdvanceResult {
  const logistics = normalizeLogisticsState(state, trade, organizations, assets, day);
  let nextTrade: TradeState = { ...trade, shipments: trade.shipments.map((shipment) => ({ ...shipment })) };
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  const events: LogisticsAdvanceResult['events'] = [];

  for (const shipment of nextTrade.shipments.filter((item) => item.status === 'awaiting_transport')) {
    let job = logistics.jobs.find((item) => item.shipmentId === shipment.id);
    const route = ensureRoute(logistics, routeForShipment(shipment, nextOrganizations, assets));
    if (!job) {
      job = {
        id: `freight-job-${logistics.nextJobNumber++}`,
        shipmentId: shipment.id,
        carrierId: null,
        vehicleId: null,
        routeId: route.id,
        status: 'queued',
        createdDay: day,
        assignedDay: null,
        departDay: null,
        expectedArrivalDay: null,
        deliveredDay: null,
        quantity: shipment.quantity,
        capacityUsed: 0,
        transportCost: 0,
        insuranceCost: 0,
        delayDays: 0,
        damageUnits: 0,
        damageApplied: false,
        customsCleared: !route.customsRequired,
        lastProcessedDay: day,
        note: 'Ожидает перевозчика',
      };
      logistics.jobs.push(job);
    }
    if (job.status !== 'queued') continue;
    const assignment = chooseCarrierVehicle(logistics, route, shipment.quantity, day);
    if (!assignment) {
      shipment.note = 'Нет свободного транспорта нужной вместимости';
      job.note = shipment.note;
      continue;
    }
    const buyer = nextOrganizations.find((item) => item.id === shipment.buyerOrganizationId);
    const seller = nextOrganizations.find((item) => item.id === shipment.sellerOrganizationId);
    const cargoValue = roundMoney(shipment.quantity * shipment.unitPrice);
    const loadShare = Math.max(.08, shipment.quantity / assignment.vehicle.capacity);
    const transportCost = roundMoney(Math.max(32, route.distanceKm * assignment.carrier.baseRatePerKm * loadShare + shipment.quantity * .018 + route.tollCost * loadShare));
    const insuranceCost = roundMoney(cargoValue * (route.customsRequired ? .0075 : .004));
    const freightCredit = buyer ? Math.max(2_500, buyer.valuation * .035) : 0;
    if (!buyer || !seller || buyer.status === 'insolvent' || buyer.cash + freightCredit < transportCost + insuranceCost) {
      shipment.note = 'Покупатель не может профинансировать перевозку';
      job.note = shipment.note;
      if (day - job.createdDay >= 3) {
        shipment.status = 'failed';
        shipment.note = 'Перевозка отменена: кредитный лимит покупателя исчерпан';
        job.status = 'failed';
        job.note = shipment.note;
        nextTrade = restoreShipmentInventory(nextTrade, shipment, day);
        nextTrade.contracts = nextTrade.contracts.map((contract) => contract.id === shipment.contractId
          ? { ...contract, failures: contract.failures + 1, nextDeliveryDay: day + contract.intervalDays, lastResult: 'Поставка отменена из-за кредитного риска' }
          : contract);
        recordOperation(logistics, day, 'failed', job, buyer?.id ?? null, 0, 'Перевозка отменена', shipment.note);
      }
      continue;
    }
    nextOrganizations = transferMoney(nextOrganizations, buyer.id, assignment.carrier.organizationId, transportCost + insuranceCost, 'freight');
    const departDay = day + 1;
    const expectedArrivalDay = departDay + route.baseTransitDays;
    job.carrierId = assignment.carrier.id;
    job.vehicleId = assignment.vehicle.id;
    job.status = 'loading';
    job.assignedDay = day;
    job.departDay = departDay;
    job.expectedArrivalDay = expectedArrivalDay;
    job.capacityUsed = shipment.quantity / assignment.vehicle.capacity;
    job.transportCost = transportCost;
    job.insuranceCost = insuranceCost;
    job.note = 'Транспорт назначен, идёт погрузка';
    assignment.vehicle.activeJobId = job.id;
    assignment.vehicle.availableDay = expectedArrivalDay + 1;
    assignment.carrier.totalJobs += 1;
    shipment.departDay = departDay;
    shipment.arrivalDay = expectedArrivalDay;
    shipment.note = `Погрузка · ${carrierName(assignment.carrier.organizationId)}`;
    recordOperation(logistics, day, 'assigned', job, buyer.id, transportCost + insuranceCost, 'Назначен перевозчик', `${carrierName(assignment.carrier.organizationId)} · ${route.distanceKm} км · прибытие день ${expectedArrivalDay}.`);
  }
  pruneCompletedJobs(logistics);
  return { logistics, trade: nextTrade, organizations: nextOrganizations, events };
}

export function logisticsOrganizationSummary(state: LogisticsState, organizationId: string): {
  activeJobs: number;
  queuedJobs: number;
  availableVehicles: number;
  totalVehicles: number;
  deliveredJobs: number;
  delayedJobs: number;
  damagedUnits: number;
} {
  const carrier = state.carriers.find((item) => item.organizationId === organizationId);
  if (!carrier) return { activeJobs: 0, queuedJobs: 0, availableVehicles: 0, totalVehicles: 0, deliveredJobs: 0, delayedJobs: 0, damagedUnits: 0 };
  const fleet = state.fleet.filter((item) => item.carrierId === carrier.id);
  return {
    activeJobs: state.jobs.filter((job) => job.carrierId === carrier.id && ['loading', 'in_transit', 'customs_hold'].includes(job.status)).length,
    queuedJobs: state.jobs.filter((job) => job.status === 'queued').length,
    availableVehicles: fleet.filter((vehicle) => !vehicle.activeJobId).length,
    totalVehicles: fleet.length,
    deliveredJobs: carrier.deliveredJobs,
    delayedJobs: carrier.delayedJobs,
    damagedUnits: carrier.damagedUnits,
  };
}

export function distributorSummary(trade: TradeState, organizationId: string): { productUnits: number; inboundContracts: number; outboundContracts: number; activeShipments: number } {
  return {
    productUnits: trade.inventory.filter((lot) => lot.organizationId === organizationId && lot.commodityKind === 'product').reduce((sum, lot) => sum + lot.quantity, 0),
    inboundContracts: trade.contracts.filter((contract) => contract.buyerOrganizationId === organizationId && contract.commodityKind === 'product' && contract.status === 'active').length,
    outboundContracts: trade.contracts.filter((contract) => contract.sellerOrganizationId === organizationId && contract.commodityKind === 'product' && contract.status === 'active').length,
    activeShipments: trade.shipments.filter((shipment) => (shipment.buyerOrganizationId === organizationId || shipment.sellerOrganizationId === organizationId) && ['awaiting_transport', 'in_transit', 'delayed', 'customs_hold'].includes(shipment.status)).length,
  };
}

function pruneCompletedJobs(state: LogisticsState) {
  const active = state.jobs.filter((job) => !['delivered', 'failed'].includes(job.status));
  const completed = state.jobs.filter((job) => ['delivered', 'failed'].includes(job.status)).slice(-700);
  state.jobs = [...completed, ...active];
}

function routeForShipment(shipment: TradeShipmentState, organizations: OrganizationState[], assets: WorldAssetState[]): Omit<LogisticsRouteState, 'id'> {
  const seller = organizations.find((item) => item.id === shipment.sellerOrganizationId);
  const buyer = organizations.find((item) => item.id === shipment.buyerOrganizationId);
  const originAsset = shipment.sellerAssetId ? assets.find((item) => item.id === shipment.sellerAssetId) : assets.find((item) => item.operatorOrganizationId === seller?.id && item.status === 'operating');
  const destinationAsset = shipment.buyerAssetId ? assets.find((item) => item.id === shipment.buyerAssetId) : assets.find((item) => item.operatorOrganizationId === buyer?.id && item.status === 'operating');
  const originRegionId = originAsset?.regionId ?? seller?.regionId ?? 'hesse';
  const destinationRegionId = destinationAsset?.regionId ?? buyer?.regionId ?? originRegionId;
  const origin = logisticsNode(originRegionId, originAsset?.countryId ?? seller?.countryId);
  const destination = logisticsNode(destinationRegionId, destinationAsset?.countryId ?? buyer?.countryId);
  const rawDistance = Math.sqrt((origin.x - destination.x) ** 2 + (origin.y - destination.y) ** 2);
  const overseas = Math.abs(origin.x - destination.x) > 10;
  const distanceKm = Math.round(Math.max(35, rawDistance * (overseas ? 620 : 115)));
  const differentCountry = origin.countryId !== destination.countryId;
  const euCountries = new Set(['germany', 'france', 'spain', 'poland']);
  const customsRequired = differentCountry && (!euCountries.has(origin.countryId) || !euCountries.has(destination.countryId));
  const borderCrossings = differentCountry ? (customsRequired ? 1 : Math.max(1, Math.round(rawDistance / 4))) : 0;
  const baseTransitDays = Math.max(1, Math.ceil(distanceKm / (overseas ? 900 : 520)) + borderCrossings);
  return {
    originRegionId,
    destinationRegionId,
    originCountryId: origin.countryId,
    destinationCountryId: destination.countryId,
    distanceKm,
    borderCrossings,
    customsRequired,
    baseTransitDays,
    tollCost: roundMoney(distanceKm * .08 + borderCrossings * (customsRequired ? 90 : 35)),
  };
}

function ensureRoute(state: LogisticsState, route: Omit<LogisticsRouteState, 'id'>): LogisticsRouteState {
  const existing = state.routes.find((item) => item.originRegionId === route.originRegionId && item.destinationRegionId === route.destinationRegionId);
  if (existing) return existing;
  const created: LogisticsRouteState = { id: `route-${route.originRegionId}-${route.destinationRegionId}`, ...route };
  state.routes.push(created);
  return created;
}

function chooseCarrierVehicle(state: LogisticsState, route: LogisticsRouteState, quantity: number, day: number): { carrier: LogisticsCarrierState; vehicle: LogisticsVehicleState } | null {
  const candidates: Array<{ carrier: LogisticsCarrierState; vehicle: LogisticsVehicleState; score: number }> = [];
  for (const carrier of state.carriers) {
    if (route.customsRequired && !carrier.customsCapability) continue;
    for (const vehicle of state.fleet.filter((item) => item.carrierId === carrier.id && item.capacity >= quantity && item.availableDay <= day + 1 && !item.activeJobId)) {
      const depotRegion = logisticsCarriers.find((item) => item.id === carrier.id)?.regionId ?? vehicle.currentRegionId;
      const reposition = routeDistance(depotRegion, route.originRegionId);
      const score = reposition * 1.2 + (100 - carrier.reliability) * 9 + (100 - vehicle.condition) * 4 + carrier.baseRatePerKm * 30 + Math.max(0, vehicle.capacity - quantity) / 180;
      candidates.push({ carrier, vehicle, score });
    }
  }
  return candidates.sort((a, b) => a.score - b.score)[0] ?? null;
}

function releaseVehicle(state: LogisticsState, job: FreightJobState, destinationRegionId: string | null, day: number) {
  const vehicle = state.fleet.find((item) => item.id === job.vehicleId);
  if (!vehicle) return;
  vehicle.activeJobId = null;
  vehicle.availableDay = day;
  if (destinationRegionId) vehicle.currentRegionId = destinationRegionId;
}

function recordOperation(state: LogisticsState, day: number, kind: LogisticsOperationKind, job: FreightJobState, organizationId: string | null, amount: number, headline: string, detail: string) {
  const carrier = state.carriers.find((item) => item.id === job.carrierId);
  state.operations = [{
    id: `logistics-operation-${state.nextOperationNumber++}`,
    day,
    kind,
    jobId: job.id,
    shipmentId: job.shipmentId,
    carrierOrganizationId: carrier?.organizationId ?? null,
    organizationId,
    amount: roundMoney(amount),
    headline,
    detail,
  }, ...state.operations].slice(0, 320);
}

function transferMoney(organizations: OrganizationState[], payerId: string, receiverId: string, amount: number, mode: 'freight' | 'claim'): OrganizationState[] {
  if (amount <= 0) return organizations;
  return organizations.map((organization) => {
    if (organization.id === payerId) return { ...organization, cash: roundMoney(organization.cash - amount), dailyCosts: mode === 'freight' ? roundMoney(organization.dailyCosts + amount) : organization.dailyCosts };
    if (organization.id === receiverId) return { ...organization, cash: roundMoney(organization.cash + amount), dailyRevenue: mode === 'freight' ? roundMoney(organization.dailyRevenue + amount) : organization.dailyRevenue };
    return organization;
  });
}

function routeDistance(fromRegionId: string, toRegionId: string): number {
  const from = logisticsNode(fromRegionId);
  const to = logisticsNode(toRegionId);
  return Math.round(Math.sqrt((from.x - to.x) ** 2 + (from.y - to.y) ** 2) * 115);
}

function routeById(state: LogisticsState, routeId: string): LogisticsRouteState | undefined {
  return state.routes.find((item) => item.id === routeId);
}

function carrierName(organizationId: string): string {
  return logisticsCarriers.find((item) => item.organizationId === organizationId)?.organizationName ?? 'Перевозчик';
}

function logisticsOwner(index: number): string {
  return ['семья Крамер', 'группа Мартен', 'семья Харпер', 'кооператив Нормандии'][index] ?? 'частные акционеры';
}

function distributionOwner(index: number): string {
  return ['Rhein Trade Holding', 'Maison Distribution SA', 'West Country Partners'][index] ?? 'региональные инвесторы';
}

function hash(value: string): number {
  return Math.abs(hashSeed(value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
