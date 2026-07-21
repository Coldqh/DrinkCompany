import type { EquipmentDefinition } from './production';

export type FacilityRoomId = 'production' | 'fermentation' | 'storage' | 'laboratory' | 'packaging';
export type FacilityUtilityId = 'water' | 'power' | 'climate';

export interface FacilityRoomState {
  id: FacilityRoomId;
  level: number;
}

export interface FacilityState {
  tier: number;
  basePropertyDailyCost: number;
  areaSquareMeters: number;
  rooms: Record<FacilityRoomId, number>;
  utilities: Record<FacilityUtilityId, number>;
  sanitation: number;
  equipmentCondition: Record<string, number>;
  equipmentUpgrades: Record<string, number>;
  maintenanceSpend: number;
  expansionSpend: number;
  lastServiceDay: number;
  incidents: FacilityIncident[];
}

export interface FacilityIncident {
  id: string;
  day: number;
  tone: 'warning' | 'maintenance' | 'upgrade';
  title: string;
  detail: string;
}

export interface FacilitySeed {
  type: 'urban_unit' | 'rural_workshop' | 'converted_warehouse';
  capacity: number;
  energyLimit: number;
  storageQuality: number;
  propertyDailyCost?: number;
}

export interface FacilityAdvanceResult {
  facility: FacilityState;
  incidents: FacilityIncident[];
}

export const ROOM_DEFINITIONS: Record<FacilityRoomId, { name: string; summary: string; baseCost: number; dailyCost: number; maxLevel: number }> = {
  production: { name: 'Производственный зал', summary: 'Определяет предельный объём партии и место под технологические модули.', baseCost: 7_500, dailyCost: 42, maxLevel: 3 },
  fermentation: { name: 'Ферментация', summary: 'Даёт дополнительные одновременные линии и более стабильный температурный режим.', baseCost: 9_200, dailyCost: 55, maxLevel: 3 },
  storage: { name: 'Склад', summary: 'Увеличивает безопасный запас сырья и готовой продукции.', baseCost: 5_800, dailyCost: 30, maxLevel: 3 },
  laboratory: { name: 'Лаборатория', summary: 'Повышает контроль процесса и снижает риск скрытых дефектов.', baseCost: 11_500, dailyCost: 64, maxLevel: 3 },
  packaging: { name: 'Зона розлива', summary: 'Снижает потери при розливе и готовит предприятие к большим заказам.', baseCost: 8_400, dailyCost: 46, maxLevel: 3 },
};

export const UTILITY_DEFINITIONS: Record<FacilityUtilityId, { name: string; summary: string; baseCost: number; dailyCost: number; maxLevel: number }> = {
  water: { name: 'Вода и мойка', summary: 'Поддерживает санитарный цикл и большие объёмы производства.', baseCost: 4_800, dailyCost: 28, maxLevel: 3 },
  power: { name: 'Электросеть', summary: 'Снимает ограничения на мощное оборудование и несколько активных линий.', baseCost: 6_200, dailyCost: 36, maxLevel: 3 },
  climate: { name: 'Климат-контроль', summary: 'Стабилизирует ферментацию и хранение сырья.', baseCost: 7_300, dailyCost: 39, maxLevel: 3 },
};

export function createFacilityState(seed: FacilitySeed, day = 1): FacilityState {
  const warehouseBonus = seed.type === 'converted_warehouse' ? 1 : 0;
  const ruralStorage = seed.type === 'rural_workshop' ? 1 : 0;
  return {
    tier: 1,
    basePropertyDailyCost: seed.propertyDailyCost ?? 0,
    areaSquareMeters: seed.type === 'urban_unit' ? 82 : seed.type === 'rural_workshop' ? 118 : 156,
    rooms: {
      production: 1,
      fermentation: Math.max(1, Math.min(2, seed.capacity - 1)),
      storage: Math.min(2, 1 + ruralStorage + warehouseBonus),
      laboratory: 0,
      packaging: 0,
    },
    utilities: {
      water: 1,
      power: Math.max(1, Math.min(2, Math.round(seed.energyLimit / 2))),
      climate: seed.storageQuality >= 4 ? 2 : 1,
    },
    sanitation: 88,
    equipmentCondition: {},
    equipmentUpgrades: {},
    maintenanceSpend: 0,
    expansionSpend: 0,
    lastServiceDay: day,
    incidents: [],
  };
}

export function registerEquipment(facility: FacilityState, equipmentId: string): FacilityState {
  if (facility.equipmentCondition[equipmentId] !== undefined) return facility;
  return {
    ...facility,
    equipmentCondition: { ...facility.equipmentCondition, [equipmentId]: 100 },
    equipmentUpgrades: { ...facility.equipmentUpgrades, [equipmentId]: 0 },
  };
}

