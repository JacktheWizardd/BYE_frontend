// Generates the BYE design tokens from packages/tokens/tokens.json:
//   packages/tokens/generated/tokens.css      plain CSS variables (--bye-*) for apps/web and the Windows app
//   packages/tokens/generated/theme.css       Tailwind v4 @theme block for apps/landing
//   packages/tokens/generated/BYETokens.swift SwiftUI constants for the Mac app (copied by the app repo's sync script)
// Run `node scripts/build-tokens.mjs` after editing tokens.json. `--check` fails if a generated file is stale.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(root, 'packages/tokens')
const banner = 'Generated from packages/tokens/tokens.json by scripts/build-tokens.mjs. Do not edit; edit tokens.json and rebuild.'

const kebab = (s) => s.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()
const px = (n) => (n === 0 ? '0' : `${n}px`)
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function shadowCss(layers, color) {
  return layers.map((l) => {
    const hex = color[l.color].value
    const paint = l.alpha === 1 ? hex : `rgb(${rgb(hex).join(' ')} / ${l.alpha})`
    const parts = [px(l.x ?? 0), px(l.y ?? 0), px(l.blur ?? 0)]
    if (l.spread !== undefined) parts.push(px(l.spread))
    return `${parts.join(' ')} ${paint}`
  }).join(', ')
}
const bezier = (b) => `cubic-bezier(${b.join(', ')})`

function css(t) {
  const lines = []
  for (const [k, v] of Object.entries(t.color)) lines.push(`--bye-${kebab(k)}: ${v.value};`)
  for (const [k, v] of Object.entries(t.font)) lines.push(`--bye-font-${k}: ${v.css};`)
  for (const [k, v] of Object.entries(t.size)) lines.push(`--bye-size-${kebab(k)}: ${v}px;`)
  for (const [k, v] of Object.entries(t.space)) lines.push(`--bye-space-${k}: ${v}px;`)
  for (const [k, v] of Object.entries(t.radius)) lines.push(`--bye-radius-${k}: ${v}px;`)
  for (const [k, v] of Object.entries(t.border)) lines.push(`--bye-border-${k}: ${v}px;`)
  for (const [k, v] of Object.entries(t.shadow)) lines.push(`--bye-shadow-${kebab(k)}: ${shadowCss(v, t.color)};`)
  for (const [k, v] of Object.entries(t.tilt)) lines.push(`--bye-tilt-${kebab(k)}: ${v}deg;`)
  for (const [k, v] of Object.entries(t.motion.easing)) lines.push(`--bye-ease-${k}: ${bezier(v)};`)
  for (const [k, v] of Object.entries(t.motion.durationMs)) lines.push(`--bye-duration-${kebab(k)}: ${v}ms;`)
  return `/* ${banner} */\n:root {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`
}

// Tailwind names used by apps/landing (bg-paper, text-ink-2, rounded-card, shadow-float, ease-out-expo …).
function theme(t) {
  const c = t.color
  const colors = { paper: c.paper, linen: c.linen, card: c.card, tile: c.tile, 'tile-line': c.tileLine, ink: c.ink, 'ink-2': c.ink2, 'ink-3': c.ink3, line: c.line, 'line-strong': c.lineStrong, accent: c.accent, 'brand-soft': c.brandSoft, signal: c.signal }
  const lines = [
    ...Object.entries(t.breakpoint).map(([k, v]) => `--breakpoint-${k}: ${v}px;`),
    '',
    ...Object.entries(colors).map(([k, v]) => `--color-${k}: ${v.value};`),
    '',
    ...Object.entries(t.font).map(([k, v]) => `--font-${k}: ${v.css};`),
    '',
    `--radius-card: ${t.radius.card}px;`,
    `--radius-window: ${t.radius.window}px;`,
    ...Object.entries(t.shadow).map(([k, v]) => `--shadow-${kebab(k)}: ${shadowCss(v, t.color)};`),
    `--ease-out-expo: ${bezier(t.motion.easing.expo)};`,
    `--ease-spring: ${bezier(t.motion.easing.spring)};`,
  ]
  return `/* ${banner} */\n@theme {\n${lines.map((l) => (l ? `  ${l}` : '')).join('\n')}\n}\n`
}

