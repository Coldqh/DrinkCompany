import { beverageCategories, type BeverageCategoryId } from '../data/beverageCatalog';
import { getCountryRuleset, type CountryRuleset, type ExciseRule, type PermitType } from '../data/regulationCatalog';
import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeProductState, TradeState } from './trade';

export type LicenseStatus = 'active' | 'pending' | 'suspended' | 'revoked' | 'expired';
export type TaxObligationStatus = 'assessed' | 'paid' | 'overdue' | 'cancelled';
export type MovementKind = 'domestic' | 'eu_excise' | 'customs_import';
export type MovementStatus = 'declared' | 'cleared' | 'held' | 'failed';
export type InspectionResult = 'clear' | 'warning' | 'violation' | 'closure';
export type ViolationSeverity = 'minor' | 'major' | 'critical';

export interface RegulatoryAuthorityState {
  id: string;
  countryId: string;
  name: string;
  currency: 'EUR' | 'GBP';
  taxRevenue: number;
  activeCases: number;
}

export interface OrganizationLicenseState {
  id: string;
  organizationId: string;
  assetId: string | null;
  countryId: string;
  permitType: PermitType;
  status: LicenseStatus;
  issuedDay: number;
  expiresDay: number | null;
  suspendedUntilDay: number | null;
  scopeCategoryIds: BeverageCategoryId[];
}

export interface ExciseObligationState {
  id: string;
  organizationId: string;
  authorityId: string;
  sourceShipmentId: string;
  productId: string;
  categoryId: BeverageCategoryId;
  units: number;
  volumeLiters: number;
  alcoholByVolume: number;
  amount: number;
  currency: 'EUR' | 'GBP';
  assessedDay: number;
  dueDay: number;
  paidDay: number | null;
  status: TaxObligationStatus;
}

export interface ExciseMovementState {
  id: string;
  shipmentId: string;
  kind: MovementKind;
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  originCountryId: string;
  destinationCountryId: string;
  documentReference: string;
  declaredDay: number;
  clearedDay: number | null;
  status: MovementStatus;
  note: string;
}

export interface RegulatoryInspectionState {
  id: string;
  authorityId: string;
  organizationId: string;
  assetId: string | null;
  day: number;
  result: InspectionResult;
  score: number;
  findings: string[];
}

export interface RegulatoryViolationState {
  id: string;
  authorityId: string;
  organizationId: string;
  assetId: string | null;
  day: number;
  severity: ViolationSeverity;
  code: string;
  description: string;
  fine: number;
  resolved: boolean;
}

export interface RegulatoryPaymentState {
  id: string;
  day: number;
  organizationId: string;
  authorityId: string;
  obligationId: string;
  amount: number;
  currency: 'EUR' | 'GBP';
}

export interface OrganizationComplianceState {
  organizationId: string;
  score: number;
  lastInspectionDay: number | null;
  overdueTax: number;
  activeViolations: number;
}

export interface RegulationState {
  authorities: RegulatoryAuthorityState[];
  licenses: OrganizationLicenseState[];
  obligations: ExciseObligationState[];
  movements: ExciseMovementState[];
  inspections: RegulatoryInspectionState[];
  violations: RegulatoryViolationState[];
  payments: RegulatoryPaymentState[];
  compliance: OrganizationComplianceState[];
  nextLicenseNumber: number;
  nextObligationNumber: number;
  nextMovementNumber: number;
  nextInspectionNumber: number;
  nextViolationNumber: number;
  nextPaymentNumber: number;
}

export interface RegulationAdvanceResult {
  regulation: RegulationState;
  organizations: OrganizationState[];
  events: { title: string; detail: string; tone: 'market' | 'warning' | 'release' }[];
  taxCollected: number;
  playerTaxPaid: number;
}

