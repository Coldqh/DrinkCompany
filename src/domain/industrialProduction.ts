import { industrialBlueprintForCategory, type IndustrialVesselType } from '../data/industrialProcessCatalog';
import { processStages, type BeverageCategoryId, type ProcessStageId } from '../data/beverageCatalog';
import type { TradeProductState, TradeProductionBatchState } from './trade';

export type IndustrialPlanStatus = 'running' | 'maturing' | 'ready_for_packaging' | 'complete' | 'blocked';
export type IndustrialRunStatus = 'queued' | 'running' | 'complete' | 'failed';
export type IntermediateLotStatus = 'active' | 'consumed' | 'quarantined' | 'released';
export type MaturationStatus = 'aging' | 'ready' | 'drained';

export interface IndustrialIntermediateLot {
  id: string;
  ownerOrganizationId: string;
  productId: string;
  categoryId: BeverageCategoryId;
  batchId: string;
  stageId: ProcessStageId;
  quantityLiters: number;
  alcoholByVolume: number;
  quality: number;
  createdDay: number;
  sourceTradeLotIds: string[];
  sourceIntermediateLotIds: string[];
  status: IntermediateLotStatus;
}

export interface IndustrialProcessRun {
  id: string;
  planId: string;
  batchId: string;
  producerOrganizationId: string;
  productId: string;
  stageId: ProcessStageId;
  stageIndex: number;
  vesselType: IndustrialVesselType;
  status: IndustrialRunStatus;
  startDay: number;
  dueDay: number;
  inputLotIds: string[];
  outputLotId: string | null;
  inputVolumeLiters: number;
  outputVolumeLiters: number;
  qualityBefore: number;
  qualityAfter: number;
  alcoholBefore: number;
  alcoholAfter: number;
  note: string;
}

export interface IndustrialMaturationLot {
  id: string;
  planId: string;
  batchId: string;
  productId: string;
  producerOrganizationId: string;
  sourceIntermediateLotId: string;
  vesselType: IndustrialVesselType;
  enteredDay: number;
  minimumReleaseDay: number;
  targetReleaseDay: number;
  lastUpdatedDay: number;
  startingVolumeLiters: number;
  currentVolumeLiters: number;
  annualVolumeLossRate: number;
  ageDays: number;
  quality: number;
  status: MaturationStatus;
}

export interface IndustrialBlendComponent {
  categoryId?: BeverageCategoryId;
  productId?: string;
  minimumShare: number;
  maximumShare: number;
  targetShare: number;
}

export interface IndustrialBlendRecipe {
  id: string;
  producerOrganizationId: string;
  productId: string;
  name: string;
  createdDay: number;
  targetAlcoholByVolume: number;
  targetQuality: number;
  components: IndustrialBlendComponent[];
}

export interface IndustrialBatchPlan {
  id: string;
  batchId: string;
  producerOrganizationId: string;
  productId: string;
  categoryId: BeverageCategoryId;
  blueprintId: string;
  status: IndustrialPlanStatus;
  currentStageIndex: number;
  currentRunId: string | null;
  sourceTradeLotIds: string[];
  intermediateLotIds: string[];
  maturationLotIds: string[];
  blendRecipeId: string | null;
  plannedUnits: number;
  startingVolumeLiters: number;
  currentVolumeLiters: number;
  currentAlcoholByVolume: number;
  currentQuality: number;
  startDay: number;
  estimatedReadyDay: number;
  completedDay: number | null;
  issue: string | null;
}

export interface IndustrialProductionOperation {
  id: string;
  day: number;
  kind: 'stage_started' | 'stage_completed' | 'maturation_update' | 'batch_completed' | 'process_blocked';
  organizationId: string;
  productId: string;
  batchId: string;
  headline: string;
  detail: string;
}

export interface IndustrialProductionState {
  plans: IndustrialBatchPlan[];
  runs: IndustrialProcessRun[];
  intermediateLots: IndustrialIntermediateLot[];
  maturationLots: IndustrialMaturationLot[];
  blendRecipes: IndustrialBlendRecipe[];
  operations: IndustrialProductionOperation[];
  nextPlanNumber: number;
  nextRunNumber: number;
  nextIntermediateLotNumber: number;
  nextMaturationLotNumber: number;
  nextBlendRecipeNumber: number;
  nextOperationNumber: number;
}

