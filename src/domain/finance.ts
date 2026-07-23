import type { OrganizationState, WorldAssetState } from './ecosystem';
import type { TradeContractState, TradeState } from './trade';

export type PaymentTerm = 'prepaid' | 'due_on_receipt' | 'net_7' | 'net_14' | 'net_30';
export type InvoiceStatus = 'open' | 'partial' | 'paid' | 'overdue' | 'defaulted' | 'disputed';
export type CreditFacilityStatus = 'active' | 'frozen' | 'closed';
export type LoanStatus = 'active' | 'repaid' | 'defaulted';
export type InsurancePolicyKind = 'cargo' | 'property' | 'recall';
export type FinancialOperationKind = 'invoice_issued' | 'payment' | 'credit_draw' | 'credit_repayment' | 'interest' | 'insurance_premium' | 'default';

export interface BankState {
  id: string;
  name: string;
  countryId: string;
  baseAnnualRate: number;
  riskAppetite: number;
}

export interface BankAccountState {
  id: string;
  organizationId: string;
  bankId: string;
  accountNumber: string;
  currency: 'EUR' | 'GBP';
  overdraftLimit: number;
  frozen: boolean;
  openedDay: number;
}

export interface InvoiceState {
  id: string;
  sourceType: 'shipment' | 'service' | 'insurance';
  sourceId: string;
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  contractId: string | null;
  issuedDay: number;
  dueDay: number;
  paymentTerm: PaymentTerm;
  currency: 'EUR' | 'GBP';
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  lastPaymentDay: number | null;
  defaultedDay: number | null;
}

export interface CreditFacilityState {
  id: string;
  organizationId: string;
  bankId: string;
  limit: number;
  drawn: number;
  annualRate: number;
  collateralAssetIds: string[];
  status: CreditFacilityStatus;
  openedDay: number;
}

export interface LoanState {
  id: string;
  organizationId: string;
  bankId: string;
  principal: number;
  outstanding: number;
  annualRate: number;
  monthlyInstallment: number;
  nextPaymentDay: number;
  collateralAssetIds: string[];
  status: LoanStatus;
}

export interface InsurancePolicyState {
  id: string;
  organizationId: string;
  insurerBankId: string;
  kind: InsurancePolicyKind;
  coverageLimit: number;
  monthlyPremium: number;
  deductible: number;
  active: boolean;
  nextPremiumDay: number;
}

export interface FinancialPeriodAccumulator {
  organizationId: string;
  periodStartDay: number;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  depreciation: number;
  interest: number;
  taxes: number;
}

export interface FinancialStatementState {
  id: string;
  organizationId: string;
  periodStartDay: number;
  periodEndDay: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  depreciation: number;
  interest: number;
  taxes: number;
  netIncome: number;
  operatingCashFlow: number;
  receivables: number;
  payables: number;
  inventoryValue: number;
  cash: number;
  debt: number;
  workingCapital: number;
}

export interface FinancialOperationState {
  id: string;
  day: number;
  kind: FinancialOperationKind;
  organizationId: string;
  counterpartyOrganizationId: string | null;
  invoiceId: string | null;
  facilityId: string | null;
  amount: number;
  memo: string;
}

export interface FinancialSystemState {
  banks: BankState[];
  accounts: BankAccountState[];
  invoices: InvoiceState[];
  creditFacilities: CreditFacilityState[];
  loans: LoanState[];
  insurancePolicies: InsurancePolicyState[];
  periods: FinancialPeriodAccumulator[];
  statements: FinancialStatementState[];
  operations: FinancialOperationState[];
  nextInvoiceNumber: number;
  nextFacilityNumber: number;
  nextLoanNumber: number;
  nextPolicyNumber: number;
  nextStatementNumber: number;
  nextOperationNumber: number;
}

export interface FinancialAdvanceResult {
  financials: FinancialSystemState;
  organizations: OrganizationState[];
  trade: TradeState;
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
  playerCashDelta: number;
}

const BANKS: BankState[] = [
  { id: 'bank-rhein-commercial', name: 'Rhein Commercial Bank', countryId: 'germany', baseAnnualRate: .058, riskAppetite: 62 },
  { id: 'bank-credit-est', name: 'Crédit de l’Est', countryId: 'france', baseAnnualRate: .054, riskAppetite: 58 },
  { id: 'bank-crown-merchant', name: 'Crown Merchant Bank', countryId: 'united-kingdom', baseAnnualRate: .064, riskAppetite: 55 },
];


