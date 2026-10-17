import { test } from 'node:test'
import assert from 'node:assert/strict'
import { course, professors, sectionDetails } from '../packages/core/domain'
import { fits, formatLabel } from '../apps/web/src/schedule'
test('enrollment values preserve unknowns, clamp negative counts, and reject invalid counts', () => {
  assert.deepEqual(sectionDetails({}), { seatsOpen: undefined, capacity: undefined, waitlistCount: undefined, waitlistCapacity: undefined, termPart: '', campus: '', units: '' })
  const d = sectionDetails({ seatsAvail: '-3', maxEnrl: 30, waitCount: 'bad', waitCapacity: '', ptrmDesc: 'Full term', campDesc: 'Main', creditHrLow: '3' })
  assert.equal(d.seatsOpen, 0); assert.equal(d.capacity, 30); assert.equal(d.waitlistCount, undefined); assert.equal(d.waitlistCapacity, undefined)
})
test('structured days and enrollment fields survive section grouping', () => {
  const rows = [{ subjCode: 'MATH', courseNumbDisplay: '005A', crn: '12345', pfaName: 'Avery Example', schdCode: 'LEC', monDay: 'M', wedDay: 'W', seatsAvail: '5', maxEnrl: '30', ptrmDesc: '8-week first session' }]
  const s = professors(rows, course('math5a'))[0].sections[0]
  assert.deepEqual(s.days, ['Mon', 'Wed']); assert.equal(s.details?.seatsOpen, 5)
  assert.equal(fits(s, ['Mon']), true); assert.equal(fits(s, ['Mon', 'Fri']), false)
  assert.equal(formatLabel(s), 'In person')
  assert.equal(fits({ ...s, days: [], meetings: [] }, ['Mon']), false)
  assert.equal(fits({ ...s, formats: ['OD'], days: [], meetings: [] }, ['Mon']), true)
})
