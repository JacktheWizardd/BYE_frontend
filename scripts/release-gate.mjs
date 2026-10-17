import { readFile } from 'node:fs/promises'
const record = JSON.parse(await readFile('docs/release-readiness.json', 'utf8'))
const required = ['pccCloudflareVerified', 'pccUseVerified', 'rmpPermissionRecorded', 'rmpCloudflareVerified', 'browserAcceptancePassed', 'freeTierVerified']
// Owner decisions accept a missing gate as a known risk; they never mark the gate itself as passed.
const overridden = required.filter(key => record[key] !== true && record.ownerDecisions?.[key]?.accepted === true)
const blocked = required.filter(key => record[key] !== true && !overridden.includes(key))
for (const key of overridden) console.warn(`Gate ${key} NOT met; owner accepted the risk on ${record.ownerDecisions[key].date}: ${record.ownerDecisions[key].note}`)
if (blocked.length) { console.error('Live release blocked:', blocked.join(', ')); process.exitCode = 1 }
else console.log('Recorded release prerequisites passed. Confirm the matching preview version before enabling production.')
