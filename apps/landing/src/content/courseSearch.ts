// Course search over the real PCC course list (codes and titles only), loaded on demand.
// "5a", "math 5" and "MATH 005A" all find MATH 005A: PCC pads course numbers with zeros.

export type Course = [code: string, title: string]
type Indexed = { code: string; title: string; keys: string[]; lowerTitle: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

let index: Promise<Indexed[]> | null = null
export function indexCourse([code, title]: Course): Indexed {
  const [subject = '', number = ''] = code.split(' ')
  const bare = number.replace(/^0+(?=\d)/, '')
  return { code, title, lowerTitle: title.toLowerCase(), keys: [norm(code), norm(subject + bare), norm(number), norm(bare)] }
}

export function loadCourses() {
  index ??= import('./pcc-courses.json').then(m => (m.default.courses as Course[]).map(indexCourse))
  return index
}

export function searchCourses(list: Indexed[], query: string, limit = 6) {
  const q = norm(query), words = query.trim().toLowerCase()
  if (!q) return []
  // Extra zeros are fine too: "biol 0011" finds BIOL 011, as "biol 11" does.
  const qBare = q.replace(/^([a-z]+)0+(?=\d)/, '$1')
  const starts: Indexed[] = [], titles: Indexed[] = []
  for (const c of list) {
    if (c.keys.some(k => k.startsWith(q) || k.startsWith(qBare))) starts.push(c)
    else if (words.length >= 3 && c.lowerTitle.includes(words)) titles.push(c)
    if (starts.length >= limit) break
  }
  return [...starts, ...titles].slice(0, limit).map(c => ({ code: c.code, title: c.title }))
}
