// Phones can't install the Mac app, so offer to copy the download address for later.
export function copyLink() {
  const status = document.querySelector<HTMLElement>('[data-copy-status]')
  document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = location.origin + '/#download'
      try { await navigator.clipboard.writeText(url); if (status) status.textContent = 'Link copied. Open it on your Mac to download.' }
      catch { if (status) status.textContent = 'Copy this address: ' + url }
    })
  })
}
