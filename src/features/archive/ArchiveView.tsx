import { useRef, useState } from 'react';
import type { GameState } from '../../domain/game';
import type { VersionGuard } from '../../app/useVersionGuard';
import { getStyle, type SavedRecipe } from '../../domain/production';
import { Icon } from '../../ui/Icon';
import { CompactHeader, EmptyState, Modal, SubTabs } from '../../ui/MobileUI';

interface ArchiveViewProps {
  state: GameState;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
  version: VersionGuard;
}

type ArchiveSection = 'recipes' | 'sales' | 'data';

export function ArchiveView({ state, version, onExport, onImport, onReset }: ArchiveViewProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<ArchiveSection>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const selectedSale = state.world?.sales.find((sale) => sale.id === selectedSaleId) ?? null;

  return (
    <div className="screen-stack archive-compact">
      <CompactHeader kicker="Архив" title="Память компании" meta={`${state.production.recipes.length} рецептов · ${state.world?.sales.length ?? 0} продаж · автосохранение включено`} action={<div className="archive-mark"><Icon name="archive" /></div>} />

      <SubTabs value={section} onChange={setSection} options={[
        { id: 'recipes', label: 'Рецепты', badge: state.production.recipes.length },
        { id: 'sales', label: 'Продажи', badge: state.world?.sales.length ?? 0 },
        { id: 'data', label: 'Данные' },
      ]} />

      {section === 'recipes' && (
        state.production.recipes.length === 0 ? (
          <section className="glass-card"><EmptyState icon="archive" title="Рецептов пока нет" text="Сохрани первую версию в производственной студии." /></section>
        ) : (
          <section className="compact-list glass-card recipe-list">
            {state.production.recipes.map((recipe) => {
              const style = getStyle(recipe.styleId);
              return (
                <button key={recipe.id} className="compact-list-row" onClick={() => setSelectedRecipe(recipe)}>
                  <span className="recipe-dot" style={{ background: style.color }} />
                  <span><strong>{recipe.name}</strong><small>{style.shortName} · v{recipe.version} · день {recipe.createdDay}</small></span>
                  <span className="recipe-row-meta">{recipe.volumeLiters} л</span>
                </button>
              );
            })}
          </section>
        )
      )}

      {section === 'sales' && (
        (state.world?.sales.length ?? 0) === 0 ? (
          <section className="glass-card"><EmptyState icon="handshake" title="Продаж пока нет" text="Принятые офферы и закрытые поставки появятся здесь." /></section>
        ) : (
          <section className="compact-list glass-card sales-list">
            {state.world?.sales.map((sale) => {
              const outlet = state.world?.outlets.find((item) => item.id === sale.outletId);
              const batch = state.production.batches.find((item) => item.id === sale.batchId);
              return <button key={sale.id} className="compact-list-row" onClick={() => setSelectedSaleId(sale.id)}><span className="row-icon"><Icon name="contract" /></span><span><strong>{outlet?.name ?? 'Точка'}</strong><small>День {sale.day} · {batch?.code} · {sale.units} бутылок</small></span><span className="sale-value">{formatMoney(sale.revenue)}</span></button>;
            })}
          </section>
        )
      )}

      {section === 'data' && (
        <section className="data-panel glass-card">
          <div className="data-status"><div><Icon name="check" /></div><span><strong>Локальное автосохранение</strong><small>IndexedDB · схема {state.schemaVersion}</small></span></div>
          <div className="version-status"><span><strong>Версия {version.currentVersion}</strong><small>{version.checking ? 'Проверяем обновление…' : version.remote ? `Сервер: ${version.remote.version} · ${version.remote.buildId.slice(0, 7)}` : 'Сервер пока недоступен'}</small></span><button className="button ghost compact-button" onClick={() => void version.checkNow()} disabled={version.checking}>Проверить</button></div>
          <p>Экспортируй файл перед очисткой браузера или переносом игры на другое устройство.</p>
          <div className="stacked-actions">
            <button className="button primary" onClick={onExport}>Экспортировать сохранение</button>
            <button className="button secondary" onClick={() => fileInput.current?.click()}>Импортировать JSON</button>
            <button className="button danger" onClick={onReset}>Удалить прогресс</button>
          </div>
          <input ref={fileInput} hidden type="file" accept="application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImport(file);
            event.currentTarget.value = '';
          }} />
        </section>
      )}

      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}

      {selectedSale && (
        <Modal title={state.world?.outlets.find((item) => item.id === selectedSale.outletId)?.name ?? 'Поставка'} kicker={`День ${selectedSale.day}`} onClose={() => setSelectedSaleId(null)}>
          <div className="sale-modal-value">{formatMoney(selectedSale.revenue)}</div>
          <div className="detail-grid">
            <div><span>Объём</span><strong>{selectedSale.units} бут.</strong></div>
            <div><span>Цена</span><strong>{selectedSale.unitPrice.toFixed(2)}</strong></div>
            <div><span>Партия</span><strong>{state.production.batches.find((item) => item.id === selectedSale.batchId)?.code ?? '—'}</strong></div>
            <div><span>Контракт</span><strong>{selectedSale.contractId}</strong></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RecipeModal({ recipe, onClose }: { recipe: SavedRecipe; onClose: () => void }) {
  const style = getStyle(recipe.styleId);
  return (
    <Modal title={recipe.name} kicker={`${recipe.family === 'beer' ? 'Пиво' : 'Сидр'} · версия ${recipe.version}`} onClose={onClose}>
      <div className="recipe-modal-swatch" style={{ background: style.color }}><span>{style.name}</span></div>
      <div className="detail-grid">
        <div><span>Объём</span><strong>{recipe.volumeLiters} л</strong></div>
        <div><span>Создан</span><strong>день {recipe.createdDay}</strong></div>
        <div><span>Процесс</span><strong>{recipe.primaryDays + recipe.conditioningDays} дн.</strong></div>
        <div><span>Стоимость</span><strong>{formatMoney(recipe.estimatedCost)}</strong></div>
      </div>
      <div className="profile-details">
        <Profile label="Сладость" value={recipe.sweetness} />
        <Profile label="Кислотность" value={recipe.acidity} />
        <Profile label="Горечь" value={recipe.bitterness} />
        <Profile label="Тело" value={recipe.body} />
        <Profile label="Ароматика" value={recipe.aroma} />
        <Profile label="Оригинальность" value={recipe.originality} />
      </div>
    </Modal>
  );
}

function Profile({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><div><i style={{ width: `${value * 20}%` }} /></div><strong>{value}</strong></div>;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}
