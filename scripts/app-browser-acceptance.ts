/** Combined live-app UI acceptance. All PCC, RMP and Supabase responses are fictional. */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, webkit } from 'playwright'
import assert from 'node:assert/strict'
import { setup } from '../tests/fixtures'
import { errorResponse } from '../server/service'
import { handleReviewRequest } from '../server/reviews'
import { reviewFixture, TEST_EMAIL } from '../tests/review-fixtures'
import type { ApiResults } from '../packages/core/api'
let source=setup(),auth=reviewFixture(),rmpEnabled=false,reportWrites=0,byeFails=false
const reviews=Array.from({length:25},(_,i)=>({id:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`,quality:4,difficulty:2,body:i===0?'<img src=x onerror=alert(1)>':'Fictional BYE comment '+i,created_at:'2026-10-16T00:00:00Z',course_id:2,courses:{code:'MATH 005A',title:'CALCULUS'}}))
const outbound:typeof fetch=async(input,init)=>{
  const request=typeof input==='string'||input instanceof URL?undefined:input
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url)
  const method=init?.method??request?.method??'GET',path=url.pathname.split('/').at(-1)
  if(byeFails&&['reviews','professors'].includes(path??''))return Response.json({code:'XX000'},{status:503})
  if(path==='professors'){const row={id:1,first_name:'Lena',last_name:'Whitcombe'};return Response.json(url.searchParams.has('id')?row:[row])}
  if(path==='courses'){const row={id:2,code:'MATH 005A',title:'CALCULUS'};return Response.json(url.searchParams.has('id')?row:[row])}
  if(path==='reviews'){
    if(url.searchParams.get('select')==='id')return Response.json({id:reviews[0].id})
    const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??1000)
    return Response.json(reviews.slice(offset,offset+limit))
  }
  if(path==='reports'&&method==='POST'){reportWrites++;return new Response(null,{status:201})}
  return auth.outbound(input,init)
}
const root=resolve('public')
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url!,'http://'+req.headers.host)
  if(url.pathname.startsWith('/api/reviews/')){
    const chunks=[];for await(const part of req)chunks.push(Buffer.from(part))
    const r=await handleReviewRequest(new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(['POST'].includes(req.method??'')?{body:Buffer.concat(chunks)}:{})}),auth.env,outbound)
    res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return
  }
  if(url.pathname.startsWith('/api/v1/')){
    const kind=url.pathname.split('/').at(-1)!
    if(kind==='status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:true,rmpConfigured:rmpEnabled}));return}
    let r:Response;try{r=Response.json(await source.service.operation(kind as keyof ApiResults,url.searchParams,'combined-browser'))}catch(e){r=errorResponse(e)}
    res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return
  }
  const file=resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''))
  if(!file.startsWith(root+sep))throw new Error()
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf'} as Record<string,string>)[extname(file)]??'application/octet-stream');res.end(await readFile(file))
 }catch{res.writeHead(404);res.end()}
})
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port
await mkdir('test-results',{recursive:true})
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]] as const){
  const browser=await engine.launch()
  try{for(const width of [390,1280]){
   source=setup();auth=reviewFixture();rmpEnabled=false;reportWrites=0;byeFails=false
   const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors:string[]=[],outside:string[]=[]
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin))outside.push(r.url())})
   const search=async()=>{await page.goto(origin+'/app/');await page.getByLabel('Semester',{exact:true}).selectOption('202670');await page.getByRole('combobox',{name:'Class',exact:true}).fill('MATH5A');await page.getByRole('button',{name:'Find professors'}).click();await page.locator('.prof-card').filter({hasText:'Lena Whitcombe'}).click();await page.getByRole('heading',{name:'Reviews',exact:true}).waitFor()}
   await search()
   const bye=page.getByRole('region',{name:'Reviews',exact:true}),cards=bye.locator('.review-list > .review-card')
   await page.getByRole('region',{name:'BYE student ratings'}).getByText('25 BYE reviews across all courses',{exact:false}).waitFor()
   await bye.locator('.source-tag.bye').first().waitFor();assert.equal(await cards.count(),4,'The list opens on four reviews')
   assert.equal(await bye.locator('.review-card img').count(),0,'Comment is rendered as text')
   await page.getByLabel('Sort reviews').selectOption('lowest');await bye.locator('.source-tag.bye').first().waitFor()
   for(const n of [10,16,22,25]){await bye.getByRole('button',{name:'View more reviews'}).click();await page.waitForFunction(n=>document.querySelectorAll('.review-list > .review-card').length===n,n)}
   assert.equal(await bye.locator('.source-tag.rmp').count(),0,'No RMP reviews while RMP is off')
   await bye.getByRole('button',{name:'Report review',exact:true}).first().click()
   await bye.getByLabel('Reason for reporting').fill('Fictional reporting test')
   await bye.getByRole('button',{name:'Send report',exact:true}).click()
   await bye.getByRole('link',{name:'Verify your school email'}).waitFor()
   await bye.getByRole('button',{name:'Write a review',exact:true}).click()
   await page.getByLabel('School email',{exact:true}).fill(TEST_EMAIL);await page.getByRole('button',{name:'Send a code →'}).click()
   await page.getByLabel('Email code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify code →'}).click()
   await page.getByText('Lena Whitcombe',{exact:true}).waitFor();await page.getByText('MATH 005A',{exact:true}).waitFor()
   assert.equal(await page.getByRole('combobox',{name:'Professor',exact:true}).count(),0,'Verified IDs are prefilled')
   rmpEnabled=true;await search()
   await bye.getByRole('button',{name:'All',exact:true}).click();await bye.locator('.source-tag.bye').first().waitFor()
   const tags=()=>cards.evaluateAll(els=>els.map(el=>el.querySelector('.source-tag')?.textContent))
   for(let i=0;i<6&&!(await tags()).includes('RMP');i++){const before=await cards.count();await bye.getByRole('button',{name:'View more reviews'}).click();await page.waitForFunction(n=>document.querySelectorAll('.review-list > .review-card').length>n,before)}
   const both=await tags();assert.ok(both.includes('RMP'),'Both lists RMP reviews too');assert.ok(both.every(t=>t==='BYE'||t==='RMP'),'Every review is tagged')
   assert.equal(both.indexOf('RMP'),both.lastIndexOf('BYE')+1,'BYE reviews come first, then RMP')
   const toggle=bye.getByRole('group',{name:'Review source'})
   await toggle.getByRole('button',{name:'RMP',exact:true}).click();assert.ok((await tags()).every(t=>t==='RMP'))
   await toggle.getByRole('button',{name:'BYE',exact:true}).click();await bye.locator('.source-tag.bye').first().waitFor();assert.ok((await tags()).every(t=>t==='BYE'))
   await toggle.getByRole('button',{name:'Both',exact:true}).click()
   assert.equal(await page.getByText('Find more for this class').count(),0)
   await bye.getByRole('button',{name:'Report review',exact:true}).first().click();await bye.getByLabel('Reason for reporting').fill('Fictional reporting test');await bye.getByRole('button',{name:'Send report',exact:true}).click();await bye.getByText('Report received.',{exact:true}).waitFor();assert.equal(reportWrites,1)
   byeFails=true;await page.getByLabel('Sort reviews').selectOption('highest');await bye.getByText('BYE reviews could not be loaded. Try again shortly.',{exact:true}).first().waitFor()
   assert.ok(await bye.locator('.source-tag.rmp').count()>0,'RMP evidence survives BYE failure')
   byeFails=false;await bye.getByRole('button',{name:'Try BYE reviews again'}).click();await bye.locator('.source-tag.bye').first().waitFor()
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   const short=await page.locator('button:visible,a.button:visible,select:visible').evaluateAll(els=>els.filter(el=>el.getBoundingClientRect().height<43.9).map(el=>el.textContent));assert.deepEqual(short,[])
   assert.equal(await page.getByRole('button',{name:/summary|fisher/i}).count(),0)
   await page.screenshot({path:`test-results/full-app-${engineName}-${width}.png`,fullPage:true})
   assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);await context.close();console.log(`${engineName} ${width}: merged sources, tags, toggle, safe comments, pagination, prefill/auth, reporting and recovery passed`)
  }}finally{await browser.close()}
 }
}finally{await new Promise<void>(r=>server.close(()=>r()))}
