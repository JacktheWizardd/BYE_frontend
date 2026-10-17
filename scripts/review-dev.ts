/** Built review page + actual Pages function on loopback. No mocked auth or database. */
import { Miniflare } from 'miniflare'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const appMode=process.argv.includes('--app')
const root=resolve('public'),out=resolve('.wrangler/review-dev')
await readFile(root+'/reviews/index.html');await mkdir(out,{recursive:true})
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','functions','build','functions','--outdir',out],{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-review-dev-build.log'},stdio:'pipe'})
const vars:Record<string,string>={REVIEWS_ENABLED:'false',LIVE_APP_ENABLED:'false',REVIEW_LOCAL_HTTP:'true'}
const keys=['REVIEWS_ENABLED','REVIEW_TEST_EMAIL','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','REVIEW_LOCAL_HTTP']
try {
  for(const line of (await readFile('.dev.vars','utf8')).split(/\r?\n/)) {
    const match=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if(match && keys.includes(match[1]))vars[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2')
  }
} catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}
for(const key of keys)if(process.env[key]!==undefined)vars[key]=process.env[key]!
vars.LIVE_APP_ENABLED=appMode?'true':'false'
if(appMode)execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','workers/source/wrangler.jsonc','--env','preview','--dry-run','--outdir',out+'/sources'],{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-app-dev-build.log'},stdio:'pipe'})
const mf=new Miniflare({workers:[
  ...(appMode?[{name:'sources',modules:true,scriptPath:out+'/sources/index.js',compatibilityDate:'2025-10-11',durableObjects:{SOURCES:{className:'Sources',useSQLite:true}},bindings:{LIVE_APP_ENABLED:'true',RMP_AUTHORIZED:'false',RMP_CACHE_SECONDS:'0'}}]:[]),
  {name:'pages',modules:true,scriptPath:out+'/index.js',compatibilityDate:'2025-10-11',bindings:vars,...(appMode?{durableObjects:{SOURCES:{className:'Sources',scriptName:'sources',useSQLite:true}}}:{})},
]})
const worker=await mf.getWorker('pages')
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url??'/','http://'+req.headers.host)
    if(url.pathname.startsWith('/api/')) {
      const parts:Buffer[]=[];let length=0
      for await(const part of req) {const chunk=Buffer.from(part);length+=chunk.length;if(length>16384){res.writeHead(413);res.end('Form too large');return}parts.push(chunk)}
      const requestInit={method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter(([,v])=>typeof v==='string')) as Record<string,string>,...(['POST','PUT','PATCH'].includes(req.method??'')?{body:Buffer.concat(parts)}:{})}
      const response=await worker.fetch(url.href,requestInit);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''))
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
    const data=await readFile(file)
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.xml':'application/xml'} as Record<string,string>)[extname(file)]??'application/octet-stream')
    if(url.pathname.startsWith('/reviews/')) {res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Cache-Control','no-store')}
    res.end(data)
  } catch {res.writeHead(404);res.end('Not found')}
})
await new Promise<void>(r=>server.listen(8788,'127.0.0.1',r))
console.log((appMode?'Live app preview: http://127.0.0.1:8788/app/ (PCC + BYE; RMP disabled). ':'')+'Review preview: http://127.0.0.1:8788/reviews/ (actual API; '+(vars.REVIEWS_ENABLED==='true'?'test enabled':'test disabled')+'). Config values are not logged.')
const close=()=>{server.close();void mf.dispose().then(()=>process.exit(0))}
process.on('SIGINT',close);process.on('SIGTERM',close)
