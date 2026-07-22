import type { EcosystemState, OrganizationState } from './ecosystem';
import type { TradeContractState, TradeProductFamily, TradeProductState } from './trade';

export type OrganizationStrategy =
  | 'survival'
  | 'deleveraging'
  | 'volume_growth'
  | 'premium'
  | 'shelf_capture'
  | 'regional_expansion'
  | 'vertical_integration'
  | 'acquisitions'
  | 'innovation';

export type LeaderRole = 'founder' | 'director' | 'technologist' | 'investor' | 'heir';
export type MemoryKind = 'supply_failure' | 'reliable_partner' | 'profitable_deal' | 'product_success' | 'product_failure' | 'acquisition' | 'asset_loss' | 'rescue' | 'rivalry';
export type ChronicleKind = 'strategy' | 'leadership' | 'product' | 'contract' | 'finance' | 'ownership' | 'crisis';

export interface LeaderProfile {
  id: string;
  organizationId: string;
  name: string;
  role: LeaderRole;
  ambition: number;
  caution: number;
  greed: number;
  loyalty: number;
  riskTolerance: number;
  influence: number;
  active: boolean;
  appointedDay: number;
}

export interface OrganizationMind {
  organizationId: string;
  strategy: OrganizationStrategy;
  objective: string;
  targetOrganizationId: string | null;
  targetAssetId: string | null;
  targetProductId: string | null;
  confidence: number;
  pressure: number;
  startedDay: number;
  reviewDay: number;
  decisionCooldownUntil: number;
  previousStrategy: OrganizationStrategy | null;
}

export interface OrganizationRelation {
  id: string;
  organizationAId: string;
  organizationBId: string;
  trust: number;
  rivalry: number;
  dependency: number;
  lastInteractionDay: number;
  reason: string;
}

export interface OrganizationMemory {
  id: string;
  organizationId: string;
  counterpartyOrganizationId: string | null;
  productId: string | null;
  day: number;
  kind: MemoryKind;
  weight: number;
  summary: string;
}

export interface WorldChronicleEntry {
  id: string;
  day: number;
  kind: ChronicleKind;
  organizationIds: string[];
  productId: string | null;
  headline: string;
  detail: string;
  tone: 'market' | 'warning' | 'release';
}

export interface WorldIntelligenceState {
  leaders: LeaderProfile[];
  minds: OrganizationMind[];
  relations: OrganizationRelation[];
  memories: OrganizationMemory[];
  chronicle: WorldChronicleEntry[];
  nextLeaderNumber: number;
  nextMemoryNumber: number;
  nextChronicleNumber: number;
}

export interface IntelligenceAdvanceResult {
  ecosystem: EcosystemState;
  events: { title: string; detail: string; tone: 'market' | 'warning' | 'release' }[];
}

const FIRST_NAMES = ['Adrian', 'Marta', 'Jonas', 'Elise', 'Victor', 'Nora', 'Leon', 'Sabine', 'Matteo', 'Claire', 'Hugo', 'Anika', 'Oskar', 'Sofia', 'Theo', 'Mila'];
const LAST_NAMES = ['Keller', 'Moreau', 'Weber', 'Fischer', 'Laurent', 'Bernard', 'Vogel', 'Roth', 'Bauer', 'Mercier', 'Klein', 'Schmitt', 'Wagner', 'Dubois', 'Hartmann', 'Renard'];

export function createWorldIntelligenceState(organizations: OrganizationState[], day: number): WorldIntelligenceState {
  let nextLeaderNumber = 1;
  const leaders: LeaderProfile[] = [];
  const minds = organizations.map((organization, index) => {
    if (organization.kind === 'player') {
      leaders.push(createLeader(nextLeaderNumber++, organization, 'founder', day, 'Игрок'));
    } else {
      leaders.push(createLeader(nextLeaderNumber++, organization, organization.kind === 'holding' ? 'investor' : 'founder', Math.max(1, organization.foundedDay)));
      leaders.push(createLeader(nextLeaderNumber++, organization, 'director', day - (index % 90)));
      if (organization.kind === 'producer' || organization.kind === 'supplier') {
        leaders.push(createLeader(nextLeaderNumber++, organization, 'technologist', day - (index % 50)));
      }
    }
    return createMind(organization, day);
  });

  return {
    leaders,
    minds,
    relations: [],
    memories: [],
    chronicle: [{
      id: 'chronicle-world-founded',
      day,
      kind: 'strategy',
      organizationIds: organizations.map((organization) => organization.id),
      productId: null,
      headline: 'Деловая сеть зафиксирована',
      detail: 'Организации получили руководителей, цели и собственную память о партнёрах.',
      tone: 'market',
    }],
    nextLeaderNumber,
    nextMemoryNumber: 1,
    nextChronicleNumber: 2,
  };
}

