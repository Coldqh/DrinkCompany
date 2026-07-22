export type EmployeeRole = 'technologist' | 'brewer' | 'cidermaker' | 'lab' | 'bottler' | 'warehouse' | 'sales' | 'marketer' | 'mechanic' | 'sanitation';
export type TeamDepartment = 'production' | 'quality' | 'packaging' | 'warehouse' | 'sales' | 'marketing' | 'maintenance' | 'sanitation';
export type ShiftId = 'day' | 'evening';
export type Workload = 'light' | 'normal' | 'heavy';
export type TrainingTrack = 'craft' | 'precision' | 'speed' | 'reliability';

export interface EmployeeProfile {
  id: string;
  name: string;
  role: EmployeeRole;
  skill: number;
  precision: number;
  pace: number;
  reliability: number;
  salary: number;
  trait: string;
}

export interface TeamCandidate extends EmployeeProfile {
  availableUntilDay: number;
  hiringFee: number;
}

export interface Employee extends EmployeeProfile {
  hiredDay: number;
  morale: number;
  fatigue: number;
  experience: number;
  assignment: TeamDepartment | null;
  shift: ShiftId;
  trainingTrack: TrainingTrack | null;
  trainingEndsDay: number | null;
  absences: number;
  incidents: number;
}

export interface TeamAutomation {
  cleaning: boolean;
  maintenance: boolean;
  sales: boolean;
}

export interface TeamEvent {
  id: string;
  day: number;
  tone: 'staff' | 'warning' | 'training';
  title: string;
  detail: string;
}

export interface TeamState {
  employees: Employee[];
  candidates: TeamCandidate[];
  workloads: Record<TeamDepartment, Workload>;
  automation: TeamAutomation;
  nextEmployeeNumber: number;
  nextCandidateRefreshDay: number;
  payrollSpend: number;
  hiringSpend: number;
  trainingSpend: number;
  events: TeamEvent[];
}

export interface TeamAdvanceResult {
  team: TeamState;
  payroll: number;
  events: TeamEvent[];
}

export interface TeamModifiers {
  productionPrecision: number;
  environmentQuality: number;
  packagingEfficiency: number;
  wearReduction: number;
  sanitationSupport: number;
  labInsight: number;
  salesSkill: number;
  marketingSkill: number;
  warehouseProtection: number;
}

const ROLE_DEFINITIONS: Record<EmployeeRole, { name: string; department: TeamDepartment; summary: string }> = {
  technologist: { name: 'Технолог', department: 'quality', summary: 'Следит за рецептурой и стабильностью партий.' },
  brewer: { name: 'Пивовар', department: 'production', summary: 'Управляет варочным процессом и ферментацией пива.' },
  cidermaker: { name: 'Сидрмейкер', department: 'production', summary: 'Работает с яблоками, прессованием и сидровой ферментацией.' },
  lab: { name: 'Лаборант', department: 'quality', summary: 'Раскрывает свойства сырья и замечает скрытые дефекты.' },
  bottler: { name: 'Оператор розлива', department: 'packaging', summary: 'Снижает потери и ошибки при упаковке.' },
  warehouse: { name: 'Кладовщик', department: 'warehouse', summary: 'Контролирует запасы и уменьшает порчу сырья.' },
  sales: { name: 'Менеджер продаж', department: 'sales', summary: 'Сам ищет точки и готовит коммерческие предложения.' },
  marketer: { name: 'Маркетолог', department: 'marketing', summary: 'Усиливает узнаваемость релизов и кампаний.' },
  mechanic: { name: 'Механик', department: 'maintenance', summary: 'Снижает износ и риск остановки оборудования.' },
  sanitation: { name: 'Санитарный оператор', department: 'sanitation', summary: 'Поддерживает чистоту цеха между партиями.' },
};

const CANDIDATE_NAMES = [
  'Mara Klein', 'Jonas Weber', 'Élise Martin', 'Tom Becker', 'Sofia Laurent', 'Lukas Brandt',
  'Nina Vogel', 'Arthur Morel', 'Clara Stein', 'Maxime Roux', 'Leonie Hart', 'Felix König',
  'Mila Schuster', 'Noah Keller', 'Eva Bernard', 'Paul Richter', 'Anna Weiss', 'Hugo Meyer',
];

const ROLE_ROTATION: EmployeeRole[] = ['technologist', 'brewer', 'cidermaker', 'lab', 'bottler', 'warehouse', 'sales', 'marketer', 'mechanic', 'sanitation'];

