import { describe, expect, it } from 'vitest';
import { advanceBrandDay, createBrand, createBrandState, createRelease, launchCampaign, type ReleaseDraft } from './brand';
import { createBatch, createRecipeDraft, createSavedRecipe } from './production';

describe('brand system', () => {
  it('creates brand, release and finishes campaign', () => {
    const first = createBrand(createBrandState(), { name: 'Noir Yard', tagline: 'Dark fermentation', positioning: 'premium', story: '' }, 3);
    const recipe = createSavedRecipe(createRecipeDraft('beer'), 1, []);
    const batch = { ...createBatch(recipe, 1, 1, 100, { rawMaterials: [], rawMaterialCost: 1000, qualityScore: 80, flavorImpact: {} }), status: 'packaged' as const, availableUnits: 120, packagedUnits: 120 };
    const draft: ReleaseDraft = { brandId: first.brand.id, batchId: batch.id, name: 'Black Field', positioning: 'premium', packaging: { form: 'longneck', glass: 'black', label: 'minimal', closure: 'crown', volumeMl: 500, carton: true }, wholesalePrice: 3, retailPrice: 5.5, targetChannel: 'specialty' };
    const released = createRelease(first.state, draft, batch, 4);
    expect(released.release.visualAppeal).toBeGreaterThan(50);
    expect(released.release.targetChannel).toBe('specialty');
    const campaign = launchCampaign(released.state, released.release.id, 'trade_press', 'berlin', 4);
    const advanced = advanceBrandDay(campaign.state, campaign.campaign.endDay);
    expect(advanced.campaigns[0]?.status).toBe('completed');
    expect(advanced.releases[0]?.awareness).toBeGreaterThan(released.release.awareness);
  });
});
