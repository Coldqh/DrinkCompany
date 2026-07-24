import { useMemo, useState } from 'react';
import type { GameState } from '../../domain/game';
import { DEFAULT_PACKAGING, type PackagingDesign } from '../../domain/brand';
import { BottlePreview, BrandCrest, CocktailArt, type CocktailVisualVariant } from '../../ui/LuxuryPrimitives';
import { Icon } from '../../ui/Icon';

interface CocktailStudioProps {
  state: GameState;
  onClose: () => void;
  onSave?: (name: string) => void;
  initialStep?: StudioStep;
}

type StudioStep = 1 | 2 | 3 | 4 | 5;

const bases: readonly [string, ...string[]] = ['Whisky Blend №01', 'London Dry Gin', 'Premium Vodka', 'Aged Rum'];
const mixes: readonly [string, ...string[]] = ['Медовый сироп', 'Кофейный ликёр', 'Биттер Кампари', 'Сироп агавы'];
const garnishes: readonly [string, ...string[]] = ['Цедра апельсина', 'Грейпфрут и розмарин', 'Лайм и морская соль', 'Коктейльная вишня'];
const glasses: readonly [string, ...string[]] = ['Old Fashioned', 'Nick & Nora', 'Highball', 'Champagne Flute'];
const iceOptions: readonly [string, ...string[]] = ['Крупный куб', 'Копьё', 'Дроблёный лёд', 'Без льда'];
const bottles: readonly [PackagingDesign, ...PackagingDesign[]] = [
  { ...DEFAULT_PACKAGING, form: 'stubby', glass: 'black', closure: 'cork', volumeMl: 750, label: 'heritage' },
  { ...DEFAULT_PACKAGING, form: 'longneck', glass: 'smoke', closure: 'swing', volumeMl: 500, label: 'editorial' },
  { ...DEFAULT_PACKAGING, form: 'wine', glass: 'clear', closure: 'cork', volumeMl: 750, label: 'minimal' },
];

