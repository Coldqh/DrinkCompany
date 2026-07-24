import { useState } from 'react';
import type { GameController } from '../../app/useGameState';
import type { VersionGuard } from '../../app/useVersionGuard';
import { ArchiveView } from '../archive/ArchiveView';
import { TeamHub } from '../team/TeamHub';
import { financialPosition, latestFinancialStatement } from '../../domain/finance';
import { activeLicensesForOrganization, organizationCompliance } from '../../domain/regulation';
import { BrandCrest, BottlePreview } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';

interface CompanyCenterProps {
  game: GameController;
  version: VersionGuard;
  onClose: () => void;
}

type Section = 'overview' | 'finance' | 'assets' | 'team' | 'licenses' | 'data';

export function CompanyCenter({ game, version, onClose }: CompanyCenterProps) {
  const [section, setSection] = useState<Section>('overview');
  const state = game.state;
  const ecosystem = state.ecosystem;
  const playerOrganizationId = ecosystem?.playerOrganizationId ?? null;
  const playerOrganization = playerOrganizationId ? ecosystem?.organizations.find((organization) => organization.id === playerOrganizationId) : null;
  const position = ecosystem && playerOrganizationId ? financialPosition(ecosystem.financials, playerOrganizationId, ecosystem.trade, state.finance.cash) : null;
  const statement = ecosystem && playerOrganizationId ? latestFinancialStatement(ecosystem.financials, playerOrganizationId) : null;
  const assets = ecosystem && playerOrganizationId ? ecosystem.assets.filter((asset) => asset.ownerOrganizationId === playerOrganizationId || asset.operatorOrganizationId === playerOrganizationId) : [];
  const licenses = ecosystem && playerOrganizationId ? activeLicensesForOrganization(ecosystem.regulation, playerOrganizationId) : [];
  const compliance = ecosystem && playerOrganizationId ? organizationCompliance(ecosystem.regulation, playerOrganizationId) : null;
  const valuation = playerOrganization?.valuation ?? state.finance.cash + (position?.inventoryValue ?? 0);

  return (
    <div className="company-profile-screen" role="dialog" aria-modal="true" aria-label="Профиль компании">
      <header className="company-profile-top">
        <button className="lux-icon-button" onClick={onClose} aria-label="Закрыть профиль"><Icon name="close" /></button>
        <BrandCrest />
        <div><span>Профиль компании</span><h1>{state.company.name}</h1><p>Стратегия, активы и репутация.</p></div>
        <span className="company-tier"><small>Уровень</small><strong>{Math.max(1, Math.floor((state.company.reputation + state.company.completedBatches) / 20) + 1)}</strong></span>
      </header>

      <section className="company-profile-hero">
        <div><span>Частная алкогольная компания</span><h2>{state.company.reputation >= 70 ? 'Премиальный дом с сильной репутацией' : state.company.reputation >= 40 ? 'Компания набирает влияние' : 'Молодой производитель строит имя'}</h2><p>{playerOrganization?.strategy ?? 'Контролируемое производство, собственные бренды и выход в гостеприимство.'}</p></div>
        <dl><div><dt>Репутация</dt><dd>{state.company.reputation}/100</dd></div><div><dt>Стоимость компании</dt><dd>{formatMoney(valuation)} ₽</dd></div><div><dt>Объекты</dt><dd>{assets.length}</dd></div><div><dt>Бренды</dt><dd>{state.brand.brands.length}</dd></div></dl>
      </section>

      <nav className="lux-tabs company-profile-tabs" aria-label="Разделы профиля компании">
        {([['overview', 'Обзор'], ['finance', 'Финансы'], ['assets', 'Активы'], ['team', 'Команда'], ['licenses', 'Лицензии'], ['data', 'Данные']] as Array<[Section, string]>).map(([id, label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}</button>)}
      </nav>

      <main className="company-profile-content">
        {section === 'overview' && <CompanyOverview state={state} assets={assets} licenses={licenses.length} compliance={compliance?.score ?? 100} valuation={valuation} />}
        {section === 'finance' && <FinanceSection state={state} position={position} statement={statement} debt={playerOrganization?.debt ?? 0} />}
        {section === 'assets' && <AssetsSection assets={assets} />}
        {section === 'team' && <TeamHub state={state} onHire={game.hireEmployee} onFire={game.fireEmployee} onAssign={game.assignEmployee} onWorkload={game.setWorkload} onAutomation={game.setAutomation} onTrain={game.trainEmployee} />}
        {section === 'licenses' && <LicensesSection licenses={licenses} compliance={compliance?.score ?? 100} overdue={compliance?.overdueTax ?? 0} day={state.day} />}
        {section === 'data' && <ArchiveView state={state} version={version} onExport={game.exportSave} onImport={game.importSave} onReset={game.reset} />}
      </main>
    </div>
  );
}

function CompanyOverview({ state, assets, licenses, compliance, valuation }: { state: GameController['state']; assets: NonNullable<GameController['state']['ecosystem']>['assets']; licenses: number; compliance: number; valuation: number }) {
  const burnDays = state.finance.dailyFixedCost > 0 ? Math.floor(state.finance.cash / state.finance.dailyFixedCost) : 999;
  const releases = state.brand.releases.filter((item) => item.status === 'active').slice(0, 3);
  return <>
    <section className="company-core-stats"><article><span>Баланс</span><strong>{formatMoney(state.finance.cash)} ₽</strong><small>{burnDays > 90 ? '90+' : burnDays} дней запаса</small></article><article><span>Расходы в день</span><strong>{formatMoney(state.finance.dailyFixedCost)} ₽</strong><small>операционная нагрузка</small></article><article><span>Стоимость</span><strong>{formatMoney(valuation)} ₽</strong><small>оценка компании</small></article><article><span>Комплаенс</span><strong className={compliance >= 75 ? 'success' : 'warning'}>{compliance}/100</strong><small>{licenses} лицензий активно</small></article></section>
    <section className="company-assets-preview"><header><span>Активы компании</span><small>{assets.length} в управлении</small></header><div>{assets.slice(0, 4).map((asset) => <article key={asset.id}><Icon name={asset.type === 'production' ? 'factory' : asset.type === 'warehouse' ? 'archive' : asset.type.includes('bar') || asset.type === 'nightclub' ? 'beer' : 'building'} /><span><strong>{asset.name}</strong><small>{asset.city} · состояние {asset.condition}/100</small></span><b>{asset.status === 'operating' ? 'Работает' : asset.status}</b></article>)}{assets.length === 0 && <p>Активы появятся после развития компании.</p>}</div></section>
    <section className="company-brands-preview"><header><span>Бренды и релизы</span><small>{releases.length} активных</small></header><div>{releases.length ? releases.map((release) => <article key={release.id}><BottlePreview design={release.packaging} compact label={release.name} /><span><strong>{release.name}</strong><small>{state.brand.brands.find((brand) => brand.id === release.brandId)?.name ?? 'Drink Company'}</small></span><dl><div><dt>Цена</dt><dd>{formatMoney(release.retailPrice)} ₽</dd></div><div><dt>Известность</dt><dd>{release.awareness}/100</dd></div></dl></article>) : <p>Первый релиз появится после розлива партии.</p>}</div></section>
    <section className="company-team-preview"><header><span>Команда</span><small>{state.team.employees.length} сотрудников</small></header><div>{state.team.employees.slice(0, 5).map((employee) => <article key={employee.id}><span>{initials(employee.name)}</span><div><strong>{employee.name}</strong><small>{employee.role} · навык {employee.skill}/100</small></div><b>{employee.morale >= 70 ? 'В форме' : employee.fatigue >= 80 ? 'Перегружен' : 'Работает'}</b></article>)}{state.team.employees.length === 0 && <p>Штат пока не сформирован.</p>}</div></section>
  </>;
}
function FinanceSection({ state, position, statement, debt }: { state: GameController['state']; position: ReturnType<typeof financialPosition> | null; statement: ReturnType<typeof latestFinancialStatement>; debt: number }) { return <section className="company-finance-section"><header><span>Финансовое положение</span><strong>{formatMoney(state.finance.cash)} ₽</strong></header><div><Detail label="К получению" value={`${formatMoney(position?.receivables ?? 0)} ₽`} /><Detail label="К оплате" value={`${formatMoney(position?.payables ?? 0)} ₽`} /><Detail label="Товарный запас" value={`${formatMoney(position?.inventoryValue ?? 0)} ₽`} /><Detail label="Оборотный капитал" value={`${formatMoney(position?.workingCapital ?? state.finance.cash)} ₽`} /><Detail label="Общий долг" value={`${formatMoney(debt)} ₽`} /><Detail label="Прибыль за месяц" value={statement ? `${formatMoney(statement.netIncome)} ₽` : 'Период не закрыт'} /><Detail label="Выручка за месяц" value={statement ? `${formatMoney(statement.revenue)} ₽` : `${formatMoney(state.finance.salesRevenue + state.finance.retailRevenue)} ₽`} /><Detail label="Налоги и акциз" value={`${formatMoney(state.finance.taxSpend)} ₽`} /></div></section>; }
function AssetsSection({ assets }: { assets: NonNullable<GameController['state']['ecosystem']>['assets'] }) { return <section className="company-assets-section"><header><span>Активы</span><small>{assets.length} объектов</small></header><div>{assets.map((asset) => <article key={asset.id}><Icon name={asset.type === 'production' ? 'factory' : asset.type === 'warehouse' ? 'archive' : asset.type.includes('bar') || asset.type === 'nightclub' ? 'beer' : 'building'} /><span><strong>{asset.name}</strong><small>{asset.city} · {asset.address}</small></span><dl><div><dt>Состояние</dt><dd>{asset.condition}/100</dd></div><div><dt>Расходы</dt><dd>{formatMoney(asset.dailyOperatingCost)} ₽/день</dd></div></dl></article>)}</div></section>; }
function LicensesSection({ licenses, compliance, overdue, day }: { licenses: ReturnType<typeof activeLicensesForOrganization>; compliance: number; overdue: number; day: number }) { return <section className="company-license-section"><header><span>Лицензии и регулирование</span><strong className={compliance >= 75 ? 'success' : 'warning'}>{compliance}/100</strong></header><p className="license-status-line"><Icon name={overdue > 0 ? 'warning' : 'check'} />{overdue > 0 ? `Просрочено обязательств на ${formatMoney(overdue)} ₽` : 'Лицензии и обязательства в порядке'}</p><div>{licenses.map((license) => <article key={license.id}><Icon name="contract" /><span><strong>{permitLabel(license.permitType)}</strong><small>{license.assetId ? 'Привязана к объекту' : 'Корпоративная лицензия'}</small></span><b>{license.expiresDay ? `до дня ${license.expiresDay}` : 'бессрочно'}</b><em className={license.expiresDay && license.expiresDay - day < 30 ? 'warning' : 'success'}>{license.status}</em></article>)}{licenses.length === 0 && <p>Активных лицензий пока нет.</p>}</div></section>; }
function Detail({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function permitLabel(value: string) { return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'DC'; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
