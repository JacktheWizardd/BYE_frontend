import { useEffect, useState } from 'react'
import { KIT_FORM_ID, KIT_FORM_URL } from '../content/site'
import { ArrowRight, CheckIcon } from '../ui/icons'

// Slim update signup under the install cards, through Kit. A plain form post: no Kit script, no cookies,
// no fetch, so the site CSP only needs app.kit.com in form-action. Kit shows its own confirmation page
// (or redirects back, if set in Kit) and sends a double opt-in email before anyone is subscribed.
export function Newsletter() {
  // Kit redirects back to /?subscribed=1#updates after a signup (set in the Kit form settings).
  // The page is prerendered, so read the flag after hydration, then tidy the address bar.
  const [subscribed, setSubscribed] = useState(false)
  useEffect(() => {
    const url = new URL(location.href)
    if (url.searchParams.get('subscribed') !== '1') return
    setSubscribed(true)
    url.searchParams.delete('subscribed')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [])

  return (
    <div id="updates" className="mx-auto mt-4 flex max-w-5xl flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div>
        <h3 className="text-xl">Get BYE news</h3>
        <p className="mt-1 text-[13px] text-ink-3">Hear when BYE is ready on Mac, Windows, phones and the browser. A few emails a semester; unsubscribe anytime.</p>
      </div>
      {subscribed ? (
        <p role="status" className="flex items-center gap-2 text-[15px] font-semibold"><CheckIcon className="size-5 shrink-0" /> Check your inbox to confirm your email.</p>
      ) : KIT_FORM_ID ? (
        <form action={KIT_FORM_URL} method="post" className="flex w-full flex-col gap-2 md:max-w-md md:flex-row">
          <label htmlFor="updates-email" className="sr-only">Email address</label>
          <input id="updates-email" type="email" name="email_address" required autoComplete="email" inputMode="email"
            placeholder="example@email.com"
            className="min-h-12 w-full min-w-0 flex-1 rounded-full border-[1.5px] border-line bg-paper px-5 text-[16px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none" />
          <button type="submit" className="btn btn-primary shrink-0">Subscribe <ArrowRight className="size-5" /></button>
        </form>
      ) : (
        <button type="button" disabled className="btn btn-soon w-full md:w-auto">Signup opens soon</button>
      )}
    </div>
  )
}
