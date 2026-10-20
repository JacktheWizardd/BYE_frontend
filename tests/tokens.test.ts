import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
// @ts-expect-error The generator is a plain .mjs script without type declarations.
import { generate } from '../scripts/build-tokens.mjs'

const tokens = JSON.parse(await readFile('packages/tokens/tokens.json', 'utf8'))
const color = (name: string): string => tokens.color[name].value

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('generated token files match tokens.json', async () => {
  const files: Record<string, string> = await generate()
  for (const [name, content] of Object.entries(files)) {
    const current = (await readFile(`packages/tokens/${name}`, 'utf8')).replace(/\r\n/g, '\n')
    assert.equal(current, content, `${name} is stale; run pnpm build:tokens`)
  }
})

test('every color is a six-digit hex value', () => {
  for (const [name, entry] of Object.entries<{ value: string }>(tokens.color)) assert.match(entry.value, /^#[0-9a-f]{6}$/, name)
})

test('text colors meet WCAG AA on every surface they sit on', () => {
  for (const surface of ['paper', 'linen', 'card']) {
    for (const text of ['ink', 'ink2', 'ink3']) assert.ok(contrast(color(text), color(surface)) >= 4.5, `${text} on ${surface}`)
  }
  assert.ok(contrast(color('paper'), color('ink')) >= 4.5, 'paper text on ink buttons')
  assert.ok(contrast(color('ink'), color('accent')) >= 4.5, 'ink text on the yellow hover state')
  assert.ok(contrast(color('signal'), color('paper')) >= 4.5, 'signal text on paper')
})

test('yellow stays an accent, never a text color', () => {
  assert.ok(contrast(color('accent'), color('paper')) < 3, 'accent must not pass as a text color on paper')
})

test('motion tokens are complete for both platforms', () => {
  for (const curve of Object.values<number[]>(tokens.motion.easing)) assert.equal(curve.length, 4)
  for (const key of ['slide', 'swipe', 'bars', 'countUp', 'stagger', 'confetti']) assert.ok(tokens.motion.durationMs[key] > 0, key)
  assert.ok(tokens.motion.spring.dampingFraction > 0 && tokens.motion.spring.dampingFraction < 1)
})
