import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availabilityDeadline, openSeatTotal, staleSource } from '../packages/core/freshness'
import type { Section, SourceMeta } from '../packages/core/types'
test('availability expires within two minutes and honors shorter explicit deadlines',()=>{
  const source: SourceMeta={source:'pcc',retrievedAt:1000,stale:false}
  assert.equal(availabilityDeadline(source),121000)
  assert.equal(staleSource(source,121000),true)
  assert.equal(staleSource({...source,expiresAt:901000},121000),true)
  assert.equal(staleSource({...source,expiresAt:901000},901000),true)
  assert.equal(staleSource(source,999),true)
})
test('seat totals deduplicate co-instructors and never present unknown or stale seats as a complete sum',()=>{
  const s:Section={crn:'12345',title:'Fixture',start:'',end:'',formats:['OD'],meetings:[],status:'C',source:{source:'pcc',retrievedAt:1000,stale:false},details:{termPart:'',campus:'',units:'',seatsOpen:4}}
  assert.equal(openSeatTotal([s,s],2000),4)
  assert.equal(openSeatTotal([s,{...s,crn:'12346',details:undefined}],2000),undefined)
  assert.equal(openSeatTotal([s],121000),undefined)
  assert.equal(openSeatTotal([],2000),undefined)
})
