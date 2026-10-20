import { mkdirSync, writeFileSync } from 'node:fs';
import { Engine, hash } from '../src/engine.ts';
import { inquiry } from '../tests/helpers.ts';
mkdirSync('evidence', { recursive: true });
const e = new Engine(':memory:');
const results=[];
for (const scenario of ['normal','shortage','capacity','stale','transient','timeout','missing_cost']) {
  const start=performance.now();
  let m=e.create('representative-demo',`acceptance-${scenario.replaceAll('_','-')}`,inquiry(scenario));
  while(['QUEUED','RUNNING'].includes(m.state)) {
    m=await e.step('representative-demo',m.id);
    if (m.tasks.some(t=>t.next_at>Date.now())) await new Promise(r=>setTimeout(r,250));
  }
  const evidenceFile=`mission-${scenario}.json`;
  writeFileSync(`evidence/${evidenceFile}`,JSON.stringify(m,null,2));
  results.push({scenario,missionId:m.id,state:m.state,durationMs:performance.now()-start,
    failedAttempts:m.events.filter(ev=>ev.payload.type==='tool.failed').length,
    taskAttempts:m.tasks.map(t=>({role:t.role,attempts:t.attempt,error:t.error})),
    financials:m.proposal?.financials??null,blockers:m.proposal?.quality.blockers??[],
    auditValid:m.auditValid,evidenceFile,evidenceHash:hash(m),liveModelCalls:0,liveSponsorCalls:0});
}
const report={generatedAt:new Date().toISOString(),runtime:process.version,mode:'DETERMINISTIC_LOCAL',results,
  measuredBusinessOutcomes:{realCustomers:0,actualRevenueCents:0,conversionRate:null,manualBaselineMs:null,
    timeSavings:null,providerCostUsd:0,providerCostBasis:'No external model/provider calls made. Infrastructure cost not measured.'}};
writeFileSync('evidence/acceptance-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));e.close();