export function ensureFinancialOrganizations(organizations: OrganizationState[], assets: WorldAssetState[], day: number): { organizations: OrganizationState[]; assets: WorldAssetState[] } {
  const nextOrganizations = organizations.map((organization) => ({ ...organization, assetIds: [...organization.assetIds] }));
  const nextAssets = assets.map((asset) => ({ ...asset }));
  const regionByCountry: Record<string, string> = { germany: 'hesse', france: 'grand-est', 'united-kingdom': 'kent' };
  const cityByCountry: Record<string, string> = { germany: 'Frankfurt', france: 'Strasbourg', 'united-kingdom': 'London' };
  for (const [index, bank] of BANKS.entries()) {
    if (!nextOrganizations.some((organization) => organization.id === bank.id)) {
      const assetId = `asset-${bank.id}`;
      nextOrganizations.push({
        id: bank.id,
        name: bank.name,
        kind: 'financial',
        countryId: bank.countryId,
        regionId: regionByCountry[bank.countryId] ?? 'hesse',
        ownerLabel: 'Акционеры банка',
        status: 'active',
        cash: 8_000_000 + index * 1_500_000,
        debt: 0,
        reputation: 78 - index * 2,
        strategy: 'Кредитование торговли и производственных активов',
        employeeCount: 120 + index * 35,
        valuation: 32_000_000 + index * 4_000_000,
        dailyRevenue: 0,
        dailyCosts: 9_000 + index * 1_100,
        assetIds: [assetId],
        supplierOrganizationIds: [],
        buyerOrganizationIds: [],
        foundedDay: Math.min(day, 1),
      });
      nextAssets.push({
        id: assetId,
        type: 'office',
        name: `${bank.name} · головной офис`,
        city: cityByCountry[bank.countryId] ?? 'Frankfurt',
        countryId: bank.countryId,
        regionId: regionByCountry[bank.countryId] ?? 'hesse',
        address: 'Финансовый квартал',
        ownerOrganizationId: bank.id,
        operatorOrganizationId: bank.id,
        status: 'operating',
        condition: 92,
        capacity: 250,
        footfall: 0,
        askingPrice: 4_800_000 + index * 700_000,
        dailyRent: 0,
        dailyOperatingCost: 9_000 + index * 1_100,
        audience: 'Корпоративные клиенты алкогольной индустрии',
        marketOutletId: null,
        venue: null,
      });
    }
  }
  return { organizations: nextOrganizations, assets: nextAssets };
}

export function createFinancialSystem(organizations: OrganizationState[], assets: WorldAssetState[], day: number): FinancialSystemState {
  const accounts: BankAccountState[] = [];
  const creditFacilities: CreditFacilityState[] = [];
  const loans: LoanState[] = [];
  const insurancePolicies: InsurancePolicyState[] = [];
  let nextFacilityNumber = 1;
  let nextLoanNumber = 1;
  let nextPolicyNumber = 1;

  for (const organization of organizations) {
    const bank = bankForCountry(organization.countryId);
    accounts.push({
      id: `bank-account-${organization.id}`,
      organizationId: organization.id,
      bankId: bank.id,
      accountNumber: accountNumber(organization.id),
      currency: organization.countryId === 'united-kingdom' ? 'GBP' : 'EUR',
      overdraftLimit: roundMoney(Math.max(1_500, organization.valuation * .025)),
      frozen: false,
      openedDay: day,
    });
    if (!['holding', 'service', 'financial'].includes(organization.kind)) {
      const collateral = assets.filter((asset) => asset.ownerOrganizationId === organization.id).slice(0, 2).map((asset) => asset.id);
      creditFacilities.push({
        id: `credit-facility:${organization.id}`,
        organizationId: organization.id,
        bankId: bank.id,
        limit: roundMoney(Math.max(5_000, organization.valuation * (.1 + bank.riskAppetite / 1000))),
        drawn: 0,
        annualRate: roundRate(bank.baseAnnualRate + riskPremium(organization)),
        collateralAssetIds: collateral,
        status: organization.status === 'insolvent' ? 'frozen' : 'active',
        openedDay: day,
      });
      nextFacilityNumber += 1;
    }
    if (organization.debt > 0) {
      const outstanding = roundMoney(organization.debt);
      loans.push({
        id: `loan:legacy:${organization.id}`,
        organizationId: organization.id,
        bankId: bank.id,
        principal: outstanding,
        outstanding,
        annualRate: roundRate(bank.baseAnnualRate + riskPremium(organization) + .012),
        monthlyInstallment: roundMoney(Math.max(250, outstanding / 48)),
        nextPaymentDay: day + 30,
        collateralAssetIds: assets.filter((asset) => asset.ownerOrganizationId === organization.id).slice(0, 2).map((asset) => asset.id),
        status: 'active',
      });
      nextLoanNumber += 1;
    }
    if (['producer', 'carrier', 'distributor', 'hospitality', 'retailer', 'player'].includes(organization.kind)) {
      const kinds: InsurancePolicyKind[] = organization.kind === 'carrier' ? ['cargo', 'property'] : organization.kind === 'producer' || organization.kind === 'player' ? ['property', 'recall'] : ['property'];
      for (const kind of kinds) {
        insurancePolicies.push({
          id: `insurance:${organization.id}:${kind}`,
          organizationId: organization.id,
          insurerBankId: bank.id,
          kind,
          coverageLimit: roundMoney(Math.max(15_000, organization.valuation * (kind === 'recall' ? .35 : .22))),
          monthlyPremium: roundMoney(Math.max(35, organization.valuation * (kind === 'cargo' ? .0009 : .00065))),
          deductible: roundMoney(Math.max(250, organization.valuation * .004)),
          active: true,
          nextPremiumDay: day + 30,
        });
        nextPolicyNumber += 1;
      }
    }
  }

  return {
    banks: BANKS.map((bank) => ({ ...bank })),
    accounts,
    invoices: [],
    creditFacilities,
    loans,
    insurancePolicies,
    periods: organizations.map((organization) => emptyPeriod(organization.id, day)),
    statements: [],
    operations: [],
    nextInvoiceNumber: 1,
    nextFacilityNumber,
    nextLoanNumber,
    nextPolicyNumber,
    nextStatementNumber: 1,
    nextOperationNumber: 1,
  };
}

