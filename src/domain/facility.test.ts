import { describe, expect, it } from 'vitest';
import { advanceFacilityDay, createFacilityState, effectiveEquipmentCapacity, maxActiveBatches, upgradeRoom } from './facility';
import type { EquipmentDefinition } from './production';

const equipment: EquipmentDefinition = { id: 'tank', family: 'shared', name: 'Tank', category: 'test', cost: 1000, precision: 3, capacityLiters: 100, icon: 'tank', summary: '', benefit: '' };

function facility() {
  return createFacilityState({ type: 'urban_unit', capacity: 2, energyLimit: 2, storageQuality: 3 });
}

describe('facility', () => {
  it('expands fermentation capacity through room upgrades', () => {
    const initial = facility();
    const upgraded = upgradeRoom(initial, 'fermentation', 2);
    expect(maxActiveBatches(upgraded)).toBeGreaterThan(maxActiveBatches(initial));
    expect(upgraded.expansionSpend).toBeGreaterThan(0);
  });

  it('degrades sanitation and installed equipment during active production', () => {
    const initial = { ...facility(), equipmentCondition: { tank: 100 } };
    const result = advanceFacilityDay(initial, ['tank'], 2, 2);
    expect(result.facility.sanitation).toBeLessThan(initial.sanitation);
    expect(result.facility.equipmentCondition.tank).toBeLessThan(100);
  });

  it('equipment modernization increases useful capacity', () => {
    const initial = { ...facility(), equipmentCondition: { tank: 100 }, equipmentUpgrades: { tank: 0 } };
    const upgraded = { ...initial, equipmentUpgrades: { tank: 2 } };
    expect(effectiveEquipmentCapacity(upgraded, equipment)).toBeGreaterThan(effectiveEquipmentCapacity(initial, equipment));
  });
});
