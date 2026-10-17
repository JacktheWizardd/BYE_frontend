/** Browser acceptance uses the real review API and SDK against a fictional Supabase transport. */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
import { handleReviewRequest } from '../server/reviews'
import { reviewFixture, TEST_EMAIL, REVIEW_ID } from '../tests/review-fixtures'
let fixture=reviewFixture()
const root=resolve('public')
const server=createServer(async(req,res)=>{
  try {
    const origin='http://'+req.headers.host,url=new URL(req.url??'/',origin)
    if(url.pathname.startsWith('/api/reviews/')) {
      const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk))
      const request=new Request(url,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter(([,v])=>typeof v==='string')) as Record<string,string>,...(['POST','PUT','PATCH'].includes(req.method??'')?{body:Buffer.concat(chunks)}:{})})
      const response=await handleReviewRequest(request,fixture.env,fixture.outbound)
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''))
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
    const data=await readFile(file)
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf'} as Record<string,string>)[extname(file)]??'application/octet-stream')
    res.end(data)
  } catch {res.writeHead(404);res.end()}
})
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r))
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port
await mkdir('test-results',{recursive:true})
const reports:unknown[]=[]
try {
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]] as const) {
    const browser=await engine.launch()
    try {
      for(const width of [390,1280]) {
        fixture=reviewFixture()
        const context=await browser.newContext({viewport:{width,height:width<600?844:900},...(width<600?{isMobile:true,hasTouch:true}:{})})
        const page=await context.newPage(),errors:string[]=[],outside:string[]=[]
        page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin))outside.push(r.url())})
        await page.clock.install()
        await page.goto(origin+'/reviews/')
        await page.getByLabel('School email',{exact:true}).fill('other@example.com')
        await page.getByRole('button',{name:'Send a code'}).click()
        await page.getByRole('alert').filter({hasText:'Use your @go.pasadena.edu'}).waitFor()
        assert.equal(fixture.state.otpRequests,0)
        await page.getByLabel('School email',{exact:true}).fill(TEST_EMAIL)
        await page.getByRole('button',{name:'Send a code'}).click()
        await page.getByLabel('Email code',{exact:true}).fill('000000')
        await page.getByRole('button',{name:'Verify code'}).click()
        await page.getByRole('alert').filter({hasText:'incorrect or has expired'}).waitFor()
        await page.getByLabel('Email code',{exact:true}).fill('123456')
        await page.getByRole('button',{name:'Verify code'}).click()
        await page.getByText('Verified as '+TEST_EMAIL,{exact:true}).waitFor()
        assert.equal(await page.evaluate(()=>document.cookie.includes('bye-review')),false,'Auth cookie is HttpOnly')
        assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[])
        await page.getByRole('combobox',{name:'Course',exact:true}).fill('TEST')
        await page.clock.fastForward(300)
        await page.getByRole('option',{name:/TEST 001/}).waitFor()
        await page.getByRole('combobox',{name:'Course',exact:true}).press('ArrowDown')
        await page.getByRole('combobox',{name:'Course',exact:true}).press('Enter')
        await page.getByRole('combobox',{name:'Professor',exact:true}).fill('Alex Fixture')
        await page.clock.fastForward(300)
        await page.getByRole('option',{name:'Alex Fixture'}).click()
        await page.getByLabel('Quality',{exact:true}).selectOption('4')
        await page.getByLabel('Difficulty',{exact:true}).selectOption('3')
        await page.getByLabel('Grading',{exact:true}).selectOption('1')
        await page.getByLabel('Clarity',{exact:true}).selectOption('0')
        await page.getByLabel('Your experience',{exact:false}).fill('Temporary browser test comment.')
        await page.getByRole('button',{name:'Check your review'}).click()
        await page.getByRole('heading',{name:'Check your review.'}).waitFor()
        assert.ok((await page.locator('dl').innerText()).includes('Skipped'))
        await page.screenshot({path:`test-results/reviews-${name}-${width}-confirm.png`,fullPage:true})
        // Expiration must retain the open draft and selected professor/course.
        fixture.state.authExpired=true
        await page.getByRole('button',{name:'Submit test review'}).click()
        await page.getByRole('alert').filter({hasText:'Verify your school email again'}).waitFor()
        assert.equal(fixture.state.saves.length,0)
        fixture.state.authExpired=false
        await page.clock.fastForward(61000)
        await page.getByRole('button',{name:'Send a code'}).click()
        await page.getByLabel('Email code',{exact:true}).fill('123456')
        await page.getByRole('button',{name:'Verify code'}).click()
        await page.getByRole('heading',{name:'Check your review.'}).waitFor()
        await page.getByRole('button',{name:'Back to edit'}).click()
        assert.equal(await page.getByLabel('Your experience',{exact:false}).inputValue(),'Temporary browser test comment.')
        await page.getByRole('button',{name:'Check your review'}).click()
        await page.getByRole('button',{name:'Submit test review'}).click()
        await page.getByRole('heading',{name:'Your review is saved.'}).waitFor()
        assert.equal(await page.locator('.review-id').innerText(),REVIEW_ID)
        assert.equal(fixture.state.saves.length,1)
        assert.deepEqual(fixture.state.saves[0].p_answers,{grading:1,clarity:0})
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
        assert.deepEqual(await page.locator('button:visible,a:visible,input:visible,select:visible').evaluateAll(elements=>elements.filter(el=>el.getBoundingClientRect().height<43.9).map(el=>el.textContent)),[])
        await page.screenshot({path:`test-results/reviews-${name}-${width}-receipt.png`,fullPage:true})
        await page.getByRole('button',{name:'Sign out',exact:true}).click()
        await page.getByRole('heading',{name:'Verify your school email.'}).waitFor()
        const cookies=await context.cookies();assert.ok(!cookies.some(c=>c.name.includes('bye-review')))
        assert.deepEqual(errors,[]);assert.deepEqual(outside,[])
        await context.close()
        reports.push({engine:name,width,passed:true})
      }
      // Failed catalog reads are recoverable; an uncertain write must not retry.
      fixture=reviewFixture();fixture.state.catalogFails=true;fixture.state.saveFails=true
      const context=await browser.newContext({viewport:{width:390,height:844}})
      const page=await context.newPage();await page.clock.install()
      const verified=await context.request.post(origin+'/api/reviews/auth/verify',{headers:{Origin:origin},data:{email:TEST_EMAIL,code:'123456'}})
      assert.equal(verified.status(),200)
      await page.goto(origin+'/reviews/')
      await page.getByRole('button',{name:'Retry questions'}).waitFor()
      fixture.state.catalogFails=false
      await page.getByRole('button',{name:'Retry questions'}).click()
      await page.getByLabel('Grading',{exact:true}).waitFor()
      await page.getByRole('combobox',{name:'Course',exact:true}).fill('TEST');await page.clock.fastForward(300)
      await page.getByRole('option',{name:/TEST 001/}).click()
      await page.getByRole('combobox',{name:'Professor',exact:true}).fill('Alex');await page.clock.fastForward(300)
      await page.getByRole('option',{name:'Alex Fixture'}).click()
      await page.getByLabel('Quality',{exact:true}).selectOption('4');await page.getByLabel('Difficulty',{exact:true}).selectOption('3')
      await page.getByRole('button',{name:'Check your review'}).click()
      await page.getByRole('button',{name:'Submit test review'}).click()
      await page.getByRole('alert').filter({hasText:'Do not submit again'}).waitFor()
      assert.equal(await page.getByRole('button',{name:'Check Supabase before retrying',exact:true}).isEnabled(),false)
      assert.equal(fixture.state.calls.filter(x=>x.url.includes('/rpc/')).length,1)
      await context.close()
      fixture=reviewFixture();fixture.env.REVIEWS_ENABLED='false'
      const disabled=await browser.newPage();await disabled.goto(origin+'/reviews/')
      await disabled.getByRole('heading',{name:'Review testing is not open yet.'}).waitFor()
      assert.equal(fixture.state.calls.length,0);await disabled.close()
    } finally {await browser.close()}
  }
  console.log(JSON.stringify({fixtureOnly:true,realEmailDelivery:false,reports},null,2))
} finally {await new Promise<void>(r=>server.close(()=>r()))}
