import { useMemo, useState } from 'react';
import type { ActionResult } from '../../app/useGameState';
import type { GameState } from '../../domain/game';
import {
  dailyPayroll,
  departmentName,
  maxTeamSize,
  roleName,
  roleSummary,
  teamModifiers,
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
import { EmptyState, MiniStat, Modal, SubTabs } from '../../ui/MobileUI';

interface TeamHubProps {
  state: GameState;
  onHire: (candidateId: string) => ActionResult;
  onFire: (employeeId: string) => ActionResult;
  onAssign: (employeeId: string, department: TeamDepartment | null, shift: ShiftId) => ActionResult;
  onWorkload: (department: TeamDepartment, workload: Workload) => ActionResult;
  onAutomation: (key: keyof TeamAutomation, enabled: boolean) => ActionResult;
  onTrain: (employeeId: string, track: TrainingTrack) => ActionResult;
}

type Section = 'staff' | 'candidates' | 'shifts' | 'growth';
const DEPARTMENTS: TeamDepartment[] = ['production', 'quality', 'packaging', 'warehouse', 'sales', 'marketing', 'maintenance', 'sanitation'];
const TRAINING: TrainingTrack[] = ['craft', 'precision', 'speed', 'reliability'];

export function TeamHub({ state, onHire, onFire, onAssign, onWorkload, onAutomation, onTrain }: TeamHubProps) {
  const [section, setSection] = useState<Section>('staff');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<TeamCandidate | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const capacity = maxTeamSize(state.facility?.tier ?? 1);
  const payroll = dailyPayroll(state.team);
  const avgMorale = state.team.employees.length ? Math.round(state.team.employees.reduce((sum, item) => sum + item.morale, 0) / state.team.employees.length) : 0;
  const avgFatigue = state.team.employees.length ? Math.round(state.team.employees.reduce((sum, item) => sum + item.fatigue, 0) / state.team.employees.length) : 0;
  const modifiers = useMemo(() => teamModifiers(state.team), [state.team]);

  function act(result: ActionResult) {
    setFeedback(result);
    window.setTimeout(() => setFeedback(null), 2600);
    if (result.ok) {
      setSelectedCandidate(null);
      setSelectedEmployee(null);
    }
  }

  return (
    <div className="team-hub compact-page">
      {feedback && <div className={`toast ${feedback.ok ? 'success' : 'error'}`}>{feedback.ok ? <Icon name="check" /> : <Icon name="warning" />}{feedback.message}</div>}

      <section className="team-command-card glass-card">
        <div>
          <span className="section-kicker">управление людьми</span>
          <h2>{state.team.employees.length === 0 ? 'Пока ты работаешь один' : `${state.team.employees.length} человек в команде`}</h2>
          <p>{state.team.employees.length === 0 ? 'Первый специалист снимет часть ручной работы и добавит ежедневные расходы.' : `Фонд оплаты ${formatMoney(payroll)} в день · средняя мораль ${avgMorale}/100.`}</p>
        </div>
        <div className="team-capacity-ring"><strong>{state.team.employees.length}</strong><span>из {capacity}</span></div>
      </section>

      <section className="mini-stat-grid team-stat-grid">
        <MiniStat label="Штат" value={`${state.team.employees.length}/${capacity}`} note="мест занято" />
        <MiniStat label="Зарплаты" value={formatMoney(payroll)} note="за день" />
        <MiniStat label="Мораль" value={`${avgMorale}`} note="средняя" />
        <MiniStat label="Усталость" value={`${avgFatigue}`} note="средняя" />
      </section>

      <SubTabs value={section} onChange={setSection} label="Команда" options={[
        { id: 'staff', label: 'Штат', badge: state.team.employees.length },
        { id: 'candidates', label: 'Кандидаты', badge: state.team.candidates.length },
        { id: 'shifts', label: 'Смены' },
        { id: 'growth', label: 'Развитие' },
      ]} />

      {section === 'staff' && (
        state.team.employees.length === 0
          ? <section className="glass-card"><EmptyState icon="factory" title="Штат ещё не собран" text="Открой рынок кандидатов и найми первого специалиста." action={<button className="button primary" onClick={() => setSection('candidates')}>К кандидатам</button>} /></section>
          : <section className="compact-list glass-card">{state.team.employees.map((employee) => (
            <button className="compact-list-row" key={employee.id} onClick={() => setSelectedEmployee(employee)}>
              <EmployeeMark employee={employee} />
              <span><strong>{employee.name}</strong><small>{roleName(employee.role)} · {employee.assignment ? departmentName(employee.assignment) : 'без назначения'} · усталость {employee.fatigue}</small></span>
              <span className={`row-status ${employee.trainingEndsDay ? 'warning' : employee.morale >= 65 ? 'neutral' : 'danger'}`}>{employee.trainingEndsDay ? `учёба до ${employee.trainingEndsDay}` : employee.shift === 'day' ? 'день' : 'вечер'}</span>
            </button>
          ))}</section>
      )}

      {section === 'candidates' && (
        <>
          <div className="compact-banner neutral"><Icon name="clock" /><span>Список обновится на {state.team.nextCandidateRefreshDay}-й день. Найм включает оформление и ввод в должность.</span></div>
          <section className="candidate-grid">{state.team.candidates.map((candidate) => (
            <button className="candidate-card glass-card" key={candidate.id} onClick={() => setSelectedCandidate(candidate)}>
              <EmployeeMark employee={candidate} />
              <div><span>{roleName(candidate.role)}</span><strong>{candidate.name}</strong><small>{candidate.trait}</small></div>
              <dl><div><dt>Навык</dt><dd>{candidate.skill}</dd></div><div><dt>Надёжность</dt><dd>{candidate.reliability}</dd></div><div><dt>Зарплата</dt><dd>{formatMoney(candidate.salary)}</dd></div></dl>
            </button>
          ))}</section>
        </>
      )}

      {section === 'shifts' && (
        <div className="shift-stack">
          <section className="automation-panel glass-card">
            <div className="compact-section-title"><div><span>Автоматизация</span><strong>Передать рутину сотрудникам</strong></div></div>
            <AutomationRow label="Санитарная поддержка" note="Снижает падение чистоты каждый день" enabled={state.team.automation.cleaning} onChange={(value) => act(onAutomation('cleaning', value))} />
            <AutomationRow label="Контроль износа" note="Механик уменьшает ежедневный износ" enabled={state.team.automation.maintenance} onChange={(value) => act(onAutomation('maintenance', value))} />
            <AutomationRow label="Поиск покупателей" note="Менеджер раз в несколько дней отправляет образец" enabled={state.team.automation.sales} onChange={(value) => act(onAutomation('sales', value))} />
          </section>
          <section className="department-grid">{DEPARTMENTS.map((department) => {
            const assigned = state.team.employees.filter((employee) => employee.assignment === department && employee.trainingEndsDay === null);
            const workload = state.team.workloads[department];
            return <article className="department-card glass-card" key={department}>
              <header><div><span>{departmentName(department)}</span><strong>{assigned.length ? assigned.map((item) => item.name.split(' ')[0]).join(', ') : 'Никого'}</strong></div><b>{assigned.length}</b></header>
              <div className="workload-switch">{(['light', 'normal', 'heavy'] as Workload[]).map((value) => <button key={value} className={workload === value ? 'active' : ''} onClick={() => act(onWorkload(department, value))}>{workloadLabel(value)}</button>)}</div>
            </article>;
          })}</section>
        </div>
      )}

      {section === 'growth' && (
        <>
          <section className="team-impact-grid">
            <Impact label="Точность процесса" value={`+${modifiers.productionPrecision.toFixed(1)}`} />
            <Impact label="Контроль качества" value={`+${modifiers.environmentQuality.toFixed(1)}`} />
            <Impact label="Экономия розлива" value={`${Math.round(modifiers.packagingEfficiency * 100)}%`} />
            <Impact label="Снижение износа" value={`${Math.round(modifiers.wearReduction * 100)}%`} />
          </section>
          {state.team.employees.length > 0 && <section className="compact-list glass-card">{state.team.employees.map((employee) => <button className="compact-list-row" key={employee.id} onClick={() => setSelectedEmployee(employee)}><EmployeeMark employee={employee} /><span><strong>{employee.name}</strong><small>Опыт {employee.experience} · точность {employee.precision} · темп {employee.pace}</small></span><Icon name="arrow" /></button>)}</section>}
          {state.team.events.length > 0 && <section className="team-event-list glass-card">{state.team.events.slice(0, 8).map((item) => <div key={item.id}><i className={item.tone} /><span><strong>{item.title}</strong><small>День {item.day} · {item.detail}</small></span></div>)}</section>}
        </>
      )}

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
function Impact({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
