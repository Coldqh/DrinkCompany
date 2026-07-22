import { describe, expect, it } from 'vitest';
import { equipmentCatalog } from '../data/productionCatalog';
import {
  acceptMarketOffer,
  cleanProductionFacility,
  expandFacilityRoom,
  advanceDay,
  fulfillRepeatOrder,
  hireTeamCandidate,
  acquireWorldAsset,
  leaseWorldAsset,
  investWorldOrganization,
  stockWorldVenue,
  registerBrand,
  registerProductRelease,
  cleanWorldVenue,
  upgradeWorldVenue,
  migrateGameState,
  orderSupplies,
  packageProductionBatch,
  purchaseEquipment,
  queueProductionRecipe,
  saveRecipe,
  submitMarketProposal,
  startCompany,
  startProductionBatch,
  tasteProductionBatch,
  type LegacyGameStateV1,
  type PropertyDefinition,
} from './game';
import { createRecipeDraft } from './production';
import { DEFAULT_PACKAGING } from './brand';
import { createRetailState, openRetailVenue } from './retail';
import { parseGameState } from '../infrastructure/gameStateRepository';

const property: PropertyDefinition = {
  id: 'property-test',
  regionId: 'region-test',
  name: 'Тестовый цех',
  type: 'urban_unit',
  acquisition: 'rent',
  upfrontCost: 20_000,
  dailyCost: 180,
  capacity: 3,
  energyLimit: 4,
  storageQuality: 3,
  marketAccess: 4,
  summary: 'Тест',
};

function createCompany() {
  return startCompany({
    companyName: 'North Glass',
    mode: 'standard',
    countryId: 'germany',
    regionId: 'bavaria',
    property,
  }, new Date('2026-01-01T00:00:00.000Z'));
}

function stockBeerMaterials(initial: ReturnType<typeof createCompany>, bottles = 600) {
  let state = initial;
  state = orderSupplies(state, 'rhein-pils', 50);
  state = orderSupplies(state, 'hallertau-mittelfruh', 3);
  state = orderSupplies(state, 'ferment-ale', 6);
  state = orderSupplies(state, 'nord-bottle', bottles);
  for (let day = 0; day < 4; day += 1) state = advanceDay(state);
  return state;
}

describe('startCompany', () => {
  it('создаёт рабочее состояние и списывает стоимость объекта', () => {
    const state = createCompany();
    expect(state.phase).toBe('operating');
    expect(state.schemaVersion).toBe(17);
    expect(state.finance.cash).toBe(100_000);
    expect(state.finance.dailyFixedCost).toBeGreaterThan(180);
    expect(state.facility?.rooms.production).toBe(1);
    expect(state.company.name).toBe('North Glass');
    expect(state.world?.companies.length).toBeGreaterThanOrEqual(10);
    expect(state.world?.outlets).toHaveLength(12);
    expect(state.supply.offers.length).toBeGreaterThan(10);
    expect(state.team.candidates.length).toBeGreaterThan(0);
    expect(state.ecosystem?.regulation.authorities).toHaveLength(3);
    expect(state.ecosystem?.regulation.licenses.length ?? 0).toBeGreaterThan(0);
    expect(state.ecosystem?.primaryProduction.sites.length ?? 0).toBeGreaterThan(8);
    expect(state.ecosystem?.primaryProduction.rawLots.length ?? 0).toBeGreaterThan(0);
  });

  it('отклоняет слишком короткое название', () => {
    expect(() => startCompany({ companyName: 'A', mode: 'standard', countryId: 'germany', regionId: 'bavaria', property })).toThrow('минимум 2 символа');
  });
});