export function createRegulationState(organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number): RegulationState {
  const authorities = createAuthorities();
  const licenses = seedLicenses(organizations, assets, trade, day);
  return normalizeRegulationState({
    authorities,
    licenses,
    obligations: [],
    movements: [],
    inspections: [],
    violations: [],
    payments: [],
    compliance: [],
    nextLicenseNumber: licenses.length + 1,
    nextObligationNumber: 1,
    nextMovementNumber: 1,
    nextInspectionNumber: 1,
    nextViolationNumber: 1,
    nextPaymentNumber: 1,
  }, organizations, assets, trade, day);
}

export function normalizeRegulationState(value: RegulationState | null | undefined, organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number): RegulationState {
  const base = value ?? createEmptyRegulationState();
  const authorities = mergeAuthorities(base.authorities ?? []);
  const licenses = ensureRequiredLicenses(base.licenses ?? [], organizations, assets, trade, day, base.nextLicenseNumber ?? 1);
  const normalized: RegulationState = {
    authorities,
    licenses: licenses.items.map((license) => {
      if (license.status === 'suspended' && license.suspendedUntilDay !== null && license.suspendedUntilDay <= day) return { ...license, status: 'active' as const, suspendedUntilDay: null };
      if (license.expiresDay !== null && license.expiresDay < day && license.status === 'active') return { ...license, status: 'expired' as const };
      return license;
    }),
    obligations: base.obligations ?? [],
    movements: base.movements ?? [],
    inspections: base.inspections ?? [],
    violations: base.violations ?? [],
    payments: base.payments ?? [],
    compliance: base.compliance ?? [],
    nextLicenseNumber: Math.max(base.nextLicenseNumber ?? 1, licenses.nextNumber),
    nextObligationNumber: base.nextObligationNumber ?? 1,
    nextMovementNumber: base.nextMovementNumber ?? 1,
    nextInspectionNumber: base.nextInspectionNumber ?? 1,
    nextViolationNumber: base.nextViolationNumber ?? 1,
    nextPaymentNumber: base.nextPaymentNumber ?? 1,
  };
  return { ...normalized, compliance: buildCompliance(normalized, organizations) };
}

export function advanceRegulationDay(state: RegulationState, organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number, player?: { organizationId: string; cash: number }): RegulationAdvanceResult {
  let regulation = normalizeRegulationState(state, organizations, assets, trade, day);
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  const events: RegulationAdvanceResult['events'] = [];

  regulation = assessDeliveredShipments(regulation, nextOrganizations, trade, day);
  regulation = registerMovementDocuments(regulation, nextOrganizations, trade, day);

  let taxCollected = 0;
  let playerTaxPaid = 0;
  let playerCashAvailable = player?.cash ?? 0;
  const authorities = regulation.authorities.map((authority) => ({ ...authority }));
  const obligations = regulation.obligations.map((obligation) => {
    if (obligation.status === 'paid' || obligation.status === 'cancelled' || obligation.dueDay > day) return obligation;
    const organization = nextOrganizations.find((item) => item.id === obligation.organizationId);
    const authority = authorities.find((item) => item.id === obligation.authorityId);
    if (!organization || !authority) return obligation;
    const availableCash = organization.id === player?.organizationId ? playerCashAvailable : organization.cash;
    if (availableCash >= obligation.amount) {
      if (organization.id === player?.organizationId) {
        playerCashAvailable = roundMoney(playerCashAvailable - obligation.amount);
        playerTaxPaid = roundMoney(playerTaxPaid + obligation.amount);
      } else {
        organization.cash = roundMoney(organization.cash - obligation.amount);
        organization.dailyCosts = roundMoney(organization.dailyCosts + obligation.amount);
      }
      authority.taxRevenue = roundMoney(authority.taxRevenue + obligation.amount);
      taxCollected = roundMoney(taxCollected + obligation.amount);
      const payment: RegulatoryPaymentState = {
        id: `reg-payment-${regulation.nextPaymentNumber}`,
        day,
        organizationId: organization.id,
        authorityId: authority.id,
        obligationId: obligation.id,
        amount: obligation.amount,
        currency: obligation.currency,
      };
      regulation = { ...regulation, payments: [...regulation.payments, payment].slice(-8_000), nextPaymentNumber: regulation.nextPaymentNumber + 1 };
      return { ...obligation, status: 'paid' as const, paidDay: day };
    }
    if (obligation.status !== 'overdue') {
      events.push({ tone: 'warning', title: `${organization.name}: просрочен акциз`, detail: `К оплате ${formatMoney(obligation.amount, obligation.currency)}. Регулятор открыл нарушение.` });
      regulation = addViolation(regulation, {
        authorityId: authority.id,
        organizationId: organization.id,
        assetId: null,
        day,
        severity: obligation.amount > 5_000 ? 'major' : 'minor',
        code: 'excise_overdue',
        description: `Акцизное обязательство ${obligation.id} не оплачено в срок.`,
        fine: roundMoney(Math.max(50, obligation.amount * .08)),
      });
    }
    return { ...obligation, status: 'overdue' as const };
  });
  const paidObligationIds = new Set(obligations.filter((obligation) => obligation.status === 'paid').map((obligation) => obligation.id));
  const violations = regulation.violations.map((violation) => violation.code === 'excise_overdue' && [...paidObligationIds].some((id) => violation.description.includes(id)) ? { ...violation, resolved: true } : violation);
  const openCasesByAuthority = new Map<string, number>();
  for (const violation of violations) if (!violation.resolved) openCasesByAuthority.set(violation.authorityId, (openCasesByAuthority.get(violation.authorityId) ?? 0) + 1);
  regulation = { ...regulation, authorities: authorities.map((authority) => ({ ...authority, activeCases: openCasesByAuthority.get(authority.id) ?? 0 })), obligations, violations };

  const inspectionResult = runScheduledInspections(regulation, nextOrganizations, assets, day);
  regulation = inspectionResult.regulation;
  nextOrganizations = inspectionResult.organizations;
  events.push(...inspectionResult.events);
  regulation = { ...regulation, compliance: buildCompliance(regulation, nextOrganizations) };

  return { regulation, organizations: nextOrganizations, events, taxCollected, playerTaxPaid };
}

