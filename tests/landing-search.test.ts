import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexCourse, searchCourses } from '../apps/landing/src/content/courseSearch'

const list = [['BIOL 011', 'General Biology'], ['BIOL 011H', 'Honors General Biology'], ['MATH 005A', 'Single Variable Calculus I']].map(c => indexCourse(c as [string, string]))
const codes = (q: string) => searchCourses(list, q).map(c => c.code)

test('landing course search ignores leading zeros in either direction', () => {
  for (const q of ['biol 011', 'biol 0011', 'BIOL011', 'biol 11']) assert.deepEqual(codes(q), ['BIOL 011', 'BIOL 011H'], q)
  for (const q of ['math 5a', 'math 05a', 'MATH 0005A', '5a']) assert.deepEqual(codes(q), ['MATH 005A'], q)
})
