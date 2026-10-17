/** Prepare an isolated upload directory. This command never deploys. */
import { cp, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
const stage=resolve('.wrangler/reviews-preview')
await readFile('public/reviews/index.html')
const template=JSON.parse((await readFile('wrangler.reviews.jsonc','utf8')).replace(/^\s*\/\/.*$/gm,''))
if(template.name!=='bye-before-you-enroll')throw new Error('Unexpected Pages project')
await mkdir(stage,{recursive:true})
await cp('public',stage+'/public',{recursive:true})
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','functions','build','functions','--outdir',stage+'/functions-build'],{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-review-preview-build.log'},stdio:'pipe'})
await copyFile(stage+'/functions-build/index.js',stage+'/public/_worker.js')
await writeFile(stage+'/wrangler.jsonc',JSON.stringify(template,null,2)+'\n')
console.log('Prepared .wrangler/reviews-preview with reviews and source APIs disabled. No deployment performed.')
console.log('After owner approval/configuration, deploy from that directory to the existing project using --branch review-submission-test. Never deploy this test to main.')
