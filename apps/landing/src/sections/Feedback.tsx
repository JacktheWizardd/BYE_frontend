import { useState } from 'react'
import { FEEDBACK_EMAIL } from '../content/site'
import { ArrowRight, CheckIcon, MailIcon } from '../ui/icons'

// BYE is a student project in beta, so feedback gets its own bold section. Feedback goes by email
// through the visitor's own mail app: no form backend, nothing stored by the site.
const topics = ['Something’s broken', 'Wrong professor or class info', 'An idea or request', 'Something else'] as const
type Topic = (typeof topics)[number]

const body = [
  'Hi BYE,',
  '',
  'What happened, or what’s your idea:',
  '',
  '',
  'Where: phone / Mac app / Windows app / web demo / review page',
  'Class and professor (if it’s about one):',
  '',
  'A screenshot helps if you have one.',
].join('\n')

const mailto = (topic: Topic | null) =>
  `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(topic ? `BYE feedback: ${topic}` : 'BYE feedback')}&body=${encodeURIComponent(body)}`

export function Feedback() {
  const [topic, setTopic] = useState<Topic | null>(null)
  const [copied, setCopied] = useState('')
  const copy = async () => {
    try { await navigator.clipboard.writeText(FEEDBACK_EMAIL); setCopied('Email address copied.') }
    catch { setCopied(`Copy this address: ${FEEDBACK_EMAIL}`) }
  }
  return (
    <section id="feedback" className="py-16 lg:py-24">
      <div className="wrap">
        <div className="grid gap-10 rounded-[28px] bg-ink p-6 text-paper md:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
          <div className="lg:col-span-6">
            <h2 className="text-[38px] leading-[1.06] text-paper md:text-5xl lg:text-[56px]">Help shape <span className="swipe text-paper">BYE.</span></h2>
            <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-paper/80">
              BYE is a student project in beta. Every bug report, wrong professor match and idea gets read, and tester feedback decides what gets built next.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-paper/80">
              {['What happened, or what you’d like to see', 'Where: phone, Mac app, Windows app or web demo', 'The class and professor, if it’s about one', 'A screenshot, if you have one'].map(t => (
                <li key={t} className="flex gap-3"><CheckIcon className="mt-0.5 size-5 shrink-0 text-accent" />{t}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-5 rounded-[22px] bg-paper p-5 text-ink md:p-7 lg:col-span-6">
            <fieldset>
              <legend className="font-semibold">What’s it about?</legend>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {topics.map(t => {
                  const on = t === topic
                  return (
                    <label key={t} className={`relative flex min-h-12 cursor-pointer items-center rounded-xl border-[1.5px] px-4 py-2.5 text-[15px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2 ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink'}`}>
                      <input type="radio" name="feedback-topic" value={t} checked={on} onChange={() => setTopic(t)} className="absolute inset-0 m-0 cursor-pointer opacity-0" />
                      {t}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            {/* FEEDBACK LINK: opens the visitor's mail app with a prefilled subject and short template. */}
            <a href={mailto(topic)} className="btn btn-primary w-full">
              <MailIcon className="size-5" /> Email us <ArrowRight className="size-5" />
            </a>
            <div className="flex flex-col gap-1 border-t border-line pt-4 text-center">
              <p className="text-[13px] text-ink-3">No mail app? Write to</p>
              <p className="code select-all text-[15px] text-ink [overflow-wrap:anywhere]">{FEEDBACK_EMAIL}</p>
              <button type="button" onClick={copy} className="mx-auto inline-flex min-h-11 items-center text-[15px] font-semibold underline decoration-line-strong underline-offset-4 hover:decoration-ink">Copy email address</button>
              <p role="status" className="min-h-5 text-[13px] text-ink-3">{copied}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