export function normalizeWorldIntelligenceState(value: WorldIntelligenceState | null | undefined, organizations: OrganizationState[], day: number): WorldIntelligenceState {
  const base = value ?? createWorldIntelligenceState(organizations, day);
  let nextLeaderNumber = base.nextLeaderNumber ?? 1;
  const leaders = [...(base.leaders ?? [])];
  const minds = [...(base.minds ?? [])];

  for (const organization of organizations) {
    if (!minds.some((mind) => mind.organizationId === organization.id)) minds.push(createMind(organization, day));
    if (!leaders.some((leader) => leader.organizationId === organization.id && leader.active)) {
      leaders.push(createLeader(nextLeaderNumber++, organization, organization.kind === 'player' ? 'founder' : 'director', day, organization.kind === 'player' ? 'Игрок' : undefined));
    }
  }

  return {
    leaders,
    minds,
    relations: base.relations ?? [],
    memories: base.memories ?? [],
    chronicle: base.chronicle ?? [],
    nextLeaderNumber,
    nextMemoryNumber: base.nextMemoryNumber ?? 1,
    nextChronicleNumber: base.nextChronicleNumber ?? 1,
  };
}

export function advanceWorldIntelligence(state: EcosystemState, day: number): IntelligenceAdvanceResult {
  let intelligence = normalizeWorldIntelligenceState(state.intelligence, state.organizations, day);
  let ecosystem: EcosystemState = { ...state, intelligence };
  const events: IntelligenceAdvanceResult['events'] = [];

  intelligence = rememberDailyOperations(ecosystem, day, intelligence);
  intelligence = refreshRelations(ecosystem, day, intelligence);
  ecosystem = { ...ecosystem, intelligence };

  for (const organization of ecosystem.organizations) {
    const currentMind = intelligence.minds.find((mind) => mind.organizationId === organization.id);
    if (!currentMind) continue;
    const reviewed = shouldReviewMind(organization, currentMind, day)
      ? reviewMind(ecosystem, organization, currentMind, day)
      : currentMind;
    intelligence = {
      ...intelligence,
      minds: intelligence.minds.map((mind) => mind.organizationId === reviewed.organizationId ? reviewed : mind),
    };
    if (reviewed.strategy !== currentMind.strategy) {
      intelligence = appendChronicle(
        intelligence,
        day,
        'strategy',
        [organization.id],
        null,
        `${organization.name} меняет курс`,
        `${strategyLabel(currentMind.strategy)} уступает стратегии «${strategyLabel(reviewed.strategy)}». ${reviewed.objective}`,
        organization.status === 'active' ? 'market' : 'warning',
      );
    }
    ecosystem = { ...ecosystem, intelligence };

    if (organization.kind === 'player' || day < reviewed.decisionCooldownUntil || organization.status === 'acquired') continue;
    const decision = executeStrategyDecision(ecosystem, organization.id, reviewed, day);
    ecosystem = decision.ecosystem;
    intelligence = ecosystem.intelligence;
    if (decision.event) events.push(decision.event);
  }

  const leadership = resolveLeadershipPressure(ecosystem, day);
  ecosystem = leadership.ecosystem;
  events.push(...leadership.events);

  return { ecosystem, events };
}

export function strategyLabel(strategy: OrganizationStrategy): string {
  const labels: Record<OrganizationStrategy, string> = {
    survival: 'Выживание',
    deleveraging: 'Сокращение долгов',
    volume_growth: 'Рост объёма',
    premium: 'Премиальный сегмент',
    shelf_capture: 'Захват полок',
    regional_expansion: 'Новый регион',
    vertical_integration: 'Вертикальная интеграция',
    acquisitions: 'Поглощения',
    innovation: 'Новые продукты',
  };
  return labels[strategy];
}

export function leaderRoleLabel(role: LeaderRole): string {
  const labels: Record<LeaderRole, string> = {
    founder: 'Основатель', director: 'Директор', technologist: 'Главный технолог', investor: 'Инвестор', heir: 'Наследник',
  };
  return labels[role];
}

