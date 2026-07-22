import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  badge?: number;
}

export function SubTabs<T extends string>({ value, options, onChange, label }: { value: T; options: TabOption<T>[]; onChange: (value: T) => void; label?: string }) {
  return (
    <nav className="sub-tabs" aria-label={label ?? 'Подразделы'}>
      {options.map((option) => (
        <button key={option.id} className={value === option.id ? 'active' : ''} onClick={() => onChange(option.id)}>
          <span>{option.label}</span>
          {Boolean(option.badge) && <i>{option.badge}</i>}
        </button>
      ))}
    </nav>
  );
}

export function CompactHeader({ kicker, title, meta, action }: { kicker: string; title: string; meta?: string; action?: ReactNode }) {
  return (
    <header className="compact-header">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
        {meta && <p>{meta}</p>}
      </div>
      {action && <div className="compact-header-action">{action}</div>}
    </header>
  );
}

export function MiniStat({ label, value, note, tone = 'neutral' }: { label: string; value: string; note?: string; tone?: 'neutral' | 'warm' | 'green' | 'blue' }) {
  return (
    <div className={`mini-stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function Modal({ title, kicker, children, onClose, footer, wide = false }: { title: string; kicker?: string; children: ReactNode; onClose: () => void; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`mobile-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>{kicker && <span>{kicker}</span>}<h3>{title}</h3></div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
        </header>
        <div className="modal-scroll">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: 'archive' | 'batch' | 'bottle' | 'handshake' | 'market' | 'factory' | 'store' | 'map' | 'contract'; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="compact-empty">
      <div><Icon name={icon} /></div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}
