import { useCallback, useEffect, useRef, useState } from 'react';
import { equipmentCatalog, getEquipment } from '../data/productionCatalog';
import { properties } from '../data/catalog';
import {
  acceptMarketOffer,
  createSupplierAgreement,
  cleanProductionFacility,
  assignTeamEmployee,
  fireTeamEmployee,
  hireTeamCandidate,
  expandFacilityRoom,
  expandFacilityUtility,
  advanceDay,
  createInitialState,
  declineMarketOffer,
  discardProductionBatch,
  fulfillRepeatOrder,
  dismissTutorial,
  packageProductionBatch,
  orderSupplies,
  acquireWorldAsset,
  leaseWorldAsset,
  investWorldOrganization,
  stockWorldVenue,
  cleanWorldVenue,
  upgradeWorldVenue,
  setWorldVenueStatus,
  purchaseEquipment,
  queueProductionRecipe,
  removeQueuedRecipe,
  registerBrand,
  registerProductRelease,
  startPromotionCampaign,
  trainTeamEmployee,
  updateTeamAutomation,
  updateTeamWorkload,
  serviceProductionEquipment,
  saveRecipe,
  startCompany,
  startProductionBatch,
  upgradeProductionEquipment,
  submitMarketProposal,
  tasteProductionBatch,
  type GameState,
  type NewGameSelection,
} from '../domain/game';
import type { RecipeDraft } from '../domain/production';
import type { FacilityRoomId, FacilityUtilityId } from '../domain/facility';
import type { IngredientCategory } from '../data/supplyCatalog';
import type { ProposalInput } from '../domain/market';
import type { BrandDraft, CampaignType, ReleaseDraft } from '../domain/brand';
import type { RetailVenueStatus, RetailVenueType } from '../domain/retail';
import type { ShiftId, TeamAutomation, TeamDepartment, TrainingTrack, Workload } from '../domain/team';
import { loadGameState, parseGameState, saveGameState, serializeGameState } from '../infrastructure/gameStateRepository';

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface GameController {
  state: GameState;
  isReady: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  createCompany: (selection: NewGameSelection) => ActionResult;
  nextDay: () => ActionResult;
  reset: () => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<void>;
  buyEquipment: (equipmentId: string) => ActionResult;
  saveRecipeDraft: (draft: RecipeDraft) => ActionResult;
  launchBatch: (draft: RecipeDraft, selectedLots?: Partial<Record<IngredientCategory, string>>) => ActionResult;
  tasteBatch: (batchId: string) => ActionResult;
  packageBatch: (batchId: string) => ActionResult;
  discardBatch: (batchId: string) => ActionResult;
  hideTutorial: () => void;
  sendProposal: (input: ProposalInput) => ActionResult;
  acceptOffer: (proposalId: string) => ActionResult;
  declineOffer: (proposalId: string) => ActionResult;
  fulfillOrder: (orderId: string, batchId: string) => ActionResult;
  orderSupply: (offerId: string, quantity: number) => ActionResult;
  signSupplier: (supplierId: string) => ActionResult;
  expandRoom: (roomId: FacilityRoomId) => ActionResult;
  expandUtility: (utilityId: FacilityUtilityId) => ActionResult;
  cleanFacility: () => ActionResult;
  serviceEquipment: (equipmentId: string) => ActionResult;
  upgradeEquipment: (equipmentId: string) => ActionResult;
  queueRecipe: (recipeId: string) => ActionResult;
  removeQueue: (queueId: string) => ActionResult;
  createBrand: (draft: BrandDraft) => ActionResult;
  createRelease: (draft: ReleaseDraft) => ActionResult;
  launchCampaign: (releaseId: string, type: CampaignType) => ActionResult;
  hireEmployee: (candidateId: string) => ActionResult;
  fireEmployee: (employeeId: string) => ActionResult;
  assignEmployee: (employeeId: string, department: TeamDepartment | null, shift: ShiftId) => ActionResult;
  setWorkload: (department: TeamDepartment, workload: Workload) => ActionResult;
  setAutomation: (key: keyof TeamAutomation, enabled: boolean) => ActionResult;
  trainEmployee: (employeeId: string, track: TrainingTrack) => ActionResult;
  acquireAsset: (assetId: string) => ActionResult;
  leaseAsset: (assetId: string, type: RetailVenueType, name: string) => ActionResult;
  investOrganization: (organizationId: string, share: number) => ActionResult;
  stockWorldVenue: (assetId: string, releaseId: string, units: number, price: number) => ActionResult;
  cleanWorldVenue: (assetId: string) => ActionResult;
  upgradeWorldVenue: (assetId: string) => ActionResult;
  setWorldVenueStatus: (assetId: string, status: RetailVenueStatus) => ActionResult;
}

