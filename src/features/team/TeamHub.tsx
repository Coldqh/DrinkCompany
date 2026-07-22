import { useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import {
  dailyPayroll,
  departmentName,
  maxTeamSize,
  roleName,
  roleSummary,
  trainingCost,
  trainingLabel,
  workloadLabel,
  type Employee,
  type ShiftId,
  type TeamAutomation,
  type TeamCandidate,
  type TeamDepartment,
  type TrainingTrack,
  type Workload,
} from '../../domain/team';
import { Icon } from '../../ui/Icon';
import { EmptyState, Modal } from '../../ui/MobileUI';

interface TeamHubProps {
  state: GameState;
  onHire: (candidateId: string) => ActionResult;
  onFire: (employeeId: string) => ActionResult;
  onAssign: (employeeId: string, department: TeamDepartment | null, shift: ShiftId) => ActionResult;
  onWorkload: (department: TeamDepartment, workload: Workload) => ActionResult;
  onAutomation: (key: keyof TeamAutomation, enabled: boolean) => ActionResult;
  onTrain: (employeeId: string, track: TrainingTrack) => ActionResult;
}

const DEPARTMENTS: TeamDepartment[] = ['production', 'quality', 'packaging', 'warehouse', 'sales', 'marketing', 'maintenance', 'sanitation'];
const TRAINING: TrainingTrack[] = ['craft', 'precision', 'speed', 'reliability'];

export function TeamHub({ state, onHire, onFire, onAssign, onWorkload, onAutomation, onTrain }: TeamHubProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<TeamCandidate | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const capacity = maxTeamSize(state.facility?.tier ?? 1);
  const payroll = dailyPayroll(state.team);

  function act(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2400);
    if (result.ok) {
      setSelectedCandidate(null);
      setSelectedEmployee(null);
    }
  }

  return (
    <div className="simple-hub">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}
      <div className="hub-summary">
        <div><span>Штат</span><strong>{state.team.employees.length}/{capacity}</strong></div>
        <div><span>Зарплаты</span><strong>{formatMoney(payroll)}/день</strong></div>
      </div>
      <div className="inline-actions">
        <button className="button primary" onClick={() => setShowCandidates(true)}>Нанять</button>
        <button className="button secondary" onClick={() => setShowWork(true)}>Работа команды</button>
      </div>
      {state.team.employees.length === 0 ? (
        <div className="plain-panel"><EmptyState icon="factory" title="Ты работаешь один" text="Найми специалиста, когда ручная работа начнёт мешать росту." /></div>
      ) : (
        <div className="simple-list plain-panel">
          {state.team.employees.map((employee) => (
            <button key={employee.id} onClick={() => setSelectedEmployee(employee)}>
              <EmployeeMark employee={employee} />
              <span><strong>{employee.name}</strong><small>{roleName(employee.role)} · {employee.assignment ? departmentName(employee.assignment) : 'без назначения'}</small></span>
              <b>{employee.fatigue}%</b>
            </button>
          ))}
        </div>
      )}

      {showCandidates && <Modal title="Кандидаты" kicker={`До ${capacity - state.team.employees.length} свободных мест`} onClose={() => setShowCandidates(false)}>
        <div className="simple-list">
          {state.team.candidates.map((candidate) => <button key={candidate.id} onClick={() => setSelectedCandidate(candidate)}><EmployeeMark employee={candidate} /><span><strong>{candidate.name}</strong><small>{roleName(candidate.role)} · зарплата {formatMoney(candidate.salary)}</small></span><Icon name="arrow" /></button>)}
        </div>
      </Modal>}

      {showWork && <Modal title="Работа команды" kicker="Автоматизация и нагрузка" onClose={() => setShowWork(false)}>
        <div className="settings-stack">
          <AutomationRow label="Санитария" note="Снижает падение чистоты" enabled={state.team.automation.cleaning} onChange={(value) => act(onAutomation('cleaning', value))} />
          <AutomationRow label="Обслуживание" note="Снижает износ оборудования" enabled={state.team.automation.maintenance} onChange={(value) => act(onAutomation('maintenance', value))} />
          <AutomationRow label="Продажи" note="Менеджер сам ищет покупателей" enabled={state.team.automation.sales} onChange={(value) => act(onAutomation('sales', value))} />
          {DEPARTMENTS.map((department) => <div className="work-setting" key={department}><span><strong>{departmentName(department)}</strong><small>{state.team.employees.filter((employee) => employee.assignment === department).length} сотрудников</small></span><div>{(['light', 'normal', 'heavy'] as Workload[]).map((value) => <button key={value} className={state.team.workloads[department] === value ? 'active' : ''} onClick={() => act(onWorkload(department, value))}>{workloadLabel(value)}</button>)}</div></div>)}
        </div>
      </Modal>}

      {selectedCandidate && <CandidateModal candidate={selectedCandidate} cash={state.finance.cash} full={state.team.employees.length >= capacity} onClose={() => setSelectedCandidate(null)} onHire={() => act(onHire(selectedCandidate.id))} />}
      {selectedEmployee && <EmployeeModal employee={selectedEmployee} cash={state.finance.cash} onClose={() => setSelectedEmployee(null)} onAssign={(department, shift) => act(onAssign(selectedEmployee.id, department, shift))} onTrain={(track) => act(onTrain(selectedEmployee.id, track))} onFire={() => act(onFire(selectedEmployee.id))} />}
    </div>
  );
}
function CandidateModal({ candidate, cash, full, onClose, onHire }: { candidate: TeamCandidate; cash: number; full: boolean; onClose: () => void; onHire: () => void }) {
  return <Modal title={candidate.name} kicker={roleName(candidate.role)} onClose={onClose} footer={<button className="button primary" disabled={full || cash < candidate.hiringFee} onClick={onHire}>{full ? 'Нет места в штате' : `Нанять за ${formatMoney(candidate.hiringFee)}`}</button>}>
    <div className="employee-hero"><EmployeeMark employee={candidate} large /><div><strong>{candidate.trait}</strong><p>{roleSummary(candidate.role)}</p></div></div>
    <div className="detail-grid"><Detail label="Навык" value={`${candidate.skill}/100`} /><Detail label="Точность" value={`${candidate.precision}/100`} /><Detail label="Темп" value={`${candidate.pace}/100`} /><Detail label="Надёжность" value={`${candidate.reliability}/100`} /><Detail label="Зарплата" value={`${formatMoney(candidate.salary)} / мес.`} /><Detail label="Доступен" value={`до дня ${candidate.availableUntilDay}`} /></div>
  </Modal>;
}

