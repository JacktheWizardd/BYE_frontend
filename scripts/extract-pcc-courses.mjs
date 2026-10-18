// Extracts public course codes and titles from a PCC schedule bundle made by the app repository
// (../BYE_Before_You_Enroll/.local-docs/pcc-schedule/<term>/bundle.json) for the home page search.
// Only course codes and titles are kept: no instructors, emails, sections or notes.
// Usage: node scripts/extract-pcc-courses.mjs <path to bundle.json>
import { readFile, writeFile } from 'node:fs/promises'

const src = process.argv[2]
if (!src) throw new Error('Pass the path to a PCC schedule bundle.json')
const bundle = JSON.parse(await readFile(src, 'utf8'))
const small = new Set(['and', 'of', 'to', 'for', 'in', 'the', 'with', 'a', 'an', 'on', 'or'])
const titleCase = s => s.toLowerCase().replace(/\b([a-z])([a-z']*)/g, (w, a, b, i) => (i > 0 && small.has(w) ? w : a.toUpperCase() + b))
  .replace(/\b(Ii|Iii|Iv)\b/g, m => m.toUpperCase()).replace(/\bEsl\b/g, 'ESL').replace(/\bUs\b/g, 'US')
const courses = bundle.tables.courses
  .map(c => [c.course_key, titleCase(String(c.title ?? '').trim())])
  .filter(([code, title]) => code && title)
  .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
const out = { term: bundle.term?.termName ?? '', retrieved: String(bundle.retrieved_at ?? '').slice(0, 10), courses }
await writeFile('apps/landing/src/content/pcc-courses.json', JSON.stringify(out) + '\n')
console.log(`Wrote ${courses.length} ${out.term} courses to apps/landing/src/content/pcc-courses.json`)
