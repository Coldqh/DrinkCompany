import { advanceDay, type GameState } from './game';
import { auditKernel } from './kernel';
import { auditQuality } from './quality';

export interface ObserverSimulationReport {
  daysSimulated: number;
  startDay: number;
  finalDay: number;
  organizationCount: number;
  assetCount: number;
  productCount: number;
  contractCount: number;
  moneyEntries: number;
  goodsEntries: number;
  traceNodes: number;
  demandRegionCount: number;
  consumerPurchases: number;
  regulatoryAuthorities: number;
  activeLicenses: number;
  exciseObligations: number;
  regulatoryPayments: number;
  openRegulatoryViolations: number;
  primarySiteCount: number;
  primaryRawLotCount: number;
  harvestCount: number;
  primaryProcessingOperations: number;
  carrierCount: number;
  distributorCount: number;
  fleetVehicleCount: number;
  freightJobCount: number;
  deliveredFreightJobs: number;
  queuedFreightJobs: number;
  logisticsOperations: number;
  qualityLaboratories: number;
  qualitySamples: number;
  qualityCertificates: number;
  qualityIncidents: number;
  recalledUnits: number;
  finalPlayerCash: number;
  violations: string[];
}

export interface ObserverSimulationResult {
  state: GameState;
  report: ObserverSimulationReport;
}

export interface ObserverSimulationOptions {
  startDate?: Date;
  freezePlayerCompany?: boolean;
}