export function calculateExcise(input: {
  countryId: string;
  categoryId: BeverageCategoryId;
  alcoholByVolume: number;
  volumeLiters: number;
  smallProducer?: boolean;
}): { amount: number; currency: 'EUR' | 'GBP'; rule: ExciseRule } {
  const ruleset = getCountryRuleset(input.countryId);
  const rule = matchingExciseRule(ruleset, input.categoryId, input.alcoholByVolume);
  const rate = input.smallProducer && rule.smallProducerRate !== undefined ? rule.smallProducerRate : rule.rate;
  const hectolitres = input.volumeLiters / 100;
  const pureAlcoholLitres = input.volumeLiters * Math.max(0, input.alcoholByVolume) / 100;
  const plato = Math.max(0, input.alcoholByVolume * 2.4);
  let amount = 0;
  if (rule.model === 'per_hl') amount = hectolitres * rate;
  if (rule.model === 'per_hl_degree') amount = hectolitres * Math.max(0, input.alcoholByVolume) * rate;
  if (rule.model === 'per_hl_plato') amount = hectolitres * plato * rate;
  if (rule.model === 'per_hl_pure_alcohol') amount = (pureAlcoholLitres / 100) * rate;
  if (rule.model === 'per_litre_pure_alcohol') amount = pureAlcoholLitres * rate;
  return { amount: roundMoney(amount), currency: rule.currency, rule };
}

export function requiredPermitsForOrganization(organization: OrganizationState): PermitType[] {
  const ruleset = getCountryRuleset(organization.countryId);
  if (organization.kind === 'player' || organization.kind === 'producer') return ruleset.permitRequirements.producer;
  if (organization.kind === 'supplier') return ruleset.permitRequirements.supplier;
  if (organization.kind === 'retailer') return ruleset.permitRequirements.retailer;
  if (organization.kind === 'hospitality') return ruleset.permitRequirements.hospitality;
  return [];
}

export function organizationCompliance(state: RegulationState, organizationId: string): OrganizationComplianceState {
  return state.compliance.find((item) => item.organizationId === organizationId) ?? { organizationId, score: 100, lastInspectionDay: null, overdueTax: 0, activeViolations: 0 };
}

