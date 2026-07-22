import { advanceDay, type GameState } from './game';
import { auditKernel } from './kernel';

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
      finalPlayerCash: state.finance.cash,
      violations,
    },
  };
}
