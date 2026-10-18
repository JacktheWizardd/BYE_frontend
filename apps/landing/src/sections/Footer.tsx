import { footerLinks } from '../content/site'

// `base` lets other pages (such as /reviews/) reuse this footer: in-page links then point at the home page.
export function Footer({ base = '' }: { base?: string }) {
  const links = base
    ? [{ href: base, label: 'Home' }, ...footerLinks.map(l => (l.href.length > 1 && l.href.startsWith('#') ? { ...l, href: base + l.href } : l)), { href: '/licenses.txt', label: 'Credits' }]
    : footerLinks
  return (
    <footer className="border-t border-line py-10 text-[13px] leading-relaxed text-ink-3 lg:py-14">
      <div className="wrap grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <span className="swipe font-display text-2xl font-bold leading-none text-ink">BYE</span>
          <p className="mt-3">Before You Enroll · © 2026 BYE</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 lg:col-span-3 lg:flex-col lg:items-start">
          {links.map(l => <a key={l.label} href={l.href} className="inline-flex min-h-11 items-center text-[15px] text-ink no-underline hover:underline">{l.label}</a>)}
        </nav>
        <div className="space-y-2 lg:col-span-5">
          <p>BYE is a free, independent student project. It is not affiliated with Pasadena City College.</p>
          {/* Source and license credit: keep as plain text, no third-party logos or branding. */}
          <p>Professor ratings and some reviews come from Rate My Professors, with links back to each original profile. BYE’s ratings client is adapted from rate-my-professors-client-ts by Amaan, under the MIT License. Libre Baskerville, Schibsted Grotesk and JetBrains Mono are used under the SIL Open Font License.</p>
        </div>
      </div>
    </footer>
  )
}