export interface IndustrialAdvanceResult {
  industrial: IndustrialProductionState;
  batches: TradeProductionBatchState[];
  completedBatchIds: string[];
  events: Array<{ title: string; detail: string; tone: 'market' | 'warning' | 'release' }>;
}

export function createIndustrialProductionState(): IndustrialProductionState {
  return {
    plans: [], runs: [], intermediateLots: [], maturationLots: [], blendRecipes: [], operations: [],
    nextPlanNumber: 1, nextRunNumber: 1, nextIntermediateLotNumber: 1, nextMaturationLotNumber: 1, nextBlendRecipeNumber: 1, nextOperationNumber: 1,
  };
}

export function normalizeIndustrialProductionState(value: IndustrialProductionState | null | undefined): IndustrialProductionState {
  const base = createIndustrialProductionState();
  if (!value) return base;
  return {
    plans: (value.plans ?? []).map((item) => ({ ...item, sourceTradeLotIds: item.sourceTradeLotIds ?? [], intermediateLotIds: item.intermediateLotIds ?? [], maturationLotIds: item.maturationLotIds ?? [], blendRecipeId: item.blendRecipeId ?? null, completedDay: item.completedDay ?? null, issue: item.issue ?? null })),
    runs: (value.runs ?? []).map((item) => ({ ...item, inputLotIds: item.inputLotIds ?? [], outputLotId: item.outputLotId ?? null, note: item.note ?? '' })),
    intermediateLots: (value.intermediateLots ?? []).map((item) => ({ ...item, sourceTradeLotIds: item.sourceTradeLotIds ?? [], sourceIntermediateLotIds: item.sourceIntermediateLotIds ?? [] })),
    maturationLots: value.maturationLots ?? [],
    blendRecipes: (value.blendRecipes ?? []).map((item) => ({ ...item, components: item.components ?? [] })),
    operations: value.operations ?? [],
    nextPlanNumber: value.nextPlanNumber ?? inferNext(value.plans, 'industrial-plan-'),
    nextRunNumber: value.nextRunNumber ?? inferNext(value.runs, 'industrial-run-'),
    nextIntermediateLotNumber: value.nextIntermediateLotNumber ?? inferNext(value.intermediateLots, 'industrial-lot-'),
    nextMaturationLotNumber: value.nextMaturationLotNumber ?? inferNext(value.maturationLots, 'maturation-lot-'),
    nextBlendRecipeNumber: value.nextBlendRecipeNumber ?? inferNext(value.blendRecipes, 'blend-recipe-'),
    nextOperationNumber: value.nextOperationNumber ?? inferNext(value.operations, 'industrial-operation-'),
  };
}

export function startIndustrialBatch(
  state: IndustrialProductionState,
  batch: TradeProductionBatchState,
  product: TradeProductState,
  day: number,
): { industrial: IndustrialProductionState; estimatedReadyDay: number; planId: string; currentStageId: ProcessStageId } {
  const industrial = cloneIndustrial(state);
  const categoryId = normalizeCategory(product.beverageCategoryId ?? product.family);
  const blueprint = industrialBlueprintForCategory(categoryId);
  const startingVolumeLiters = round(batch.plannedUnits * product.packageVolumeLiters / Math.max(.2, totalYield(blueprint.stages)));
  const blendRecipe = createDefaultBlendRecipe(industrial, product, categoryId, day);
  const planId = `industrial-plan-${industrial.nextPlanNumber++}`;
  const plan: IndustrialBatchPlan = {
    id: planId,
    batchId: batch.id,
    producerOrganizationId: batch.producerOrganizationId,
    productId: product.id,
    categoryId,
    blueprintId: blueprint.id,
    status: 'running',
    currentStageIndex: 0,
    currentRunId: null,
    sourceTradeLotIds: [...batch.ingredientLotIds, ...(batch.packagingLotIds ?? [])],
    intermediateLotIds: [],
    maturationLotIds: [],
    blendRecipeId: blendRecipe?.id ?? null,
    plannedUnits: batch.plannedUnits,
    startingVolumeLiters,
    currentVolumeLiters: startingVolumeLiters,
    currentAlcoholByVolume: initialAlcoholByVolume(categoryId, product.alcoholByVolume),
    currentQuality: clamp(Math.round(product.quality * .78 + 15), 35, 98),
    startDay: day,
    estimatedReadyDay: estimateReadyDay(day, blueprint.stages),
    completedDay: null,
    issue: null,
  };
  industrial.plans.push(plan);
  const first = beginStage(industrial, plan, product, day, []);
  plan.currentRunId = first.id;
  pushOperation(industrial, day, 'stage_started', plan, `Запущен этап «${stageName(first.stageId)}»`, `${product.name}: технологическая цепочка началась.`);
  return { industrial, estimatedReadyDay: plan.estimatedReadyDay, planId, currentStageId: first.stageId };
}