describe('production cycle', () => {
  it('покупает линию, запускает партию и проводит её до розлива', () => {
    let state = createCompany();
    for (const equipmentId of ['micro-brewhouse', 'fermentation-bank', 'compact-bottler', 'lab-kit']) {
      const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('test equipment missing');
      state = purchaseEquipment(state, equipment);
    }

    state = stockBeerMaterials(state);

    const draft = { ...createRecipeDraft('beer'), name: 'Citrus Line', primaryDays: 5, conditioningDays: 3, volumeLiters: 100 };
    state = startProductionBatch(state, draft, property, equipmentCatalog);
    expect(state.production.batches[0]?.status).toBe('fermenting');
    expect(state.production.recipes[0]?.name).toBe('Citrus Line');

    for (let day = 0; day < 8; day += 1) state = advanceDay(state);
    const readyBatch = state.production.batches[0];
    expect(readyBatch?.status).toBe('ready');
    if (!readyBatch) throw new Error('batch missing');

    state = tasteProductionBatch(state, readyBatch.id);
    expect(state.production.batches[0]?.tasting?.confidence).toBe(88);

    state = packageProductionBatch(state, readyBatch.id);
    expect(state.production.batches[0]?.status).toBe('packaged');
    expect(state.production.batches[0]?.packagedUnits).toBeGreaterThan(150);
    expect(state.production.batches[0]?.availableUnits).toBe(state.production.batches[0]?.packagedUnits);
    expect(state.company.completedBatches).toBe(1);
    expect(state.finance.packagedInventoryValue).toBeGreaterThan(0);
  });

  it('не запускает пиво без обязательного оборудования', () => {
    const state = createCompany();
    expect(() => startProductionBatch(state, createRecipeDraft('beer'), property, equipmentCatalog)).toThrow('обязательное оборудование');
  });

  it('списывает ежедневные расходы и двигает партии по времени', () => {
    const state = createCompany();
    const next = advanceDay(state);
    expect(next.day).toBe(2);
    expect(next.finance.cash).toBe(state.finance.cash - state.finance.dailyFixedCost);
  });
});


describe('facility growth', () => {
  it('расширяет ферментационную зону и повышает ежедневные расходы', () => {
    const state = createCompany();
    const capacityBefore = state.facility?.rooms.fermentation ?? 0;
    const costBefore = state.finance.dailyFixedCost;
    const expanded = expandFacilityRoom(state, 'fermentation');
    expect(expanded.facility?.rooms.fermentation).toBe(capacityBefore + 1);
    expect(expanded.finance.dailyFixedCost).toBeGreaterThan(costBefore);
    expect(expanded.finance.facilitySpend).toBeGreaterThan(0);
  });

  it('ставит сохранённый рецепт в очередь', () => {
    let state = createCompany();
    state = saveRecipe(state, { ...createRecipeDraft('beer'), name: 'Queue Test' });
    const recipe = state.production.recipes[0];
    if (!recipe) throw new Error('recipe missing');
    state = queueProductionRecipe(state, recipe.id);
    expect(state.production.queue).toHaveLength(1);
    expect(state.production.queue[0]?.recipeId).toBe(recipe.id);
  });

  it('санитарная смена восстанавливает чистоту', () => {
    const state = createCompany();
    if (!state.facility) throw new Error('facility missing');
    const dirty = { ...state, facility: { ...state.facility, sanitation: 42 } };
    const cleaned = cleanProductionFacility(dirty);
    expect(cleaned.facility?.sanitation).toBeGreaterThan(42);
    expect(cleaned.finance.maintenanceSpend).toBeGreaterThan(0);
  });
});

describe('team cycle', () => {
  it('нанимает сотрудника и списывает зарплату на следующий день', () => {
    let state = createCompany();
    const candidate = state.team.candidates[0];
    if (!candidate) throw new Error('candidate missing');
    state = hireTeamCandidate(state, candidate.id);
    const before = state.finance.cash;
    const daily = state.finance.dailyFixedCost;
    state = advanceDay(state);
    expect(state.team.employees).toHaveLength(1);
    expect(state.finance.cash).toBeCloseTo(before - daily, 2);
    expect(state.finance.teamSpend).toBeGreaterThan(candidate.hiringFee);
  });
});

describe('save parsing', () => {
  it('принимает текущее сохранение schemaVersion 17', () => {
    const state = createCompany();
    const parsed = parseGameState(JSON.stringify(state));
    expect(parsed.schemaVersion).toBe(17);
    expect(parsed.facility).not.toBeNull();
  });
});