export function activeLicensesForOrganization(state: RegulationState, organizationId: string): OrganizationLicenseState[] {
  return state.licenses.filter((license) => license.organizationId === organizationId && license.status === 'active');
}

function assessDeliveredShipments(state: RegulationState, organizations: OrganizationState[], trade: TradeState, day: number): RegulationState {
  let next = state;
  const assessed = new Set(next.obligations.map((obligation) => obligation.sourceShipmentId));
  for (const shipment of trade.shipments) {
    if (shipment.status !== 'delivered' || shipment.arrivalDay > day || shipment.commodityKind !== 'product' || assessed.has(shipment.id)) continue;
    const product = trade.products.find((item) => item.id === shipment.commodityId);
    const seller = organizations.find((item) => item.id === shipment.sellerOrganizationId);
    const buyer = organizations.find((item) => item.id === shipment.buyerOrganizationId);
    if (!product || !seller || !buyer) continue;
    const liableOrganization = seller.countryId === buyer.countryId ? seller : buyer;
    const volumeLiters = shipment.quantity * product.packageVolumeLiters;
    const excise = calculateExcise({
      countryId: buyer.countryId,
      categoryId: product.beverageCategoryId ?? categoryForLegacyProduct(product),
      alcoholByVolume: product.alcoholByVolume,
      volumeLiters,
      smallProducer: seller.employeeCount <= 20,
    });
    const authority = authorityForCountry(next, buyer.countryId);
    const obligation: ExciseObligationState = {
      id: `reg-obligation-${next.nextObligationNumber}`,
      organizationId: liableOrganization.id,
      authorityId: authority.id,
      sourceShipmentId: shipment.id,
      productId: product.id,
      categoryId: product.beverageCategoryId ?? categoryForLegacyProduct(product),
      units: shipment.quantity,
      volumeLiters: roundQuantity(volumeLiters),
      alcoholByVolume: product.alcoholByVolume,
      amount: excise.amount,
      currency: excise.currency,
      assessedDay: day,
      dueDay: day + 7,
      paidDay: null,
      status: excise.amount <= 0 ? 'paid' : 'assessed',
    };
    next = { ...next, obligations: [...next.obligations, obligation].slice(-8_000), nextObligationNumber: next.nextObligationNumber + 1 };
    assessed.add(shipment.id);
  }
  return next;
}

function registerMovementDocuments(state: RegulationState, organizations: OrganizationState[], trade: TradeState, day: number): RegulationState {
  let next = state;
  const existing = new Set(next.movements.map((movement) => movement.shipmentId));
  for (const shipment of trade.shipments) {
    if (shipment.commodityKind !== 'product' || shipment.departDay > day || existing.has(shipment.id)) continue;
    const seller = organizations.find((item) => item.id === shipment.sellerOrganizationId);
    const buyer = organizations.find((item) => item.id === shipment.buyerOrganizationId);
    if (!seller || !buyer) continue;
    const origin = getCountryRuleset(seller.countryId);
    const destination = getCountryRuleset(buyer.countryId);
    const kind: MovementKind = seller.countryId === buyer.countryId ? 'domestic' : origin.emcsMember && destination.emcsMember ? 'eu_excise' : 'customs_import';
    const importPermit = activePermit(next, buyer.id, 'import_export');
    const status: MovementStatus = kind === 'customs_import' && !importPermit ? 'held' : shipment.status === 'failed' ? 'failed' : shipment.status === 'delivered' ? 'cleared' : 'declared';
    const movement: ExciseMovementState = {
      id: `reg-movement-${next.nextMovementNumber}`,
      shipmentId: shipment.id,
      kind,
      sellerOrganizationId: seller.id,
      buyerOrganizationId: buyer.id,
      originCountryId: seller.countryId,
      destinationCountryId: buyer.countryId,
      documentReference: `${kind === 'eu_excise' ? 'ARC' : kind === 'customs_import' ? 'CUS' : 'DOM'}-${day}-${String(next.nextMovementNumber).padStart(5, '0')}`,
      declaredDay: shipment.departDay,
      clearedDay: status === 'cleared' ? day : null,
      status,
      note: kind === 'eu_excise' ? 'Перемещение зарегистрировано в электронной акцизной модели.' : kind === 'customs_import' ? 'Требуется таможенное оформление и импортное разрешение.' : 'Внутреннее перемещение.',
    };
    next = { ...next, movements: [...next.movements, movement].slice(-6_000), nextMovementNumber: next.nextMovementNumber + 1 };
    if (status === 'held') {
      const authority = authorityForCountry(next, buyer.countryId);
      next = addViolation(next, {
        authorityId: authority.id,
        organizationId: buyer.id,
        assetId: shipment.buyerAssetId,
        day,
        severity: 'major',
        code: 'import_without_permit',
        description: `Поставка ${shipment.id} пересекла таможенную границу без импортного разрешения.`,
        fine: roundMoney(Math.max(250, shipment.quantity * shipment.unitPrice * .12)),
      });
    }
    existing.add(shipment.id);
  }
  return next;
}

