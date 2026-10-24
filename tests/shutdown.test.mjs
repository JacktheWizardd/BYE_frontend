import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { onRequest } from '../functions/_middleware.ts'

const request = (path, method = 'GET', next = () => { throw new Error('Unexpected downstream request') }) =>
  onRequest({ request: new Request(`https://bye.example${path}`, { method }), next })

test('every public page, asset and download is unavailable without calling downstream', async () => {
  for (const path of ['/', '/demo/', '/app/', '/reviews/', '/download', '/download/windows', '/downloads/BYE-0.5.0-AppleSilicon.dmg', '/site/index.js', '/unknown', '/updates-evil/appcast.xml', '/windows/other.json']) {
    const response = await request(path)
    assert.equal(response.status, 503, path)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow')
    assert.match(await response.text(), /<h1>BYE has shut down\.<\/h1>/)
  }
})

test('API reads and writes stop before authentication, email or database handlers', async () => {
  for (const path of ['/api', '/api/v1/status', '/api/reviews/session', '/api/reviews/auth/send', '/api/reviews/submit']) {
    for (const method of ['GET', 'POST', 'DELETE', 'OPTIONS']) {
      const response = await request(path, method)
      assert.equal(response.status, 503)
      assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE')
    }
  }
})

test('desktop feeds and signed update files pass through unchanged for GET and HEAD', async () => {
  for (const path of ['/updates/appcast.xml', '/updates/BYE-0.5.0-AppleSilicon.zip', '/updates/BYE-0.5.0-AppleSilicon.zip.sha256']) {
    for (const method of ['GET', 'HEAD']) {
      const sentinel = new Response(null, { status: 200, headers: { ETag: 'unchanged' } })
      assert.equal(await request(path, method, () => sentinel), sentinel)
    }
    assert.equal((await request(path, 'POST')).status, 503)
  }
})


test('published Windows metadata and the exact portable download are available', async () => {
  const release = JSON.parse(await readFile(new URL('../retirement-release.json', import.meta.url), 'utf8'))
  assert.equal(release.windowsReady, true)
  assert.equal(release.windowsNativeTested, false)
  assert.equal(release.windowsPublicationAuthorized, true)
  const metadata = await request('/windows/latest.json')
  assert.equal(metadata.status, 200)
  assert.deepEqual(await metadata.json(), { version: release.version, downloadUrl: release.windowsDownloadUrl })
  const download = await request('/download/windows/retirement')
  assert.equal(download.status, 302)
  assert.equal(download.headers.get('Location'), release.windowsArtifactUrl)
  for (const path of ['/windows/latest.json', '/download/windows/retirement']) {
    assert.equal((await request(path, 'HEAD')).status, path.includes('latest.json') ? 200 : 302)
    assert.equal(await (await request(path, 'HEAD')).text(), '')
    for (const method of ['POST', 'DELETE', 'OPTIONS']) assert.equal((await request(path, method)).status, 503)
  }
})

test('unexpected update queries and paths remain blocked', async () => {
  for (const path of ['/windows/latest.json?v=1', '/download/windows/retirement?v=1', '/updates/appcast.xml?v=1', '/updates/unexpected.js']) {
    const response = await request(path)
    assert.equal(response.status, 503, path)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  }
})

test('HEAD responses are empty and routing invokes the gate for every path', async () => {
  for (const path of ['/', '/api/reviews/session']) {
    const response = await request(path, 'HEAD')
    assert.equal(response.status, 503)
    assert.equal(await response.text(), '')
  }
  const routes = JSON.parse(await readFile(new URL('../public/_routes.json', import.meta.url), 'utf8'))
  assert.deepEqual(routes, { version: 1, include: ['/*'], exclude: [] })
})
