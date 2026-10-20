import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { displayTitle, fits, formatLabel, orderReviews } from '../packages/core/domain'
import type { Review, Section, Weekday } from '../packages/core/types'

// Shared test vectors: the Mac app (ClasswiseCore) and the Windows app run these same JSON files.
const vectors = async (name: string) => JSON.parse(await readFile(`packages/core/vectors/${name}.json`, 'utf8'))
const section = (s: Partial<Section>): Section => ({ crn: '1', title: '', start: '', end: '', status: '', meetings: [], formats: [], ...s })

test('class-days vectors', async () => {
  for (const c of (await vectors('class-days')).cases) {
    assert.equal(fits(section(c.section), c.picked as Weekday[]), c.expected, c.name)
  }
})

test('format-label vectors', async () => {
  for (const c of (await vectors('format-label')).cases) assert.equal(formatLabel(section({ formats: c.formats })), c.expected, c.formats.join(','))
})

test('review-order vectors', async () => {
  const v = await vectors('review-order')
  const reviews: Review[] = v.reviews.map((r: Partial<Review>) => ({ course: 'MATH5A', text: '', ...r }))
  for (const c of v.cases) assert.deepEqual(orderReviews(reviews, c.by).map((r) => r.id), c.expected, c.by)
})

test('display-title vectors', async () => {
  for (const c of (await vectors('display-title')).cases) assert.equal(displayTitle(c.raw), c.expected, c.raw)
})