function runScheduledInspections(state: RegulationState, organizations: OrganizationState[], assets: WorldAssetState[], day: number): { regulation: RegulationState; organizations: OrganizationState[]; events: RegulationAdvanceResult['events'] } {
  let regulation = state;
  let nextOrganizations = organizations;
  const events: RegulationAdvanceResult['events'] = [];
  for (const organization of organizations) {
    if (organization.kind === 'holding' || organization.status === 'acquired') continue;
    const ruleset = getCountryRuleset(organization.countryId);
    const period = Math.max(24, Math.round(1 / ruleset.inspectionBaseChance));
    if ((hash(`${organization.id}:${Math.floor(day / period)}`) + day) % period !== 0) continue;
    const organizationAssets = assets.filter((asset) => asset.operatorOrganizationId === organization.id && asset.status === 'operating');
    const required = requiredPermitsForOrganization(organization);
    const missing = required.filter((permit) => !activePermit(regulation, organization.id, permit));
    for (const asset of organizationAssets.filter((asset) => asset.type === 'bar' || asset.type === 'shop')) {
      if (!activePermit(regulation, organization.id, 'premises', asset.id)) missing.push('premises');
    }
    const overdue = regulation.obligations.filter((obligation) => obligation.organizationId === organization.id && obligation.status === 'overdue').reduce((sum, obligation) => sum + obligation.amount, 0);
    const brokenMovement = regulation.movements.some((movement) => movement.buyerOrganizationId === organization.id && movement.status === 'held');
    const score = clamp(100 - missing.length * 28 - Math.min(35, overdue / 180) - (brokenMovement ? 25 : 0), 0, 100);
    const result: InspectionResult = score >= 85 ? 'clear' : score >= 60 ? 'warning' : score >= 30 ? 'violation' : 'closure';
    const findings: string[] = [];
    if (missing.length) findings.push(`Не хватает разрешений: ${unique(missing).join(', ')}`);
    if (overdue > 0) findings.push(`Просроченный акциз: ${roundMoney(overdue)}`);
    if (brokenMovement) findings.push('Есть задержанное таможенное перемещение');
    if (findings.length === 0) findings.push('Документы, лицензии и акцизные записи в порядке');
    const authority = authorityForCountry(regulation, organization.countryId);
    const inspection: RegulatoryInspectionState = {
      id: `reg-inspection-${regulation.nextInspectionNumber}`,
      authorityId: authority.id,
      organizationId: organization.id,
      assetId: organizationAssets[0]?.id ?? null,
      day,
      result,
      score: Math.round(score),
      findings,
    };
    regulation = { ...regulation, inspections: [inspection, ...regulation.inspections].slice(0, 1_500), nextInspectionNumber: regulation.nextInspectionNumber + 1 };
    if (result === 'violation' || result === 'closure') {
      const fine = roundMoney(result === 'closure' ? 5_000 + overdue * .15 : 850 + overdue * .08);
      regulation = addViolation(regulation, {
        authorityId: authority.id,
        organizationId: organization.id,
        assetId: inspection.assetId,
        day,
        severity: result === 'closure' ? 'critical' : 'major',
        code: result === 'closure' ? 'license_closure' : 'compliance_failure',
        description: findings.join('. '),
        fine,
      });
      nextOrganizations = nextOrganizations.map((item) => item.id === organization.id ? {
        ...item,
        cash: roundMoney(item.cash - Math.min(Math.max(0, item.cash), fine)),
        reputation: clamp(item.reputation - (result === 'closure' ? 7 : 3), 0, 100),
        status: result === 'closure' && item.status === 'active' ? 'strained' : item.status,
      } : item);
      if (result === 'closure') {
        regulation = {
          ...regulation,
          licenses: regulation.licenses.map((license) => license.organizationId === organization.id && license.status === 'active'
            ? { ...license, status: 'suspended' as const, suspendedUntilDay: day + 14 }
            : license),
        };
      }
      events.push({ tone: 'warning', title: `${organization.name}: регуляторное нарушение`, detail: findings.join('. ') });
    }
  }
  return { regulation, organizations: nextOrganizations, events };
}

