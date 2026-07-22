import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import { createEcosystemState, normalizeEcosystemState } from './ecosystem';
import { advanceWorldIntelligence, createWorldIntelligenceState } from './worldIntelligence';

const companies = [
  { id: 'producer-a', name: 'Producer A', country: 'Германия', category: 'Пивоварня', reputation: 68, momentum: 62, status: 'stable' as const },
  { id: 'producer-b', name: 'Producer B', country: 'Франция', category: 'Сидрерия', reputation: 48, momentum: 28, status: 'struggling' as const },
];

function createWorld() {
  return createEcosystemState({
    playerCompanyName: 'Player Company',
    countryId: 'germany',
    regionId: 'bavaria',
    propertyName: 'Test Facility',
    propertyId: 'property-rent',
    propertyDailyCost: 180,
    propertyOwned: false,
    companies,
    outlets: marketOutlets,
    day: 1,
  });
}

describe('world intelligence', () => {
  it('создаёт руководителей, стратегии и стартовую хронику для организаций', () => {
    const state = createWorld();
    expect(state.intelligence.minds).toHaveLength(state.organizations.length);
    expect(state.intelligence.leaders.some((leader) => leader.role === 'director')).toBe(true);
    expect(state.intelligence.chronicle[0]?.headline).toContain('сеть');
  });

  it('переводит проблемную компанию в режим сокращения долгов и реально платит долг', () => {
    let state = createWorld();
    const target = state.organizations.find((organization) => organization.kind === 'producer' && organization.status === 'strained');
    if (!target) throw new Error('strained producer missing');
    state = {
      ...state,
      organizations: state.organizations.map((organization) => organization.id === target.id ? { ...organization, cash: 28_000, debt: 70_000, valuation: 100_000, status: 'strained' as const } : organization),
      intelligence: {
        ...state.intelligence,
        minds: state.intelligence.minds.map((mind) => mind.organizationId === target.id ? { ...mind, strategy: 'premium' as const, reviewDay: 2, decisionCooldownUntil: 2 } : mind),
      },
    };
    const before = state.organizations.find((organization) => organization.id === target.id)!;
    const result = advanceWorldIntelligence(state, 2).ecosystem;
    const after = result.organizations.find((organization) => organization.id === target.id)!;
    expect(result.intelligence.minds.find((mind) => mind.organizationId === target.id)?.strategy).toBe('deleveraging');
    expect(after.debt).toBeLessThan(before.debt);
    expect(result.intelligence.chronicle.some((entry) => entry.organizationIds.includes(target.id) && entry.kind === 'finance')).toBe(true);
  });

  it('стратегия захвата полок создаёт новый реальный контракт', () => {
    let state = createWorld();
    const producer = state.organizations.find((organization) => organization.kind === 'producer' && state.trade.products.some((product) => product.producerOrganizationId === organization.id));
    if (!producer) throw new Error('producer missing');
    const before = state.trade.contracts.length;
    state = {
      ...state,
      intelligence: {
        ...state.intelligence,
        minds: state.intelligence.minds.map((mind) => mind.organizationId === producer.id ? { ...mind, strategy: 'shelf_capture' as const, reviewDay: 99, decisionCooldownUntil: 2 } : mind),
      },
    };
    const result = advanceWorldIntelligence(state, 2).ecosystem;
    expect(result.trade.contracts.length).toBeGreaterThan(before);
    expect(result.intelligence.chronicle.some((entry) => entry.organizationIds.includes(producer.id) && entry.headline.includes('полк'))).toBe(true);
  });

  it('инновационная компания создаёт самостоятельный продукт', () => {
    let state = createWorld();
    const producer = state.organizations.find((organization) => organization.kind === 'producer' && organization.status === 'active');
    if (!producer) throw new Error('producer missing');
    const before = state.trade.products.filter((product) => product.producerOrganizationId === producer.id).length;
    state = {
      ...state,
      organizations: state.organizations.map((organization) => organization.id === producer.id ? { ...organization, cash: 90_000 } : organization),
      intelligence: {
        ...state.intelligence,
        minds: state.intelligence.minds.map((mind) => mind.organizationId === producer.id ? { ...mind, strategy: 'innovation' as const, reviewDay: 99, decisionCooldownUntil: 2 } : mind),
      },
    };
    const result = advanceWorldIntelligence(state, 2).ecosystem;
    expect(result.trade.products.filter((product) => product.producerOrganizationId === producer.id)).toHaveLength(before + 1);
    expect(result.intelligence.chronicle.some((entry) => entry.organizationIds.includes(producer.id) && entry.kind === 'product')).toBe(true);
  });

  it('запоминает срыв поставки и снижает доверие между контрагентами', () => {
    let state = createWorld();
    const contract = state.trade.contracts[0];
    if (!contract) throw new Error('contract missing');
    state = {
      ...state,
      trade: {
        ...state.trade,
        contracts: state.trade.contracts.map((item) => item.id === contract.id ? { ...item, failures: 2, lastResult: 'Поставка сорвана' } : item),
        operations: [{
          id: 'operation-test',
          day: 2,
          kind: 'shortage',
          organizationId: contract.buyerOrganizationId,
          counterpartyOrganizationId: contract.sellerOrganizationId,
          assetId: null,
          headline: 'Не хватило сырья',
          detail: 'Поставщик не выполнил объём.',
          amount: 0,
        }],
      },
    };
    const result = advanceWorldIntelligence(state, 2).ecosystem;
    expect(result.intelligence.memories.some((memory) => memory.organizationId === contract.buyerOrganizationId && memory.kind === 'supply_failure')).toBe(true);
    const relation = result.intelligence.relations.find((item) => [item.organizationAId, item.organizationBId].includes(contract.buyerOrganizationId) && [item.organizationAId, item.organizationBId].includes(contract.sellerOrganizationId));
    expect(relation?.trust).toBeLessThan(0);
  });

  it('добавляет intelligence при нормализации старой экосистемы', () => {
    const state = createWorld();
    const legacy = { ...state, intelligence: undefined } as unknown as typeof state;
    const normalized = normalizeEcosystemState(legacy, 5);
    expect(normalized.intelligence.leaders.length).toBeGreaterThan(0);
    expect(normalized.intelligence.minds).toHaveLength(normalized.organizations.length);
  });

  it('создаёт интеллект напрямую для пустой миграции', () => {
    const state = createWorld();
    const intelligence = createWorldIntelligenceState(state.organizations, 4);
    expect(intelligence.nextLeaderNumber).toBeGreaterThan(1);
    expect(intelligence.relations).toEqual([]);
  });
});