export function useGameState(): GameController {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const stateRef = useRef(state);
  const [isReady, setIsReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<GameController['saveStatus']>('idle');

  const replaceState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let active = true;
    void loadGameState()
      .then((loaded) => {
        if (active) replaceState(loaded);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, [replaceState]);

  useEffect(() => {
    if (!isReady) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void saveGameState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isReady, state]);

  const perform = useCallback((transition: (current: GameState) => GameState, successMessage: string): ActionResult => {
    try {
      const next = transition(stateRef.current);
      replaceState(next);
      return { ok: true, message: successMessage };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Действие не выполнено' };
    }
  }, [replaceState]);

  const createCompany = useCallback((selection: NewGameSelection) => (
    perform(() => startCompany(selection), 'Компания открыта')
  ), [perform]);

  const nextDay = useCallback(() => (
    perform((current) => advanceDay(current), 'День завершён')
  ), [perform]);

  const buyEquipment = useCallback((equipmentId: string) => {
    const equipment = getEquipment(equipmentId);
    return perform((current) => purchaseEquipment(current, equipment), `${equipment.name} установлено`);
  }, [perform]);

  const saveRecipeDraft = useCallback((draft: RecipeDraft) => (
    perform((current) => saveRecipe(current, draft), `Рецепт «${draft.name}» сохранён`)
  ), [perform]);

  const launchBatch = useCallback((draft: RecipeDraft, selectedLots: Partial<Record<IngredientCategory, string>> = {}) => {
    const current = stateRef.current;
    const property = properties.find((item) => item.id === current.world?.propertyId);
    if (!property) return { ok: false, message: 'Объект производства не найден' };
    return perform(
      (game) => startProductionBatch(game, draft, property, equipmentCatalog, selectedLots),
      `Партия «${draft.name}» запущена`,
    );
  }, [perform]);

  const tasteBatchAction = useCallback((batchId: string) => (
    perform((current) => tasteProductionBatch(current, batchId), 'Дегустация завершена')
  ), [perform]);

  const packageBatchAction = useCallback((batchId: string) => (
    perform((current) => packageProductionBatch(current, batchId), 'Партия разлита и готова к продажам')
  ), [perform]);

  const discardBatchAction = useCallback((batchId: string) => (
    perform((current) => discardProductionBatch(current, batchId), 'Партия списана')
  ), [perform]);

  const hideTutorial = useCallback(() => {
    replaceState(dismissTutorial(stateRef.current));
  }, [replaceState]);

  const sendProposal = useCallback((input: ProposalInput) => (
    perform((current) => submitMarketProposal(current, input), 'Предложение отправлено закупщику')
  ), [perform]);

  const acceptOffer = useCallback((proposalId: string) => (
    perform((current) => acceptMarketOffer(current, proposalId), 'Поставка подтверждена, деньги зачислены')
  ), [perform]);

  const declineOffer = useCallback((proposalId: string) => (
    perform((current) => declineMarketOffer(current, proposalId), 'Оффер отклонён')
  ), [perform]);

  const fulfillOrder = useCallback((orderId: string, batchId: string) => (
    perform((current) => fulfillRepeatOrder(current, orderId, batchId), 'Повторная поставка обработана')
  ), [perform]);

  const orderSupply = useCallback((offerId: string, quantity: number) => (
    perform((current) => orderSupplies(current, offerId, quantity), 'Закупка оформлена')
  ), [perform]);

  const signSupplier = useCallback((supplierId: string) => (
    perform((current) => createSupplierAgreement(current, supplierId), 'Постоянный договор подписан')
  ), [perform]);


  const expandRoom = useCallback((roomId: FacilityRoomId) => (
    perform((current) => expandFacilityRoom(current, roomId), 'Помещение расширено')
  ), [perform]);

  const expandUtility = useCallback((utilityId: FacilityUtilityId) => (
    perform((current) => expandFacilityUtility(current, utilityId), 'Инфраструктура улучшена')
  ), [perform]);

  const cleanFacility = useCallback(() => (
    perform((current) => cleanProductionFacility(current), 'Санитарная смена завершена')
  ), [perform]);

  const serviceEquipment = useCallback((equipmentId: string) => {
    const equipment = getEquipment(equipmentId);
    return perform((current) => serviceProductionEquipment(current, equipment), `${equipment.name} обслужено`);
  }, [perform]);

  const upgradeEquipment = useCallback((equipmentId: string) => {
    const equipment = getEquipment(equipmentId);
    return perform((current) => upgradeProductionEquipment(current, equipment), `${equipment.name} модернизировано`);
  }, [perform]);

  const queueRecipe = useCallback((recipeId: string) => (
    perform((current) => queueProductionRecipe(current, recipeId), 'Рецепт добавлен в очередь')
  ), [perform]);

  const removeQueue = useCallback((queueId: string) => (
    perform((current) => removeQueuedRecipe(current, queueId), 'Позиция удалена из очереди')
  ), [perform]);

  const createBrandAction = useCallback((draft: BrandDraft) => (
    perform((current) => registerBrand(current, draft), `Бренд «${draft.name}» создан`)
  ), [perform]);

  const createReleaseAction = useCallback((draft: ReleaseDraft) => (
    perform((current) => registerProductRelease(current, draft), `Релиз «${draft.name}» запущен`)
  ), [perform]);

  const launchCampaignAction = useCallback((releaseId: string, type: CampaignType) => (
    perform((current) => startPromotionCampaign(current, releaseId, type), 'Продвижение запущено')
  ), [perform]);

  const hireEmployee = useCallback((candidateId: string) => (
    perform((current) => hireTeamCandidate(current, candidateId), 'Сотрудник принят в команду')
  ), [perform]);

  const fireEmployee = useCallback((employeeId: string) => (
    perform((current) => fireTeamEmployee(current, employeeId), 'Сотрудник уволен')
  ), [perform]);

  const assignEmployeeAction = useCallback((employeeId: string, department: TeamDepartment | null, shift: ShiftId) => (
    perform((current) => assignTeamEmployee(current, employeeId, department, shift), 'Назначение обновлено')
  ), [perform]);

  const setWorkloadAction = useCallback((department: TeamDepartment, workload: Workload) => (
    perform((current) => updateTeamWorkload(current, department, workload), 'Нагрузка отдела изменена')
  ), [perform]);

  const setAutomationAction = useCallback((key: keyof TeamAutomation, enabled: boolean) => (
    perform((current) => updateTeamAutomation(current, key, enabled), enabled ? 'Автоматизация включена' : 'Автоматизация отключена')
  ), [perform]);

  const trainEmployeeAction = useCallback((employeeId: string, track: TrainingTrack) => (
    perform((current) => trainTeamEmployee(current, employeeId, track), 'Обучение запущено')
  ), [perform]);

  const acquireAssetAction = useCallback((assetId: string) => (
    perform((current) => acquireWorldAsset(current, assetId), 'Объект перешёл под контроль компании')
  ), [perform]);

  const leaseAssetAction = useCallback((assetId: string, type: RetailVenueType, name: string) => (
    perform((current) => leaseWorldAsset(current, assetId, type, name), 'Объект арендован и введён в работу')
  ), [perform]);

  const investOrganizationAction = useCallback((organizationId: string, share: number) => (
    perform((current) => investWorldOrganization(current, organizationId, share), `Куплено ${share}% компании`)
  ), [perform]);

  const stockWorldVenueAction = useCallback((assetId: string, releaseId: string, units: number, price: number) => (
    perform((current) => stockWorldVenue(current, assetId, releaseId, units, price), 'Продукт передан на полку объекта')
  ), [perform]);

  const cleanWorldVenueAction = useCallback((assetId: string) => (
    perform((current) => cleanWorldVenue(current, assetId), 'Санитарная смена завершена')
  ), [perform]);

  const upgradeWorldVenueAction = useCallback((assetId: string) => (
    perform((current) => upgradeWorldVenue(current, assetId), 'Объект расширен')
  ), [perform]);

  const setWorldVenueStatusAction = useCallback((assetId: string, status: RetailVenueStatus) => (
    perform((current) => setWorldVenueStatus(current, assetId, status), status === 'open' ? 'Объект открыт' : 'Объект временно закрыт')
  ), [perform]);


  const reset = useCallback(() => replaceState(createInitialState()), [replaceState]);

  const exportSave = useCallback(() => {
    const current = stateRef.current;
    const blob = new Blob([serializeGameState(current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `drink-company-day-${current.day}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const importSave = useCallback(async (file: File) => {
    const serialized = await file.text();
    replaceState(parseGameState(serialized));
  }, [replaceState]);


  return {
    state,
    isReady,
    saveStatus,
    createCompany,
    nextDay,
    reset,
    exportSave,
    importSave,
    buyEquipment,
    saveRecipeDraft,
    launchBatch,
    tasteBatch: tasteBatchAction,
    packageBatch: packageBatchAction,
    discardBatch: discardBatchAction,
    hideTutorial,
    sendProposal,
    acceptOffer,
    declineOffer,
    fulfillOrder,
    orderSupply,
    signSupplier,
    expandRoom,
    expandUtility,
    cleanFacility,
    serviceEquipment,
    upgradeEquipment,
    queueRecipe,
    removeQueue,
    createBrand: createBrandAction,
    createRelease: createReleaseAction,
    launchCampaign: launchCampaignAction,
    hireEmployee,
    fireEmployee,
    assignEmployee: assignEmployeeAction,
    setWorkload: setWorkloadAction,
    setAutomation: setAutomationAction,
    trainEmployee: trainEmployeeAction,
    acquireAsset: acquireAssetAction,
    leaseAsset: leaseAssetAction,
    investOrganization: investOrganizationAction,
    stockWorldVenue: stockWorldVenueAction,
    cleanWorldVenue: cleanWorldVenueAction,
    upgradeWorldVenue: upgradeWorldVenueAction,
    setWorldVenueStatus: setWorldVenueStatusAction,
  };
}