describe('save migration', () => {
  it('добавляет первичный сектор в сохранение schemaVersion 16', () => {
    const legacy = structuredClone(createCompany()) as unknown as Record<string, unknown>;
    legacy.schemaVersion = 16;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.primaryProduction;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.ecosystem?.primaryProduction.sites.length ?? 0).toBeGreaterThan(8);
    expect(migrated.ecosystem?.assets.some((asset) => asset.type === 'orchard')).toBe(true);
  });

  it('добавляет регулирование и параметры алкоголя в сохранение schemaVersion 15', () => {
    const legacy = JSON.parse(JSON.stringify(createCompany())) as Record<string, unknown>;
    legacy.schemaVersion = 15;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.regulation;
    const trade = ecosystem.trade as { products: Array<Record<string, unknown>> };
    for (const product of trade.products) {
      delete product.alcoholByVolume;
      delete product.packageVolumeLiters;
    }
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.ecosystem?.regulation.authorities).toHaveLength(3);
    expect(migrated.ecosystem?.regulation.licenses.length ?? 0).toBeGreaterThan(0);
    expect(migrated.ecosystem?.trade.products.every((product) => product.alcoholByVolume >= 0)).toBe(true);
  });

  it('добавляет стратегии, руководителей и память в сохранение schemaVersion 12', () => {
    const legacy = JSON.parse(JSON.stringify(createCompany())) as Record<string, unknown>;
    legacy.schemaVersion = 12;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.intelligence;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect((migrated.ecosystem?.intelligence.leaders.length ?? 0)).toBeGreaterThan(0);
    expect(migrated.ecosystem?.intelligence.minds).toHaveLength(migrated.ecosystem?.organizations.length ?? 0);
  });

  it('добавляет корпоративную группу в сохранение schemaVersion 11', () => {
    const legacy = JSON.parse(JSON.stringify(createCompany())) as Record<string, unknown>;
    legacy.schemaVersion = 11;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.subsidiaries;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.ecosystem?.subsidiaries).toEqual([]);
    expect(migrated.finance.corporateSpend).toBe(0);
  });

  it('переводит старое сохранение schemaVersion 1 на новую модель', () => {
    const legacy: LegacyGameStateV1 = {
      schemaVersion: 1,
      phase: 'operating',
      mode: 'standard',
      day: 4,
      company: { name: 'Old Cellar', reputation: 2 },
      world: { countryId: 'germany', regionId: 'hesse', propertyId: 'hesse-workshop' },
      finance: { cash: 50_000, dailyFixedCost: 170 },
      discoveredProductFamilies: ['beer', 'cider'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
    };

    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.production.batches).toEqual([]);
    expect(migrated.company.completedBatches).toBe(0);
    expect(migrated.supply.inventory).toEqual([]);
    expect(migrated.world?.companies.length).toBeGreaterThan(0);
  });

  it('добавляет живой рынок в сохранение schemaVersion 3', () => {
    const legacy = JSON.parse(JSON.stringify(createCompany())) as Record<string, unknown>;
    legacy.schemaVersion = 3;
    const world = legacy.world as Record<string, unknown>;
    delete world.repeatOrders;
    delete world.reviews;
    delete world.demandSignals;
    delete world.releases;
    delete world.nextRepeatOrderNumber;

    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.world?.repeatOrders).toEqual([]);
    expect(migrated.world?.demandSignals.length).toBeGreaterThan(0);
    expect(migrated.supply.offers.length).toBeGreaterThan(0);
  });

  it('добавляет товарную экосистему в сохранение schemaVersion 10', () => {
    const legacy = JSON.parse(JSON.stringify(createCompany())) as Record<string, unknown>;
    legacy.schemaVersion = 10;
    const ecosystem = legacy.ecosystem as Record<string, unknown>;
    delete ecosystem.trade;

    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.ecosystem?.trade.products.length).toBeGreaterThan(0);
    expect(migrated.ecosystem?.trade.contracts.length).toBeGreaterThan(0);
  });

  it('добавляет рынок в сохранение schemaVersion 2', () => {
    const current = createCompany();
    const legacy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
    legacy.schemaVersion = 2;
    const world = legacy.world as Record<string, unknown>;
    delete world.outlets;
    delete world.proposals;
    delete world.contracts;
    delete world.sales;
    const finance = legacy.finance as Record<string, unknown>;
    delete finance.salesRevenue;
    delete finance.unitsSold;

    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.world?.outlets).toHaveLength(12);
    expect(migrated.finance.salesRevenue).toBe(0);
  });
});


