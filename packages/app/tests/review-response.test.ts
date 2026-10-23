import test from 'node:test'
import assert from 'node:assert/strict'
import { resolutionResponse, profileResponse, reviewsResponse } from '../src/review-response'
test('BYE review reads reject malformed data and conflicting identities', () => {
  for (const value of [null, {}, { match: 'ambiguous', professor: { id: 'a', first_name: 'Sample', last_name: 'Person' }, course: null }]) assert.throws(() => resolutionResponse(value))
  assert.deepEqual(resolutionResponse({ match: 'missing', professor: null, course: null }).professor, null)
  const profile = { professorId: 'one', count: 0, quality: null, difficulty: null, courses: [], retrievedAt: '2026-10-21' }
  assert.equal(profileResponse(profile, 'one').count, 0)
  assert.throws(() => profileResponse(profile, 'two'))
  assert.throws(() => profileResponse({ ...profile, courses: [null] }, 'one'))
  assert.deepEqual(reviewsResponse({ reviews: [], nextOffset: null }, 0).reviews, [])
  assert.throws(() => reviewsResponse({ reviews: [], nextOffset: 20 }, 20))
  assert.throws(() => reviewsResponse({ reviews: [{ id: 'a', quality: '5' }], nextOffset: null }, 0))
})
