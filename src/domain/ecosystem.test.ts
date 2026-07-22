import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import {
  acquireAsset,
  advanceEcosystemDay,
  createEcosystemState,
  investInOrganization,
  injectSubsidiaryCapital,
  leaseVacantAsset,
  setSubsidiaryPolicy,
  takeoverOrganization,
  transferGroupAsset,
} from './ecosystem';
import { createBrandState } from './brand';

const companies = [
  { id: 'producer-a', name: 'Producer A', country: 'Германия', category: 'Пивоварня', reputation: 60, momentum: 52, status: 'stable' as const },
  { id: 'producer-b', name: 'Producer B', country: 'Франция', category: 'Сидрерия', reputation: 54, momentum: 33, status: 'struggling' as const },
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

describe('ecosystem', () => {
  it('создаёт реальные организации и связывает рыночные точки с объектами', () => {
    const state = createWorld();
    expect(state.organizations.some((organization) => organization.id === state.playerOrganizationId)).toBe(true);
    expect(state.assets.filter((asset) => asset.marketOutletId)).toHaveLength(marketOutlets.length);
    expect(state.assets.some((asset) => asset.type === 'vacant_commercial')).toBe(true);
  });

  it('арендует свободный объект, а не создаёт абстрактную точку', () => {
    const state = createWorld();
    const result = leaseVacantAsset(state, 'vacant-bavaria-1', { type: 'bar', name: 'Black Yard' }, 100_000, 2);
    const asset = result.ecosystem.assets.find((item) => item.id === 'vacant-bavaria-1');
    expect(asset?.type).toBe('bar');
    expect(asset?.operatorOrganizationId).toBe(state.playerOrganizationId);
    expect(asset?.ownerOrganizationId).toBe('org-landlord-de');
    expect(result.ecosystem.organizations.some((organization) => organization.id === asset?.ownerOrganizationId)).toBe(true);
    expect(result.ecosystem.transactions[0]?.kind).toBe('lease');
  });

  it('передаёт существующий объект игроку при выкупе', () => {
    const state = createWorld();
    const target = state.assets.find((asset) => asset.status === 'for_sale');
    if (!target) throw new Error('for-sale asset missing');
    const result = acquireAsset(state, target.id, 1_000_000, 2);
    const acquired = result.ecosystem.assets.find((asset) => asset.id === target.id);
    expect(acquired?.ownerOrganizationId).toBe(state.playerOrganizationId);
    expect(acquired?.operatorOrganizationId).toBe(state.playerOrganizationId);
  });

  it('даёт долю компании без передачи операционного контроля', () => {
    const state = createWorld();
    const organization = state.organizations.find((item) => item.kind === 'producer');
    if (!organization) throw new Error('producer missing');
    const result = investInOrganization(state, organization.id, 10, 1_000_000, 2);
    expect(result.ecosystem.holdings[0]?.share).toBe(10);
    expect(result.ecosystem.assets.some((asset) => asset.operatorOrganizationId === state.playerOrganizationId && asset.ownerOrganizationId === organization.id)).toBe(false);
  });

  it('покупает контрольный пакет без разрушения действующей компании', () => {
    const state = createWorld();
    const organization = state.organizations.find((item) => item.kind === 'producer');
    if (!organization) throw new Error('producer missing');
    const beforeProducts = state.trade.products.filter((product) => product.producerOrganizationId === organization.id).length;
    const result = takeoverOrganization(state, organization.id, 51, 1_000_000, 2);
    expect(result.ecosystem.subsidiaries[0]?.organizationId).toBe(organization.id);
    expect(result.ecosystem.subsidiaries[0]?.controlShare).toBe(51);
    expect(result.ecosystem.organizations.find((item) => item.id === organization.id)?.assetIds).toEqual(organization.assetIds);
    expect(result.ecosystem.trade.products.filter((product) => product.producerOrganizationId === organization.id)).toHaveLength(beforeProducts);
  });

  it('докапитализирует дочернюю компанию и сокращает её долг', () => {
    const state = createWorld();
    const organization = state.organizations.find((item) => item.kind === 'producer');
    if (!organization) throw new Error('producer missing');
    const controlled = takeoverOrganization(state, organization.id, 51, 1_000_000, 2).ecosystem;
    const before = controlled.organizations.find((item) => item.id === organization.id)!;
    const result = injectSubsidiaryCapital(controlled, organization.id, 20_000, 1_000_000, 3);
    const after = result.ecosystem.organizations.find((item) => item.id === organization.id)!;
    expect(after.cash).toBeGreaterThan(before.cash);
    expect(after.debt).toBeLessThan(before.debt);
    expect(result.ecosystem.subsidiaries[0]?.capitalInjected).toBe(20_000);
  });

  it('меняет политику дочерней компании и переводит коммерческий актив внутри группы', () => {
    const state = createWorld();
    const organization = state.organizations.find((item) => item.kind === 'hospitality');
    if (!organization) throw new Error('hospitality organization missing');
    let ecosystem = takeoverOrganization(state, organization.id, 75, 1_000_000, 2).ecosystem;
    ecosystem = setSubsidiaryPolicy(ecosystem, organization.id, 'integrated', 'sweep');
    const assetId = organization.assetIds[0];
    if (!assetId) throw new Error('asset missing');
    ecosystem = transferGroupAsset(ecosystem, assetId, ecosystem.playerOrganizationId, 3);
    expect(ecosystem.subsidiaries[0]?.autonomy).toBe('integrated');
    expect(ecosystem.subsidiaries[0]?.treasuryPolicy).toBe('sweep');
    expect(ecosystem.assets.find((asset) => asset.id === assetId)?.ownerOrganizationId).toBe(ecosystem.playerOrganizationId);
  });

  it('двигает деньги NPC и выставляет проблемные активы на продажу', () => {
    const state = createWorld();
    const strained = state.organizations.find((organization) => organization.status === 'strained' && organization.assetIds.length > 0);
    if (!strained) throw new Error('strained organization missing');
    const forced = {
      ...state,
      organizations: state.organizations.map((organization) => organization.id === strained.id ? { ...organization, cash: -7_000, debt: organization.valuation } : organization),
    };
    const advanced = advanceEcosystemDay(forced, createBrandState(), [], 2, 0);
    expect(advanced.ecosystem.organizations.find((organization) => organization.id === strained.id)?.status).toBe('insolvent');
    expect(advanced.ecosystem.assets.some((asset) => asset.ownerOrganizationId === strained.id && asset.status === 'for_sale')).toBe(true);
  });
});
