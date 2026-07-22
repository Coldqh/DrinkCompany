import { describe, expect, it } from 'vitest';
import {
  advanceTeamDay,
  assignEmployee,
  createTeamState,
  dailyPayroll,
  hireCandidate,
  setDepartmentWorkload,
  startEmployeeTraining,
  teamModifiers,
} from './team';

describe('team management', () => {
  it('нанимает кандидата и добавляет ежедневную зарплату', () => {
    const initial = createTeamState(1);
    const candidate = initial.candidates[0];
    if (!candidate) throw new Error('candidate missing');
    const result = hireCandidate(initial, candidate.id, 1);
    expect(result.team.employees).toHaveLength(1);
    expect(result.team.candidates.some((item) => item.id === candidate.id)).toBe(false);
    expect(dailyPayroll(result.team)).toBeGreaterThan(0);
  });

  it('назначенный механик снижает износ', () => {
    const initial = createTeamState(6);
    const candidate = initial.candidates.find((item) => item.role === 'mechanic');
    if (!candidate) throw new Error('candidate missing');
    const hired = hireCandidate(initial, candidate.id, 6).team;
    const employee = hired.employees[0];
    if (!employee) throw new Error('employee missing');
    const assigned = assignEmployee(hired, employee.id, 'maintenance', 'day');
    expect(teamModifiers(assigned).wearReduction).toBeGreaterThan(0);
  });

  it('высокая нагрузка увеличивает усталость', () => {
    const initial = createTeamState(1);
    const candidate = initial.candidates[0];
    if (!candidate) throw new Error('candidate missing');
    const hired = hireCandidate(initial, candidate.id, 1).team;
    const employee = hired.employees[0];
    if (!employee?.assignment) throw new Error('assignment missing');
    const loaded = setDepartmentWorkload(hired, employee.assignment, 'heavy');
    const advanced = advanceTeamDay(loaded, 2).team;
    expect(advanced.employees[0]?.fatigue).toBeGreaterThan(employee.fatigue);
  });

  it('обучение временно снимает сотрудника и повышает навык', () => {
    const initial = createTeamState(1);
    const candidate = initial.candidates[0];
    if (!candidate) throw new Error('candidate missing');
    const hired = hireCandidate(initial, candidate.id, 1).team;
    const employee = hired.employees[0];
    if (!employee) throw new Error('employee missing');
    const started = startEmployeeTraining(hired, employee.id, 'precision', 1).team;
    expect(started.employees[0]?.assignment).toBeNull();
    const completed = advanceTeamDay(advanceTeamDay(advanceTeamDay(started, 2).team, 3).team, 4).team;
    expect(completed.employees[0]?.precision).toBeGreaterThan(employee.precision);
    expect(completed.employees[0]?.trainingEndsDay).toBeNull();
  });
});
