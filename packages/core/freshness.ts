import type { Section, SourceMeta } from './types'

// Availability defaults to a two-minute policy. The schedule service supplies its own deadline.
export const availabilityDeadline = (source: SourceMeta) => Number.isFinite(source.expiresAt ?? source.retrievedAt + 120_000) ? Math.min(source.expiresAt ?? source.retrievedAt + 120_000, source.retrievedAt + 120_000) : 0
export function staleSource(source: SourceMeta | undefined, now = Date.now()) {
  return !!source && (source.stale || !Number.isFinite(source.retrievedAt) || now < source.retrievedAt || now >= availabilityDeadline(source))
}
export function openSeatTotal(sections: Section[], now = Date.now()) {
  const unique = [...new Map(sections.map(s => [s.crn, s])).values()]
  // A partial sum would look like a complete count; keep unavailable totals unknown.
  if (!unique.length || unique.some(s => staleSource(s.source, now) || s.details?.seatsOpen === undefined)) return undefined
  return unique.reduce((n, s) => n + s.details!.seatsOpen!, 0)
}