export function normalizeFinancialSystem(value: FinancialSystemState | null | undefined, organizations: OrganizationState[], assets: WorldAssetState[], day: number): FinancialSystemState {
  if (!value || !Array.isArray(value.invoices)) return createFinancialSystem(organizations, assets, day);
  const base = createFinancialSystem(organizations, assets, day);
  const organizationIds = new Set(organizations.map((organization) => organization.id));
  const accountsByOrganization = new Map((value.accounts ?? []).map((account) => [account.organizationId, account]));
  const facilitiesByOrganization = new Map((value.creditFacilities ?? []).map((facility) => [facility.organizationId, facility]));
  const periodsByOrganization = new Map((value.periods ?? []).map((period) => [period.organizationId, period]));
  return {
    ...base,
    ...value,
    banks: value.banks?.length ? value.banks : base.banks,
    accounts: base.accounts.map((account) => accountsByOrganization.get(account.organizationId) ?? account),
    creditFacilities: base.creditFacilities.map((facility) => facilitiesByOrganization.get(facility.organizationId) ?? facility),
    loans: (value.loans ?? base.loans).filter((loan) => organizationIds.has(loan.organizationId)),
    insurancePolicies: (value.insurancePolicies ?? base.insurancePolicies).filter((policy) => organizationIds.has(policy.organizationId)),
    invoices: (value.invoices ?? []).filter((invoice) => organizationIds.has(invoice.sellerOrganizationId) && organizationIds.has(invoice.buyerOrganizationId)).map((invoice) => ({ ...invoice, paidAmount: invoice.paidAmount ?? 0, status: invoice.status ?? 'open', defaultedDay: invoice.defaultedDay ?? null })),
    periods: base.periods.map((period) => periodsByOrganization.get(period.organizationId) ?? period),
    statements: value.statements ?? [],
    operations: value.operations ?? [],
    nextInvoiceNumber: value.nextInvoiceNumber ?? 1,
    nextFacilityNumber: value.nextFacilityNumber ?? base.nextFacilityNumber,
    nextLoanNumber: value.nextLoanNumber ?? base.nextLoanNumber,
    nextPolicyNumber: value.nextPolicyNumber ?? base.nextPolicyNumber,
    nextStatementNumber: value.nextStatementNumber ?? 1,
    nextOperationNumber: value.nextOperationNumber ?? 1,
  };
}

