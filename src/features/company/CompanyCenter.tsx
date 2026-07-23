import { useState } from 'react';
import type { GameController } from '../../app/useGameState';
import type { VersionGuard } from '../../app/useVersionGuard';
import { ArchiveView } from '../archive/ArchiveView';
import { TeamHub } from '../team/TeamHub';
import { SubTabs } from '../../ui/MobileUI';
import { financialPosition, latestFinancialStatement } from '../../domain/finance';

interface CompanyCenterProps {
  game: GameController;
  version: VersionGuard;
}

type Section = 'finance' | 'team' | 'data';

export function CompanyCenter({ game, version }: CompanyCenterProps) {
  const [section, setSection] = useState<Section>('finance');
  const state = game.state;
  const playerOrganizationId = state.ecosystem?.playerOrganizationId ?? null;
  const playerOrganization = playerOrganizationId ? state.ecosystem?.organizations.find((organization) => organization.id === playerOrganizationId) : null;
  const position = state.ecosystem && playerOrganizationId ? financialPosition(state.ecosystem.financials, playerOrganizationId, state.ecosystem.trade, state.finance.cash) : null;
  const statement = state.ecosystem && playerOrganizationId ? latestFinancialStatement(state.ecosystem.financials, playerOrganizationId) : null;
  return (
    <div className="company-center">
      <SubTabs value={section} onChange={setSection} options={[
        { id: 'finance', label: 'Финансы' },
        { id: 'team', label: 'Команда', badge: state.team.employees.length },
        { id: 'data', label: 'Данные' },
      ]} />
      {section === 'finance' && <div className="finance-view">
        <div className="finance-hero"><span>Доступно</span><strong>{formatMoney(state.finance.cash)}</strong><small>−{formatMoney(state.finance.dailyFixedCost)} в день</small></div>
        <div className="detail-grid clean-grid">
          <Detail label="К получению" value={formatMoney(position?.receivables ?? 0)} />
          <Detail label="К оплате" value={formatMoney(position?.payables ?? 0)} />
          <Detail label="Товарный запас" value={formatMoney(position?.inventoryValue ?? 0)} />
          <Detail label="Оборотный капитал" value={formatMoney(position?.workingCapital ?? state.finance.cash)} />
          <Detail label="Кредитная линия" value={`${formatMoney(position?.creditDrawn ?? 0)} / ${formatMoney(position?.creditLimit ?? 0)}`} />
          <Detail label="Общий долг" value={formatMoney(playerOrganization?.debt ?? 0)} />
          <Detail label="Прибыль за месяц" value={statement ? formatMoney(statement.netIncome) : 'Нет закрытого периода'} />
          <Detail label="Выручка за месяц" value={statement ? formatMoney(statement.revenue) : formatMoney(state.finance.salesRevenue + state.finance.retailRevenue)} />
          <Detail label="Налоги и акциз" value={formatMoney(state.finance.taxSpend)} />
        </div>
      </div>}
      {section === 'team' && <TeamHub state={state} onHire={game.hireEmployee} onFire={game.fireEmployee} onAssign={game.assignEmployee} onWorkload={game.setWorkload} onAutomation={game.setAutomation} onTrain={game.trainEmployee} />}
      {section === 'data' && <ArchiveView state={state} version={version} onExport={game.exportSave} onImport={game.importSave} onReset={game.reset} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
