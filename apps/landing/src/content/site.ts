// Links and short facts used across the page. Tools and people search for the LINK markers.

// APP LINK: the web demo runs on fictional sample data. Keep "Sample data for now" next to every demo link.
export const DEMO_URL = '/demo/'
// DOWNLOAD LINK: /download redirects to the newest Mac DMG (see public/_redirects). Never change this path.
export const DOWNLOAD_URL = '/download'
// Mac downloads reopened with 0.5.0 (2026-10-22). While false, the Mac card shows "Available soon" and
// /download redirects to /#download (the install cards). To pause: set false, swap the two lines in
// public/_redirects and update scripts/verify-static.mjs.
export const DOWNLOADS_OPEN = false
// WINDOWS LINK: /download/windows redirects to the installer on the public BYE-releases GitHub repository
// (public/_redirects). The installer is too large for Cloudflare Pages. Never change this path.
export const WINDOWS_DOWNLOAD_URL = '/download/windows'
export const WINDOWS_OPEN = false
// REVIEW LINK: the review form for @go.pasadena.edu students.
export const REVIEWS_URL = '/reviews/'
// FEEDBACK LINK: feedback goes by email (see sections/Feedback.tsx); FEEDBACK_URL points at that section.
export const FEEDBACK_EMAIL = 'byebeforeyouenroll@gmail.com'
export const FEEDBACK_URL = '#feedback'

export const DEMO_LABEL = 'Sample data for now'
export const MAC_REQUIREMENTS = 'Apple Silicon · macOS 14 or newer'

export const nav = [
  { href: '#how', label: 'How it works' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#download', label: 'Download' },
  { href: '#feedback', label: 'Feedback' },
]

export const footerLinks = [
  { href: DEMO_URL, label: 'Web demo (sample data)' },
  { href: REVIEWS_URL, label: 'Write a review' },
  { href: '#how', label: 'How it works' },
  { href: '#download', label: 'Download' },
  { href: FEEDBACK_URL, label: 'Feedback' },
]
