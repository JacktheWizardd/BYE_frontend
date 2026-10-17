/** Stage the full app without deploying or copying local credentials. */
import { cp, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
const stage=resolve('.wrangler/app-preview')
await readFile('public/app/index.html')
const config=JSON.parse(await readFile('wrangler.pages.jsonc','utf8'))
if(config.name!=='bye-before-you-enroll')throw new Error('Unexpected Pages project')
// Both config contexts target preview sources, never production sources.
const previewBinding={bindings:[{name:'SOURCES',class_name:'Sources',script_name:'bye-sources-preview'}]}
config.durable_objects=previewBinding
config.vars={LIVE_APP_ENABLED:'false',REVIEWS_ENABLED:'false'}
config.env={preview:{vars:{LIVE_APP_ENABLED:'false',REVIEWS_ENABLED:'false'},durable_objects:previewBinding}}
await mkdir(stage,{recursive:true});await cp('public',stage+'/public',{recursive:true})
// Preview-only policy: leave the production analytics setting untouched.
const previewHeaders="\n# Owner preview: no third-party scripts or analytics connections.\n/*\n  Cache-Control: public, no-transform\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'\n"
await writeFile(stage+'/public/_headers',(await readFile('public/_headers','utf8'))+previewHeaders)
const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-app-preview-build.log'}
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','functions','build','functions','--outdir',stage+'/functions-build'],{env,stdio:'pipe'})
await copyFile(stage+'/functions-build/index.js',stage+'/public/_worker.js')
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','workers/source/wrangler.jsonc','--env','preview','--dry-run','--outdir',stage+'/sources'],{env,stdio:'pipe'})
await writeFile(stage+'/wrangler.jsonc',JSON.stringify(config,null,2)+'\n')
console.log('Full app staged at .wrangler/app-preview. Both APIs disabled; source binding targets preview only. No credentials copied and no deployment performed.')