function createLeader(number: number, organization: OrganizationState, role: LeaderRole, appointedDay: number, forcedName?: string): LeaderProfile {
  const seed = hash(`${organization.id}-${role}`);
  return {
    id: `leader-${number}`,
    organizationId: organization.id,
    name: forcedName ?? `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / 7) % LAST_NAMES.length]}`,
    role,
    ambition: stat(seed, 3),
    caution: stat(seed, 7),
    greed: stat(seed, 11),
    loyalty: stat(seed, 17),
    riskTolerance: stat(seed, 23),
    influence: role === 'founder' || role === 'investor' ? 88 : role === 'director' ? 76 : 61,
    active: true,
    appointedDay: Math.max(1, appointedDay),
  };
}

function createMind(organization: OrganizationState, day: number): OrganizationMind {
  const strategy = chooseStrategy(organization, [], null);
  return {
    organizationId: organization.id,
    strategy,
    objective: objectiveFor(strategy, organization),
    targetOrganizationId: null,
    targetAssetId: null,
    targetProductId: null,
    confidence: organization.status === 'active' ? 62 : 38,
    pressure: organization.status === 'active' ? 18 : organization.status === 'strained' ? 68 : 92,
    startedDay: day,
    reviewDay: day + 8 + hash(organization.id) % 8,
    decisionCooldownUntil: day + 2 + hash(`${organization.id}-decision`) % 5,
    previousStrategy: null,
  };
}

function shouldReviewMind(organization: OrganizationState, mind: OrganizationMind, day: number): boolean {
  return day >= mind.reviewDay || organization.status === 'insolvent' || (organization.status === 'strained' && mind.strategy !== 'survival' && mind.strategy !== 'deleveraging');
}

function reviewMind(state: EcosystemState, organization: OrganizationState, mind: OrganizationMind, day: number): OrganizationMind {
  const memories = state.intelligence.memories.filter((memory) => memory.organizationId === organization.id).slice(0, 12);
  const leader = strongestLeader(state.intelligence, organization.id);
  const strategy = chooseStrategy(organization, memories, leader);
  const changed = strategy !== mind.strategy;
  return {
    ...mind,
    previousStrategy: changed ? mind.strategy : mind.previousStrategy,
    strategy,
    objective: objectiveFor(strategy, organization),
    confidence: clamp((organization.reputation + (leader?.ambition ?? 50)) / 2 - (organization.status === 'insolvent' ? 28 : 0), 15, 94),
    pressure: organization.status === 'insolvent' ? 96 : organization.status === 'strained' ? 72 : clamp(35 + organization.debt / Math.max(1, organization.valuation) * 40, 12, 68),
    startedDay: changed ? day : mind.startedDay,
    reviewDay: day + 9 + hash(`${organization.id}-${day}`) % 10,
    decisionCooldownUntil: Math.min(mind.decisionCooldownUntil, day),
  };
}

function chooseStrategy(organization: OrganizationState, memories: OrganizationMemory[], leader: LeaderProfile | null): OrganizationStrategy {
  if (organization.status === 'insolvent') return 'survival';
  if (organization.status === 'strained' || organization.debt > organization.valuation * .48) return 'deleveraging';
  const failures = memories.filter((memory) => memory.kind === 'supply_failure' || memory.kind === 'product_failure').reduce((sum, memory) => sum + memory.weight, 0);
  if (failures > 20) return organization.kind === 'producer' ? 'vertical_integration' : 'survival';
  const risk = leader?.riskTolerance ?? 50;
  const ambition = leader?.ambition ?? 50;
  if (organization.kind === 'supplier') return risk > 62 ? 'vertical_integration' : 'volume_growth';
  if (organization.kind === 'holding') return ambition > 62 ? 'acquisitions' : 'deleveraging';
  if (organization.kind === 'hospitality' || organization.kind === 'retailer') return ambition > 58 ? 'shelf_capture' : 'regional_expansion';
  if (organization.kind === 'producer') {
    if (organization.cash > organization.valuation * .42 && ambition > 70) return 'acquisitions';
    if (risk > 72) return 'innovation';
    if ((leader?.caution ?? 50) > 68) return 'premium';
    return ambition > 55 ? 'volume_growth' : 'premium';
  }
  return 'volume_growth';
}

