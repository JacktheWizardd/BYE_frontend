/** Fictional archive UI acceptance; no requests leave the loopback fixture. */
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {chromium,webkit} from 'playwright'
import assert from 'node:assert/strict'
import {setup} from '../tests/fixtures'
import type {ApiResults} from '../packages/core/api'
const fixture=setup(),root=resolve('public');let sectionRequests=0
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url!,'http://localhost')
    if(url.pathname.startsWith('/api/v1/')) {
      const kind=url.pathname.split('/').at(-1)!
      if(kind==='status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:true,rmpConfigured:false}));return}
      const result=await fixture.service.operation(kind as keyof ApiResults,url.searchParams,'archive-browser')
      if(kind==='terms')for(const t of result.data as any[])if(t.termCode==='202670')t.semesterStatus='archived'
      if(kind==='sections') {
        sectionRequests++
        Object.assign(result.meta,{semesterStatus:'archived',archivedAt:new Date().toISOString(),stale:true,expiresAt:0})
        for(const p of (result.data as any).professors)for(const s of p.sections){s.source=result.meta;if(s.details)for(const k of ['seatsOpen','capacity','waitlistCount','waitlistCapacity'])delete s.details[k]}
      }
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return
    }
    const file=resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+sep))throw Error('path')
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf'} as Record<string,string>)[extname(file)]??'application/octet-stream');res.end(await readFile(file))
  }catch{res.writeHead(500);res.end()}
})
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${(server.address() as any).port}`
try {
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]] as const){const browser=await engine.launch();try{
  for(const width of [390,1280]) {
    const page=await browser.newPage({viewport:{width,height:844}})
    const outside:string[]=[];page.on('request',r=>{if(!r.url().startsWith(origin))outside.push(r.url())})
    await page.clock.install();await page.goto(origin+'/app/')
    await page.locator('optgroup[label="Archived semesters"] option').waitFor({state:'attached'})
    await page.getByLabel('Semester',{exact:true}).selectOption('202670')
    await page.getByRole('combobox',{name:'Class',exact:true}).fill('math5a')
    await page.getByRole('button',{name:'Find professors'}).click()
    await page.getByText('Archived semester · For reference',{exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'Refresh',exact:true}).count(),0)
    const before=sectionRequests;await page.clock.fastForward(180_001);assert.equal(sectionRequests,before,'Archive must not poll sections')
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    assert.deepEqual(outside,[])
    await page.clock.runFor(1000)
    await page.screenshot({path:`test-results/archive-${name}-${width}.png`,fullPage:true})
    console.log(`${name} ${width}: archive picker, label, no availability polling, no overflow passed`)
    await page.close()
  }
 }finally{await browser.close()}}
}finally{await new Promise<void>(r=>server.close(()=>r()))}
