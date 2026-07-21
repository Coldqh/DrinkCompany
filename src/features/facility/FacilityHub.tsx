import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import { equipmentCatalog } from '../../data/productionCatalog';
import {
  ROOM_DEFINITIONS,
  UTILITY_DEFINITIONS,
  cleaningCost,
  effectiveEquipmentCapacity,
  effectiveEquipmentPrecision,
  equipmentServiceCost,
  equipmentUpgradeCost,
  facilityDailyCost,
  inventoryCapacity,
  maxActiveBatches,
  maxFacilityBatchVolume,
  roomUpgradeCost,
  utilityUpgradeCost,
  type FacilityRoomId,
  type FacilityUtilityId,
} from '../../domain/facility';
import type { GameState } from '../../domain/game';
import type { EquipmentDefinition } from '../../domain/production';
import { Icon } from '../../ui/Icon';
import { EmptyState, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

type FacilitySection = 'object' | 'lines' | 'maintenance' | 'expansion';
type ExpansionTarget = { kind: 'room'; id: FacilityRoomId } | { kind: 'utility'; id: FacilityUtilityId } | null;

interface FacilityHubProps {
  state: GameState;
  onBuyEquipment: (equipmentId: string) => ActionResult;
  onExpandRoom: (roomId: FacilityRoomId) => ActionResult;
  onExpandUtility: (utilityId: FacilityUtilityId) => ActionResult;
  onClean: () => ActionResult;
  onServiceEquipment: (equipmentId: string) => ActionResult;
  onUpgradeEquipment: (equipmentId: string) => ActionResult;
  onQueueRecipe: (recipeId: string) => ActionResult;
  onRemoveQueue: (queueId: string) => ActionResult;
}

export function FacilityHub({ state, onBuyEquipment, onExpandRoom, onExpandUtility, onClean, onServiceEquipment, onUpgradeEquipment, onQueueRecipe, onRemoveQueue }: FacilityHubProps) {
  const [section, setSection] = useState<FacilitySection>('object');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDefinition | null>(null);
  const [expansion, setExpansion] = useState<ExpansionTarget>(null);
  const [queueRecipe, setQueueRecipe] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const facility = state.facility;
  const activeBatches = state.production.batches.filter((batch) => !['packaged', 'discarded'].includes(batch.status)).length;
  const installed = useMemo(() => equipmentCatalog.filter((item) => state.production.equipmentIds.includes(item.id)), [state.production.equipmentIds]);
  const equipmentList = useMemo(() => [...equipmentCatalog].sort((a, b) => Number(state.production.equipmentIds.includes(b.id)) - Number(state.production.equipmentIds.includes(a.id))), [state.production.equipmentIds]);

  if (!facility) return <EmptyState icon="factory" title="Объект не найден" text="Заверши создание компании, чтобы управлять производством." />;

  function report(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 3000);
    return result;
  }

  function confirmExpansion() {
    if (!expansion) return;
    const result = expansion.kind === 'room' ? onExpandRoom(expansion.id) : onExpandUtility(expansion.id);
    report(result);
    if (result.ok) setExpansion(null);
  }

  function handleQueue() {
    if (!queueRecipe) return;
    const result = report(onQueueRecipe(queueRecipe));
    if (result.ok) setQueueRecipe(null);
  }

  return (
    <div className="facility-hub screen-stack">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <section className="facility-overview glass-card">
        <div className="facility-seal"><span>{facility.tier}</span><small>уровень</small></div>
        <div><span className="section-kicker">производственный объект</span><h3>{facility.areaSquareMeters} м² в работе</h3><p>{activeBatches} из {maxActiveBatches(facility)} линий занято · до {maxFacilityBatchVolume(facility)} л за партию</p></div>
      </section>

      <section className="mini-stat-grid three facility-stats-compact">
        <MiniStat label="Чистота" value={`${Math.round(facility.sanitation)}/100`} note={facility.sanitation < 45 ? 'высокий риск' : 'рабочий уровень'} tone="warm" />
        <MiniStat label="Склад" value={`${inventoryCapacity(facility)}`} note="условных единиц" />
        <MiniStat label="Расходы" value={formatMoney(facilityDailyCost(facility))} note="за игровой день" />
      </section>

      <SubTabs value={section} onChange={setSection} options={[{ id: 'object', label: 'Объект' }, { id: 'lines', label: 'Линии', badge: state.production.queue.length }, { id: 'maintenance', label: 'Сервис' }, { id: 'expansion', label: 'Рост' }]} />

      {section === 'object' && (
        <section className="facility-room-grid">
          {(Object.keys(ROOM_DEFINITIONS) as FacilityRoomId[]).map((roomId) => {
            const definition = ROOM_DEFINITIONS[roomId];
            const level = facility.rooms[roomId];
            return <article key={roomId} className={`facility-room-card glass-card ${level === 0 ? 'locked' : ''}`}><span>{roomIcon(roomId)}</span><div><strong>{definition.name}</strong><small>{level === 0 ? 'не открыто' : `уровень ${level} из ${definition.maxLevel}`}</small></div><i style={{ '--room-level': `${(level / definition.maxLevel) * 100}%` } as React.CSSProperties} /></article>;
          })}
          <article className="facility-health-card glass-card">
            <div><span>Санитарный контур</span><strong>{Math.round(facility.sanitation)}%</strong></div>
            <div className="facility-meter"><i style={{ width: `${facility.sanitation}%` }} /></div>
            <p>{facility.sanitation >= 75 ? 'Цех работает чисто. Дополнительного штрафа к качеству нет.' : facility.sanitation >= 45 ? 'Нужна санитарная смена до следующего серьёзного запуска.' : 'Риск заражения и нестабильной партии резко вырос.'}</p>
            <button className="button secondary compact-button" disabled={facility.sanitation >= 98} onClick={() => report(onClean())}>Провести мойку · {formatMoney(cleaningCost(facility))}</button>
          </article>
        </section>
      )}

      {section === 'lines' && (
        <section className="screen-stack">
          <div className="compact-list glass-card">
            {equipmentList.map((equipment) => {
              const owned = state.production.equipmentIds.includes(equipment.id);
              const condition = facility.equipmentCondition[equipment.id] ?? 100;
              const upgrade = facility.equipmentUpgrades[equipment.id] ?? 0;
              return <button key={equipment.id} className={`compact-list-row facility-equipment-row ${owned ? '' : 'not-owned'}`} onClick={() => setSelectedEquipment(equipment)}><span className="row-icon"><Icon name={equipment.icon} /></span><span><strong>{equipment.name}</strong><small>{owned ? `${Math.round(condition)}% состояние · модернизация ${upgrade}/2` : `${equipment.category} · ${formatMoney(equipment.cost)}`}</small></span><span className={!owned ? 'row-status' : condition <= 15 ? 'row-status required' : condition < 45 ? 'row-status warning' : 'row-status positive'}>{!owned ? 'купить' : condition <= 15 ? 'стоп' : `${effectiveEquipmentCapacity(facility, equipment) || 'контроль'}`}</span></button>;
            })}
          </div>

          <section className="queue-card glass-card">
            <div className="section-title-row"><div><span className="section-kicker">производственная очередь</span><h3>Следующие партии</h3></div><button className="round-action small" disabled={state.production.recipes.length === 0} onClick={() => setQueueRecipe(state.production.recipes[0]?.id ?? null)}>+</button></div>
            {state.production.queue.length === 0 ? <p className="quiet-copy">Очередь пуста. Добавь сохранённый рецепт, и игра попробует запустить его после перехода дня.</p> : <div className="queue-list">{state.production.queue.map((item, index) => { const recipe = state.production.recipes.find((candidate) => candidate.id === item.recipeId); return <div key={item.id}><span><b>{index + 1}</b><strong>{recipe?.name ?? 'Удалённый рецепт'}</strong><small>{item.lastError ?? 'ожидает свободную линию и сырьё'}</small></span><button onClick={() => report(onRemoveQueue(item.id))}><Icon name="close" /></button></div>; })}</div>}
          </section>
        </section>
      )}

      {section === 'maintenance' && (
        <section className="screen-stack">
          <div className="maintenance-summary glass-card"><div><span>Последний общий сервис</span><strong>день {facility.lastServiceDay}</strong></div><div><span>Всего потрачено</span><strong>{formatMoney(facility.maintenanceSpend)}</strong></div></div>
          <div className="compact-list glass-card">
            {installed.map((equipment) => {
              const condition = facility.equipmentCondition[equipment.id] ?? 100;
              return <button key={equipment.id} className="compact-list-row" onClick={() => setSelectedEquipment(equipment)}><span className="condition-ring" style={{ '--condition': `${condition * 3.6}deg` } as React.CSSProperties}><i /></span><span><strong>{equipment.name}</strong><small>{condition >= 75 ? 'штатное состояние' : condition >= 35 ? 'пора планировать сервис' : 'критический износ'}</small></span><span className="row-status">{Math.round(condition)}%</span></button>;
            })}
          </div>
          <div className="incident-feed glass-card"><span className="section-kicker">журнал объекта</span>{facility.incidents.length === 0 ? <p className="quiet-copy">Серьёзных событий пока не было.</p> : facility.incidents.slice(0, 6).map((incident) => <div key={incident.id}><i /><span><strong>{incident.title}</strong><small>день {incident.day} · {incident.detail}</small></span></div>)}</div>
        </section>
      )}

      {section === 'expansion' && (
        <section className="screen-stack">
          <div className="growth-list glass-card"><span className="section-kicker">помещения</span>{(Object.keys(ROOM_DEFINITIONS) as FacilityRoomId[]).map((roomId) => { const definition = ROOM_DEFINITIONS[roomId]; const level = facility.rooms[roomId]; const maxed = level >= definition.maxLevel; return <button key={roomId} disabled={maxed} onClick={() => setExpansion({ kind: 'room', id: roomId })}><span><strong>{definition.name}</strong><small>{definition.summary}</small></span><span><b>{level}/{definition.maxLevel}</b><small>{maxed ? 'готово' : formatMoney(roomUpgradeCost(facility, roomId))}</small></span></button>; })}</div>
          <div className="growth-list glass-card"><span className="section-kicker">инфраструктура</span>{(Object.keys(UTILITY_DEFINITIONS) as FacilityUtilityId[]).map((utilityId) => { const definition = UTILITY_DEFINITIONS[utilityId]; const level = facility.utilities[utilityId]; const maxed = level >= definition.maxLevel; return <button key={utilityId} disabled={maxed} onClick={() => setExpansion({ kind: 'utility', id: utilityId })}><span><strong>{definition.name}</strong><small>{definition.summary}</small></span><span><b>{level}/{definition.maxLevel}</b><small>{maxed ? 'готово' : formatMoney(utilityUpgradeCost(facility, utilityId))}</small></span></button>; })}</div>
        </section>
      )}

      {selectedEquipment && (
        <Modal title={selectedEquipment.name} kicker="оборудование" onClose={() => setSelectedEquipment(null)} footer={state.production.equipmentIds.includes(selectedEquipment.id) ? <div className="modal-action-grid"><button className="button secondary" disabled={(facility.equipmentCondition[selectedEquipment.id] ?? 100) >= 98} onClick={() => report(onServiceEquipment(selectedEquipment.id))}>Сервис · {formatMoney(equipmentServiceCost(facility, selectedEquipment))}</button><button className="button primary" disabled={(facility.equipmentUpgrades[selectedEquipment.id] ?? 0) >= 2} onClick={() => report(onUpgradeEquipment(selectedEquipment.id))}>Модернизация · {formatMoney(equipmentUpgradeCost(facility, selectedEquipment))}</button></div> : <button className="button primary" onClick={() => { const result = report(onBuyEquipment(selectedEquipment.id)); if (result.ok) setSelectedEquipment(null); }}>Установить · {formatMoney(selectedEquipment.cost)}</button>}>
          <div className="detail-grid"><div><span>Состояние</span><strong>{state.production.equipmentIds.includes(selectedEquipment.id) ? `${Math.round(facility.equipmentCondition[selectedEquipment.id] ?? 100)}%` : 'не установлено'}</strong></div><div><span>Модернизация</span><strong>{facility.equipmentUpgrades[selectedEquipment.id] ?? 0}/2</strong></div><div><span>Точность</span><strong>{effectiveEquipmentPrecision(facility, selectedEquipment).toFixed(1)}</strong></div><div><span>Мощность</span><strong>{selectedEquipment.capacityLiters ? `${effectiveEquipmentCapacity(facility, selectedEquipment)} л` : 'контроль'}</strong></div></div>
          <p className="modal-description">{selectedEquipment.summary}</p>
        </Modal>
      )}

      {expansion && (
        <Modal title={expansion.kind === 'room' ? ROOM_DEFINITIONS[expansion.id].name : UTILITY_DEFINITIONS[expansion.id].name} kicker="расширение объекта" onClose={() => setExpansion(null)} footer={<button className="button primary" onClick={confirmExpansion}>Подтвердить · {formatMoney(expansion.kind === 'room' ? roomUpgradeCost(facility, expansion.id) : utilityUpgradeCost(facility, expansion.id))}</button>}>
          <p className="modal-description">{expansion.kind === 'room' ? ROOM_DEFINITIONS[expansion.id].summary : UTILITY_DEFINITIONS[expansion.id].summary}</p>
          <div className="detail-grid"><div><span>Текущий уровень</span><strong>{expansion.kind === 'room' ? facility.rooms[expansion.id] : facility.utilities[expansion.id]}</strong></div><div><span>После работ</span><strong>{(expansion.kind === 'room' ? facility.rooms[expansion.id] : facility.utilities[expansion.id]) + 1}</strong></div><div><span>Ежедневные расходы</span><strong>вырастут</strong></div><div><span>Срок</span><strong>сразу</strong></div></div>
        </Modal>
      )}

      {queueRecipe && (
        <Modal title="Добавить в очередь" kicker="планирование" onClose={() => setQueueRecipe(null)} footer={<button className="button primary" onClick={handleQueue}>Поставить в очередь</button>}>
          <div className="recipe-choice-list">{state.production.recipes.map((recipe) => <button key={recipe.id} className={queueRecipe === recipe.id ? 'active' : ''} onClick={() => setQueueRecipe(recipe.id)}><span><strong>{recipe.name}</strong><small>{recipe.family === 'beer' ? 'пиво' : 'сидр'} · {recipe.volumeLiters} л · версия {recipe.version}</small></span>{queueRecipe === recipe.id && <Icon name="check" />}</button>)}</div>
        </Modal>
      )}
    </div>
  );
}

function roomIcon(roomId: FacilityRoomId) {
  const icon = roomId === 'laboratory' ? 'lab' : roomId === 'packaging' ? 'bottle' : roomId === 'fermentation' ? 'tank' : roomId === 'storage' ? 'archive' : 'factory';
  return <Icon name={icon} />;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}