function createAuthorities(): RegulatoryAuthorityState[] {
  return [
    { id: 'authority-de', countryId: 'germany', name: 'Bundeszollverwaltung', currency: 'EUR', taxRevenue: 0, activeCases: 0 },
    { id: 'authority-fr', countryId: 'france', name: 'Douane et droits indirects', currency: 'EUR', taxRevenue: 0, activeCases: 0 },
    { id: 'authority-uk', countryId: 'united-kingdom', name: 'HM Revenue & Customs', currency: 'GBP', taxRevenue: 0, activeCases: 0 },
  ];
}

function createEmptyRegulationState(): RegulationState {
  return {
    authorities: createAuthorities(), licenses: [], obligations: [], movements: [], inspections: [], violations: [], payments: [], compliance: [],
    nextLicenseNumber: 1, nextObligationNumber: 1, nextMovementNumber: 1, nextInspectionNumber: 1, nextViolationNumber: 1, nextPaymentNumber: 1,
  };
}

function mergeAuthorities(existing: RegulatoryAuthorityState[]): RegulatoryAuthorityState[] {
  return createAuthorities().map((authority) => ({ ...authority, ...(existing.find((item) => item.id === authority.id) ?? {}) }));
}

function seedLicenses(organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number): OrganizationLicenseState[] {
  return ensureRequiredLicenses([], organizations, assets, trade, day, 1).items;
}

function ensureRequiredLicenses(existing: OrganizationLicenseState[], organizations: OrganizationState[], assets: WorldAssetState[], trade: TradeState, day: number, startNumber: number): { items: OrganizationLicenseState[]; nextNumber: number } {
  const items = [...existing];
  let nextNumber = startNumber;
  const categoryIdsByProducer = new Map<string, BeverageCategoryId[]>();
  for (const product of trade.products) {
    const categoryId = product.beverageCategoryId ?? categoryForLegacyProduct(product);
    categoryIdsByProducer.set(product.producerOrganizationId, unique([...(categoryIdsByProducer.get(product.producerOrganizationId) ?? []), categoryId]));
  }
  const add = (organization: OrganizationState, permitType: PermitType, assetId: string | null) => {
    if (items.some((license) => license.organizationId === organization.id && license.permitType === permitType && license.assetId === assetId && license.status !== 'revoked')) return;
    items.push({
      id: `reg-license-${nextNumber++}`,
      organizationId: organization.id,
      assetId,
      countryId: organization.countryId,
      permitType,
      status: 'active',
      issuedDay: Math.max(1, day - 365),
      expiresDay: null,
      suspendedUntilDay: null,
      scopeCategoryIds: categoryIdsByProducer.get(organization.id) ?? beverageCategories.map((category) => category.id),
    });
  };
  for (const organization of organizations) {
    for (const permit of requiredPermitsForOrganization(organization)) add(organization, permit, null);
    const crossBorder = trade.contracts.some((contract) => contract.buyerOrganizationId === organization.id && organizations.find((item) => item.id === contract.sellerOrganizationId)?.countryId !== organization.countryId);
    if (crossBorder) add(organization, 'import_export', null);
    for (const asset of assets.filter((item) => item.operatorOrganizationId === organization.id && (item.type === 'bar' || item.type === 'shop'))) add(organization, 'premises', asset.id);
  }
  return { items, nextNumber };
}