export function advanceFinancialDay(
  state: FinancialSystemState,
  organizations: OrganizationState[],
  assets: WorldAssetState[],
  previousTrade: TradeState,
  trade: TradeState,
  day: number,
  playerOrganizationId: string | null = null,
  taxPayments: Array<{ organizationId: string; amount: number; day: number }> = [],
): FinancialAdvanceResult {
  const financials = normalizeFinancialSystem(state, organizations, assets, day);
  let nextOrganizations = organizations.map((organization) => ({ ...organization }));
  let nextTrade: TradeState = { ...trade, contracts: trade.contracts.map((contract) => ({ ...contract })) };
  const events: FinancialAdvanceResult['events'] = [];
  const operations = [...financials.operations];
  let nextOperationNumber = financials.nextOperationNumber;

  const record = (kind: FinancialOperationKind, organizationId: string, counterpartyOrganizationId: string | null, invoiceId: string | null, facilityId: string | null, amount: number, memo: string) => {
    operations.unshift({ id: `financial-operation-${day}-${nextOperationNumber++}`, day, kind, organizationId, counterpartyOrganizationId, invoiceId, facilityId, amount: roundMoney(amount), memo });
    if (operations.length > 1600) operations.length = 1600;
  };

  const previousShipmentStatus = new Map(previousTrade.shipments.map((shipment) => [shipment.id, shipment.status]));
  const newlyDelivered = trade.shipments.filter((shipment) => shipment.status === 'delivered' && previousShipmentStatus.get(shipment.id) !== 'delivered');
  for (const shipment of newlyDelivered) {
    if (financials.invoices.some((invoice) => invoice.sourceType === 'shipment' && invoice.sourceId === shipment.id)) continue;
    const buyer = nextOrganizations.find((organization) => organization.id === shipment.buyerOrganizationId);
    const seller = nextOrganizations.find((organization) => organization.id === shipment.sellerOrganizationId);
    if (!buyer || !seller) continue;
    const contract = nextTrade.contracts.find((item) => item.id === shipment.contractId);
    const subtotal = roundMoney(shipment.quantity * shipment.unitPrice);
    const term = paymentTermFor(contract, buyer);
    const invoice: InvoiceState = {
      id: `invoice-${financials.nextInvoiceNumber++}`,
      sourceType: 'shipment',
      sourceId: shipment.id,
      sellerOrganizationId: seller.id,
      buyerOrganizationId: buyer.id,
      contractId: contract?.id ?? null,
      issuedDay: day,
      dueDay: day + paymentTermDays(term),
      paymentTerm: term,
      currency: buyer.countryId === 'united-kingdom' ? 'GBP' : 'EUR',
      subtotal,
      taxAmount: 0,
      total: subtotal,
      paidAmount: 0,
      status: 'open',
      lastPaymentDay: null,
      defaultedDay: null,
    };
    financials.invoices.push(invoice);
    // Trade historically settled deliveries immediately. Reverse only the cash movement;
    // revenue and cost stay accrued on the delivery date.
    nextOrganizations = nextOrganizations.map((organization) => {
      if (organization.id === seller.id) return { ...organization, cash: roundMoney(organization.cash - subtotal) };
      if (organization.id === buyer.id) return { ...organization, cash: roundMoney(organization.cash + subtotal) };
      return organization;
    });
    record('invoice_issued', seller.id, buyer.id, invoice.id, null, subtotal, `${seller.name} выставила счёт ${buyer.name}`);
  }

  for (const invoice of financials.invoices) {
    if (['paid', 'defaulted', 'disputed'].includes(invoice.status)) continue;
    const remaining = roundMoney(invoice.total - invoice.paidAmount);
    if (remaining <= 0) {
      invoice.status = 'paid';
      continue;
    }
    const buyer = nextOrganizations.find((organization) => organization.id === invoice.buyerOrganizationId);
    const seller = nextOrganizations.find((organization) => organization.id === invoice.sellerOrganizationId);
    if (!buyer || !seller) continue;
    const isDue = invoice.dueDay <= day || invoice.paymentTerm === 'prepaid' || invoice.paymentTerm === 'due_on_receipt';
    if (!isDue) continue;

    const reserve = liquidityReserve(buyer);
    let availableCash = Math.max(0, buyer.cash - reserve);
    if (availableCash < remaining) {
      const facility = financials.creditFacilities.find((item) => item.organizationId === buyer.id && item.status === 'active');
      if (facility) {
        const unused = Math.max(0, facility.limit - facility.drawn);
        const draw = roundMoney(Math.min(unused, Math.max(0, remaining + reserve - buyer.cash)));
        if (draw > 0) {
          facility.drawn = roundMoney(facility.drawn + draw);
          buyer.cash = roundMoney(buyer.cash + draw);
          const bankOrganization = nextOrganizations.find((item) => item.id === facility.bankId);
          if (bankOrganization) bankOrganization.cash = roundMoney(bankOrganization.cash - draw);
          availableCash += draw;
          record('credit_draw', buyer.id, facility.bankId, invoice.id, facility.id, draw, `Кредитная линия использована для оплаты счёта ${invoice.id}`);
        }
      }
    }
    const payment = roundMoney(Math.min(remaining, Math.max(0, buyer.cash - reserve)));
    if (payment > 0) {
      buyer.cash = roundMoney(buyer.cash - payment);
      seller.cash = roundMoney(seller.cash + payment);
      invoice.paidAmount = roundMoney(invoice.paidAmount + payment);
      invoice.lastPaymentDay = day;
      invoice.status = invoice.paidAmount + .01 >= invoice.total ? 'paid' : 'partial';
      record('payment', buyer.id, seller.id, invoice.id, null, payment, `Оплата счёта ${invoice.id}`);
    }
    if (invoice.status !== 'paid' && day > invoice.dueDay) {
      invoice.status = day - invoice.dueDay >= 15 ? 'defaulted' : 'overdue';
      if (invoice.status === 'defaulted' && invoice.defaultedDay === null) {
        invoice.defaultedDay = day;
        seller.dailyCosts = roundMoney(seller.dailyCosts + remaining);
        record('default', seller.id, buyer.id, invoice.id, null, remaining, `Безнадёжная дебиторская задолженность по счёту ${invoice.id}`);
        if (invoice.contractId) {
          nextTrade.contracts = nextTrade.contracts.map((contractItem) => contractItem.id === invoice.contractId
            ? { ...contractItem, failures: contractItem.failures + 1, status: 'paused', lastResult: 'Платёжный дефолт покупателя' }
            : contractItem);
        }
        events.push({ tone: 'warning', title: `${buyer.name}: платёжный дефолт`, detail: `${seller.name} не получила ${roundMoney(invoice.total - invoice.paidAmount)} по счёту.` });
      }
    }
  }

  if (day % 30 === 0) {
    for (const facility of financials.creditFacilities.filter((item) => item.status === 'active' && item.drawn > 0)) {
      const organization = nextOrganizations.find((item) => item.id === facility.organizationId);
      if (!organization) continue;
      const interest = roundMoney(facility.drawn * facility.annualRate / 12);
      if (organization.cash > interest + liquidityReserve(organization)) {
        organization.cash = roundMoney(organization.cash - interest);
        const bankOrganization = nextOrganizations.find((item) => item.id === facility.bankId);
        if (bankOrganization) {
          bankOrganization.cash = roundMoney(bankOrganization.cash + interest);
          bankOrganization.dailyRevenue = roundMoney(bankOrganization.dailyRevenue + interest);
        }
      } else {
        const unused = Math.max(0, facility.limit - facility.drawn);
        const capitalized = roundMoney(Math.min(unused, interest));
        facility.drawn = roundMoney(facility.drawn + capitalized);
        if (capitalized + .01 < interest) facility.status = 'frozen';
      }
      organization.dailyCosts = roundMoney(organization.dailyCosts + interest);
      const period = periodFor(financials, organization.id, day);
      period.interest = roundMoney(period.interest + interest);
      record('interest', organization.id, facility.bankId, null, facility.id, interest, 'Проценты по кредитной линии');
      if (organization.cash > liquidityReserve(organization) * 2.5) {
        const repayment = roundMoney(Math.min(facility.drawn, Math.max(0, organization.cash - liquidityReserve(organization) * 2)) * .2);
        if (repayment > 0) {
          organization.cash = roundMoney(organization.cash - repayment);
          facility.drawn = roundMoney(facility.drawn - repayment);
          const bankOrganization = nextOrganizations.find((item) => item.id === facility.bankId);
          if (bankOrganization) bankOrganization.cash = roundMoney(bankOrganization.cash + repayment);
          record('credit_repayment', organization.id, facility.bankId, null, facility.id, repayment, 'Частичное погашение кредитной линии');
        }
      }
    }
    for (const loan of financials.loans.filter((item) => item.status === 'active' && item.nextPaymentDay <= day)) {
      const organization = nextOrganizations.find((item) => item.id === loan.organizationId);
      if (!organization) continue;
      const interest = roundMoney(loan.outstanding * loan.annualRate / 12);
      const principalDue = roundMoney(Math.min(loan.outstanding, loan.monthlyInstallment));
      const payment = roundMoney(interest + principalDue);
      if (organization.cash >= payment + liquidityReserve(organization) * .5) {
        organization.cash = roundMoney(organization.cash - payment);
        const bankOrganization = nextOrganizations.find((item) => item.id === loan.bankId);
        if (bankOrganization) {
          bankOrganization.cash = roundMoney(bankOrganization.cash + payment);
          bankOrganization.dailyRevenue = roundMoney(bankOrganization.dailyRevenue + interest);
        }
        loan.outstanding = roundMoney(loan.outstanding - principalDue);
        if (loan.outstanding <= .01) loan.status = 'repaid';
      } else {
        loan.outstanding = roundMoney(loan.outstanding + interest);
      }
      loan.nextPaymentDay += 30;
      organization.dailyCosts = roundMoney(organization.dailyCosts + interest);
      periodFor(financials, organization.id, day).interest = roundMoney(periodFor(financials, organization.id, day).interest + interest);
      record('interest', organization.id, loan.bankId, null, loan.id, interest, 'Проценты по банковскому кредиту');
    }
    for (const policy of financials.insurancePolicies.filter((item) => item.active && item.nextPremiumDay <= day)) {
      const organization = nextOrganizations.find((item) => item.id === policy.organizationId);
      if (!organization) continue;
      if (organization.cash >= policy.monthlyPremium) {
        organization.cash = roundMoney(organization.cash - policy.monthlyPremium);
        const bankOrganization = nextOrganizations.find((item) => item.id === policy.insurerBankId);
        if (bankOrganization) {
          bankOrganization.cash = roundMoney(bankOrganization.cash + policy.monthlyPremium);
          bankOrganization.dailyRevenue = roundMoney(bankOrganization.dailyRevenue + policy.monthlyPremium);
        }
        organization.dailyCosts = roundMoney(organization.dailyCosts + policy.monthlyPremium);
        periodFor(financials, organization.id, day).operatingExpenses = roundMoney(periodFor(financials, organization.id, day).operatingExpenses + policy.monthlyPremium);
        record('insurance_premium', organization.id, policy.insurerBankId, null, policy.id, policy.monthlyPremium, `Страховая премия: ${policy.kind}`);
      } else {
        policy.active = false;
        events.push({ tone: 'warning', title: `${organization.name}: страхование прекращено`, detail: `Не оплачена премия по полису ${policy.kind}.` });
      }
      policy.nextPremiumDay += 30;
    }
  }

  const interestByOrganization = new Map<string, number>();
  for (const operation of operations) {
    if (operation.day !== day || operation.kind !== 'interest') continue;
    interestByOrganization.set(operation.organizationId, roundMoney((interestByOrganization.get(operation.organizationId) ?? 0) + operation.amount));
  }
  const taxByOrganization = new Map<string, number>();
  for (const payment of taxPayments) {
    if (payment.day !== day || payment.amount <= 0) continue;
    taxByOrganization.set(payment.organizationId, roundMoney((taxByOrganization.get(payment.organizationId) ?? 0) + payment.amount));
  }
  for (const organization of nextOrganizations) {
    const period = periodFor(financials, organization.id, day);
    period.revenue = roundMoney(period.revenue + Math.max(0, organization.dailyRevenue));
    const dayCosts = Math.max(0, organization.dailyCosts);
    const interestToday = interestByOrganization.get(organization.id) ?? 0;
    const taxToday = taxByOrganization.get(organization.id) ?? 0;
    const operatingCostBase = Math.max(0, dayCosts - interestToday - taxToday);
    const estimatedCogs = roundMoney(Math.min(operatingCostBase * .52, Math.max(0, organization.dailyRevenue) * .62));
    period.cogs = roundMoney(period.cogs + estimatedCogs);
    period.operatingExpenses = roundMoney(period.operatingExpenses + Math.max(0, operatingCostBase - estimatedCogs));
    period.taxes = roundMoney(period.taxes + taxToday);
    period.depreciation = roundMoney(period.depreciation + dailyDepreciation(assets, organization.id));
  }

  if (day % 30 === 0) closeFinancialPeriod(financials, nextOrganizations, trade, day);

  nextOrganizations = nextOrganizations.map((organization) => {
    const drawn = financials.creditFacilities.filter((item) => item.organizationId === organization.id).reduce((sum, item) => sum + item.drawn, 0);
    const loans = financials.loans.filter((item) => item.organizationId === organization.id && item.status === 'active').reduce((sum, item) => sum + item.outstanding, 0);
    const overdue = financials.invoices.filter((invoice) => invoice.buyerOrganizationId === organization.id && ['overdue', 'defaulted'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0);
    const defaultedPayables = financials.invoices.filter((invoice) => invoice.buyerOrganizationId === organization.id && invoice.status === 'defaulted').reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0);
    const debt = roundMoney(drawn + loans + defaultedPayables);
    const facility = financials.creditFacilities.find((item) => item.organizationId === organization.id);
    const leverage = debt / Math.max(1, organization.valuation);
    const status = overdue > organization.valuation * .12 || leverage > .85 || organization.cash < -Math.max(2_000, facility?.limit ?? 0)
      ? 'insolvent'
      : overdue > 0 || leverage > .5 || organization.cash < liquidityReserve(organization) * .35
        ? 'strained'
        : organization.status === 'acquired' ? 'acquired' : 'active';
    if (facility && status === 'insolvent') facility.status = 'frozen';
    return { ...organization, debt, status };
  });

  const unsettledInvoices = financials.invoices.filter((invoice) => !['paid', 'defaulted'].includes(invoice.status));
  const settledInvoices = financials.invoices.filter((invoice) => ['paid', 'defaulted'].includes(invoice.status)).slice(-3000);
  financials.invoices = [...settledInvoices, ...unsettledInvoices];
  financials.operations = operations;
  financials.nextOperationNumber = nextOperationNumber;
  const todaysPlayerOperations = playerOrganizationId ? operations.filter((operation) => operation.day === day && (operation.organizationId === playerOrganizationId || operation.counterpartyOrganizationId === playerOrganizationId)) : [];
  const playerCashDelta = roundMoney(todaysPlayerOperations.reduce((sum, operation) => {
    if (!playerOrganizationId) return sum;
    if (operation.kind === 'payment') {
      if (operation.organizationId === playerOrganizationId) return sum - operation.amount;
      if (operation.counterpartyOrganizationId === playerOrganizationId) return sum + operation.amount;
    }
    if (operation.kind === 'credit_draw' && operation.organizationId === playerOrganizationId) return sum + operation.amount;
    if (operation.kind === 'credit_repayment' && operation.organizationId === playerOrganizationId) return sum - operation.amount;
    if (['interest', 'insurance_premium'].includes(operation.kind) && operation.organizationId === playerOrganizationId) return sum - operation.amount;
    return sum;
  }, 0));
  return { financials, organizations: nextOrganizations, trade: nextTrade, events, playerCashDelta };
}

