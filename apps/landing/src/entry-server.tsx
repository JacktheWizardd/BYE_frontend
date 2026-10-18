import { renderToString } from 'react-dom/server'
import { App } from './App'

// Used at build time by scripts/build-landing.mjs to prerender the page into static HTML.
export function render() {
  return renderToString(<App />)
}