export function CocktailStudio({ state, onClose, onSave, initialStep = 1 }: CocktailStudioProps) {
  const [step, setStep] = useState<StudioStep>(initialStep);
  const [base, setBase] = useState(bases[0]);
  const [mix, setMix] = useState(mixes[0]);
  const [garnish, setGarnish] = useState(garnishes[0]);
  const [glass, setGlass] = useState(glasses[0]);
  const [ice, setIce] = useState(iceOptions[0]);
  const [bottle, setBottle] = useState(bottles[0]);
  const [name, setName] = useState('Amber Signature');
  const [saved, setSaved] = useState(false);
  const variant = useMemo<CocktailVisualVariant>(() => base.includes('Gin') ? 'french75' : mix.includes('Кофей') ? 'espresso' : mix.includes('агавы') ? 'paloma' : 'negroni', [base, mix]);
  const metrics = useMemo(() => {
    const cost = 78 + bases.indexOf(base) * 14 + mixes.indexOf(mix) * 8 + (bottle.glass === 'black' ? 12 : 5);
    const abv = 17 + bases.indexOf(base) * 2;
    const margin = Math.max(54, Math.min(88, 86 - Math.round(cost / 8)));
    const sweetness = mix.includes('Кофей') ? 4 : mix.includes('Мед') || mix.includes('агав') ? 3 : 2;
    return { cost, abv, margin, sweetness };
  }, [base, mix, bottle]);

  function save() {
    onSave?.(name.trim() || 'Авторский коктейль');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="cocktail-studio" role="dialog" aria-modal="true" aria-label="Создание нового коктейля">
      <header className="cocktail-studio-header">
        <button className="lux-icon-button" onClick={step === 1 ? onClose : () => setStep((step - 1) as StudioStep)} aria-label="Назад"><Icon name="arrow" /></button>
        <div><h1>Новый коктейль</h1><p>День {state.day} · создание фирменной подачи</p></div>
        <button className="lux-icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
      </header>

      <nav className="cocktail-steps" aria-label="Этапы создания коктейля">
        {(['База', 'Микс', 'Подача', 'Бутылка', 'Итог'] as const).map((label, index) => {
          const number = (index + 1) as StudioStep;
          return <button key={label} className={step === number ? 'active' : step > number ? 'done' : ''} onClick={() => setStep(number)}><span>{number}</span><b>{label}</b></button>;
        })}
      </nav>

      <main className="cocktail-studio-main">
        <header className="cocktail-stage-heading">
          <div><span>Signature cocktail</span><h2>{stageTitle(step)}</h2><p>{stageDescription(step)}</p></div>
          <BrandCrest />
        </header>

        {step === 1 && <ChoiceStage title="Выбери основу" options={bases} value={base} onChange={setBase} />}
        {step === 2 && <ChoiceStage title="Собери вкусовой слой" options={mixes} value={mix} onChange={setMix} />}
        {step === 3 && <div className="cocktail-presentation-grid"><ChoiceStage title="Гарниш" options={garnishes} value={garnish} onChange={setGarnish} compact /><ChoiceStage title="Стекло" options={glasses} value={glass} onChange={setGlass} compact /><ChoiceStage title="Лёд" options={iceOptions} value={ice} onChange={setIce} compact /></div>}
        {step === 4 && <BottleStage bottle={bottle} onChange={setBottle} />}
        {step === 5 && <label className="cocktail-name-field"><span>Название коктейля</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} /></label>}

        <section className="cocktail-preview-layout">
          <article className="cocktail-hero-preview">
            <div><h2>{name || 'Авторский коктейль'}</h2><p>Авторская подача</p></div>
            <CocktailArt variant={variant} />
            <dl><div><dt>База</dt><dd>{base}</dd></div><div><dt>Подача</dt><dd>{glass} · {ice}</dd></div><div><dt>Гарниш</dt><dd>{garnish}</dd></div></dl>
          </article>
          <article className="cocktail-bottle-pair"><span>Парное решение</span><h3>Decanter Black</h3><p>Фирменная бутылка</p><BottlePreview design={bottle} compact label="Signature" /><b>{bottle.volumeMl} мл</b></article>
        </section>

        <section className="cocktail-metrics">
          <header>Показатели коктейля</header>
          <Metric icon="wallet" label="Себестоимость" value={`${metrics.cost} ₽`} note="на порцию" />
          <Metric icon="bottle" label="Крепость" value={`${metrics.abv}%`} note="ABV" progress={metrics.abv * 3.2} />
          <Metric icon="spark" label="Сладость" value={`${metrics.sweetness}/5`} note={metrics.sweetness >= 4 ? 'выраженная' : 'умеренная'} progress={metrics.sweetness * 20} />
          <Metric icon="market" label="Маржинальность" value={`${metrics.margin}%`} note="высокая" progress={metrics.margin} />
          <Metric icon="team" label="Сложность" value="3/5" note="средняя" progress={60} />
          <Metric icon="clock" label="Время подачи" value="4:30" note="мин" progress={62} />
        </section>
      </main>

      <footer className="cocktail-studio-actions">
        <button className="lux-secondary" onClick={step === 1 ? onClose : () => setStep((step - 1) as StudioStep)}><Icon name="arrow" />Назад</button>
        {step < 5 ? <button className="lux-primary" onClick={() => setStep((step + 1) as StudioStep)}>Далее<Icon name="arrow" /></button> : <button className="lux-primary" onClick={save}>{saved ? <><Icon name="check" />Рецепт сохранён</> : 'Сохранить рецепт'}</button>}
      </footer>
    </div>
  );
}

function ChoiceStage({ title, options, value, onChange, compact = false }: { title: string; options: readonly string[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return <section className={`cocktail-choice-stage ${compact ? 'compact' : ''}`}><h3>{title}</h3><div>{options.map((option) => <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}><span>{option}</span><Icon name={value === option ? 'check' : 'arrow'} /></button>)}</div></section>;
}

function BottleStage({ bottle, onChange }: { bottle: PackagingDesign; onChange: (value: PackagingDesign) => void }) {
  return <section className="cocktail-bottle-stage"><div className="cocktail-bottle-options">{bottles.map((option, index) => <button key={`${option.form}-${option.glass}`} className={bottle === option ? 'active' : ''} onClick={() => onChange(option)}><BottlePreview design={option} compact label={`Series ${index + 1}`} /><span>{['Decanter Black', 'Amber Longneck', 'Crystal Wine'][index]}</span><small>{option.volumeMl} мл</small></button>)}</div></section>;
}

function Metric({ icon, label, value, note, progress }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string; note: string; progress?: number }) {
  return <article><Icon name={icon} /><div><span>{label}</span><strong>{value}</strong><small>{note}</small>{progress !== undefined && <i><b style={{ width: `${Math.min(100, progress)}%` }} /></i>}</div></article>;
}
function stageTitle(step: StudioStep) { return ['Выбери основу', 'Собери микс', 'Настрой подачу', 'Выбери бутылку для клубной подачи', 'Подготовь авторский рецепт'][step - 1]; }
function stageDescription(step: StudioStep) { return ['Основной алкоголь задаёт характер, крепость и себестоимость.', 'Сиропы, ликёры и биттеры формируют вкус.', 'Стекло, лёд и гарниш определяют впечатление гостя.', 'Фирменная бутылка усиливает ценность и запоминаемость коктейля.', 'Проверь показатели и сохрани рецепт в клубном меню.'][step - 1]; }
