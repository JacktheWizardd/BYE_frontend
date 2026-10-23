import { createRoot } from 'react-dom/client'
import { SharedApp } from '@bye/app'
import { createTauriRuntime } from '@bye/app/adapters/tauri'
import '@bye/app/styles.css'
try {
  const runtime = await createTauriRuntime({ demo: import.meta.env.VITE_BYE_PREVIEW_LIVE !== 'true' })
  createRoot(document.getElementById('root')!).render(<SharedApp runtime={runtime} />)
  window.addEventListener('pagehide', () => runtime.dispose(), { once: true })
} catch {
  createRoot(document.getElementById('root')!).render(<main role="alert"><h1>BYE Preview could not start</h1><p>Preview preferences could not be opened. Check storage access and reopen the preview. Existing BYE data has not been imported.</p></main>)
}
