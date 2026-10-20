import type { ReactNode } from 'react'
import { DEMO_LABEL, DEMO_URL, DOWNLOAD_URL, DOWNLOADS_OPEN, MAC_REQUIREMENTS } from '../content/site'
import { Newsletter } from './Newsletter'
import { ArrowRight } from '../ui/icons'

// While downloads are closed a card is only its title, requirements and an "Available soon" button, so both
// cards line up row for row. The install steps and note appear once DOWNLOADS_OPEN is true.
function Install({ id, title, meta, action, steps, note }: { id: string; title: string; meta: ReactNode; action: ReactNode; steps?: ReactNode[]; note?: ReactNode }) {
  return (
    <div id={id} className="flex flex-col items-start gap-5 rounded-[var(--radius-card)] border border-line bg-card p-6 md:p-8">
      <div>
        <h3 className="text-2xl">{title}</h3>
        <p className="mt-1 text-[13px] text-ink-3">{meta}</p>
      </div>
      {action}
      {steps && (
        <ol className="space-y-2.5 text-[15px] text-ink-2">
          {steps.map((s, i) => <li key={i} className="flex gap-3"><span className="font-display font-bold tabular-nums text-ink">{i + 1}</span><span>{s}</span></li>)}
        </ol>
      )}
      {note && <p className="mt-auto w-full border-t border-line pt-4 text-[14px] text-ink-2">{note}</p>}
    </div>
  )
}

const soon = <button type="button" disabled className="btn btn-soon w-full md:w-auto">Available soon</button>

export function FinalCta() {
  return (
    <section id="download" className="border-t border-line py-20 lg:py-28">
      <div className="wrap">
        {/* One column, left-aligned: the heading, intro, buttons and both cards share the same left edge. */}
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <h2 className="text-[38px] leading-[1.06] md:text-[56px] lg:text-[68px]">Plan your next semester <span className="swipe">with your eyes open.</span></h2>
            <p className="mt-6 max-w-xl text-lg text-ink-2">{DOWNLOADS_OPEN ? 'Install BYE on your Mac today, with Windows coming soon.' : 'The Mac and Windows apps are available soon.'} On a phone? Try the web demo, or send yourself the link for later.</p>
            <div className="mt-8 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
              <a href={DEMO_URL} className="btn btn-primary">Try the web demo <ArrowRight className="size-5" /></a>
              <button type="button" data-copy-link className="btn lg:hidden">Copy link for your computer</button>
            </div>
            <p data-copy-status role="status" className="mt-3 min-h-5 text-[13px] text-ink-3"></p>
            <p className="text-[13px] text-ink-3">Web demo: {DEMO_LABEL} · the apps use real PCC data</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {/* DOWNLOAD LINK: the Mac button uses DOWNLOAD_URL (/download → newest DMG). */}
            <Install id="mac" title="Mac" meta={MAC_REQUIREMENTS}
              action={DOWNLOADS_OPEN
                ? <a href={DOWNLOAD_URL} className="btn btn-primary w-full md:w-auto">Download for Mac <ArrowRight className="size-5" /></a>
                : soon}
              steps={DOWNLOADS_OPEN ? [
                <>Open the downloaded <b className="font-semibold text-ink">AppleSilicon.dmg</b> file.</>,
                <>Drag <b className="font-semibold text-ink">BYE Beta</b> into Applications.</>,
                <>Eject the DMG and open BYE Beta from Applications.</>,
              ] : undefined}
              note={DOWNLOADS_OPEN ? <><b className="font-semibold text-ink">Security warning?</b> BYE is signed but not yet notarized by Apple. If you trust it, go to System Settings → Privacy &amp; Security → Open Anyway. Updates install themselves.</> : undefined} />
            <Install id="windows" title="Windows" meta="Windows 11 · 64-bit" action={soon} />
          </div>
          {!DOWNLOADS_OPEN && <p className="mt-4 text-[14px] text-ink-2">Want to know when they are ready? <a href="#updates" className="font-semibold text-ink">Get an email ↓</a></p>}
          <Newsletter />
        </div>
      </div>
    </section>
  )
}