function executeStrategyDecision(state: EcosystemState, organizationId: string, mind: OrganizationMind, day: number): { ecosystem: EcosystemState; event: IntelligenceAdvanceResult['events'][number] | null } {
  const organization = state.organizations.find((item) => item.id === organizationId);
  if (!organization) return { ecosystem: state, event: null };
  let ecosystem = state;
  let headline = '';
  let detail = '';
  let tone: 'market' | 'warning' | 'release' = 'market';
  let productId: string | null = null;

  switch (mind.strategy) {
    case 'survival': {
      const weakest = weakestProduct(ecosystem, organizationId);
      if (weakest && weakest.status === 'active') {
        ecosystem = { ...ecosystem, trade: { ...ecosystem.trade, products: ecosystem.trade.products.map((product) => product.id === weakest.id ? { ...product, status: 'paused' } : product) } };
        headline = `${organization.name} останавливает ${weakest.name}`;
        detail = 'Компания сохраняет деньги и освобождает мощности после слабых продаж.';
        productId = weakest.id;
      } else {
        ecosystem = updateOrganization(ecosystem, organizationId, (item) => ({ ...item, dailyCosts: roundMoney(item.dailyCosts * .96) }));
        headline = `${organization.name} режет расходы`;
        detail = 'Руководство сокращает смены и откладывает часть закупок.';
      }
      tone = 'warning';
      break;
    }
    case 'deleveraging': {
      const payment = Math.max(0, Math.min(organization.debt, organization.cash - Math.max(8_000, organization.dailyCosts * 8), organization.debt * .06));
      if (payment >= 500) {
        ecosystem = updateOrganization(ecosystem, organizationId, (item) => ({ ...item, cash: roundMoney(item.cash - payment), debt: roundMoney(item.debt - payment) }));
        headline = `${organization.name} сокращает долг`;
        detail = `В кредиторам направлено ${roundMoney(payment)}. Инвестиции временно ограничены.`;
      } else {
        ecosystem = updateOrganization(ecosystem, organizationId, (item) => ({ ...item, dailyCosts: roundMoney(item.dailyCosts * .98) }));
        headline = `${organization.name} замораживает расходы`;
        detail = 'Свободных денег для крупного платежа нет; руководство удерживает ликвидность.';
      }
      break;
    }
    case 'premium': {
      const best = strongestProduct(ecosystem, organizationId);
      if (best && organization.cash >= 1_800) {
        ecosystem = updateOrganization(ecosystem, organizationId, (item) => ({ ...item, cash: roundMoney(item.cash - 1_800), reputation: clamp(item.reputation + .4, 0, 100) }));
        ecosystem = { ...ecosystem, trade: { ...ecosystem.trade, products: ecosystem.trade.products.map((product) => product.id === best.id ? { ...product, quality: clamp(product.quality + 1, 1, 100), wholesalePrice: roundMoney(product.wholesalePrice * 1.025), recommendedRetailPrice: roundMoney(product.recommendedRetailPrice * 1.03) } : product) } };
        headline = `${organization.name} усиливает ${best.name}`;
        detail = 'Партия получает более строгий контроль качества и более высокую цену.';
        productId = best.id;
      }
      break;
    }
    case 'volume_growth': {
      const ownProductIds = new Set(ecosystem.trade.products.filter((product) => product.producerOrganizationId === organizationId && product.status === 'active').map((product) => product.id));
      const contracts = ecosystem.trade.contracts.map((contract) => ownProductIds.has(contract.commodityId) && contract.status === 'active'
        ? { ...contract, quantity: Math.round(contract.quantity * 1.12), unitPrice: roundMoney(contract.unitPrice * .985) }
        : contract);
      if (contracts.some((contract, index) => contract.quantity !== ecosystem.trade.contracts[index]?.quantity)) {
        ecosystem = { ...ecosystem, trade: { ...ecosystem.trade, contracts } };
        headline = `${organization.name} наращивает объём`;
        detail = 'Компания увеличивает регулярные поставки и немного снижает оптовую цену.';
      }
      break;
    }
    case 'shelf_capture': {
      const result = createShelfContract(ecosystem, organization, day);
      ecosystem = result.ecosystem;
      headline = result.headline;
      detail = result.detail;
      productId = result.productId;
      break;
    }
    case 'vertical_integration': {
      const result = secureIngredientContract(ecosystem, organization, day);
      ecosystem = result.ecosystem;
      headline = result.headline;
      detail = result.detail;
      break;
    }
    case 'innovation': {
      const result = launchNpcProduct(ecosystem, organization, day);
      ecosystem = result.ecosystem;
      headline = result.headline;
      detail = result.detail;
      productId = result.productId;
      tone = 'release';
      break;
    }
    case 'regional_expansion': {
      const candidate = ecosystem.assets.find((asset) => asset.status === 'vacant' && asset.ownerOrganizationId !== organizationId);
      if (candidate) {
        ecosystem = { ...ecosystem, intelligence: { ...ecosystem.intelligence, minds: ecosystem.intelligence.minds.map((item) => item.organizationId === organizationId ? { ...item, targetAssetId: candidate.id } : item) } };
        headline = `${organization.name} изучает ${candidate.city}`;
        detail = `Целью стала площадка «${candidate.name}». Компания готовит расчёт аренды и потока покупателей.`;
      }
      break;
    }
    case 'acquisitions': {
      const target = ecosystem.organizations.filter((item) => item.id !== organizationId && item.kind !== 'player' && item.status !== 'acquired').sort((a, b) => a.valuation - b.valuation).find((item) => item.valuation < organization.cash * .9);
      if (target) {
        ecosystem = { ...ecosystem, intelligence: { ...ecosystem.intelligence, minds: ecosystem.intelligence.minds.map((item) => item.organizationId === organizationId ? { ...item, targetOrganizationId: target.id } : item) } };
        headline = `${organization.name} присматривается к ${target.name}`;
        detail = 'Совет директоров начал оценку активов, долгов и контрактов потенциальной цели.';
      }
      break;
    }
  }

  const cooldown = day + 4 + hash(`${organizationId}-${day}-${mind.strategy}`) % 7;
  let intelligence = ecosystem.intelligence;
  intelligence = {
    ...intelligence,
    minds: intelligence.minds.map((item) => item.organizationId === organizationId ? { ...item, decisionCooldownUntil: cooldown } : item),
  };
  if (!headline) return { ecosystem: { ...ecosystem, intelligence }, event: null };
  intelligence = appendChronicle(intelligence, day, mind.strategy === 'innovation' ? 'product' : mind.strategy === 'deleveraging' ? 'finance' : 'strategy', [organizationId], productId, headline, detail, tone);
  return { ecosystem: { ...ecosystem, intelligence }, event: { title: headline, detail, tone } };
}

