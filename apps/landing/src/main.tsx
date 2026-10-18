import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { startMotion } from './motion'
import './styles.css'

// Motion is progressive enhancement over the static page. It must start only after React has
// hydrated, because it rewrites counters and styles that hydration compares against the HTML.
let started = false
function StartMotion() {
  useEffect(() => { if (!started) { started = true; startMotion() } }, [])
  return null
}

const root = document.getElementById('root')!
const app = <StrictMode><App /><StartMotion /></StrictMode>
// The built page is prerendered, so hydrate it; the dev server starts empty, so render.
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
