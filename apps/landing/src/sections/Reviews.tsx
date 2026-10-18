import { useState } from 'react'
import { course, professors } from '../content/sample'
import { REVIEWS_URL } from '../content/site'
import { AppWindow, Caption } from '../ui/AppWindow'
import { ArrowRight, CheckIcon, LockIcon, MailIcon } from '../ui/icons'

const facts = [
  { icon: MailIcon, text: 'Sign in with a one-time code sent to your @go.pasadena.edu email. No password to create.' },
  { icon: LockIcon, text: 'Other students see your review, never your name or email.' },
  { icon: CheckIcon, text: 'One review for each professor and course, so every voice counts once.' },
]

function Scale({ label, value, onChange, low, high }: { label: string; value: number; onChange: (n: number) => void; low: string; high: string }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold">{label}</legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <label key={n} className={`grid min-h-11 cursor-pointer place-items-center rounded-lg border text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${n === value ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-2 hover:border-ink'}`}>
            <input type="radio" name={label} value={n} checked={n === value} onChange={() => onChange(n)} className="sr-only" />{n}
          </label>
        ))}
      </div>
      <p className="mt-1.5 flex justify-between text-[11px] text-ink-3"><span>{low}</span><span>{high}</span></p>
    </fieldset>
  )
}

export function Reviews() {
  const [rating, setRating] = useState(5)
  const [difficulty, setDifficulty] = useState(3)
  const [text, setText] = useState('Weekly quizzes keep you on track. Go to office hours before the midterm.')
  return (
    <section id="reviews" className="border-t border-line py-20 lg:py-28">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-5">
          <h2 className="text-[34px] leading-[1.08] md:text-5xl">Student reviews power BYE.</h2>
          <p className="mt-5 text-lg text-ink-2">BYE keeps its own review database, written by PCC students for the students who take the class next. The more people share, the clearer the picture gets.</p>
          <ul className="mt-8 space-y-4">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0" /><span className="text-ink-2">{text}</span></li>
            ))}
          </ul>
          <a href={REVIEWS_URL} className="btn btn-primary mt-9 w-full md:w-auto">Write a review <ArrowRight className="size-5" /></a>
        </div>
        <div data-reveal className="lg:col-span-6 lg:col-start-7">
          <AppWindow title={course.code} meta={`Review · ${professors[0].name}`}>
            <form className="space-y-5 p-5 md:p-6" action={REVIEWS_URL} method="get" onSubmit={e => { e.preventDefault(); window.location.href = REVIEWS_URL }}>
              <Scale label="Overall rating" value={rating} onChange={setRating} low="Poor" high="Great" />
              <Scale label="Difficulty" value={difficulty} onChange={setDifficulty} low="Easy" high="Hard" />
              <label className="block">
                <span className="text-xs font-semibold">Your review</span>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                  className="mt-2 block w-full resize-none rounded-xl border border-line bg-paper p-3 text-sm leading-relaxed text-ink outline-none focus:border-ink" />
              </label>
              <button type="submit" className="btn btn-primary w-full">Continue on the review form <ArrowRight className="size-5" /></button>
              <p className="text-center text-[12px] text-ink-3">This is a preview. Nothing is sent until you sign in on the review form.</p>
            </form>
          </AppWindow>
          <Caption>Sample form, try it</Caption>
        </div>
      </div>
    </section>
  )
}
