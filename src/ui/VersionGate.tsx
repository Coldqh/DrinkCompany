import type { VersionGuard } from '../app/useVersionGuard';
import { Icon } from './Icon';

export function VersionGate({ version }: { version: VersionGuard }) {
  if (!version.updateRequired) return null;
  return (
    <div className="version-gate" role="alertdialog" aria-modal="true" aria-labelledby="version-title">
      <div className="version-gate-card">
        <div className="version-gate-icon"><Icon name="spark" /></div>
        <span>Обязательное обновление</span>
        <h2 id="version-title">Доступна новая версия</h2>
        <p>Игра обновилась с {version.currentVersion} до {version.remote?.version}. Старый интерфейс заблокирован, чтобы сохранение не работало на несовместимом коде.</p>
        <div className="version-compare">
          <div><small>Установлено</small><strong>v{version.currentVersion}</strong></div>
          <Icon name="arrow" />
          <div><small>Доступно</small><strong>v{version.remote?.version}</strong></div>
        </div>
        <button className="button primary glow" onClick={() => void version.forceUpdate()} disabled={version.applying}>
          {version.applying ? 'Обновляем…' : 'Обновить сейчас'} <Icon name="arrow" />
        </button>
        <small>Сохранение останется в браузере. Кэш приложения будет очищен автоматически.</small>
      </div>
    </div>
  );
}