export function roomUpgradeCost(facility: FacilityState, roomId: FacilityRoomId): number {
  const nextLevel = facility.rooms[roomId] + 1;
  return Math.round(ROOM_DEFINITIONS[roomId].baseCost * Math.pow(1.72, nextLevel - 1));
}

export function utilityUpgradeCost(facility: FacilityState, utilityId: FacilityUtilityId): number {
  const nextLevel = facility.utilities[utilityId] + 1;
  return Math.round(UTILITY_DEFINITIONS[utilityId].baseCost * Math.pow(1.68, nextLevel - 1));
}

export function equipmentServiceCost(facility: FacilityState, equipment: EquipmentDefinition): number {
  const condition = facility.equipmentCondition[equipment.id] ?? 100;
  return Math.max(140, Math.round(equipment.cost * (100 - condition) / 100 * 0.18));
}

export function equipmentUpgradeCost(facility: FacilityState, equipment: EquipmentDefinition): number {
  const level = facility.equipmentUpgrades[equipment.id] ?? 0;
  return Math.round(equipment.cost * (0.42 + level * 0.26));
}

export function upgradeRoom(facility: FacilityState, roomId: FacilityRoomId, day: number): FacilityState {
  const definition = ROOM_DEFINITIONS[roomId];
  const current = facility.rooms[roomId];
  if (current >= definition.maxLevel) throw new Error('Помещение уже развито до максимума');
  const cost = roomUpgradeCost(facility, roomId);
  const rooms = { ...facility.rooms, [roomId]: current + 1 };
  const tier = Math.max(facility.tier, Math.ceil(Object.values(rooms).reduce((sum, level) => sum + level, 0) / 5));
  return addIncident({
    ...facility,
    tier,
    areaSquareMeters: facility.areaSquareMeters + (roomId === 'storage' ? 30 : 22),
    rooms,
    expansionSpend: facility.expansionSpend + cost,
  }, { id: `facility-room-${day}-${roomId}-${current + 1}`, day, tone: 'upgrade', title: `${definition.name}: уровень ${current + 1}`, detail: 'Расширение завершено и уже влияет на производство.' });
}

export function upgradeUtility(facility: FacilityState, utilityId: FacilityUtilityId, day: number): FacilityState {
  const definition = UTILITY_DEFINITIONS[utilityId];
  const current = facility.utilities[utilityId];
  if (current >= definition.maxLevel) throw new Error('Инфраструктура уже развита до максимума');
  const cost = utilityUpgradeCost(facility, utilityId);
  return addIncident({
    ...facility,
    utilities: { ...facility.utilities, [utilityId]: current + 1 },
    expansionSpend: facility.expansionSpend + cost,
  }, { id: `facility-utility-${day}-${utilityId}-${current + 1}`, day, tone: 'upgrade', title: `${definition.name}: уровень ${current + 1}`, detail: 'Новая мощность введена в работу.' });
}

export function cleanFacility(facility: FacilityState, day: number): FacilityState {
  if (facility.sanitation >= 98) throw new Error('Цех уже чистый, полноценная санитарная смена не нужна');
  const sanitation = Math.min(100, facility.sanitation + 42 + facility.utilities.water * 4);
  return addIncident({ ...facility, sanitation, maintenanceSpend: facility.maintenanceSpend + cleaningCost(facility) }, {
    id: `facility-clean-${day}`,
    day,
    tone: 'maintenance',
    title: 'Санитарная смена завершена',
    detail: `Состояние цеха восстановлено до ${sanitation}/100.`,
  });
}

export function serviceEquipment(facility: FacilityState, equipment: EquipmentDefinition, day: number): FacilityState {
  const condition = facility.equipmentCondition[equipment.id];
  if (condition === undefined) throw new Error('Оборудование не установлено');
  if (condition >= 98) throw new Error('Оборудование не нуждается в обслуживании');
  const cost = equipmentServiceCost(facility, equipment);
  return addIncident({
    ...facility,
    equipmentCondition: { ...facility.equipmentCondition, [equipment.id]: 100 },
    maintenanceSpend: facility.maintenanceSpend + cost,
    lastServiceDay: day,
  }, { id: `facility-service-${day}-${equipment.id}`, day, tone: 'maintenance', title: `${equipment.name} обслужено`, detail: 'Износ сброшен, модуль снова работает с полной точностью.' });
}

export function modernizeEquipment(facility: FacilityState, equipment: EquipmentDefinition, day: number): FacilityState {
  const current = facility.equipmentUpgrades[equipment.id] ?? 0;
  if (facility.equipmentCondition[equipment.id] === undefined) throw new Error('Оборудование не установлено');
  if (current >= 2) throw new Error('Модуль уже модернизирован до максимума');
  const cost = equipmentUpgradeCost(facility, equipment);
  return addIncident({
    ...facility,
    equipmentUpgrades: { ...facility.equipmentUpgrades, [equipment.id]: current + 1 },
    equipmentCondition: { ...facility.equipmentCondition, [equipment.id]: Math.max(85, facility.equipmentCondition[equipment.id] ?? 100) },
    expansionSpend: facility.expansionSpend + cost,
  }, { id: `facility-modernize-${day}-${equipment.id}-${current + 1}`, day, tone: 'upgrade', title: `${equipment.name}: модернизация ${current + 1}`, detail: 'Модуль получил прирост точности и полезной мощности.' });
}