export function advanceIndustrialProductionDay(
  value: IndustrialProductionState,
  batches: TradeProductionBatchState[],
  products: TradeProductState[],
  day: number,
): IndustrialAdvanceResult {
  const industrial = cloneIndustrial(normalizeIndustrialProductionState(value));
  const nextBatches = batches.map((batch) => ({ ...batch }));
  const completedBatchIds: string[] = [];
  const events: IndustrialAdvanceResult['events'] = [];

  updateMaturationLots(industrial, day);

  for (const plan of industrial.plans) {
    if (plan.status === 'complete' || plan.status === 'blocked') continue;
    const product = products.find((item) => item.id === plan.productId);
    const batch = nextBatches.find((item) => item.id === plan.batchId);
    if (!product || !batch) {
      plan.status = 'blocked';
      plan.issue = 'Продукт или партия удалены из мира';
      pushOperation(industrial, day, 'process_blocked', plan, 'Производственная цепочка остановлена', plan.issue);
      continue;
    }

    let safety = 0;
    while (safety++ < 8) {
      const run = industrial.runs.find((item) => item.id === plan.currentRunId);
      if (!run || run.status !== 'running' || run.dueDay > day) break;
      completeRun(industrial, plan, run, product, day);
      const blueprint = industrialBlueprintForCategory(plan.categoryId);
      const stageTemplate = blueprint.stages[plan.currentStageIndex];
      if (!stageTemplate) {
        plan.status = 'blocked';
        plan.issue = 'Не найден текущий технологический этап';
        break;
      }

      if (stageTemplate.createsMaturationLot) {
        const maturation = industrial.maturationLots.find((item) => plan.maturationLotIds.includes(item.id) && item.sourceIntermediateLotId === run.outputLotId);
        if (maturation && maturation.status !== 'ready') {
          plan.status = 'maturing';
          plan.currentRunId = null;
          batch.readyDay = Math.max(batch.readyDay, maturation.minimumReleaseDay);
          break;
        }
        if (maturation) {
          plan.currentVolumeLiters = maturation.currentVolumeLiters;
          plan.currentQuality = Math.max(plan.currentQuality, maturation.quality);
          maturation.status = 'drained';
        }
      }

      plan.currentStageIndex += 1;
      if (plan.currentStageIndex >= blueprint.stages.length) {
        plan.status = 'complete';
        plan.completedDay = day;
        plan.currentRunId = null;
        completedBatchIds.push(plan.batchId);
        pushOperation(industrial, day, 'batch_completed', plan, `Готов технологический цикл ${product.name}`, `${Math.round(plan.currentVolumeLiters)} л прошли все этапы и готовы к коммерческому выпуску.`);
        events.push({ tone: 'release', title: `${product.name}: цикл завершён`, detail: `${stageName(stageTemplate.stageId)} завершён, партия готова.` });
        break;
      }
      const nextRun = beginStage(industrial, plan, product, day, run.outputLotId ? [run.outputLotId] : []);
      plan.currentRunId = nextRun.id;
      plan.status = blueprint.stages[plan.currentStageIndex]?.createsMaturationLot ? 'maturing' : 'running';
      batch.readyDay = Math.max(batch.readyDay, nextRun.dueDay);
      pushOperation(industrial, day, 'stage_started', plan, `Начат этап «${stageName(nextRun.stageId)}»`, `${product.name}: ${Math.round(plan.currentVolumeLiters)} л.`);
      if (nextRun.dueDay > day) break;
    }
  }

  for (const batch of nextBatches) {
    const plan = industrial.plans.find((item) => item.batchId === batch.id);
    if (!plan) continue;
    const run = plan.currentRunId ? industrial.runs.find((item) => item.id === plan.currentRunId) : null;
    batch.currentStageId = run?.stageId ?? (plan.status === 'complete' ? 'package' : batch.currentStageId ?? null);
    batch.readyDay = Math.max(batch.readyDay, plan.estimatedReadyDay);
  }

  return { industrial: trimIndustrialHistory(industrial), batches: nextBatches, completedBatchIds, events };
}

