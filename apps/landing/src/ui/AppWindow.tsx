import type { ReactNode } from 'react'

// A calm app window frame. The product UI inside it is the hero of every section.
export function AppWindow({ title, meta, children, className = '', label }: { title: ReactNode; meta?: ReactNode; children: ReactNode; className?: string; label?: string }) {
  return (
    <div role={label ? 'img' : undefined} aria-label={label} className={`overflow-hidden rounded-[var(--radius-window)] border border-line bg-card shadow-[var(--shadow-float)] ${className}`}>
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-line bg-linen px-4 py-3">
        <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-tile-line" /><i className="size-2.5 rounded-full bg-tile-line" /><i className="size-2.5 rounded-full bg-tile-line" /></span>
        <span className="code shrink-0 whitespace-nowrap rounded-md border border-line bg-paper px-2 py-0.5 text-xs">{title}</span>
        {meta && <span className="truncate text-xs text-ink-3">{meta}</span>}
      </div>
      <div aria-hidden={label ? true : undefined}>{children}</div>
    </div>
  )
}

export function Caption({ children = 'Illustration, not real data', className = '' }: { children?: ReactNode; className?: string }) {
  return <p className={`mt-3 text-center text-[13px] text-ink-3 ${className}`}>{children}</p>
}
