import { useRef } from 'react';
import type { GameState } from '../../domain/game';
import type { VersionGuard } from '../../app/useVersionGuard';
import { Icon } from '../../ui/Icon';

interface ArchiveViewProps {
  state: GameState;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
  version: VersionGuard;
}

export function ArchiveView({ state, version, onExport, onImport, onReset }: ArchiveViewProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="simple-hub">
      <div className="data-status-line">
        <span className="action-icon"><Icon name="check" /></span>
        <span><strong>Автосохранение включено</strong><small>IndexedDB · схема {state.schemaVersion}</small></span>
      </div>
      <div className="plain-panel version-line">
        <span><strong>Версия {version.currentVersion}</strong><small>{version.checking ? 'Проверяем обновление…' : version.remote ? `Сервер: ${version.remote.version}` : 'Проверка сервера недоступна'}</small></span>
        <button className="button secondary compact-button" onClick={() => void version.checkNow()} disabled={version.checking}>Проверить</button>
      </div>
      <p className="quiet-copy">Экспортируй файл перед очисткой браузера или переносом игры на другое устройство.</p>
      <div className="stacked-actions">
        <button className="button primary" onClick={onExport}>Экспортировать сохранение</button>
        <button className="button secondary" onClick={() => fileInput.current?.click()}>Импортировать JSON</button>
        <button className="button danger" onClick={onReset}>Удалить весь прогресс</button>
      </div>
      <input ref={fileInput} hidden type="file" accept="application/json" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void onImport(file);
        event.currentTarget.value = '';
      }} />
    </div>
  );
}