export function industrialPlanForBatch(state: IndustrialProductionState, batchId: string): IndustrialBatchPlan | null {
  return state.plans.find((item) => item.batchId === batchId) ?? null;
}

export function industrialRunsForProduct(state: IndustrialProductionState, productId: string): IndustrialProcessRun[] {
  return state.runs.filter((item) => item.productId === productId).sort((a, b) => b.startDay - a.startDay);
}

export function industrialMaturationForProduct(state: IndustrialProductionState, productId: string): IndustrialMaturationLot[] {
  return state.maturationLots.filter((item) => item.productId === productId).sort((a, b) => b.enteredDay - a.enteredDay);
}

export function industrialStageLabel(stageId: ProcessStageId): string {
  return stageName(stageId);
}

export function industrialProductionSummary(state: IndustrialProductionState, productId: string): {
  activePlans: number;
  currentStage: string;
  agingLiters: number;
  oldestAgeDays: number;
  completedRuns: number;
} {
  const plans = state.plans.filter((item) => item.productId === productId && item.status !== 'complete');
  const current = plans[0];
  const currentRun = current ? state.runs.find((item) => item.id === current.currentRunId) : null;
  const maturation = state.maturationLots.filter((item) => item.productId === productId && item.status !== 'drained');
  return {
    activePlans: plans.length,
    currentStage: currentRun ? stageName(currentRun.stageId) : current?.status === 'maturing' ? 'Выдержка' : 'Нет активного процесса',
    agingLiters: round(maturation.reduce((sum, item) => sum + item.currentVolumeLiters, 0)),
    oldestAgeDays: maturation.reduce((max, item) => Math.max(max, item.ageDays), 0),
    completedRuns: state.runs.filter((item) => item.productId === productId && item.status === 'complete').length,
  };
}

export function validateIndustrialProductionState(state: IndustrialProductionState): string[] {
  const violations: string[] = [];
  const unique = (label: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) violations.push(`${label}: duplicate ids`);
  };
  unique('plans', state.plans.map((item) => item.id));
  unique('runs', state.runs.map((item) => item.id));
  unique('intermediate lots', state.intermediateLots.map((item) => item.id));
  unique('maturation lots', state.maturationLots.map((item) => item.id));
  for (const plan of state.plans) {
    if (plan.currentVolumeLiters < -0.001) violations.push(`${plan.id}: negative volume`);
    if (plan.currentQuality < 0 || plan.currentQuality > 100) violations.push(`${plan.id}: quality out of range`);
    if (plan.currentAlcoholByVolume < 0 || plan.currentAlcoholByVolume > 96) violations.push(`${plan.id}: abv out of range`);
    if (plan.currentRunId && !state.runs.some((item) => item.id === plan.currentRunId)) violations.push(`${plan.id}: missing current run`);
  }
  for (const lot of state.intermediateLots) if (lot.quantityLiters < -0.001) violations.push(`${lot.id}: negative volume`);
  for (const lot of state.maturationLots) {
    if (lot.currentVolumeLiters < -0.001) violations.push(`${lot.id}: negative maturation volume`);
    if (lot.currentVolumeLiters > lot.startingVolumeLiters + .001) violations.push(`${lot.id}: maturation volume increased`);
  }
  return violations;
}

function beginStage(industrial: IndustrialProductionState, plan: IndustrialBatchPlan, product: TradeProductState, day: number, inputLotIds: string[]): IndustrialProcessRun {
  const blueprint = industrialBlueprintForCategory(plan.categoryId);
  const template = blueprint.stages[plan.currentStageIndex];
  if (!template) throw new Error(`Не найден этап ${plan.currentStageIndex} для ${blueprint.id}`);
  const run: IndustrialProcessRun = {
    id: `industrial-run-${industrial.nextRunNumber++}`,
    planId: plan.id,
    batchId: plan.batchId,
    producerOrganizationId: plan.producerOrganizationId,
    productId: plan.productId,
    stageId: template.stageId,
    stageIndex: plan.currentStageIndex,
    vesselType: template.vesselType,
    status: 'running',
    startDay: day,
    dueDay: day + Math.max(0, template.durationDays),
    inputLotIds,
    outputLotId: null,
    inputVolumeLiters: plan.currentVolumeLiters,
    outputVolumeLiters: 0,
    qualityBefore: plan.currentQuality,
    qualityAfter: plan.currentQuality,
    alcoholBefore: plan.currentAlcoholByVolume,
    alcoholAfter: plan.currentAlcoholByVolume,
    note: `${template.qualityFocus} · ${product.name}`,
  };
  industrial.runs.push(run);
  return run;
}

