import { useRef } from 'react';
import type { GameState } from '../../domain/game';
import { getStyle } from '../../domain/production';
import { Icon } from '../../ui/Icon';

interface ArchiveViewProps {
  state: GameState;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
}

export function ArchiveView({ state, onExport, onImport, onReset }: ArchiveViewProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="archive-view">
      <section className="archive-hero glass-card">
        <div><span className="section-kicker">company memory</span><h2>Рецепты, партии и сохранение</h2><p>Каждая версия остаётся в истории. Даже слабая партия может стать полезной точкой сравнения.</p></div>
        <div className="archive-count"><strong>{state.production.recipes.length}</strong><span>версий рецептов</span></div>
      </section>

      <section>
        <div className="section-title-row"><div><span className="section-kicker">рецептурный архив</span><h3>Сохранённые версии</h3></div></div>
        {state.production.recipes.length === 0 ? (
          <div className="empty-row glass-card"><Icon name="archive" /><span><strong>Архив пуст</strong><small>Сохрани рецепт в производственной студии.</small></span></div>
        ) : (
          <div className="recipe-archive-grid">
            {state.production.recipes.map((recipe) => {
              const style = getStyle(recipe.styleId);
              return (
                <article key={recipe.id} className="recipe-archive-card glass-card">
                  <div className="recipe-color" style={{ background: style.color }} />
                  <div className="recipe-version">v{recipe.version}</div>
                  <span>{recipe.family === 'beer' ? 'ПИВО' : 'СИДР'} · ДЕНЬ {recipe.createdDay}</span>
                  <h4>{recipe.name}</h4>
                  <p>{style.name}</p>
                  <div className="mini-profile"><i style={{ height: `${recipe.sweetness * 16}%` }} /><i style={{ height: `${recipe.acidity * 16}%` }} /><i style={{ height: `${recipe.bitterness * 16}%` }} /><i style={{ height: `${recipe.body * 16}%` }} /><i style={{ height: `${recipe.aroma * 16}%` }} /></div>
                  <div className="recipe-archive-meta"><span>{recipe.volumeLiters} л</span><span>{recipe.primaryDays + recipe.conditioningDays} дней</span><span>{Math.round(recipe.estimatedCost)}</span></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="section-title-row"><div><span className="section-kicker">коммерческий архив</span><h3>Закрытые поставки</h3></div><span className="status-chip neutral">{state.world?.contracts.length ?? 0} контрактов</span></div>
        {(state.world?.sales.length ?? 0) === 0 ? (
          <div className="empty-row glass-card"><Icon name="contract" /><span><strong>Продаж пока нет</strong><small>Принятые офферы и поставки появятся здесь.</small></span></div>
        ) : (
          <div className="commercial-archive-grid">
            {state.world?.sales.map((sale) => {
              const outlet = state.world?.outlets.find((item) => item.id === sale.outletId);
              const batch = state.production.batches.find((item) => item.id === sale.batchId);
              return <article key={sale.id} className="commercial-archive-card glass-card"><div><Icon name="handshake" /><span>День {sale.day}</span></div><h4>{outlet?.name}</h4><p>{batch?.code} · {sale.units} бутылок по {sale.unitPrice.toFixed(2)}</p><strong>{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(sale.revenue)}</strong></article>;
            })}
          </div>
        )}
      </section>

      <section className="save-center glass-card">
        <div className="card-heading"><div><span className="section-kicker">локальное сохранение</span><h3>Управление данными</h3></div><span className="status-chip positive">IndexedDB</span></div>
        <p>Игра сохраняется автоматически в браузере. Экспорт нужен для резервной копии или переноса на другое устройство.</p>
        <div className="save-actions">
          <button className="button secondary" onClick={onExport}>Экспортировать JSON</button>
          <button className="button ghost" onClick={() => fileInput.current?.click()}>Импортировать</button>
          <button className="button danger" onClick={onReset}>Начать заново</button>
        </div>
        <input ref={fileInput} hidden type="file" accept="application/json" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImport(file);
          event.currentTarget.value = '';
        }} />
      </section>
    </div>
  );
}