export function createTeamState(day = 1): TeamState {
  return {
    employees: [],
    candidates: generateCandidates(day),
    workloads: {
      production: 'normal', quality: 'normal', packaging: 'normal', warehouse: 'normal',
      sales: 'normal', marketing: 'normal', maintenance: 'normal', sanitation: 'normal',
    },
    automation: { cleaning: false, maintenance: false, sales: false },
    nextEmployeeNumber: 1,
    nextCandidateRefreshDay: day + 5,
    payrollSpend: 0,
    hiringSpend: 0,
    trainingSpend: 0,
    events: [],
  };
}

export function roleName(role: EmployeeRole): string { return ROLE_DEFINITIONS[role].name; }
export function roleSummary(role: EmployeeRole): string { return ROLE_DEFINITIONS[role].summary; }
export function defaultDepartment(role: EmployeeRole): TeamDepartment { return ROLE_DEFINITIONS[role].department; }

export function departmentName(department: TeamDepartment): string {
  const names: Record<TeamDepartment, string> = {
    production: 'Производство', quality: 'Контроль качества', packaging: 'Розлив', warehouse: 'Склад',
    sales: 'Продажи', marketing: 'Маркетинг', maintenance: 'Обслуживание', sanitation: 'Санитария',
  };
  return names[department];
}

export function dailyPayroll(team: TeamState): number {
  return roundMoney(team.employees.reduce((sum, employee) => sum + employee.salary / 30, 0));
}

export function maxTeamSize(facilityTier: number): number {
  return 2 + Math.max(1, facilityTier) * 3;
}

export function hireCandidate(team: TeamState, candidateId: string, day: number): { team: TeamState; employee: Employee; cost: number } {
  const candidate = team.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error('Кандидат больше недоступен');
  if (candidate.availableUntilDay < day) throw new Error('Кандидат уже снял предложение');
  const { availableUntilDay: _availableUntilDay, hiringFee, ...profile } = candidate;
  const employee: Employee = {
    ...profile,
    id: `employee-${day}-${team.nextEmployeeNumber}`,
    hiredDay: day,
    morale: 72,
    fatigue: 8,
    experience: 0,
    assignment: defaultDepartment(candidate.role),
    shift: 'day',
    trainingTrack: null,
    trainingEndsDay: null,
    absences: 0,
    incidents: 0,
  };
  return {
    team: {
      ...team,
      employees: [employee, ...team.employees],
      candidates: team.candidates.filter((item) => item.id !== candidateId),
      nextEmployeeNumber: team.nextEmployeeNumber + 1,
      hiringSpend: roundMoney(team.hiringSpend + hiringFee),
      events: [event(day, 'staff', `${candidate.name} принят в команду`, `${roleName(candidate.role)} начинает работу в отделе «${departmentName(defaultDepartment(candidate.role))}».`), ...team.events].slice(0, 24),
    },
    employee,
    cost: hiringFee,
  };
}

export function dismissEmployee(team: TeamState, employeeId: string, day: number): { team: TeamState; cost: number } {
  const employee = getEmployee(team, employeeId);
  const cost = roundMoney(employee.salary / 15);
  return {
    team: {
      ...team,
      employees: team.employees.filter((item) => item.id !== employeeId),
      events: [event(day, 'warning', `${employee.name} покинул компанию`, `Выплачена компенсация ${Math.round(cost)}.`), ...team.events].slice(0, 24),
    },
    cost,
  };
}

export function assignEmployee(team: TeamState, employeeId: string, assignment: TeamDepartment | null, shift: ShiftId): TeamState {
  const employee = getEmployee(team, employeeId);
  if (employee.trainingEndsDay !== null) throw new Error('Сотрудник сейчас проходит обучение');
  return {
    ...team,
    employees: team.employees.map((item) => item.id === employeeId ? { ...item, assignment, shift } : item),
  };
}

export function setDepartmentWorkload(team: TeamState, department: TeamDepartment, workload: Workload): TeamState {
  return { ...team, workloads: { ...team.workloads, [department]: workload } };
}

export function setTeamAutomation(team: TeamState, key: keyof TeamAutomation, enabled: boolean): TeamState {
  return { ...team, automation: { ...team.automation, [key]: enabled } };
}

export function startEmployeeTraining(team: TeamState, employeeId: string, track: TrainingTrack, day: number): { team: TeamState; cost: number } {
  const employee = getEmployee(team, employeeId);
  if (employee.trainingEndsDay !== null) throw new Error('Сотрудник уже проходит обучение');
  const cost = trainingCost(employee, track);
  const duration = track === 'reliability' ? 4 : 3;
  return {
    team: {
      ...team,
      employees: team.employees.map((item) => item.id === employeeId ? { ...item, assignment: null, trainingTrack: track, trainingEndsDay: day + duration } : item),
      trainingSpend: roundMoney(team.trainingSpend + cost),
      events: [event(day, 'training', `${employee.name}: обучение началось`, `Программа завершится на ${day + duration}-й день.`), ...team.events].slice(0, 24),
    },
    cost,
  };
}

