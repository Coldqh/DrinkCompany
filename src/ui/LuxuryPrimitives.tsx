import type { CSSProperties } from 'react';
import type { PackagingDesign } from '../domain/brand';

export type CocktailVisualVariant = 'negroni' | 'french75' | 'espresso' | 'boulevardier' | 'paloma' | 'signature';
export type IngredientVisualVariant = 'citrus' | 'agave' | 'coffee' | 'tonic' | 'orange' | 'mint' | 'ginger' | 'generic';

export function BrandCrest({ compact = false }: { compact?: boolean }) {
  return <span className={`lux-crest ${compact ? 'compact' : ''}`} aria-hidden="true"><i>DC</i></span>;
}

export function BottlePreview({ design, compact = false, label = 'Drink Company' }: { design: PackagingDesign; compact?: boolean; label?: string }) {
  return (
    <div className={`lux-bottle ${compact ? 'compact' : ''} form-${design.form} glass-${design.glass} closure-${design.closure} label-${design.label}`} aria-label={`${label}, ${design.volumeMl} мл`}>
      <span className="lux-bottle-cap" />
      <span className="lux-bottle-neck" />
      <span className="lux-bottle-shoulder" />
      <span className="lux-bottle-body">
        <span className="lux-bottle-glint" />
        <span className="lux-bottle-label"><b>DC</b><small>{label}</small><em>{design.volumeMl} ml</em></span>
      </span>
      <span className="lux-bottle-base" />
    </div>
  );
}

export function CocktailArt({ variant, compact = false }: { variant: CocktailVisualVariant; compact?: boolean }) {
  return (
    <span className={`lux-cocktail-art ${variant} ${compact ? 'compact' : ''}`} aria-hidden="true">
      <i className="glass"><b className="liquid" /><b className="ice" /><b className="garnish" /></i>
    </span>
  );
}

export function IngredientArt({ variant }: { variant: IngredientVisualVariant }) {
  return <span className={`lux-ingredient-art ${variant}`} aria-hidden="true"><i /><b /><em /></span>;
}

export function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  return <span className="lux-stars" aria-label={`Качество ${value} из ${max}`}>{Array.from({ length: max }, (_, index) => <i key={index} className={index < Math.round(value) ? 'filled' : ''}>★</i>)}</span>;
}

export function ScoreRing({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <span className="lux-score-ring" style={{ '--score': safe } as CSSProperties}><strong>{safe}%</strong><small>{label}</small></span>;
}
