import { useCallback, useEffect, useRef, useState } from 'react';
import { equipmentCatalog, getEquipment } from '../data/productionCatalog';
import { properties } from '../data/catalog';
import {
  acceptMarketOffer,
  createSupplierAgreement,
  advanceDay,
  createInitialState,
  declineMarketOffer,
  discardProductionBatch,
  fulfillRepeatOrder,
  dismissTutorial,
  packageProductionBatch,
  orderSupplies,
  purchaseEquipment,
  saveRecipe,
  startCompany,
  startProductionBatch,
  submitMarketProposal,
  tasteProductionBatch,
  type GameState,
  type NewGameSelection,
} from '../domain/game';
import type { RecipeDraft } from '../domain/production';
import type { IngredientCategory } from '../data/supplyCatalog';
import type { ProposalInput } from '../domain/market';
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
  };
}