function swift(t) {
  const num = (n) => (Number.isInteger(n) ? `${n}` : `${n}`)
  const hex = (h) => `0x${h.slice(1).toUpperCase()}`
  const block = (name, doc, rows) => `/// ${doc}\nenum ${name} {\n${rows.map((r) => `    ${r}`).join('\n')}\n}\n`
  const out = [
    `// ${banner}`,
    '// Copied into Sources/Classwise/Views/ by scripts/sync-bye-shared.mjs in the app repository.',
    'import SwiftUI',
    '',
    block('BYEColor', 'Brand colors (light mode only).', Object.entries(t.color).map(([k, v]) => `static let ${k} = Color(byeHex: ${hex(v.value)})${v.note ? ` // ${v.note}` : ''}`)),
    block('BYESize', 'Type sizes in points. Mac body text uses SF Pro; headings and numbers use Libre Baskerville.', Object.entries(t.size).map(([k, v]) => `static let ${k}: CGFloat = ${v}`)),
    block('BYESpace', 'Spacing scale in points.', Object.entries(t.space).map(([k, v]) => `static let ${k}: CGFloat = ${v}`)),
    block('BYERadius', 'Corner radii in points.', Object.entries(t.radius).map(([k, v]) => `static let ${k}: CGFloat = ${v}`)),
    block('BYEBorder', 'Border widths in points.', Object.entries(t.border).map(([k, v]) => `static let ${k}: CGFloat = ${v}`)),
    block('BYETilt', 'Playful tilts in degrees.', Object.entries(t.tilt).map(([k, v]) => `static let ${k}: Double = ${num(v)}`)),
    block('BYEDuration', 'Motion durations in seconds.', Object.entries(t.motion.durationMs).map(([k, v]) => `static let ${k}: Double = ${v / 1000}`)),
    '/// A cubic Bézier timing curve shared with the CSS `--bye-ease-*` variables.',
    'struct BYECurve {',
    '    let x1: Double, y1: Double, x2: Double, y2: Double',
    '    func animation(_ duration: Double) -> Animation { .timingCurve(x1, y1, x2, y2, duration: duration) }',
    '}',
    '',
    block('BYEEasing', 'Easing curves.', Object.entries(t.motion.easing).map(([k, [a, b, c, d]]) => `static let ${k} = BYECurve(x1: ${a}, y1: ${b}, x2: ${c}, y2: ${d})`)),
    block('BYESpring', 'The shared spring, used for toggles, selection and re-ordering.', [
      `static let response: Double = ${t.motion.spring.response}`,
      `static let dampingFraction: Double = ${t.motion.spring.dampingFraction}`,
      'static var animation: Animation { .spring(response: response, dampingFraction: dampingFraction) }',
    ]),
    '/// One shadow layer. SwiftUI has no spread, so CSS spread values are not represented; `radius` is half the CSS blur.',
    'struct BYEShadowLayer {',
    '    let color: Color, radius: CGFloat, x: CGFloat, y: CGFloat',
    '}',
    '',
    block('BYEShadow', 'Shadows, as layers to apply in order.', Object.entries(t.shadow).map(([k, layers]) => `static let ${k}: [BYEShadowLayer] = [${layers.map((l) => `BYEShadowLayer(color: BYEColor.${l.color}.opacity(${l.alpha}), radius: ${(l.blur ?? 0) / 2}, x: ${l.x ?? 0}, y: ${l.y ?? 0})`).join(', ')}]`)),
    'extension Color {',
    '    /// Creates a color from a 0xRRGGBB value.',
    '    init(byeHex value: UInt32) {',
    '        self.init(red: Double((value >> 16) & 0xFF) / 255, green: Double((value >> 8) & 0xFF) / 255, blue: Double(value & 0xFF) / 255)',
    '    }',
    '}',
    '',
  ]
  return out.join('\n')
}

export async function generate() {
  const tokens = JSON.parse(await readFile(resolve(dir, 'tokens.json'), 'utf8'))
  return {
    'generated/tokens.css': css(tokens),
    'generated/theme.css': theme(tokens),
    'generated/BYETokens.swift': swift(tokens),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await generate()
  const check = process.argv.includes('--check')
  let stale = []
  for (const [name, content] of Object.entries(files)) {
    const file = resolve(dir, name)
    if (check) {
      // Git may check files out with CRLF on Windows; compare content, not line endings.
      const current = (await readFile(file, 'utf8').catch(() => '')).replace(/\r\n/g, '\n')
      if (current !== content) stale.push(name)
    } else {
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, content)
    }
  }
  if (check && stale.length) {
    console.error(`Design tokens are stale: ${stale.join(', ')}. Run \`pnpm build:tokens\`.`)
    process.exit(1)
  }
  console.log(check ? 'Design tokens are up to date.' : `Design tokens written: ${Object.keys(files).join(', ')}.`)
}