function rememberDailyOperations(state: EcosystemState, day: number, intelligence: WorldIntelligenceState): WorldIntelligenceState {
  let result = intelligence;
  const existingKeys = new Set(result.memories.map((memory) => `${memory.day}:${memory.organizationId}:${memory.summary}`));
  for (const operation of state.trade.operations.filter((item) => item.day === day)) {
    const kind: MemoryKind = operation.kind === 'shortage' || operation.kind === 'stockout'
      ? 'supply_failure'
      : operation.kind === 'sale' || operation.kind === 'delivery'
        ? 'profitable_deal'
        : operation.kind === 'release'
          ? 'product_success'
          : operation.kind === 'discontinued'
            ? 'product_failure'
            : 'reliable_partner';
    const weight = kind === 'supply_failure' || kind === 'product_failure' ? 9 : 5;
    const key = `${day}:${operation.organizationId}:${operation.headline}`;
    if (existingKeys.has(key)) continue;
    result = appendMemory(result, day, operation.organizationId, operation.counterpartyOrganizationId, null, kind, weight, operation.headline);
    if (operation.counterpartyOrganizationId) {
      result = appendMemory(result, day, operation.counterpartyOrganizationId, operation.organizationId, null, kind === 'supply_failure' ? 'rivalry' : 'reliable_partner', weight, operation.headline);
    }
  }
  for (const transaction of state.transactions.filter((item) => item.day === day)) {
    const kind: MemoryKind = transaction.kind === 'bankruptcy' ? 'asset_loss' : transaction.kind === 'capital_injection' ? 'rescue' : 'acquisition';
    for (const organizationId of [transaction.buyerOrganizationId, transaction.sellerOrganizationId, transaction.organizationId].filter((id): id is string => Boolean(id))) {
      result = appendMemory(result, day, organizationId, organizationId === transaction.buyerOrganizationId ? transaction.sellerOrganizationId : transaction.buyerOrganizationId, null, kind, transaction.amount > 0 ? 12 : 8, transaction.headline);
    }
  }
  return { ...result, memories: result.memories.slice(0, 420) };
}

