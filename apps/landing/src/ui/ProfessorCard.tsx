import type { Professor } from '../content/sample'

// Built from spans so the card can sit inside a button. Numbers render final values in the HTML;
// motion counts them up from zero when shown.
export function Count({ value, decimals = 1, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  return <span data-count={value} data-decimals={decimals} data-suffix={suffix} className="tabular-nums">{value.toFixed(decimals)}{suffix}</span>
}

export function RatingBar({ value, max = 5, className = '' }: { value: number; max?: number; className?: string }) {
  return (
    <span className={`block h-1.5 overflow-hidden rounded-full bg-tile ${className}`}>
      <span data-bar className="block h-full origin-left rounded-full bg-accent" style={{ width: `${(value / max) * 100}%` }} />
    </span>
  )
}

// compactOnPhone: name, score and bar only below 900px (used inside the pinned phone story).
export function ProfessorCard({ p, selected = false, compactOnPhone = false }: { p: Professor; selected?: boolean; compactOnPhone?: boolean }) {
  const phoneHide = compactOnPhone ? ' max-lg:hidden' : ''
  return (
    <span data-prof-card className={`block rounded-2xl border transition-colors ${compactOnPhone ? 'p-3 lg:p-4' : 'p-4'} ${selected ? 'border-ink bg-card shadow-[var(--shadow-soft)]' : 'border-tile-line bg-tile/70 hover:border-line-strong'}`}>
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] font-bold leading-snug">{p.name}</span>
          <span className={`mt-1 block text-[13px] leading-snug text-ink-3${phoneHide}`}>
            Difficulty <Count value={p.difficulty} /> · <Count value={p.takeAgain} decimals={0} suffix="%" /> would take again
          </span>
          <span className={`block text-[13px] leading-snug text-ink-3${phoneHide}`}><Count value={p.ratings} decimals={0} /> ratings</span>
        </span>
        <span className="font-display text-[30px] font-bold leading-none tracking-tight"><Count value={p.rating} /></span>
      </span>
      <RatingBar value={p.rating} className={`${compactOnPhone ? 'mt-2 lg:mt-3' : 'mt-3'} ${selected ? '' : 'bg-card'}`} />
    </span>
  )
}
