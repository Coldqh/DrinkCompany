import { describe, expect, it } from 'vitest';
import { marketOutlets } from '../data/marketCatalog';
import {
  acquireAsset,
  advanceEcosystemDay,
  createEcosystemState,
  investInOrganization,
  leaseVacantAsset,
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
