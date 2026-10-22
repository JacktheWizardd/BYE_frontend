import { FEEDBACK_URL } from '../content/site'

// Personal note: a draft for the owner to rewrite in their own words. Privacy lines state only verified facts.
const keeps = [
  'If you write a review: your school email, to send your sign-in code and keep one review per class.',
  'If you get a BYE number in the app: your school email, to verify you and keep your number the same on any Mac.',
  'Your review and the ratings you give.',
  'BYE’s admin can see which account wrote a review, so reports can be handled.',
]
const doesNot = [
  'No BYE password or profile to manage.',
  'The Mac app works without an account. Apart from an optional BYE number, its saved data stays on your Mac.',
  'This site loads no ads and no tracking scripts.',
]

export function About() {
  return (
    <section id="about" className="border-t border-line py-20 lg:py-28">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <h2 className="text-[34px] leading-[1.08] md:text-5xl">Built by a PCC student.</h2>
          <p className="mt-6 max-w-[34rem] font-display text-xl leading-relaxed lg:text-[22px]">
            I’m a student at Pasadena City College. I built BYE so picking a class could start with every section, every professor and what students actually said, all in one place. It’s free, it isn’t affiliated with PCC, and it will never tell you which professor to choose.
          </p>
          <p className="mt-6 text-ink-2">BYE is in beta. If something looks wrong, <a href={FEEDBACK_URL} className="font-semibold text-ink">tell me what to fix</a>. Tester feedback decides what gets built next.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:col-span-6 lg:gap-6">
          <div>
            <h3 className="border-b border-ink pb-3 text-xl">What BYE keeps</h3>
            <ul className="mt-4 space-y-3 text-[15px] text-ink-2">{keeps.map(t => <li key={t}>{t}</li>)}</ul>
          </div>
          <div>
            <h3 className="border-b border-ink pb-3 text-xl">What it doesn’t</h3>
            <ul className="mt-4 space-y-3 text-[15px] text-ink-2">{doesNot.map(t => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  )
}
