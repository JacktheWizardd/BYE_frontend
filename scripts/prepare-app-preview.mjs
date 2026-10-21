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
// Preview uses the same flags as wrangler.pages.jsonc's preview env (secrets are set in Cloudflare, not here).
const previewVars={...config.env.preview.vars}
config.vars=previewVars
config.env={preview:{vars:previewVars,durable_objects:previewBinding}}
await mkdir(stage,{recursive:true});await cp('public',stage+'/public',{recursive:true})
// The site-wide CSP in public/_headers already blocks third-party scripts; the preview only adds
// no-transform so Cloudflare does not inject its analytics snippet at all.
const previewHeaders="\n# Owner preview: no injected analytics snippet.\n/*\n  Cache-Control: public, no-transform\n"
await writeFile(stage+'/public/_headers',(await readFile('public/_headers','utf8'))+previewHeaders)
const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-app-preview-build.log'}
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','functions','build','functions','--compatibility-date','2025-10-11','--compatibility-flags','nodejs_compat','--outdir',stage+'/functions-build'],{env,stdio:'pipe'})
await copyFile(stage+'/functions-build/index.js',stage+'/public/_worker.js')
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','workers/source/wrangler.jsonc','--env','preview','--dry-run','--outdir',stage+'/sources'],{env,stdio:'pipe'})
await writeFile(stage+'/wrangler.jsonc',JSON.stringify(config,null,2)+'\n')
console.log('Full app staged at .wrangler/app-preview. Flags follow the preview env; source binding targets preview only. No credentials copied and no deployment performed.')
