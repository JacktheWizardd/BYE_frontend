// Links and short facts used across the page. Tools and people search for the LINK markers.

// APP LINK: the web demo runs on fictional sample data. Keep "Sample data for now" next to every demo link.
export const DEMO_URL = '/demo/'
// DOWNLOAD LINK: /download redirects to the newest Mac DMG (see public/_redirects). Never change this path.
export const DOWNLOAD_URL = '/download'
// REVIEW LINK: the review form for @go.pasadena.edu students.
export const REVIEWS_URL = '/reviews/'
// FEEDBACK LINK: replace '#' with the real feedback form URL.
export const FEEDBACK_URL = '#'

export const DEMO_LABEL = 'Sample data for now'
export const MAC_REQUIREMENTS = 'Apple Silicon · macOS 14 or newer'
export const WINDOWS_STATUS = 'Windows · coming soon'

export const nav = [
  { href: '#how', label: 'How it works' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#download', label: 'Download' },
]

export const footerLinks = [
  { href: DEMO_URL, label: 'Web demo (sample data)' },
  { href: REVIEWS_URL, label: 'Write a review' },
  { href: '#how', label: 'How it works' },
  { href: '#download', label: 'Download' },
  { href: FEEDBACK_URL, label: 'Feedback' },
]