function completeRun(industrial: IndustrialProductionState, plan: IndustrialBatchPlan, run: IndustrialProcessRun, product: TradeProductState, day: number): void {
  const blueprint = industrialBlueprintForCategory(plan.categoryId);
  const template = blueprint.stages[run.stageIndex];
  if (!template) throw new Error(`Не найден этап ${run.stageIndex}`);
  const processNoise = deterministicSigned(`${plan.id}:${run.stageId}:${day}`);
  const maturationLoss = template.createsMaturationLot
    ? Math.pow(1 - blueprint.annualVolumeLossRate / 365, Math.max(0, template.durationDays))
    : 1;
  const outputVolume = round(Math.max(0, run.inputVolumeLiters * template.yieldRatio * maturationLoss * (1 + processNoise * .006)));
  const qualityDelta = qualityDeltaForStage(template.stageId, processNoise, plan.currentQuality);
  const qualityAfter = clamp(Math.round(plan.currentQuality + qualityDelta), 20, 100);
  const alcoholAfter = alcoholAfterStage(template.alcoholMode, plan.currentAlcoholByVolume, product.alcoholByVolume, run.stageIndex, blueprint.stages.length);
  const outputLot: IndustrialIntermediateLot = {
    id: `industrial-lot-${industrial.nextIntermediateLotNumber++}`,
    ownerOrganizationId: plan.producerOrganizationId,
    productId: plan.productId,
    categoryId: plan.categoryId,
    batchId: plan.batchId,
    stageId: run.stageId,
    quantityLiters: outputVolume,
    alcoholByVolume: alcoholAfter,
    quality: qualityAfter,
    createdDay: day,
    sourceTradeLotIds: run.stageIndex === 0 ? [...plan.sourceTradeLotIds] : [],
    sourceIntermediateLotIds: [...run.inputLotIds],
    status: run.stageId === 'package' ? 'released' : 'active',
  };
  for (const inputId of run.inputLotIds) {
    const input = industrial.intermediateLots.find((item) => item.id === inputId);
    if (input) input.status = 'consumed';
  }
  industrial.intermediateLots.push(outputLot);
  plan.intermediateLotIds.push(outputLot.id);
  plan.currentVolumeLiters = outputVolume;
  plan.currentQuality = qualityAfter;
  plan.currentAlcoholByVolume = alcoholAfter;
  run.status = 'complete';
  run.outputLotId = outputLot.id;
  run.outputVolumeLiters = outputVolume;
  run.qualityAfter = qualityAfter;
  run.alcoholAfter = alcoholAfter;
  pushOperation(industrial, day, 'stage_completed', plan, `Завершён этап «${stageName(run.stageId)}»`, `${Math.round(run.inputVolumeLiters)} → ${Math.round(outputVolume)} л · качество ${qualityAfter}/100.`);

  if (template.createsMaturationLot) {
    const maturation: IndustrialMaturationLot = {
      id: `maturation-lot-${industrial.nextMaturationLotNumber++}`,
      planId: plan.id,
      batchId: plan.batchId,
      productId: plan.productId,
      producerOrganizationId: plan.producerOrganizationId,
      sourceIntermediateLotId: outputLot.id,
      vesselType: template.vesselType,
      enteredDay: run.startDay,
      minimumReleaseDay: run.dueDay,
      targetReleaseDay: Math.max(run.dueDay, plan.startDay + blueprint.targetAgeDays),
      lastUpdatedDay: day,
      startingVolumeLiters: outputVolume,
      currentVolumeLiters: outputVolume,
      annualVolumeLossRate: blueprint.annualVolumeLossRate,
      ageDays: Math.max(0, day - run.startDay),
      quality: qualityAfter,
      status: day >= run.dueDay ? 'ready' : 'aging',
    };
    industrial.maturationLots.push(maturation);
    plan.maturationLotIds.push(maturation.id);
  }
}