function refreshRelations(state: EcosystemState, day: number, intelligence: WorldIntelligenceState): WorldIntelligenceState {
  const pairs = new Map<string, OrganizationRelation>();
  for (const relation of intelligence.relations) pairs.set(pairKey(relation.organizationAId, relation.organizationBId), relation);
  for (const contract of state.trade.contracts) {
    const key = pairKey(contract.sellerOrganizationId, contract.buyerOrganizationId);
    const [organizationAId, organizationBId] = orderedPair(contract.sellerOrganizationId, contract.buyerOrganizationId);
    const previous = pairs.get(key);
    const failurePenalty = contract.failures * 7;
    const dependency = clamp((previous?.dependency ?? 20) + (contract.status === 'active' ? 1.2 : -2), 0, 100);
    pairs.set(key, {
      id: previous?.id ?? `relation-${organizationAId}-${organizationBId}`,
      organizationAId,
      organizationBId,
      trust: clamp((previous?.trust ?? 5) + (contract.failures === 0 ? .35 : -failurePenalty), -100, 100),
      rivalry: clamp((previous?.rivalry ?? 0) + (contract.status === 'broken' ? 6 : -.1), 0, 100),
      dependency,
      lastInteractionDay: day,
      reason: contract.lastResult,
    });
  }
  return { ...intelligence, relations: [...pairs.values()].sort((a, b) => b.dependency - a.dependency).slice(0, 260) };
}

function resolveLeadershipPressure(state: EcosystemState, day: number): IntelligenceAdvanceResult {
  let ecosystem = state;
  const events: IntelligenceAdvanceResult['events'] = [];
  for (const organization of ecosystem.organizations.filter((item) => item.kind !== 'player' && item.status !== 'acquired')) {
    const director = ecosystem.intelligence.leaders.find((leader) => leader.organizationId === organization.id && leader.role === 'director' && leader.active);
    const mind = ecosystem.intelligence.minds.find((item) => item.organizationId === organization.id);
    if (!director || !mind || day - director.appointedDay < 24) continue;
    const poorPerformance = organization.status !== 'active' || organization.dailyRevenue < organization.dailyCosts * .72;
    const conflictScore = mind.pressure + director.ambition - director.loyalty - director.caution / 2;
    if (!poorPerformance || conflictScore < 82 || day % 7 !== hash(organization.id) % 7) continue;

    const nextLeader = createLeader(ecosystem.intelligence.nextLeaderNumber, organization, 'director', day);
    nextLeader.ambition = clamp(nextLeader.ambition + 8, 1, 100);
    let intelligence: WorldIntelligenceState = {
      ...ecosystem.intelligence,
      leaders: [...ecosystem.intelligence.leaders.map((leader) => leader.id === director.id ? { ...leader, active: false } : leader), nextLeader],
      nextLeaderNumber: ecosystem.intelligence.nextLeaderNumber + 1,
    };
    const headline = `${organization.name} меняет директора`;
    const detail = `${director.name} уходит после слабого периода. Управление принимает ${nextLeader.name}.`;
    intelligence = appendChronicle(intelligence, day, 'leadership', [organization.id], null, headline, detail, 'warning');
    ecosystem = { ...ecosystem, intelligence };
    events.push({ title: headline, detail, tone: 'warning' });
  }
  return { ecosystem, events };
}

function createShelfContract(state: EcosystemState, organization: OrganizationState, day: number): { ecosystem: EcosystemState; headline: string; detail: string; productId: string | null } {
  const product = strongestProduct(state, organization.id);
  if (!product) return { ecosystem: state, headline: '', detail: '', productId: null };
  const existingBuyerAssetIds = new Set(state.trade.contracts.filter((contract) => contract.sellerOrganizationId === organization.id && contract.commodityKind === 'product' && contract.status === 'active').map((contract) => contract.buyerAssetId));
  const targetAsset = state.assets.find((asset) => (asset.type === 'bar' || asset.type === 'shop') && asset.operatorOrganizationId && !existingBuyerAssetIds.has(asset.id) && asset.operatorOrganizationId !== organization.id);
  if (!targetAsset?.operatorOrganizationId) return { ecosystem: state, headline: '', detail: '', productId: null };
  const contract: TradeContractState = {
    id: `trade-contract-${state.trade.nextContractNumber}`,
    sellerOrganizationId: organization.id,
    buyerOrganizationId: targetAsset.operatorOrganizationId,
    buyerAssetId: targetAsset.id,
    commodityKind: 'product',
    commodityId: product.id,
    quantity: 24 + hash(`${organization.id}-${targetAsset.id}`) % 25,
    unitPrice: product.wholesalePrice,
    intervalDays: 4 + hash(targetAsset.id) % 3,
    nextDeliveryDay: day + 1,
    status: 'active',
    failures: 0,
    lastResult: 'Новый контракт подписан',
  };
  return {
    ecosystem: { ...state, trade: { ...state.trade, contracts: [...state.trade.contracts, contract], nextContractNumber: state.trade.nextContractNumber + 1 } },
    headline: `${organization.name} получает новую полку`,
    detail: `${product.name} войдёт в ассортимент «${targetAsset.name}».`,
    productId: product.id,
  };
}