describe('market cycle', () => {
  it('отправляет образцы, получает оффер и проводит поставку', () => {
    let state = createCompany();
    for (const equipmentId of ['micro-brewhouse', 'fermentation-bank', 'compact-bottler', 'lab-kit']) {
      const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('test equipment missing');
      state = purchaseEquipment(state, equipment);
    }

    state = stockBeerMaterials(state);

    const draft = { ...createRecipeDraft('beer'), name: 'Market Line', primaryDays: 2, conditioningDays: 1, volumeLiters: 100 };
    state = startProductionBatch(state, draft, property, equipmentCatalog);
    state = advanceDay(advanceDay(advanceDay(state)));
    const ready = state.production.batches[0];
    if (!ready) throw new Error('batch missing');
    state = tasteProductionBatch(state, ready.id);
    state = packageProductionBatch(state, ready.id);
    const packaged = state.production.batches[0];
    if (!packaged) throw new Error('packaged batch missing');

    state = submitMarketProposal(state, {
      outletId: 'taproom-17',
      batchId: packaged.id,
      contactMode: 'meeting',
      askingPrice: 2.7,
      requestedUnits: 48,
    });
    expect(state.world?.proposals[0]?.status).toBe('reviewing');
    expect(state.production.batches[0]?.availableUnits).toBe(packaged.availableUnits - 1);

    state = advanceDay(state);
    const offer = state.world?.proposals[0];
    expect(offer?.status).toBe('offer');
    if (!offer) throw new Error('offer missing');
    const cashBeforeSale = state.finance.cash;
    state = acceptMarketOffer(state, offer.id);

    expect(state.world?.contracts).toHaveLength(1);
    expect(state.finance.salesRevenue).toBeGreaterThan(0);
    expect(state.finance.cash).toBeGreaterThan(cashBeforeSale);
    expect(state.finance.unitsSold).toBeGreaterThan(0);
    expect(state.tutorial.completedSteps).toContain('first-sale');
  });

  it('отказывает точке с несовместимой категорией', () => {
    let state = createCompany();
    for (const equipmentId of ['micro-brewhouse', 'fermentation-bank', 'compact-bottler']) {
      const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('test equipment missing');
      state = purchaseEquipment(state, equipment);
    }
    state = stockBeerMaterials(state);
    const draft = { ...createRecipeDraft('beer'), primaryDays: 1, conditioningDays: 1, volumeLiters: 80 };
    state = startProductionBatch(state, draft, property, equipmentCatalog);
    state = advanceDay(advanceDay(state));
    const batch = state.production.batches[0];
    if (!batch) throw new Error('batch missing');
    state = tasteProductionBatch(state, batch.id);
    state = packageProductionBatch(state, batch.id);
    state = submitMarketProposal(state, { outletId: 'orchard-room', batchId: batch.id, contactMode: 'sample', askingPrice: 2.5, requestedUnits: 24 });
    state = advanceDay(advanceDay(advanceDay(state)));
    expect(state.world?.proposals[0]?.status).toBe('rejected');
    expect(state.world?.proposals[0]?.decisionReasons.join(' ')).toContain('Категория');
  });
});