function updateMaturationLots(industrial: IndustrialProductionState, day: number): void {
  for (const lot of industrial.maturationLots) {
    if (lot.status === 'drained' || lot.lastUpdatedDay >= day) continue;
    const days = Math.max(0, day - lot.lastUpdatedDay);
    const dailyLoss = lot.annualVolumeLossRate / 365;
    lot.currentVolumeLiters = round(Math.max(0, lot.currentVolumeLiters * Math.pow(1 - dailyLoss, days)));
    lot.ageDays = Math.max(0, day - lot.enteredDay);
    lot.quality = clamp(Math.round(lot.quality + maturationQualityGain(lot.ageDays, days)), 20, 100);
    lot.lastUpdatedDay = day;
    if (day >= lot.minimumReleaseDay) lot.status = 'ready';
    const plan = industrial.plans.find((item) => item.id === lot.planId);
    if (plan && plan.status === 'maturing' && lot.status === 'ready' && plan.currentRunId === null) {
      plan.currentVolumeLiters = lot.currentVolumeLiters;
      plan.currentQuality = Math.max(plan.currentQuality, lot.quality);
      lot.status = 'drained';
      const productLike: TradeProductState = {
        id: plan.productId, producerOrganizationId: plan.producerOrganizationId, name: plan.productId, family: familyForCategory(plan.categoryId), beverageCategoryId: plan.categoryId, style: plan.categoryId,
        quality: plan.currentQuality, unitCost: 0, wholesalePrice: 0, recommendedRetailPrice: 0, alcoholByVolume: plan.currentAlcoholByVolume, packageVolumeLiters: .5,
        status: 'active', totalProduced: 0, totalSold: 0, slowDays: 0, stockoutDays: 0, createdDay: plan.startDay,
      };
      plan.currentStageIndex += 1;
      const blueprint = industrialBlueprintForCategory(plan.categoryId);
      if (plan.currentStageIndex >= blueprint.stages.length) {
        plan.status = 'complete';
        plan.completedDay = day;
      } else {
        const run = beginStage(industrial, plan, productLike, day, [lot.id]);
        plan.currentRunId = run.id;
        plan.status = 'running';
        pushOperation(industrial, day, 'maturation_update', plan, 'Выдержка завершена', `${Math.round(lot.currentVolumeLiters)} л готовы к этапу «${stageName(run.stageId)}».`);
      }
    }
  }
}

function createDefaultBlendRecipe(industrial: IndustrialProductionState, product: TradeProductState, categoryId: BeverageCategoryId, day: number): IndustrialBlendRecipe | null {
  const blueprint = industrialBlueprintForCategory(categoryId);
  if (!blueprint.stages.some((item) => item.stageId === 'blend')) return null;
  const recipe: IndustrialBlendRecipe = {
    id: `blend-recipe-${industrial.nextBlendRecipeNumber++}`,
    producerOrganizationId: product.producerOrganizationId,
    productId: product.id,
    name: `${product.name} · базовый купаж`,
    createdDay: day,
    targetAlcoholByVolume: product.alcoholByVolume,
    targetQuality: product.quality,
    components: [{ categoryId, minimumShare: 1, maximumShare: 1, targetShare: 1 }],
  };
  industrial.blendRecipes.push(recipe);
  return recipe;
}

function pushOperation(industrial: IndustrialProductionState, day: number, kind: IndustrialProductionOperation['kind'], plan: IndustrialBatchPlan, headline: string, detail: string): void {
  industrial.operations.push({ id: `industrial-operation-${industrial.nextOperationNumber++}`, day, kind, organizationId: plan.producerOrganizationId, productId: plan.productId, batchId: plan.batchId, headline, detail });
}

function trimIndustrialHistory(state: IndustrialProductionState): IndustrialProductionState {
  return {
    ...state,
    plans: state.plans.slice(-120),
    runs: state.runs.slice(-480),
    intermediateLots: state.intermediateLots.slice(-720),
    maturationLots: state.maturationLots.slice(-240),
    blendRecipes: state.blendRecipes.slice(-160),
    operations: state.operations.slice(-720),
  };
}

function estimateReadyDay(day: number, stages: Array<{ durationDays: number }>): number {
  return day + stages.reduce((sum, item) => sum + Math.max(0, item.durationDays), 0);
}

function totalYield(stages: Array<{ yieldRatio: number }>): number {
  return stages.reduce((value, item) => value * item.yieldRatio, 1);
}

