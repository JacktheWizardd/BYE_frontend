import { readFile } from 'node:fs/promises'
const record = JSON.parse(await readFile('docs/release-readiness.json', 'utf8'))
const required = ['pccCloudflareVerified', 'pccUseVerified', 'rmpPermissionRecorded', 'rmpCloudflareVerified', 'browserAcceptancePassed', 'freeTierVerified']
const blocked = required.filter(key => record[key] !== true)
if (blocked.length) { console.error('Live release blocked:', blocked.join(', ')); process.exitCode = 1 }
else console.log('Recorded release prerequisites passed. Confirm the matching preview version before enabling production.')
