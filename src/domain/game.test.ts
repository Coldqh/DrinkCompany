import { describe, expect, it } from 'vitest';
import { advanceDay, startCompany, type PropertyDefinition } from './game';

const property: PropertyDefinition = {
  id: 'property-test',
  regionId: 'region-test',
  name: 'Тестовый цех',
  type: 'urban_unit',
  acquisition: 'rent',
  upfrontCost: 20_000,
  dailyCost: 180,
  capacity: 2,
  energyLimit: 2,
  storageQuality: 2,
  marketAccess: 4,
  summary: 'Тест',
};

describe('startCompany', () => {
  it('создаёт рабочее состояние и списывает стоимость объекта', () => {
    const state = startCompany({
      companyName: 'North Glass',
      mode: 'standard',
      countryId: 'de',
      regionId: 'bavaria',
      property,
    }, new Date('2026-01-01T00:00:00.000Z'));

    expect(state.phase).toBe('operating');
    expect(state.finance.cash).toBe(100_000);
    expect(state.finance.dailyFixedCost).toBe(180);
    expect(state.company.name).toBe('North Glass');
  });

  it('отклоняет слишком короткое название', () => {
    expect(() => startCompany({
      companyName: 'A',
      mode: 'standard',
      countryId: 'de',
      regionId: 'bavaria',
      property,
    })).toThrow('минимум 2 символа');
  });
});

describe('advanceDay', () => {
  it('списывает ежедневные расходы', () => {
    const state = startCompany({
      companyName: 'North Glass',
      mode: 'standard',
      countryId: 'de',
      regionId: 'bavaria',
      property,
    });

    const next = advanceDay(state);
    expect(next.day).toBe(2);
    expect(next.finance.cash).toBe(state.finance.cash - 180);
  });
});
