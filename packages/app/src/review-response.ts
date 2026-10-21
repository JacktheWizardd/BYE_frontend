import type { ByeResolution, ByeRatingProfile, ByeReviewPage } from '@bye/core/reviews'

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 4000
const id = (v: unknown): v is string => text(v) && v.length > 0 && v.length <= 100
const count = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0
const rating = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5
const course = (v: unknown) => object(v) && id(v.id) && text(v.code) && text(v.title)
export function resolutionResponse(v: unknown): ByeResolution {
  if (!object(v) || !['matched', 'missing', 'ambiguous'].includes(String(v.match)) ||
      !(v.course === null || course(v.course)) || !(v.professor === null || object(v.professor) && id(v.professor.id) && text(v.professor.first_name) && text(v.professor.last_name)) ||
      (v.match !== 'matched' && v.professor !== null)) throw new Error('Invalid BYE professor resolution.')
  return v as unknown as ByeResolution
}
export function profileResponse(v: unknown, professorId: string): ByeRatingProfile {
  if (!object(v) || v.professorId !== professorId || !count(v.count) || !(v.quality === null || rating(v.quality)) || !(v.difficulty === null || rating(v.difficulty)) ||
      !text(v.retrievedAt) || !Array.isArray(v.courses) || v.courses.length > 500 || !v.courses.every(c => course(c) && count(c.count))) throw new Error('Invalid BYE professor profile.')
  return v as unknown as ByeRatingProfile
}
export function reviewsResponse(v: unknown, offset: number): ByeReviewPage {
  if (!object(v) || !Array.isArray(v.reviews) || v.reviews.length > 20 || !v.reviews.every(r => object(r) && id(r.id) && rating(r.quality) && rating(r.difficulty) && (r.body === null || text(r.body)) && text(r.date) && id(r.courseId) && text(r.course)) ||
      !(v.nextOffset === null || count(v.nextOffset) && (v.nextOffset as number) > offset)) throw new Error('Invalid BYE review page or pagination.')
  return v as unknown as ByeReviewPage
}