function secureIngredientContract(state: EcosystemState, organization: OrganizationState, day: number): { ecosystem: EcosystemState; headline: string; detail: string } {
  const existing = state.trade.contracts.filter((contract) => contract.buyerOrganizationId === organization.id && contract.commodityKind === 'ingredient' && contract.status === 'active');
  const supplier = state.organizations.find((item) => item.kind === 'supplier' && item.status === 'active' && !existing.some((contract) => contract.sellerOrganizationId === item.id));
  const ingredientLot = supplier ? state.trade.inventory.find((lot) => lot.organizationId === supplier.id && lot.commodityKind === 'ingredient' && lot.quantity > 10) : null;
  if (!supplier || !ingredientLot) return { ecosystem: state, headline: '', detail: '' };
  const contract: TradeContractState = {
    id: `trade-contract-${state.trade.nextContractNumber}`,
    sellerOrganizationId: supplier.id,
    buyerOrganizationId: organization.id,
    buyerAssetId: null,
    commodityKind: 'ingredient',
    commodityId: ingredientLot.commodityId,
    quantity: Math.max(10, Math.round(ingredientLot.quantity * .08)),
    unitPrice: roundMoney(ingredientLot.unitCost * 1.35),
    intervalDays: 5,
    nextDeliveryDay: day + 1,
    status: 'active',
    failures: 0,
    lastResult: 'Прямой контракт подписан',
  };
  return {
    ecosystem: { ...state, trade: { ...state.trade, contracts: [...state.trade.contracts, contract], nextContractNumber: state.trade.nextContractNumber + 1 } },
    headline: `${organization.name} фиксирует сырьё`,
    detail: `Прямой контракт с ${supplier.name} снижает зависимость от старой цепочки.`,
  };
}

function launchNpcProduct(state: EcosystemState, organization: OrganizationState, day: number): { ecosystem: EcosystemState; headline: string; detail: string; productId: string | null } {
  if (organization.kind !== 'producer' || organization.cash < 4_500) return { ecosystem: state, headline: '', detail: '', productId: null };
  const activeProducts = state.trade.products.filter((product) => product.producerOrganizationId === organization.id && product.status === 'active');
  if (activeProducts.length >= 3) return { ecosystem: state, headline: '', detail: '', productId: null };
  const family = nextFamily(activeProducts[0]?.family ?? 'beer', hash(`${organization.id}-${day}`));
  const number = state.trade.nextProductNumber;
  const product: TradeProductState = {
    id: `trade-product-${number}`,
    producerOrganizationId: organization.id,
    name: innovationName(organization.name, family, number),
    family,
    style: strategyStyle(family),
    quality: clamp(Math.round(organization.reputation * .72 + 22), 45, 94),
    unitCost: roundMoney(1.1 + (hash(organization.id) % 80) / 100),
    wholesalePrice: roundMoney(2.8 + (hash(`${organization.id}-price`) % 130) / 100),
    recommendedRetailPrice: roundMoney(5.2 + (hash(`${organization.id}-retail`) % 220) / 100),
    beverageCategoryId: family === 'wine' ? 'still_wine' : family === 'spirit' ? 'whisky' : family,
    alcoholByVolume: family === 'wine' ? 12.5 : family === 'spirit' ? 40 : family === 'liqueur' ? 24 : family === 'alcohol_free' ? .5 : family === 'cider' ? 5.5 : 5,
    packageVolumeLiters: family === 'wine' || family === 'spirit' || family === 'liqueur' ? .75 : .5,
    status: 'active',
    totalProduced: 0,
    totalSold: 0,
    slowDays: 0,
    stockoutDays: 0,
    createdDay: day,
  };
  return {
    ecosystem: {
      ...updateOrganization(state, organization.id, (item) => ({ ...item, cash: roundMoney(item.cash - 4_500) })),
      trade: { ...state.trade, products: [...state.trade.products, product], nextProductNumber: number + 1 },
    },
    headline: `${organization.name} выпускает ${product.name}`,
    detail: `Новая линейка ${product.family} проходит первый коммерческий цикл.`,
    productId: product.id,
  };
}

function strongestLeader(intelligence: WorldIntelligenceState, organizationId: string): LeaderProfile | null {
  return intelligence.leaders.filter((leader) => leader.organizationId === organizationId && leader.active).sort((a, b) => b.influence - a.influence)[0] ?? null;
}

