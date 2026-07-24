import { useMemo, useState } from 'react';
import {
  DEFAULT_PACKAGING,
  type ClosureStyle,
  type GlassTone,
  type LabelStyle,
  type PackageForm,
  type PackagingDesign,
} from '../../domain/brand';
import { BottlePreview, BrandCrest } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';

interface BottleDesignerProps {
  initial?: PackagingDesign;
  onClose: () => void;
  onSave?: (design: PackagingDesign) => void;
}

type ChoiceKey = 'form' | 'glass' | 'volumeMl' | 'closure' | 'label' | 'carton';

const forms: Array<{ value: PackageForm; label: string; hint: string }> = [
  { value: 'stubby', label: 'Компактная', hint: 'низкий корпус' },
  { value: 'longneck', label: 'Классика', hint: 'вытянутый силуэт' },
  { value: 'wine', label: 'Винная', hint: 'плавные плечики' },
];
const glasses: Array<{ value: GlassTone; label: string }> = [
  { value: 'clear', label: 'Прозрачное' },
  { value: 'smoke', label: 'Янтарное' },
  { value: 'black', label: 'Чёрное' },
];
const closures: Array<{ value: ClosureStyle; label: string }> = [
  { value: 'crown', label: 'Кроненпробка' },
  { value: 'swing', label: 'Бугельная пробка' },
  { value: 'cork', label: 'Корковая пробка' },
];
const labels: Array<{ value: LabelStyle; label: string }> = [
  { value: 'minimal', label: 'Минимализм' },
  { value: 'editorial', label: 'Премиум-серия' },
  { value: 'industrial', label: 'Производственная' },
  { value: 'heritage', label: 'Наследие' },
];