function buildCompliance(state: RegulationState, organizations: OrganizationState[]): OrganizationComplianceState[] {
  return organizations.map((organization) => {
    const overdueTax = roundMoney(state.obligations.filter((obligation) => obligation.organizationId === organization.id && obligation.status === 'overdue').reduce((sum, obligation) => sum + obligation.amount, 0));
    const activeViolations = state.violations.filter((violation) => violation.organizationId === organization.id && !violation.resolved).length;
    const lastInspection = state.inspections.filter((inspection) => inspection.organizationId === organization.id).sort((a, b) => b.day - a.day)[0];
    const missingPermits = requiredPermitsForOrganization(organization).filter((permit) => !activePermit(state, organization.id, permit)).length;
    return {
      organizationId: organization.id,
      score: clamp(Math.round(100 - activeViolations * 12 - missingPermits * 20 - Math.min(35, overdueTax / 200)), 0, 100),
      lastInspectionDay: lastInspection?.day ?? null,
      overdueTax,
      activeViolations,
    };
  });
}

function addViolation(state: RegulationState, input: Omit<RegulatoryViolationState, 'id' | 'resolved'>): RegulationState {
  const duplicate = state.violations.some((violation) => !violation.resolved && violation.organizationId === input.organizationId && violation.code === input.code && violation.description === input.description);
  if (duplicate) return state;
  const violation: RegulatoryViolationState = { ...input, id: `reg-violation-${state.nextViolationNumber}`, resolved: false };
  return {
    ...state,
    violations: [violation, ...state.violations].slice(0, 2_000),
    authorities: state.authorities.map((authority) => authority.id === input.authorityId ? { ...authority, activeCases: authority.activeCases + 1 } : authority),
    nextViolationNumber: state.nextViolationNumber + 1,
  };
}

function activePermit(state: RegulationState, organizationId: string, permitType: PermitType, assetId: string | null = null): boolean {
  return state.licenses.some((license) => license.organizationId === organizationId && license.permitType === permitType && (assetId === null || license.assetId === assetId) && license.status === 'active');
}

function matchingExciseRule(ruleset: CountryRuleset, categoryId: BeverageCategoryId, alcoholByVolume: number): ExciseRule {
  return ruleset.exciseRules.find((rule) => rule.categoryIds.includes(categoryId)
    && (rule.minimumAbv === undefined || alcoholByVolume >= rule.minimumAbv)
    && (rule.maximumAbv === undefined || alcoholByVolume <= rule.maximumAbv))
    ?? { id: `${ruleset.countryId}-fallback`, categoryIds: [categoryId], model: 'none', rate: 0, currency: ruleset.currency, label: 'Нет ставки' };
}

function categoryForLegacyProduct(product: Pick<TradeProductState, 'family'>): BeverageCategoryId {
  if (product.family === 'wine') return 'still_wine';
  if (product.family === 'spirit') return 'whisky';
  return product.family;
}

function authorityForCountry(state: RegulationState, countryId: string): RegulatoryAuthorityState {
  return state.authorities.find((authority) => authority.countryId === countryId) ?? state.authorities[0]!;
}

function formatMoney(value: number, currency: 'EUR' | 'GBP'): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, style: 'currency', currency }).format(value);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }
function clamp(value: number, minimum: number, maximum: number): number { return Math.min(maximum, Math.max(minimum, value)); }
function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function roundQuantity(value: number): number { return Math.round((value + Number.EPSILON) * 1000) / 1000; }