export function advanceTeamDay(team: TeamState, day: number): TeamAdvanceResult {
  const events: TeamEvent[] = [];
  const employees = team.employees.map((employee) => {
    if (employee.trainingEndsDay !== null && day >= employee.trainingEndsDay) {
      const upgraded = completeTraining(employee);
      events.push(event(day, 'training', `${employee.name} завершил обучение`, trainingResultText(employee.trainingTrack)));
      return upgraded;
    }

    if (employee.trainingEndsDay !== null) return { ...employee, fatigue: Math.max(0, employee.fatigue - 4) };

    const workload = employee.assignment ? team.workloads[employee.assignment] : 'light';
    const fatigueDelta = workload === 'heavy' ? 13 : workload === 'normal' ? 7 : 2;
    const recovery = employee.shift === 'evening' ? 1 : 0;
    let fatigue = clamp(employee.fatigue + fatigueDelta - recovery, 0, 100);
    let morale = clamp(employee.morale + (workload === 'light' ? 1 : workload === 'heavy' ? -2 : 0), 0, 100);
    let absences = employee.absences;
    let incidents = employee.incidents;
    const absenceRisk = Math.max(0, fatigue - 68) + Math.max(0, 60 - employee.reliability) * 0.6;
    const roll = seededRoll(day, employee.id, 100);
    if (roll < absenceRisk * 0.18) {
      absences += 1;
      fatigue = Math.max(18, fatigue - 24);
      morale = Math.max(0, morale - 4);
      events.push(event(day, 'warning', `${employee.name} не вышел на смену`, 'Высокая усталость сорвала рабочий день сотрудника.'));
    } else if (roll < absenceRisk * 0.18 + Math.max(0, fatigue - 75) * 0.12) {
      incidents += 1;
      morale = Math.max(0, morale - 2);
      events.push(event(day, 'warning', `${employee.name}: ошибка на смене`, 'Перегрузка привела к потере темпа и дополнительному контролю.'));
    }
    return { ...employee, fatigue, morale, absences, incidents, experience: employee.experience + (employee.assignment ? 1 : 0) };
  });

  const refreshed = day >= team.nextCandidateRefreshDay;
  if (refreshed) events.push(event(day, 'staff', 'Рынок кандидатов обновился', 'Появились новые специалисты с другим уровнем опыта и зарплатными ожиданиями.'));
  const payroll = dailyPayroll({ ...team, employees });
  const nextTeam: TeamState = {
    ...team,
    employees,
    candidates: refreshed ? generateCandidates(day) : team.candidates.filter((candidate) => candidate.availableUntilDay >= day),
    nextCandidateRefreshDay: refreshed ? day + 5 : team.nextCandidateRefreshDay,
    payrollSpend: roundMoney(team.payrollSpend + payroll),
    events: [...events, ...team.events].slice(0, 24),
  };
  return { team: nextTeam, payroll, events };
}

export function teamModifiers(team: TeamState, family?: 'beer' | 'cider'): TeamModifiers {
  const active = team.employees.filter((employee) => employee.assignment && employee.trainingEndsDay === null && employee.fatigue < 92);
  const contribution = (department: TeamDepartment, roles?: EmployeeRole[]) => active
    .filter((employee) => employee.assignment === department && (!roles || roles.includes(employee.role)))
    .reduce((sum, employee) => sum + effectiveScore(employee, team.workloads[department]), 0);
  const productionRoles: EmployeeRole[] = family === 'beer' ? ['brewer', 'technologist'] : family === 'cider' ? ['cidermaker', 'technologist'] : ['brewer', 'cidermaker', 'technologist'];
  return {
    productionPrecision: clamp(contribution('production', productionRoles) / 70 + contribution('quality', ['technologist']) / 110, 0, 3.2),
    environmentQuality: clamp(contribution('quality', ['technologist', 'lab']) / 24, 0, 8),
    packagingEfficiency: clamp(contribution('packaging', ['bottler']) / 2600, 0, 0.045),
    wearReduction: clamp(contribution('maintenance', ['mechanic']) / 180, 0, 0.58),
    sanitationSupport: clamp(contribution('sanitation', ['sanitation']) / 18, 0, 8),
    labInsight: clamp(contribution('quality', ['lab']) / 30, 0, 4),
    salesSkill: clamp(contribution('sales', ['sales']) / 20, 0, 8),
    marketingSkill: clamp(contribution('marketing', ['marketer']) / 20, 0, 8),
    warehouseProtection: clamp(contribution('warehouse', ['warehouse']) / 22, 0, 7),
  };
}