function EmployeeModal({ employee, cash, onClose, onAssign, onTrain, onFire }: { employee: Employee; cash: number; onClose: () => void; onAssign: (department: TeamDepartment | null, shift: ShiftId) => void; onTrain: (track: TrainingTrack) => void; onFire: () => void }) {
  const [department, setDepartment] = useState<TeamDepartment | ''>(employee.assignment ?? '');
  const [shift, setShift] = useState<ShiftId>(employee.shift);
  return <Modal title={employee.name} kicker={roleName(employee.role)} onClose={onClose}>
    <div className="employee-hero"><EmployeeMark employee={employee} large /><div><strong>{employee.trait}</strong><p>Мораль {employee.morale} · усталость {employee.fatigue} · опыт {employee.experience}</p></div></div>
    <div className="detail-grid"><Detail label="Навык" value={`${employee.skill}/100`} /><Detail label="Точность" value={`${employee.precision}/100`} /><Detail label="Темп" value={`${employee.pace}/100`} /><Detail label="Надёжность" value={`${employee.reliability}/100`} /><Detail label="Прогулы" value={`${employee.absences}`} /><Detail label="Ошибки" value={`${employee.incidents}`} /></div>
    <div className="modal-form"><label><span>Отдел</span><select value={department} onChange={(event) => setDepartment(event.target.value as TeamDepartment | '')}><option value="">Без назначения</option>{DEPARTMENTS.map((value) => <option key={value} value={value}>{departmentName(value)}</option>)}</select></label><label><span>Смена</span><select value={shift} onChange={(event) => setShift(event.target.value as ShiftId)}><option value="day">Дневная</option><option value="evening">Вечерняя</option></select></label><button className="button secondary" disabled={employee.trainingEndsDay !== null} onClick={() => onAssign(department || null, shift)}>Сохранить назначение</button></div>
    <div className="training-grid">{TRAINING.map((track) => <button key={track} disabled={employee.trainingEndsDay !== null || cash < trainingCost(employee, track)} onClick={() => onTrain(track)}><span>{trainingLabel(track)}</span><strong>{formatMoney(trainingCost(employee, track))}</strong><small>3–4 дня</small></button>)}</div>
    <button className="button danger employee-fire" onClick={onFire}>Уволить сотрудника</button>
  </Modal>;
}

function EmployeeMark({ employee, large = false }: { employee: Pick<Employee, 'name' | 'role'> | TeamCandidate; large?: boolean }) {
  const initials = employee.name.split(' ').slice(0, 2).map((part) => part[0]).join('');
  return <span className={`employee-mark role-${employee.role} ${large ? 'large' : ''}`}><b>{initials}</b><i /></span>;
}
function AutomationRow({ label, note, enabled, onChange }: { label: string; note: string; enabled: boolean; onChange: (enabled: boolean) => void }) { return <button className={`automation-row ${enabled ? 'active' : ''}`} onClick={() => onChange(!enabled)}><span><strong>{label}</strong><small>{note}</small></span><i><b /></i></button>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
