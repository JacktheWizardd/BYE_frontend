import { DEMO_URL, DOWNLOADS_OPEN, nav } from '../content/site'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <a href="#top" aria-label="BYE, Before You Enroll, home" className="flex min-h-11 items-baseline gap-2.5 py-2.5 no-underline">
          <span className="swipe font-display text-[25px] font-bold leading-none">BYE</span>
          <span className="hidden text-sm text-ink-3 md:inline">Before You Enroll</span>
        </a>
        <nav aria-label="Main" className="flex items-center gap-7">
          {nav.map(l => <a key={l.href} href={l.href} className="hidden text-[15px] text-ink-2 no-underline hover:text-ink lg:inline">{l.label}</a>)}
          <a href={DEMO_URL} className="btn btn-primary min-h-11 px-4 text-[15px] lg:hidden">Try the demo</a>
          <a href="#download" className="btn btn-primary hidden min-h-11 px-5 text-[15px] lg:inline-flex">{DOWNLOADS_OPEN ? 'Install' : 'Available soon'}</a>
        </nav>
      </div>
    </header>
  )
}
