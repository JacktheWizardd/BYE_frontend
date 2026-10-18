import { About } from './sections/About'
import { FinalCta } from './sections/FinalCta'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Nav } from './sections/Nav'
import { Reviews } from './sections/Reviews'
import { Story } from './sections/Story'
import { Testimonials } from './sections/Testimonials'

// Page order lives here. To add a section: create it in sections/, put its copy in content/, add it below.
export function App() {
  return (
    <>
      <a href="#main" className="btn btn-primary fixed left-3 top-3 z-[60] -translate-y-24 focus:translate-y-0">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Story />
        <Reviews />
        <About />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