export function BottleDesigner({ initial = DEFAULT_PACKAGING, onClose, onSave }: BottleDesignerProps) {
  const [design, setDesign] = useState<PackagingDesign>({ ...initial });
  const [activeChoice, setActiveChoice] = useState<ChoiceKey>('form');
  const [saved, setSaved] = useState(false);
  const unitCost = useMemo(() => bottleUnitCost(design), [design]);
  const setupCost = useMemo(() => bottleSetupCost(design), [design]);
  const appeal = useMemo(() => bottleAppeal(design), [design]);

  function change<K extends keyof PackagingDesign>(key: K, value: PackagingDesign[K]) {
    setDesign((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function save() {
    onSave?.(design);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="lux-screen bottle-designer-screen">
      <header className="lux-screen-header bottle-designer-header">
        <button className="lux-icon-button" onClick={onClose} aria-label="Вернуться в производство"><Icon name="arrow" /></button>
        <div className="lux-screen-title"><span>Упаковка продукта</span><h1>Выбор бутылки</h1><p>Создай форму, которая продолжит характер напитка.</p></div>
        <BrandCrest compact />
      </header>

      <main className="bottle-designer-layout">
        <section className="bottle-option-stack" aria-label="Настройки бутылки">
          <BottleChoice icon="bottle" title="Силуэт" value={formLabel(design.form)} active={activeChoice === 'form'} onClick={() => setActiveChoice('form')} />
          <BottleChoice icon="spark" title="Стекло" value={glassLabel(design.glass)} active={activeChoice === 'glass'} onClick={() => setActiveChoice('glass')} />
          <BottleChoice icon="wallet" title="Объём" value={`${design.volumeMl} мл`} active={activeChoice === 'volumeMl'} onClick={() => setActiveChoice('volumeMl')} />
          <BottleChoice icon="bottle" title="Горлышко" value={design.form === 'wine' ? 'Удлинённое' : design.form === 'stubby' ? 'Короткое' : 'Стандартное'} active={false} onClick={() => setActiveChoice('form')} />
          <BottleChoice icon="archive" title="Крышка / пробка" value={closureLabel(design.closure)} active={activeChoice === 'closure'} onClick={() => setActiveChoice('closure')} />
          <BottleChoice icon="contract" title="Этикетка" value={labelStyleLabel(design.label)} active={activeChoice === 'label'} onClick={() => setActiveChoice('label')} />
          <BottleChoice icon="spark" title="Тиснение" value={design.carton ? 'Монограмма DC' : 'Без тиснения'} active={activeChoice === 'carton'} onClick={() => setActiveChoice('carton')} />
        </section>

        <section className="bottle-stage" aria-label="Предпросмотр бутылки">
          <div className="bottle-stage-glow" />
          <BottlePreview design={design} label="Premium Series" />
          <div className="bottle-guides" aria-hidden="true">
            <span className="guide-cap">Крышка / пробка</span>
            <span className="guide-neck">Горлышко</span>
            <span className="guide-shoulder">Плечики</span>
            <span className="guide-body">Корпус</span>
            <span className="guide-label">Этикетка</span>
            <span className="guide-base">Основание</span>
          </div>
          <div className="bottle-view-controls"><button><Icon name="building" />3D</button><button><Icon name="pulse" />Вращать</button></div>
        </section>
      </main>

      <section className="bottle-choice-panel">
        <header><span>{choiceTitle(activeChoice)}</span><small>{choiceHint(activeChoice)}</small></header>
        {activeChoice === 'form' && <div className="bottle-silhouette-strip">{forms.map((option) => <button key={option.value} className={design.form === option.value ? 'active' : ''} onClick={() => change('form', option.value)}><BottlePreview design={{ ...design, form: option.value }} compact /><span>{option.label}</span></button>)}</div>}
        {activeChoice === 'glass' && <div className="bottle-choice-grid">{glasses.map((option) => <button key={option.value} className={design.glass === option.value ? 'active' : ''} onClick={() => change('glass', option.value)}><i className={`glass-swatch ${option.value}`} /><span>{option.label}</span></button>)}</div>}
        {activeChoice === 'volumeMl' && <div className="bottle-choice-grid">{([330, 500, 750] as const).map((value) => <button key={value} className={design.volumeMl === value ? 'active' : ''} onClick={() => change('volumeMl', value)}><strong>{value}</strong><span>мл</span></button>)}</div>}
        {activeChoice === 'closure' && <div className="bottle-choice-grid">{closures.map((option) => <button key={option.value} className={design.closure === option.value ? 'active' : ''} onClick={() => change('closure', option.value)}><Icon name="archive" /><span>{option.label}</span></button>)}</div>}
        {activeChoice === 'label' && <div className="bottle-choice-grid">{labels.map((option) => <button key={option.value} className={design.label === option.value ? 'active' : ''} onClick={() => change('label', option.value)}><i className={`label-swatch ${option.value}`} /><span>{option.label}</span></button>)}</div>}
        {activeChoice === 'carton' && <div className="bottle-choice-grid"><button className={!design.carton ? 'active' : ''} onClick={() => change('carton', false)}><Icon name="close" /><span>Без тиснения</span></button><button className={design.carton ? 'active' : ''} onClick={() => change('carton', true)}><BrandCrest compact /><span>Монограмма DC</span></button></div>}
      </section>

      <section className="bottle-spec-grid">
        <article><header>Спецификация</header><dl><Spec label="Объём" value={`${design.volumeMl} мл`} /><Spec label="Стекло" value={glassLabel(design.glass)} /><Spec label="Силуэт" value={formLabel(design.form)} /><Spec label="Пробка" value={closureLabel(design.closure)} /><Spec label="Серия" value={labelStyleLabel(design.label)} /></dl></article>
        <article><header>Экономика и позиционирование</header><dl><Spec label="Себестоимость тары" value={`${formatMoney(unitCost)} ₽`} /><Spec label="Подготовка серии" value={`${formatMoney(setupCost)} ₽`} /><Spec label="Премиальность" value={`+${Math.max(4, appeal - 44)}%`} success /><Spec label="Совместимость с клубом" value={appeal >= 70 ? 'Высокая' : 'Средняя'} success={appeal >= 70} /></dl><p><Icon name="spark" /> Дизайн подходит для премиальной линейки и клубной подачи.</p></article>
      </section>

      <button className="lux-primary bottle-save" onClick={save}>{saved ? <><Icon name="check" />Дизайн сохранён</> : 'Сохранить дизайн бутылки'}</button>
    </div>
  );
}

function BottleChoice({ icon, title, value, active, onClick }: { icon: Parameters<typeof Icon>[0]['name']; title: string; value: string; active: boolean; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><Icon name={icon} /><span><small>{title}</small><strong>{value}</strong></span><Icon name="arrow" /></button>;
}
function Spec({ label, value, success = false }: { label: string; value: string; success?: boolean }) { return <div><dt>{label}</dt><dd className={success ? 'success' : ''}>{value}</dd></div>; }
function choiceTitle(key: ChoiceKey) { return ({ form: 'Выбор силуэта', glass: 'Оттенок стекла', volumeMl: 'Объём бутылки', closure: 'Крышка и пробка', label: 'Система этикетки', carton: 'Тиснение и знак' })[key]; }
function choiceHint(key: ChoiceKey) { return ({ form: 'Форма влияет на характер продукта', glass: 'Стекло меняет восприятие цвета', volumeMl: 'Размер определяет позиционирование', closure: 'Укупорка влияет на ритуал открытия', label: 'Выбери язык премиальной серии', carton: 'Знак добавляет коллекционную ценность' })[key]; }
function formLabel(value: PackageForm) { return forms.find((item) => item.value === value)?.label ?? value; }
function glassLabel(value: GlassTone) { return glasses.find((item) => item.value === value)?.label ?? value; }
function closureLabel(value: ClosureStyle) { return closures.find((item) => item.value === value)?.label ?? value; }
function labelStyleLabel(value: LabelStyle) { return labels.find((item) => item.value === value)?.label ?? value; }
function formatMoney(value: number) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value); }

function bottleSetupCost(packaging: PackagingDesign) { return 420 + (packaging.label === 'editorial' ? 380 : packaging.label === 'heritage' ? 260 : packaging.label === 'industrial' ? 180 : 120) + (packaging.form === 'wine' ? 280 : packaging.form === 'stubby' ? 90 : 140) + (packaging.carton ? 260 : 0); }
function bottleUnitCost(packaging: PackagingDesign) { return Math.round(138 + (packaging.volumeMl === 750 ? 52 : packaging.volumeMl === 500 ? 31 : 18) + (packaging.glass === 'black' ? 24 : packaging.glass === 'smoke' ? 17 : 9) + (packaging.closure === 'cork' ? 36 : packaging.closure === 'swing' ? 28 : 11) + (packaging.carton ? 18 : 0)); }
function bottleAppeal(packaging: PackagingDesign) { let score = 48; if (packaging.glass === 'black') score += 8; if (packaging.label === 'minimal') score += 11; if (packaging.label === 'editorial') score += 12; if (packaging.label === 'heritage') score += 4; if (packaging.closure === 'cork') score += 8; if (packaging.form === 'stubby') score += 3; if (packaging.carton) score += 4; return Math.max(20, Math.min(95, score)); }