describe('living market', () => {
  it('создаёт отзыв и повторный заказ, затем принимает стабильную новую партию', () => {
    let state = createCompany();
    for (const equipmentId of ['micro-brewhouse', 'fermentation-bank', 'compact-bottler', 'lab-kit']) {
      const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('test equipment missing');
      state = purchaseEquipment(state, equipment);
    }

    state = stockBeerMaterials(state);

    const draft = { ...createRecipeDraft('beer'), name: 'House Pale', primaryDays: 2, conditioningDays: 1, volumeLiters: 100 };
    state = startProductionBatch(state, draft, property, equipmentCatalog);
    state = advanceDay(advanceDay(advanceDay(state)));
    const first = state.production.batches[0];
    if (!first) throw new Error('first batch missing');
    state = tasteProductionBatch(state, first.id);
    state = packageProductionBatch(state, first.id);
    state = submitMarketProposal(state, { outletId: 'taproom-17', batchId: first.id, contactMode: 'meeting', askingPrice: 2.7, requestedUnits: 48 });
    state = advanceDay(state);
    const offer = state.world?.proposals[0];
    if (!offer || offer.status !== 'offer') throw new Error('offer missing');
    state = acceptMarketOffer(state, offer.id);

    state = startProductionBatch(state, { ...draft, name: 'House Pale v2' }, property, equipmentCatalog);
    state = advanceDay(advanceDay(state));
    expect(state.world?.reviews).toHaveLength(1);
    state = advanceDay(state);
    const secondReady = state.production.batches.find((batch) => batch.recipe.name === 'House Pale v2');
    if (!secondReady) throw new Error('second batch missing');
    state = tasteProductionBatch(state, secondReady.id);
    state = packageProductionBatch(state, secondReady.id);
    state = advanceDay(state);

    const order = state.world?.repeatOrders.find((item) => item.status === 'pending');
    expect(order).toBeTruthy();
    if (!order) throw new Error('repeat order missing');
    const cashBefore = state.finance.cash;
    state = fulfillRepeatOrder(state, order.id, secondReady.id);

    expect(state.world?.repeatOrders.find((item) => item.id === order.id)?.status).toBe('fulfilled');
    expect(state.world?.repeatOrders.find((item) => item.id === order.id)?.consistencyScore).toBeGreaterThanOrEqual(order.minConsistency);
    expect(state.finance.cash).toBeGreaterThan(cashBefore);
    expect(state.world?.sales[0]?.kind).toBe('repeat');
  });

  it('просрочивает повторный заказ и ухудшает отношения', () => {
    let state = createCompany();
    if (!state.world) throw new Error('world missing');
    const outlet = state.world.outlets.find((item) => item.id === 'taproom-17');
    if (!outlet) throw new Error('outlet missing');
    state = {
      ...state,
      day: 10,
      world: {
        ...state.world,
        repeatOrders: [{
          id: 'repeat-expire', outletId: outlet.id, referenceContractId: 'contract-x', referenceBatchId: 'batch-x', createdDay: 5,
          dueDay: 10, family: 'beer', styleId: 'modern-pale-ale', units: 24, unitPrice: 2.5, minConsistency: 70,
          status: 'pending', fulfilledBatchId: null, consistencyScore: null, decisionNote: 'test',
        }],
      },
    };
    const relationshipBefore = outlet.relationship;
    state = advanceDay(state);
    expect(state.world?.repeatOrders[0]?.status).toBe('expired');
    expect(state.world?.outlets.find((item) => item.id === outlet.id)?.relationship).toBe(Math.max(0, relationshipBefore - 12));
  });

  it('двигает спрос и выпускает релизы компаний мира', () => {
    let state = createCompany();
    const initialDemand = state.world?.demandSignals.map((signal) => signal.index) ?? [];
    for (let index = 0; index < 5; index += 1) state = advanceDay(state);
    expect(state.world?.releases.length).toBeGreaterThan(0);
    expect(state.world?.demandSignals.map((signal) => signal.index)).not.toEqual(initialDemand);
  });
});