function strongestProduct(state: EcosystemState, organizationId: string): TradeProductState | null {
  return state.trade.products.filter((product) => product.producerOrganizationId === organizationId && product.status === 'active').sort((a, b) => (b.totalSold + b.quality * 2) - (a.totalSold + a.quality * 2))[0] ?? null;
}

function weakestProduct(state: EcosystemState, organizationId: string): TradeProductState | null {
  return state.trade.products.filter((product) => product.producerOrganizationId === organizationId && product.status !== 'discontinued').sort((a, b) => (a.totalSold - a.slowDays * 4 + a.quality) - (b.totalSold - b.slowDays * 4 + b.quality))[0] ?? null;
}

function updateOrganization(state: EcosystemState, organizationId: string, update: (organization: OrganizationState) => OrganizationState): EcosystemState {
  return { ...state, organizations: state.organizations.map((organization) => organization.id === organizationId ? update(organization) : organization) };
}

function appendMemory(state: WorldIntelligenceState, day: number, organizationId: string, counterpartyOrganizationId: string | null, productId: string | null, kind: MemoryKind, weight: number, summary: string): WorldIntelligenceState {
  const memory: OrganizationMemory = { id: `memory-${state.nextMemoryNumber}`, organizationId, counterpartyOrganizationId, productId, day, kind, weight, summary };
  return { ...state, memories: [memory, ...state.memories], nextMemoryNumber: state.nextMemoryNumber + 1 };
}

function appendChronicle(state: WorldIntelligenceState, day: number, kind: ChronicleKind, organizationIds: string[], productId: string | null, headline: string, detail: string, tone: WorldChronicleEntry['tone']): WorldIntelligenceState {
  const entry: WorldChronicleEntry = { id: `chronicle-${state.nextChronicleNumber}`, day, kind, organizationIds, productId, headline, detail, tone };
  return { ...state, chronicle: [entry, ...state.chronicle].slice(0, 260), nextChronicleNumber: state.nextChronicleNumber + 1 };
}

function objectiveFor(strategy: OrganizationStrategy, organization: OrganizationState): string {
  const objectives: Record<OrganizationStrategy, string> = {
    survival: 'Сохранить ликвидность и удержать ключевой актив.',
    deleveraging: 'Снизить долг без остановки основной деятельности.',
    volume_growth: 'Увеличить регулярные поставки и загрузку мощностей.',
    premium: 'Поднять качество, цену и статус ключевого продукта.',
    shelf_capture: 'Получить новые точки продаж и удержать полочное пространство.',
    regional_expansion: 'Найти объект и покупателей в новом городе.',
    vertical_integration: 'Закрепить сырьё и сократить зависимость от посредников.',
    acquisitions: 'Найти слабую компанию или актив для поглощения.',
    innovation: 'Запустить новую продуктовую линейку.',
  };
  return `${objectives[strategy]} Текущий фокус: ${organization.strategy}.`;
}

function orderedPair(a: string, b: string): [string, string] { return a < b ? [a, b] : [b, a]; }
function pairKey(a: string, b: string): string { return orderedPair(a, b).join('::'); }
function stat(seed: number, shift: number): number { return 28 + ((seed >>> (shift % 16)) + seed * shift) % 68; }
function hash(value: string): number { let result = 2166136261; for (let index = 0; index < value.length; index += 1) { result ^= value.charCodeAt(index); result = Math.imul(result, 16777619); } return result >>> 0; }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }

function nextFamily(current: TradeProductFamily, seed: number): TradeProductFamily {
  const families: TradeProductFamily[] = ['beer', 'cider', 'wine', 'spirit', 'liqueur', 'alcohol_free'];
  return families[(families.indexOf(current) + 1 + seed % 3) % families.length] ?? 'beer';
}
function strategyStyle(family: TradeProductFamily): string { return ({ beer: 'Dark Lager', cider: 'Dry Orchard', wine: 'Field Cuvée', spirit: 'Small Batch', liqueur: 'Herbal', alcohol_free: 'Fermented Botanical' } as Record<TradeProductFamily, string>)[family]; }
function innovationName(name: string, family: TradeProductFamily, number: number): string { const root = name.split(' ')[0] ?? 'House'; const suffix = ({ beer: 'Black', cider: 'Orchard', wine: 'Parcel', spirit: 'Reserve', liqueur: 'Noir', alcohol_free: 'Zero' } as Record<TradeProductFamily, string>)[family]; return `${root} ${suffix} ${number}`; }