export function financialPosition(state: FinancialSystemState, organizationId: string, trade: TradeState, cash: number): {
  receivables: number; payables: number; creditLimit: number; creditDrawn: number; inventoryValue: number; workingCapital: number;
} {
  const receivables = roundMoney(state.invoices.filter((invoice) => invoice.sellerOrganizationId === organizationId && !['paid', 'defaulted'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0));
  const payables = roundMoney(state.invoices.filter((invoice) => invoice.buyerOrganizationId === organizationId && !['paid', 'disputed'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0));
  const facility = state.creditFacilities.find((item) => item.organizationId === organizationId);
  const inventoryValue = roundMoney(trade.inventory.filter((lot) => lot.organizationId === organizationId).reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0));
  return {
    receivables,
    payables,
    creditLimit: facility?.limit ?? 0,
    creditDrawn: facility?.drawn ?? 0,
    inventoryValue,
    workingCapital: roundMoney(cash + receivables + inventoryValue - payables),
  };
}

export function latestFinancialStatement(state: FinancialSystemState, organizationId: string): FinancialStatementState | null {
  return state.statements.filter((statement) => statement.organizationId === organizationId).sort((a, b) => b.periodEndDay - a.periodEndDay)[0] ?? null;
}

export function auditFinancialSystem(state: FinancialSystemState, organizations: OrganizationState[]): string[] {
  const violations: string[] = [];
  const organizationIds = new Set(organizations.map((organization) => organization.id));
  if (new Set(state.invoices.map((invoice) => invoice.id)).size !== state.invoices.length) violations.push('Дублирующиеся финансовые счета');
  if (state.invoices.some((invoice) => invoice.total < 0 || invoice.paidAmount < 0 || invoice.paidAmount - invoice.total > .01)) violations.push('Некорректная сумма финансового счёта');
  if (state.invoices.some((invoice) => !organizationIds.has(invoice.sellerOrganizationId) || !organizationIds.has(invoice.buyerOrganizationId))) violations.push('Финансовый счёт ссылается на неизвестную организацию');
  if (state.creditFacilities.some((facility) => facility.drawn < 0 || facility.drawn - facility.limit > .01)) violations.push('Кредитная линия вышла за допустимый лимит');
  if (state.loans.some((loan) => loan.outstanding < 0)) violations.push('Отрицательный остаток банковского кредита');
  if (state.statements.some((statement) => !Number.isFinite(statement.workingCapital) || !Number.isFinite(statement.netIncome))) violations.push('Некорректная финансовая отчётность');
  return violations;
}

function closeFinancialPeriod(state: FinancialSystemState, organizations: OrganizationState[], trade: TradeState, day: number): void {
  for (const organization of organizations) {
    const period = periodFor(state, organization.id, day);
    const receivables = state.invoices.filter((invoice) => invoice.sellerOrganizationId === organization.id && !['paid', 'defaulted'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0);
    const payables = state.invoices.filter((invoice) => invoice.buyerOrganizationId === organization.id && !['paid', 'defaulted'].includes(invoice.status)).reduce((sum, invoice) => sum + invoice.total - invoice.paidAmount, 0);
    const inventoryValue = trade.inventory.filter((lot) => lot.organizationId === organization.id).reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0);
    const debt = state.creditFacilities.filter((facility) => facility.organizationId === organization.id).reduce((sum, facility) => sum + facility.drawn, 0)
      + state.loans.filter((loan) => loan.organizationId === organization.id && loan.status === 'active').reduce((sum, loan) => sum + loan.outstanding, 0);
    const grossProfit = period.revenue - period.cogs;
    const netIncome = grossProfit - period.operatingExpenses - period.depreciation - period.interest - period.taxes;
    state.statements.push({
      id: `financial-statement-${state.nextStatementNumber++}`,
      organizationId: organization.id,
      periodStartDay: period.periodStartDay,
      periodEndDay: day,
      revenue: roundMoney(period.revenue),
      cogs: roundMoney(period.cogs),
      grossProfit: roundMoney(grossProfit),
      operatingExpenses: roundMoney(period.operatingExpenses),
      depreciation: roundMoney(period.depreciation),
      interest: roundMoney(period.interest),
      taxes: roundMoney(period.taxes),
      netIncome: roundMoney(netIncome),
      operatingCashFlow: roundMoney(netIncome + period.depreciation - receivables + payables),
      receivables: roundMoney(receivables),
      payables: roundMoney(payables),
      inventoryValue: roundMoney(inventoryValue),
      cash: roundMoney(organization.cash),
      debt: roundMoney(debt),
      workingCapital: roundMoney(organization.cash + receivables + inventoryValue - payables),
    });
    Object.assign(period, emptyPeriod(organization.id, day + 1));
  }
  if (state.statements.length > 720) state.statements = state.statements.slice(-720);
}

function periodFor(state: FinancialSystemState, organizationId: string, day: number): FinancialPeriodAccumulator {
  let period = state.periods.find((item) => item.organizationId === organizationId);
  if (!period) {
    period = emptyPeriod(organizationId, day);
    state.periods.push(period);
  }
  return period;
}

function emptyPeriod(organizationId: string, day: number): FinancialPeriodAccumulator {
  return { organizationId, periodStartDay: day, revenue: 0, cogs: 0, operatingExpenses: 0, depreciation: 0, interest: 0, taxes: 0 };
}

function dailyDepreciation(assets: WorldAssetState[], organizationId: string): number {
  return roundMoney(assets.filter((asset) => asset.ownerOrganizationId === organizationId).reduce((sum, asset) => sum + Math.max(0, asset.askingPrice) / 3650, 0));
}

function paymentTermFor(contract: TradeContractState | undefined, buyer: OrganizationState): PaymentTerm {
  if (buyer.status === 'strained' || buyer.status === 'insolvent') return 'net_7';
  if (contract?.commodityKind === 'ingredient') return 'net_14';
  if (buyer.kind === 'distributor' || buyer.kind === 'retailer') return 'net_30';
  if (buyer.kind === 'hospitality') return 'net_14';
  return 'net_7';
}

function paymentTermDays(term: PaymentTerm): number {
  return ({ prepaid: 0, due_on_receipt: 0, net_7: 7, net_14: 14, net_30: 30 })[term];
}

function liquidityReserve(organization: OrganizationState): number {
  return roundMoney(Math.max(800, organization.dailyCosts * 4));
}

function bankForCountry(countryId: string): BankState {
  return BANKS.find((bank) => bank.countryId === countryId) ?? BANKS[0]!;
}

function accountNumber(seed: string): string {
  const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12).padEnd(12, '0');
  return `DC${clean}`;
}

function riskPremium(organization: OrganizationState): number {
  return organization.status === 'insolvent' ? .12 : organization.status === 'strained' ? .055 : Math.max(.008, (70 - organization.reputation) / 1000);
}

function roundRate(value: number): number { return Math.round(value * 10_000) / 10_000; }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
