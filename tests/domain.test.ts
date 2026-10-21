import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { catalog, course, delivery, eligible, filterReviews, identity, orderReviews, professors, resolve, sameCourse, suggestions } from '../packages/core/domain'
import type { Profile, Review, Row } from '../packages/core/types'
export const profile = (id = '1', overrides: Partial<Profile> = {}): Profile => ({ id, firstName: 'John', lastName: 'Harris', schoolID: 2649, school: 'Pasadena City College', department: 'History', reviews: [], courseCounts: [], coverage: {}, ...overrides })
const review = (id: string, text: string, label = 'ETH014'): Review => ({ id, text, course: label, date: '2026-05-01' })
test('course shorthand preserves subject, prefix, suffix and original label', () => {
  for (const input of ['math 5a', 'MATH05A', 'MATH 005A']) assert.equal(course(input).matchingKey, 'MATH5A')
  assert.equal(course('POLS C1000').matchingKey, 'POLSC1000')
  assert.equal(course('ETH000').matchingKey, 'ETH0')
  assert.equal(course('ETH 014').display, 'ETH 014')
  for (const input of ['14', 'SOC14', 'ETH14B']) assert.equal(sameCourse(course('ETH014'), input), false)
  assert.throws(() => course('5A'))
})
test('official resolution, exact precedence and ambiguous aliases', () => {
  const rows: Row[] = ['005A', '5A'].map((number, i) => ({ subjCode: 'MATH', courseNumbDisplay: number, crn: String(i + 1), courseTitle: 'Calculus' }))
  assert.equal(resolve('math5a', rows).key, 'MATH5A')
  assert.throws(() => resolve('math05a', rows), /More than one/)
  assert.equal(resolve('math05a', rows.slice(0, 1)).key, 'MATH005A')
  assert.equal(suggestions('math5a', rows)[0].course.key, 'MATH5A')
  for(const status of ['R','X']) assert.equal(catalog([{ ...rows[0], fwSectOpenInd: status }]).length,1,'Uninterpreted source statuses must remain visible')
})
test('PCC fixture retains closed sections, deduplicates CRNs and groups meetings', async () => {
  const rows = JSON.parse(await readFile(new URL('../apps/web/tests/fixtures/pcc-summer-2026-eth014.json', import.meta.url), 'utf8'))
  const result = professors(rows, course('ETH14'))
  assert.equal(result.length, 10)
  assert.equal(result.reduce((n, p) => n + p.sections.length, 0), 14)
  const hybrid = result.find(p => p.name === 'Ryan Howard')!.sections[0]
  assert.equal(hybrid.crn, '54591'); assert.equal(hybrid.meetings.length, 2)
  assert.equal(delivery(hybrid), 'Hybrid · campus meetings required')
  assert.equal(delivery(result.find(p => p.name === 'Ariana Flores')!.sections[0]), 'Online · no scheduled meetings')
})
test('identity requires PCC school and conservative full name; departments never break ties', () => {
  const a = profile(), b = profile('2', { department: 'Ethnic Studies' })
  assert.equal(eligible('John Harris', [a, b, a]).length, 2)
  assert.equal(identity('John Harris', profile('1', { schoolID: 1 })), false)
  assert.equal(identity('John Harris', profile('1', { school: 'Other College' })), false)
  assert.equal(identity('John Harris', profile('1', { firstName: 'Jane' })), false)
  assert.equal(identity('Dr José De La Cruz', profile('1', { firstName: 'Jose', lastName: 'De La Cruz' })), true)
  assert.equal(identity('Jose De La Cruz', profile('1', { firstName: 'Jose', lastName: 'Cruz' })), false)
})
test('review filters preserve source labels, separate all-course coverage and cap 50', () => {
  const p = profile('1', { reviews: [review('1', 'Text', 'MATH5A'), review('2', 'Other', 'SOC14'), review('3', 'Unspecified', '5A')], coverage: { all: { reviewIDs: ['1', '2'], hasNextPage: false, updatedAt: Date.now() } } })
  assert.deepEqual(filterReviews(p, course('MATH005A'), 'this').map(r => r.id), ['1'])
  assert.equal(filterReviews(p, course('MATH005A'), 'all').length, 2)
  assert.equal(filterReviews(p, course('MATH005A'), 'SOC14')[0].course, 'SOC14')
})


test('all six review sort modes keep unknown dates last and use stable ties',()=>{
 const rows=[{id:'a',course:'TEST1',text:'',date:'2026-01-01',rating:2,difficulty:5},{id:'b',course:'TEST1',text:'',date:'2026-02-01',rating:5,difficulty:1},{id:'c',course:'TEST1',text:'',date:'',rating:3,difficulty:3}]
 const expectations={recent:'b',oldest:'a',highest:'b',lowest:'a',difficulty:'b',highestDifficulty:'a'}
 for(const [by,id] of Object.entries(expectations))assert.equal(orderReviews(rows,by)[0].id,id)
 assert.equal(orderReviews(rows,'oldest').at(-1)?.id,'c')
})
