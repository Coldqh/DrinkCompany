import type { ReactNode, SVGProps } from 'react';

type IconName = 'home' | 'factory' | 'batch' | 'market' | 'archive' | 'wallet' | 'clock' | 'spark' | 'kettle' | 'press' | 'tank' | 'bottle' | 'lab' | 'beer' | 'apple' | 'arrow' | 'check' | 'warning' | 'close';

const paths: Record<IconName, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9 21v-6h6v6"/></>,
  factory: <><path d="M3 21V9l6 3V8l6 4V5h6v16Z"/><path d="M7 17h2M12 17h2M17 17h2"/></>,
  batch: <><path d="M7 3h10v4H7z"/><path d="M6 7h12v14H6z"/><path d="M9 11h6M9 15h6"/></>,
  market: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/><path d="m3 15 6-5 6 2 7-7"/></>,
  archive: <><path d="M4 5h16v4H4z"/><path d="M6 9h12v12H6z"/><path d="M10 13h4"/></>,
  wallet: <><path d="M3 7h16v13H3z"/><path d="M3 7V5h13v2"/><path d="M15 12h6v5h-6z"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  spark: <><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/></>,
  kettle: <><path d="M5 8h12v11H5z"/><path d="M8 4h6v4M17 10h2a3 3 0 0 1 0 6h-2M8 22h6"/></>,
  press: <><path d="M6 4h12M12 4v5M8 9h8v4H8zM6 13h12v8H6z"/><path d="M9 17h6"/></>,
  tank: <><path d="M7 3h10v3H7zM6 6h12v13H6zM9 19v2M15 19v2"/><path d="M9 10h6"/></>,
  bottle: <><path d="M10 3h4v5l2 3v10H8V11l2-3z"/><path d="M9 14h6"/></>,
  lab: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/></>,
  beer: <><path d="M6 5h10v16H6z"/><path d="M16 8h2a3 3 0 0 1 0 6h-2M8 8h6"/></>,
  apple: <><path d="M12 7c-5-3-8 1-7 6s4 8 7 8 6-3 7-8-2-9-7-6Z"/><path d="M12 7c0-3 2-5 5-5M12 5c-2-2-4-2-5-1"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 18h.01"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
