import type { ReactNode } from 'react'
import { DEMO_LABEL, DEMO_URL, DOWNLOAD_URL, DOWNLOADS_OPEN, MAC_REQUIREMENTS } from '../content/site'
import { Newsletter } from './Newsletter'
import { ArrowRight } from '../ui/icons'

function Install({ id, title, meta, action, steps, note }: { id: string; title: string; meta: ReactNode; action: ReactNode; steps: ReactNode[]; note: ReactNode }) {
  return (
    <div id={id} className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-card p-6 md:p-8">
      <div>
        <h3 className="text-2xl">{title}</h3>
        <p className="mt-1 text-[13px] text-ink-3">{meta}</p>
      </div>
      {action}
      <ol className="space-y-2.5 text-[15px] text-ink-2">
        {steps.map((s, i) => <li key={i} className="flex gap-3"><span className="font-display font-bold tabular-nums text-ink">{i + 1}</span><span>{s}</span></li>)}
      </ol>
      <p className="mt-auto border-t border-line pt-4 text-[14px] text-ink-2">{note}</p>
    </div>
  )
}

export function FinalCta() {
  return (
    <section id="download" className="border-t border-line py-20 lg:py-28">
      <div className="wrap">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[38px] leading-[1.06] md:text-[56px] lg:text-[68px]">Plan your next semester <span className="swipe">with your eyes open.</span></h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-2">{DOWNLOADS_OPEN ? 'Install BYE on your Mac today, with Windows coming soon.' : 'A new Mac version is coming soon, with Windows after it.'} On a phone? Try the web demo, or send yourself the link for later.</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center">
            <a href={DEMO_URL} className="btn btn-primary">Try the web demo <ArrowRight className="size-5" /></a>
            <button type="button" data-copy-link className="btn lg:hidden">Copy link for your computer</button>
          </div>
          <p data-copy-status role="status" className="mt-3 min-h-5 text-[13px] text-ink-3"></p>
          <p className="text-[13px] text-ink-3">Web demo: {DEMO_LABEL} · the apps use real PCC data</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          {/* DOWNLOAD LINK: the Mac button uses DOWNLOAD_URL (/download → newest DMG). */}
          <Install id="mac" title="Install on Mac" meta={MAC_REQUIREMENTS}
            action={DOWNLOADS_OPEN
              ? <a href={DOWNLOAD_URL} className="btn btn-primary w-full md:w-auto md:self-start">Download for Mac <ArrowRight className="size-5" /></a>
              : <button type="button" disabled className="btn btn-soon w-full md:w-auto md:self-start">Available soon</button>}
            steps={[
              <>Open the downloaded <b className="font-semibold text-ink">AppleSilicon.dmg</b> file.</>,
              <>Drag <b className="font-semibold text-ink">BYE Beta</b> into Applications.</>,
              <>Eject the DMG and open BYE Beta from Applications.</>,
            ]}
            note={DOWNLOADS_OPEN ? <><b className="font-semibold text-ink">Security warning?</b> BYE is signed but not yet notarized by Apple. If you trust it, go to System Settings → Privacy &amp; Security → Open Anyway. Updates install themselves.</>
              : <>We’re finishing a new version. <a href="#updates" className="font-semibold text-ink">Get an email when it’s ready ↓</a></>} />
          <Install id="windows" title="Install on Windows" meta="Windows 11 · 64-bit"
            action={<button type="button" disabled className="btn btn-soon w-full md:w-auto md:self-start">Coming soon</button>}
            steps={[
              <>Download the <b className="font-semibold text-ink">windows-x64.zip</b> file.</>,
              <>Right-click it and choose <b className="font-semibold text-ink">Extract All</b>.</>,
              <>Open the BYE folder and run <b className="font-semibold text-ink">BYE.exe</b>.</>,
            ]}
            note={<>Updates are manual for now. The download button appears here when the Windows version is ready.</>} />
        </div>
        <Newsletter />
      </div>
    </section>
  )
}
