import { testimonials } from '../content/testimonials'

// Renders nothing until testimonials.enabled is true and every quote is real.
export function Testimonials() {
  if (!testimonials.enabled) return null
  return (
    <section id="testers" className="border-t border-line py-20 lg:py-28">
      <div className="wrap">
        <h2 className="text-[34px] leading-[1.08] md:text-5xl">What beta testers say.</h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.items.map((t, i) => (
            <li key={i} data-tile className="rounded-[var(--radius-card)] border border-line bg-card p-6">
              <blockquote className="font-display text-lg leading-relaxed">“{t.quote}”</blockquote>
              <p className="mt-4 text-sm font-semibold">{t.name}</p>
              <p className="text-sm text-ink-3">{t.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