export function cleaningCost(facility: FacilityState): number {
  return Math.round(110 + (100 - facility.sanitation) * 4.2 - facility.utilities.water * 12);
}

export function facilityDailyCost(facility: FacilityState): number {
  const roomCost = (Object.keys(facility.rooms) as FacilityRoomId[]).reduce((sum, id) => sum + ROOM_DEFINITIONS[id].dailyCost * facility.rooms[id], 0);
  const utilityCost = (Object.keys(facility.utilities) as FacilityUtilityId[]).reduce((sum, id) => sum + UTILITY_DEFINITIONS[id].dailyCost * facility.utilities[id], 0);
  return Math.round(facility.basePropertyDailyCost + roomCost + utilityCost + facility.tier * 18);
}

export function maxActiveBatches(facility: FacilityState): number {
  return Math.max(1, facility.rooms.fermentation + Math.floor(facility.utilities.power / 2));
}

export function maxFacilityBatchVolume(facility: FacilityState): number {
  return 100 + facility.rooms.production * 90 + facility.utilities.water * 20;
}

export function inventoryCapacity(facility: FacilityState): number {
  return 350 + facility.rooms.storage * 550 + facility.utilities.climate * 120;
}

export function facilityQualityModifier(facility: FacilityState): number {
  const sanitationModifier = (facility.sanitation - 75) / 8;
  const laboratoryModifier = facility.rooms.laboratory * 1.7;
  const climateModifier = facility.utilities.climate * 1.1;
  return sanitationModifier + laboratoryModifier + climateModifier;
}

export function effectiveEquipmentPrecision(facility: FacilityState, equipment: EquipmentDefinition): number {
  const condition = facility.equipmentCondition[equipment.id] ?? 100;
  const upgrade = facility.equipmentUpgrades[equipment.id] ?? 0;
  return Math.max(0.5, equipment.precision + upgrade * 0.55 - Math.max(0, 70 - condition) / 24);
}

export function effectiveEquipmentCapacity(facility: FacilityState, equipment: EquipmentDefinition): number {
  const upgrade = facility.equipmentUpgrades[equipment.id] ?? 0;
  const condition = facility.equipmentCondition[equipment.id] ?? 100;
  const conditionMultiplier = condition < 30 ? 0.55 : condition < 60 ? 0.82 : 1;
  return Math.round(equipment.capacityLiters * (1 + upgrade * 0.18) * conditionMultiplier);
}

export function equipmentAvailable(facility: FacilityState, equipmentId: string): boolean {
  return (facility.equipmentCondition[equipmentId] ?? 100) > 15;
}

export function advanceFacilityDay(facility: FacilityState, equipmentIds: string[], activeBatchCount: number, day: number): FacilityAdvanceResult {
  const usage = activeBatchCount > 0 ? 1.25 + activeBatchCount * 0.55 : 0.32;
  const equipmentCondition = { ...facility.equipmentCondition };
  const incidents: FacilityIncident[] = [];

  for (const equipmentId of equipmentIds) {
    const previous = equipmentCondition[equipmentId] ?? 100;
    const next = Math.max(0, Math.round((previous - usage) * 10) / 10);
    equipmentCondition[equipmentId] = next;
    if (previous > 35 && next <= 35) incidents.push({ id: `facility-wear-${day}-${equipmentId}`, day, tone: 'warning', title: 'Оборудование требует внимания', detail: 'Один из модулей опустился ниже 35% состояния.' });
    if (previous > 15 && next <= 15) incidents.push({ id: `facility-break-${day}-${equipmentId}`, day, tone: 'warning', title: 'Производственный модуль остановлен', detail: 'Состояние оборудования критическое. Нужен ремонт.' });
  }

  const sanitationLoss = 0.8 + activeBatchCount * 1.75 - facility.utilities.water * 0.18;
  const sanitation = Math.max(0, Math.round((facility.sanitation - sanitationLoss) * 10) / 10);
  if (facility.sanitation > 45 && sanitation <= 45) incidents.push({ id: `facility-sanitation-${day}`, day, tone: 'warning', title: 'Санитарный риск', detail: 'Чистота цеха опустилась ниже безопасного уровня.' });

  const nextFacility = { ...facility, sanitation, equipmentCondition };
  return { facility: incidents.reduce(addIncident, nextFacility), incidents };
}

function addIncident(facility: FacilityState, incident: FacilityIncident): FacilityState {
  return { ...facility, incidents: [incident, ...facility.incidents].slice(0, 18) };
}