function alcoholAfterStage(mode: 'none' | 'ferment' | 'distill' | 'fortify' | 'proof' | 'preserve', current: number, target: number, stageIndex: number, stageCount: number): number {
  if (mode === 'ferment') return round(clamp(Math.max(current, target * .68), 0, 22));
  if (mode === 'distill') return round(clamp(Math.max(current * 2.4, target * 1.42), 20, 94));
  if (mode === 'fortify') return round(clamp(Math.max(current, target * 1.05), 8, 30));
  if (mode === 'proof') return round(clamp(target, 0, 96));
  if (mode === 'preserve' && stageIndex >= stageCount - 1) return round(clamp(target, 0, 96));
  return round(clamp(current, 0, 96));
}

function initialAlcoholByVolume(categoryId: BeverageCategoryId, target: number): number {
  if (['gin', 'liqueur', 'amaro_bitter', 'vermouth_aperitif', 'rtd'].includes(categoryId)) return round(Math.max(0, target * .88));
  return 0;
}

function qualityDeltaForStage(stageId: ProcessStageId, noise: number, currentQuality: number): number {
  const base: Record<string, number> = { mill: .2, mash: .6, press: .4, boil: .8, ferment: 1.3, distill: 1.1, infuse: .9, fortify: .3, age: 2.4, blend: 1.2, carbonate: .3, stabilize: .7, package: -.2 };
  const ceilingPenalty = Math.max(0, currentQuality - 90) * .08;
  return (base[stageId] ?? .2) + noise * 1.2 - ceilingPenalty;
}

function maturationQualityGain(ageDays: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 0;
  const ageFactor = ageDays < 90 ? .035 : ageDays < 365 ? .018 : .006;
  return elapsedDays * ageFactor;
}

function stageName(stageId: ProcessStageId): string {
  return processStages.find((item) => item.id === stageId)?.name ?? stageId;
}

function normalizeCategory(value: string): BeverageCategoryId {
  if (['beer', 'cider', 'perry', 'still_wine', 'sparkling_wine', 'fortified_wine', 'whisky', 'rum', 'vodka', 'gin', 'agave_spirit', 'brandy', 'liqueur', 'amaro_bitter', 'vermouth_aperitif', 'sake', 'mead', 'rtd', 'alcohol_free', 'mixer'].includes(value)) return value;
  if (value === 'wine') return 'still_wine';
  if (value === 'spirit') return 'whisky';
  return value === 'beer' || value === 'cider' || value === 'liqueur' || value === 'alcohol_free' ? value : 'beer';
}

function familyForCategory(categoryId: BeverageCategoryId): TradeProductState['family'] {
  if (categoryId === 'beer') return 'beer';
  if (categoryId === 'cider' || categoryId === 'perry') return 'cider';
  if (['still_wine', 'sparkling_wine', 'fortified_wine', 'vermouth_aperitif'].includes(categoryId)) return 'wine';
  if (['liqueur', 'amaro_bitter'].includes(categoryId)) return 'liqueur';
  if (['alcohol_free', 'mixer'].includes(categoryId)) return 'alcohol_free';
  return 'spirit';
}

function deterministicSigned(key: string): number {
  let value = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    value ^= key.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

function cloneIndustrial(state: IndustrialProductionState): IndustrialProductionState {
  return {
    ...state,
    plans: state.plans.map((item) => ({ ...item, sourceTradeLotIds: [...item.sourceTradeLotIds], intermediateLotIds: [...item.intermediateLotIds], maturationLotIds: [...item.maturationLotIds] })),
    runs: state.runs.map((item) => ({ ...item, inputLotIds: [...item.inputLotIds] })),
    intermediateLots: state.intermediateLots.map((item) => ({ ...item, sourceTradeLotIds: [...item.sourceTradeLotIds], sourceIntermediateLotIds: [...item.sourceIntermediateLotIds] })),
    maturationLots: state.maturationLots.map((item) => ({ ...item })),
    blendRecipes: state.blendRecipes.map((item) => ({ ...item, components: item.components.map((component) => ({ ...component })) })),
    operations: state.operations.map((item) => ({ ...item })),
  };
}

function inferNext(items: Array<{ id: string }>, prefix: string): number {
  return items.reduce((max, item) => Math.max(max, Number(item.id.replace(prefix, '')) || 0), 0) + 1;
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function round(value: number): number { return Math.round(value * 1000) / 1000; }