export function runObserverSimulation(initial: GameState, days: number, options: ObserverSimulationOptions = {}): ObserverSimulationResult {
  if (!Number.isInteger(days) || days < 0) throw new Error('Количество дней observer-run должно быть неотрицательным целым числом');
  let state = initial;
  const startDate = options.startDate ?? new Date('2026-01-01T00:00:00.000Z');
  const freezePlayerCompany = options.freezePlayerCompany ?? true;
  for (let offset = 1; offset <= days; offset += 1) {
    const previousCash = state.finance.cash;
    const previousPlayerOrganization = state.ecosystem?.organizations.find((organization) => organization.id === state.ecosystem?.playerOrganizationId);
    state = advanceDay(state, new Date(startDate.getTime() + offset * 86_400_000));
    if (freezePlayerCompany && state.ecosystem) {
      state = {
        ...state,
        finance: { ...state.finance, cash: previousCash },
        ecosystem: {
          ...state.ecosystem,
          organizations: state.ecosystem.organizations.map((organization) => organization.id === state.ecosystem?.playerOrganizationId && previousPlayerOrganization
            ? { ...organization, cash: previousPlayerOrganization.cash, debt: previousPlayerOrganization.debt, dailyRevenue: 0, dailyCosts: 0 }
            : organization),
        },
      };
    }
  }
  const ecosystem = state.ecosystem;
  if (!ecosystem) {
    return {
      state,
      report: {
        daysSimulated: days,
        startDay: initial.day,
        finalDay: state.day,
        organizationCount: 0,
        assetCount: 0,
        productCount: 0,
        contractCount: 0,
        moneyEntries: 0,
        goodsEntries: 0,
        traceNodes: 0,
        demandRegionCount: 0,
        consumerPurchases: 0,
        regulatoryAuthorities: 0,
        activeLicenses: 0,
        exciseObligations: 0,
        regulatoryPayments: 0,
        openRegulatoryViolations: 0,
        primarySiteCount: 0,
        primaryRawLotCount: 0,
        harvestCount: 0,
        primaryProcessingOperations: 0,
        carrierCount: 0,
        distributorCount: 0,
        fleetVehicleCount: 0,
        freightJobCount: 0,
        deliveredFreightJobs: 0,
        queuedFreightJobs: 0,
        logisticsOperations: 0,
        qualityLaboratories: 0,
        qualitySamples: 0,
        qualityCertificates: 0,
        qualityIncidents: 0,
        recalledUnits: 0,
        finalPlayerCash: state.finance.cash,
        violations: state.phase === 'operating' ? ['Operating state has no ecosystem'] : [],
      },
    };
  }
  const audit = auditKernel(ecosystem.kernel, ecosystem.trade);
  const organizationIds = new Set(ecosystem.organizations.map((organization) => organization.id));
  const assetIds = new Set(ecosystem.assets.map((asset) => asset.id));
  const violations = [...audit.violations];
  if (organizationIds.size !== ecosystem.organizations.length) violations.push('Дублирующиеся организации в EcosystemState');
  if (assetIds.size !== ecosystem.assets.length) violations.push('Дублирующиеся объекты в EcosystemState');
  if (ecosystem.trade.inventory.some((lot) => lot.quantity < 0)) violations.push('Обнаружен отрицательный товарный остаток');
  if (ecosystem.demand.regions.some((region) => region.population <= 0 || region.adultPopulation <= 0)) violations.push('Некорректное население региона');
  if (ecosystem.demand.purchases.some((purchase) => purchase.units <= 0 || purchase.revenue < 0)) violations.push('Некорректная запись потребительской покупки');
  if (ecosystem.regulation.obligations.some((obligation) => obligation.amount < 0)) violations.push('Отрицательное акцизное обязательство');
  if (ecosystem.regulation.payments.some((payment) => payment.amount <= 0)) violations.push('Некорректная регуляторная оплата');
  if (ecosystem.primaryProduction.rawLots.some((lot) => lot.quantity < 0)) violations.push('Отрицательный остаток первичного сырья');
  const primarySiteIds = new Set(ecosystem.primaryProduction.sites.map((site) => site.id));
  if (primarySiteIds.size !== ecosystem.primaryProduction.sites.length) violations.push('Дублирующиеся первичные хозяйства');
  if (ecosystem.primaryProduction.rawLots.some((lot) => !primarySiteIds.has(lot.siteId))) violations.push('Первичный лот ссылается на неизвестное хозяйство');
  if (ecosystem.primaryProduction.harvests.some((harvest) => harvest.quantity <= 0 || harvest.quality < 0 || harvest.quality > 100)) violations.push('Некорректная запись урожая');
  const vehicleIds = new Set(ecosystem.logistics.fleet.map((vehicle) => vehicle.id));
  if (vehicleIds.size !== ecosystem.logistics.fleet.length) violations.push('Дублирующиеся транспортные средства');
  const shipmentIds = new Set(ecosystem.trade.shipments.map((shipment) => shipment.id));
  if (ecosystem.logistics.jobs.some((job) => !['delivered', 'failed'].includes(job.status) && !shipmentIds.has(job.shipmentId))) violations.push('Активная логистическая задача ссылается на неизвестную поставку');
  if (ecosystem.logistics.jobs.some((job) => job.transportCost < 0 || job.insuranceCost < 0 || job.damageUnits < 0)) violations.push('Некорректные показатели перевозки');
  if (ecosystem.logistics.fleet.some((vehicle) => vehicle.capacity <= 0 || vehicle.condition < 0 || vehicle.condition > 100)) violations.push('Некорректное состояние автопарка');
  if (ecosystem.logistics.jobs.some((job) => job.status === 'delivered' && job.deliveredDay === null)) violations.push('Доставленный рейс без даты завершения');
  violations.push(...auditQuality(ecosystem.quality, ecosystem.trade));
  const licenseIds = new Set(ecosystem.regulation.licenses.map((license) => license.id));
  if (licenseIds.size !== ecosystem.regulation.licenses.length) violations.push('Дублирующиеся регуляторные лицензии');
  return {
    state,
    report: {
      daysSimulated: days,
      startDay: initial.day,
      finalDay: state.day,
      organizationCount: ecosystem.organizations.length,
      assetCount: ecosystem.assets.length,
      productCount: ecosystem.trade.products.length,
      contractCount: ecosystem.trade.contracts.length,
      moneyEntries: ecosystem.kernel.moneyLedger.length,
      goodsEntries: ecosystem.kernel.goodsLedger.length,
      traceNodes: ecosystem.kernel.traceability.length,
      demandRegionCount: ecosystem.demand.regions.length,
      consumerPurchases: ecosystem.demand.purchases.length,
      regulatoryAuthorities: ecosystem.regulation.authorities.length,
      activeLicenses: ecosystem.regulation.licenses.filter((license) => license.status === 'active').length,
      exciseObligations: ecosystem.regulation.obligations.length,
      regulatoryPayments: ecosystem.regulation.payments.length,
      openRegulatoryViolations: ecosystem.regulation.violations.filter((violation) => !violation.resolved).length,
      primarySiteCount: ecosystem.primaryProduction.sites.length,
      primaryRawLotCount: ecosystem.primaryProduction.rawLots.length,
      harvestCount: ecosystem.primaryProduction.harvests.length,
      primaryProcessingOperations: ecosystem.primaryProduction.operations.filter((operation) => operation.kind === 'processing').length,
      carrierCount: ecosystem.organizations.filter((organization) => organization.kind === 'carrier').length,
      distributorCount: ecosystem.organizations.filter((organization) => organization.kind === 'distributor').length,
      fleetVehicleCount: ecosystem.logistics.fleet.length,
      freightJobCount: Math.max(ecosystem.logistics.jobs.length, ecosystem.logistics.nextJobNumber - 1),
      deliveredFreightJobs: ecosystem.logistics.carriers.reduce((sum, carrier) => sum + carrier.deliveredJobs, 0),
      queuedFreightJobs: ecosystem.logistics.jobs.filter((job) => job.status === 'queued').length,
      logisticsOperations: ecosystem.logistics.operations.length,
      qualityLaboratories: ecosystem.quality.laboratories.length,
      qualitySamples: ecosystem.quality.samples.length,
      qualityCertificates: ecosystem.quality.certificates.length,
      qualityIncidents: ecosystem.quality.incidents.length,
      recalledUnits: ecosystem.quality.recalls.reduce((sum, recall) => sum + recall.destroyedUnits, 0),
      finalPlayerCash: state.finance.cash,
      violations,
    },
  };
}