export function trainingCost(employee: Employee, track: TrainingTrack): number {
  const base = track === 'reliability' ? 980 : 760;
  return Math.round(base + employee.skill * 6);
}

export function workloadLabel(workload: Workload): string {
  return workload === 'light' ? 'Щадящая' : workload === 'heavy' ? 'Высокая' : 'Обычная';
}

export function trainingLabel(track: TrainingTrack): string {
  const labels: Record<TrainingTrack, string> = { craft: 'Ремесло', precision: 'Точность', speed: 'Темп', reliability: 'Надёжность' };
  return labels[track];
}

function generateCandidates(day: number): TeamCandidate[] {
  return Array.from({ length: 6 }, (_, index) => {
    const seed = day * 17 + index * 29;
    const role = ROLE_ROTATION[(day + index * 3) % ROLE_ROTATION.length] ?? 'technologist';
    const skill = 42 + seededRoll(seed, role, 37);
    const precision = clamp(skill + seededRoll(seed + 2, role, 25) - 12, 30, 96);
    const pace = clamp(skill + seededRoll(seed + 3, role, 27) - 13, 30, 96);
    const reliability = clamp(52 + seededRoll(seed + 5, role, 43), 35, 97);
    const salary = Math.round((1250 + skill * 22 + reliability * 6) / 50) * 50;
    const name = CANDIDATE_NAMES[(day * 3 + index * 5) % CANDIDATE_NAMES.length] ?? `Candidate ${index + 1}`;
    return {
      id: `candidate-${day}-${index + 1}-${role}`,
      name,
      role,
      skill,
      precision,
      pace,
      reliability,
      salary,
      trait: traitFor(seed),
      availableUntilDay: day + 4,
      hiringFee: Math.round((salary * 0.55 + skill * 7) / 10) * 10,
    };
  });
}

function effectiveScore(employee: Employee, workload: Workload): number {
  const workloadModifier = workload === 'heavy' ? 1.12 : workload === 'light' ? 0.82 : 1;
  const fatigueModifier = clamp(1 - Math.max(0, employee.fatigue - 45) / 100, 0.45, 1);
  const moraleModifier = 0.78 + employee.morale / 450;
  return ((employee.skill * 0.45 + employee.precision * 0.3 + employee.reliability * 0.25) * workloadModifier * fatigueModifier * moraleModifier);
}

function completeTraining(employee: Employee): Employee {
  const track = employee.trainingTrack;
  if (!track) return { ...employee, trainingEndsDay: null };
  return {
    ...employee,
    skill: clamp(employee.skill + (track === 'craft' ? 7 : 3), 1, 100),
    precision: clamp(employee.precision + (track === 'precision' ? 8 : 2), 1, 100),
    pace: clamp(employee.pace + (track === 'speed' ? 8 : 2), 1, 100),
    reliability: clamp(employee.reliability + (track === 'reliability' ? 8 : 2), 1, 100),
    morale: clamp(employee.morale + 6, 0, 100),
    fatigue: Math.max(0, employee.fatigue - 18),
    assignment: defaultDepartment(employee.role),
    trainingTrack: null,
    trainingEndsDay: null,
  };
}

function trainingResultText(track: TrainingTrack | null): string {
  return track ? `Навык «${trainingLabel(track)}» вырос, сотрудник возвращается к назначению.` : 'Сотрудник возвращается к работе.';
}

function traitFor(seed: number): string {
  const traits = ['Педантичный', 'Быстро учится', 'Спокоен под нагрузкой', 'Прямой в общении', 'Экономит сырьё', 'Требует чётких процессов'];
  return traits[seededRoll(seed, 'trait', traits.length)] ?? 'Педантичный';
}

function event(day: number, tone: TeamEvent['tone'], title: string, detail: string): TeamEvent {
  return { id: `team-${day}-${slug(title)}-${Math.abs(hash(detail)) % 999}`, day, tone, title, detail };
}

function getEmployee(team: TeamState, employeeId: string): Employee {
  const employee = team.employees.find((item) => item.id === employeeId);
  if (!employee) throw new Error('Сотрудник не найден');
  return employee;
}

function seededRoll(seed: number, key: string, max: number): number {
  return Math.abs(hash(`${seed}:${key}`)) % Math.max(1, max);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result | 0;
}

function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '').slice(0, 24); }
function roundMoney(value: number): number { return Math.round(value * 100) / 100; }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