describe('world ecosystem', () => {
  it('арендует реальный объект, передаёт релиз на полку и продаёт его по дням', () => {
    let state = createCompany();
    for (const equipmentId of ['micro-brewhouse', 'fermentation-bank', 'compact-bottler', 'lab-kit']) {
      const equipment = equipmentCatalog.find((item) => item.id === equipmentId);
      if (!equipment) throw new Error('test equipment missing');
      state = purchaseEquipment(state, equipment);
    }
    state = stockBeerMaterials(state);
    const draft = { ...createRecipeDraft('beer'), name: 'Ecosystem Pale', primaryDays: 1, conditioningDays: 1, volumeLiters: 80 };
    state = startProductionBatch(state, draft, property, equipmentCatalog);
    state = advanceDay(advanceDay(state));
    const batch = state.production.batches[0];
    if (!batch) throw new Error('batch missing');
    state = tasteProductionBatch(state, batch.id);
    state = packageProductionBatch(state, batch.id);
    state = registerBrand(state, { name: 'Night District', tagline: 'Local beer', positioning: 'bar', story: 'Test brand' });
    const brand = state.brand.brands[0];
    if (!brand) throw new Error('brand missing');
    state = registerProductRelease(state, { brandId: brand.id, batchId: batch.id, name: 'District Pale', positioning: 'bar', packaging: DEFAULT_PACKAGING, wholesalePrice: 2.6, retailPrice: 5.2 });
    const release = state.brand.releases[0];
    if (!release) throw new Error('release missing');
    state = { ...state, finance: { ...state.finance, cash: state.finance.cash + 100_000 } };
    state = leaseWorldAsset(state, 'vacant-bavaria-1', 'bar', 'Black Yard');
    const asset = state.ecosystem?.assets.find((item) => item.id === 'vacant-bavaria-1');
    if (!asset?.venue) throw new Error('venue missing');
    const availableBefore = state.production.batches.find((item) => item.id === batch.id)?.availableUnits ?? 0;
    state = stockWorldVenue(state, asset.id, release.id, 24, 5.4);
    expect(state.production.batches.find((item) => item.id === batch.id)?.availableUnits).toBe(availableBefore - 24);
    const cashBefore = state.finance.cash;
    state = advanceDay(state);
    expect(state.ecosystem?.retailReports[0]?.unitsSold).toBeGreaterThan(0);
    expect(state.finance.retailRevenue).toBeGreaterThan(0);
    expect(state.finance.cash).toBeGreaterThan(cashBefore - state.finance.dailyFixedCost);
  });

  it('выкупает существующий бар, инвестирует в компанию и меняет владельца объекта', () => {
    let state = createCompany();
    state = { ...state, finance: { ...state.finance, cash: 500_000 } };
    const target = state.ecosystem?.assets.find((asset) => asset.status === 'for_sale' && asset.marketOutletId);
    if (!target) throw new Error('sale asset missing');
    const sellerId = target.ownerOrganizationId;
    state = acquireWorldAsset(state, target.id);
    const acquired = state.ecosystem?.assets.find((asset) => asset.id === target.id);
    expect(acquired?.ownerOrganizationId).toBe(state.ecosystem?.playerOrganizationId);
    expect(acquired?.operatorOrganizationId).toBe(state.ecosystem?.playerOrganizationId);
    expect(state.world?.outlets.find((outlet) => outlet.id === target.marketOutletId)?.controlledByPlayer).toBe(true);
    const seller = state.ecosystem?.organizations.find((organization) => organization.id === sellerId);
    expect(seller?.assetIds).not.toContain(target.id);

    const organization = state.ecosystem?.organizations.find((item) => item.kind === 'producer');
    if (!organization) throw new Error('organization missing');
    const cashBefore = state.finance.cash;
    state = investWorldOrganization(state, organization.id, 10);
    expect(state.ecosystem?.holdings.some((holding) => holding.organizationId === organization.id && holding.share === 10)).toBe(true);
    expect(state.finance.cash).toBeLessThan(cashBefore);
  });

  it('учитывает санитарную смену и расширение контролируемой точки', () => {
    let state = createCompany();
    state = { ...state, finance: { ...state.finance, cash: 300_000 } };
    state = leaseWorldAsset(state, 'vacant-bavaria-1', 'shop', 'District Bottle');
    const asset = state.ecosystem?.assets.find((item) => item.id === 'vacant-bavaria-1');
    if (!asset?.venue || !state.ecosystem) throw new Error('venue missing');
    state = {
      ...state,
      ecosystem: {
        ...state.ecosystem,
        assets: state.ecosystem.assets.map((item) => item.id === asset.id && item.venue ? { ...item, venue: { ...item.venue, cleanliness: 45 } } : item),
      },
    };
    const cashBeforeClean = state.finance.cash;
    state = cleanWorldVenue(state, asset.id);
    expect(state.ecosystem?.assets.find((item) => item.id === asset.id)?.venue?.cleanliness).toBeGreaterThan(45);
    expect(state.finance.cash).toBeLessThan(cashBeforeClean);
    const dailyBefore = state.finance.dailyFixedCost;
    const levelBefore = state.ecosystem?.assets.find((item) => item.id === asset.id)?.venue?.level ?? 0;
    state = upgradeWorldVenue(state, asset.id);
    expect(state.ecosystem?.assets.find((item) => item.id === asset.id)?.venue?.level).toBe(levelBefore + 1);
    expect(state.finance.dailyFixedCost).toBeGreaterThanOrEqual(dailyBefore);
  });

  it('переносит старую розницу в единую экосистему при миграции schemaVersion 9', () => {
    const current = createCompany();
    const opened = openRetailVenue(createRetailState(), { type: 'bar', name: 'Legacy Bar', regionId: 'bavaria' }, current.day).retail;
    const legacy = JSON.parse(JSON.stringify(current)) as Record<string, unknown>;
    legacy.schemaVersion = 9;
    legacy.retail = opened;
    delete legacy.ecosystem;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(17);
    expect(migrated.ecosystem?.assets.some((asset) => asset.name === 'Legacy Bar' && asset.operatorOrganizationId === migrated.ecosystem?.playerOrganizationId)).toBe(true);
  });
});
