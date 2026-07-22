import { useState } from 'react';
import type { GameController } from '../../app/useGameState';
import type { VersionGuard } from '../../app/useVersionGuard';
import { ArchiveView } from '../archive/ArchiveView';
import { TeamHub } from '../team/TeamHub';
import { SubTabs } from '../../ui/MobileUI';

interface CompanyCenterProps {
  game: GameController;
  version: VersionGuard;
}

type Section = 'finance' | 'team' | 'data';

export function CompanyCenter({ game, version }: CompanyCenterProps) {
  const [section, setSection] = useState<Section>('finance');
  const state = game.state;
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
          <Detail label="Выручка" value={formatMoney(state.finance.salesRevenue + state.finance.retailRevenue)} />
          <Detail label="Продано" value={`${state.finance.unitsSold} бут.`} />
          <Detail label="Производство" value={formatMoney(state.finance.productionSpend)} />
          <Detail label="Сырьё" value={formatMoney(state.finance.supplySpend)} />
          <Detail label="Команда" value={formatMoney(state.finance.teamSpend)} />
          <Detail label="Налоги и акциз" value={formatMoney(state.finance.taxSpend)} />
          <Detail label="Объекты" value={formatMoney(state.finance.facilitySpend + state.finance.retailSpend)} />
        </div>
      </div>}
      {section === 'team' && <TeamHub state={state} onHire={game.hireEmployee} onFire={game.fireEmployee} onAssign={game.assignEmployee} onWorkload={game.setWorkload} onAutomation={game.setAutomation} onTrain={game.trainEmployee} />}
      {section === 'data' && <ArchiveView state={state} version={version} onExport={game.exportSave} onImport={game.importSave} onReset={game.reset} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function formatMoney(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }
