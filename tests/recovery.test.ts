import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/engine.ts';
import { runRole } from '../src/agents.ts';
import { inquiry } from './helpers.ts';
test('corrected data creates a linked mission and preserves failed evidence',async()=>{
 const e=new Engine(':memory:',async i=>runRole(i));try{
  let parent=e.create('demo','broken-data',inquiry('missing_cost'));
  for(let i=0;i<5 && parent.state!=='BLOCKED';i++)parent=await e.step('demo',parent.id);
  assert.equal(parent.state,'BLOCKED');const q=inquiry();
  let next=e.revise('demo',parent.id,'correct-data',q);
  assert.equal(e.revise('demo',parent.id,'correct-data',q).id,next.id);
  for(let i=0;i<5;i++)next=await e.step('demo',next.id);
  assert.equal(next.state,'APPROVAL_READY');assert.equal(e.get('demo',parent.id).state,'BLOCKED');
  assert(next.events.some(x=>x.payload.type==='mission.revised_from'&&x.payload.parentMissionId===parent.id));
 }finally{e.close();}
});
test('tampered input snapshots are rejected by integrity checks',async()=>{
 const e=new Engine(':memory:',async i=>runRole(i));try{
  const m=e.create('demo','tamper-snapshot',inquiry());
  const changed={...m.snapshot,capacity:999};e.db.prepare('UPDATE missions SET snapshot=? WHERE id=?').run(JSON.stringify(changed),m.id);
  assert.equal(e.get('demo',m.id).auditValid,false);await assert.rejects(e.step('demo',m.id),/AUDIT_INTEGRITY_FAILED/);
 }finally{e.close();}
});
test('tampered completed result or proposal cannot pass review',async()=>{
 for(const target of ['result','proposal']) {
  const e=new Engine(':memory:',async i=>runRole(i));try{
   let m=e.create('demo',`tamper-${target}`,inquiry());for(let i=0;i<5;i++)m=await e.step('demo',m.id);
   if(target==='result')e.db.prepare("UPDATE tasks SET output='{}' WHERE mission_id=? AND role='Sales'").run(m.id);
   else e.db.prepare("UPDATE missions SET proposal='{}' WHERE id=?").run(m.id);
   assert.equal(e.get('demo',m.id).auditValid,false);assert.throws(()=>e.review('demo',m.id,m.proposalHash),/REVIEW_GATE_REJECTED/);
  }finally{e.close();}
 }
});
