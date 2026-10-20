import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startServer } from '../src/server.ts';
import { inquiry } from './helpers.ts';
test('HTTP journey, origin protection, external action rejection and evidence retrieval',async()=>{
 const {server,engine}=startServer({port:0,dbPath:':memory:'});await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{
  assert.equal((await fetch(base+'/api/missions')).status,401);
  const page=await fetch(base);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy')!,/frame-ancestors 'none'/);
  const cookie=page.headers.get('set-cookie')!.split(';')[0];const headers={'Content-Type':'application/json',Origin:base,Cookie:cookie,'Idempotency-Key':'http-journey'};
  assert.equal((await fetch(base+'/api/missions',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},body:JSON.stringify(inquiry())})).status,403);
  const rejected=await fetch(base+'/api/missions',{method:'POST',headers,body:JSON.stringify({...inquiry(),email:'secret@example.com'})});assert.equal(rejected.status,400);assert(!String(await rejected.text()).includes('secret@example.com'));
  const created=await fetch(base+'/api/missions',{method:'POST',headers,body:JSON.stringify(inquiry())});assert.equal(created.status,201);let m=await created.json();
  for(let i=0;i<60 && ['QUEUED','RUNNING'].includes(m.state);i++){await new Promise(r=>setTimeout(r,150));m=await(await fetch(base+`/api/missions/${m.id}`,{headers:{Cookie:cookie}})).json();}
  assert.equal(m.state,'APPROVAL_READY');assert(m.auditValid);assert.equal(m.tasks.filter((t:any)=>t.state==='DONE').length,5);
  assert.equal((await fetch(base+`/api/missions/${m.id}/review`,{method:'POST',headers,body:JSON.stringify({proposalHash:m.proposalHash,confirm:'true'})})).status,400);
  const review=await fetch(base+`/api/missions/${m.id}/review`,{method:'POST',headers,body:JSON.stringify({proposalHash:m.proposalHash,confirm:true})});assert.equal(review.status,200);assert.equal((await review.json()).state,'REVIEWED_LOCAL');
  assert.equal((await fetch(base+m.events[0].evidenceUrl,{headers:{Cookie:cookie}})).status,200);
  const archive=await(await fetch(base+'/api/acceptance',{headers:{Cookie:cookie}})).json();assert.equal(archive.results.length,7);
  for(const r of archive.results)assert.equal((await fetch(base+r.artifactUrl,{headers:{Cookie:cookie}})).status,200);
  assert.equal((await fetch(base+'/api/send',{method:'POST',headers,body:'{}'})).status,403);
  assert.equal((await fetch(base+'/src/engine.ts',{headers:{Cookie:cookie}})).status,404);
  for(const path of ['/api/acceptance/%2e%2e%2fpackage.json','/api/acceptance/normal%00','/api/acceptance/constructor','/api/acceptance/normal/extra']){
    const response=await fetch(base+path,{headers:{Cookie:cookie}});assert.equal(response.status,404);assert(!String(await response.text()).includes('dependencies'));
  }
  const hostile='/api/acceptance/'+encodeURIComponent('<script>alert(1)</script>');
  const safeError=await fetch(base+hostile,{headers:{Cookie:cookie}});
  assert.equal(safeError.status,404);assert.equal(safeError.headers.get('content-type'),'application/json; charset=utf-8');
  assert.equal(safeError.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(await safeError.json(),{error:'ROUTE_NOT_FOUND'});
 }finally{server.close();await once(server,'close');engine.close();}
});
test('request bursts are throttled before expensive handlers',async()=>{
 const {server,engine}=startServer({port:0,dbPath:':memory:'});await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 try{for(let i=0;i<300;i++)assert.equal((await fetch(base+'/health')).status,200);
 const blocked=await fetch(base+'/health');assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'60');assert.equal((await blocked.json()).error,'RATE_LIMITED');}
 finally{server.close();await once(server,'close');engine.close();}
});
