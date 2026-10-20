import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const a=load('evidence/acceptance-report.json'),c=load('evidence/checks-report.json'),b=load('evidence/browser-report.json');
const tap=readFileSync('evidence/tests.tap','utf8');
const tests=/# tests (\d+)/.exec(tap)?.[1],passes=/# pass (\d+)/.exec(tap)?.[1],fails=/# fail (\d+)/.exec(tap)?.[1];
const lines=[
 '# Verification report — AIZOYA restaurant operations alpha',
 '',`Generated ${new Date().toISOString()}. Source and evidence are a local development candidate.`,
 '', '**Release: HOLD. Event submission: HOLD. Independent review: REVIEW_REQUIRED.**',
 '', '## What was actually exercised',
 '', 'Browser inquiry → strict API validation → SQLite mission and task ledger → five constrained deterministic subprocess workers → checked proposal → local review → saved readback and evidence links.',
 '', `Node tests: ${passes}/${tests} pass; ${fails} fail. Browser acceptance checks: ${b.results.filter(r=>r.passed).length}/${b.results.length} pass; page errors: ${b.errors.length}.`,
 '', '| Check | Result | Evidence |','|---|---|---|',
 ...c.results.map(r=>`| ${r.name} | ${r.passed?'PASS':'HOLD / NONZERO'}${r.exitCode===undefined?'':` (exit ${r.exitCode})`} | ${r.evidence?`[${r.evidence}](../evidence/${r.evidence})`:r.scope} |`),
 '', 'The overall check command deliberately exits nonzero because dependency audit is not clean. This is not represented as a fully passing release.',
 '', '## Seven measured local scenarios',
 '', '| Scenario | Outcome | Elapsed ms | Tool failures | Packet |','|---|---|---:|---:|---|',
 ...a.results.map(r=>`| ${r.scenario} | ${r.state} | ${r.durationMs.toFixed(1)} | ${r.failedAttempts} | [packet](../evidence/${r.evidenceFile}) |`),
 '', 'All seven mission audit chains validated at capture. Tool failures are deliberately injected representative scenarios; no real inventory provider failed. Timeout children are killed and attempts stop at three. Missing costs block without a fabricated quote.',
 '', '## Browser acceptance',
 '', ...b.results.map(r=>`- ${r.name}: ${r.passed?'PASS':'FAIL'}${r.durationMs?`; ${r.durationMs.toFixed(1)}ms from navigation to proposal review availability`:''}.`),
 '', 'Desktop viewport 1440×1100; mobile viewport 390×844; no mobile horizontal overflow. Physical iPhone/Safari, accessibility audit and live provider latency are not verified. Screenshots were inspected internally; not included as deliverables.',
 '', '## Behavior/security coverage',
 '', 'Strict types and extra-field rejection; integer-cent margin arithmetic; all five roles; idempotency; shortages; capacity; stale snapshots; allergens/cross-contact; budget; lead time; missing costs; tenant isolation; exact-hash review; expiry; restart; concurrent step/lease recovery; invalid outputs; event/input/output/proposal tampering; transient failures; hard timeout; origin/session checks; no source-file exposure; no external action routes; corrected-data lineage; privacy-safe error responses; seven archived packet endpoints.',
 '', 'The source scanner is a limited heuristic. No Snyk, Prelint, penetration test or formal security certification is claimed. Node 24 permission mode does not enforce network isolation; authored workers expose no outbound tools.',
 '', '## Business and integration truth',
 '', `Real customers: ${a.measuredBusinessOutcomes.realCustomers}. Realized revenue: $0. Manual baseline, time saved, conversion and willingness to pay: unknown.`,
 '', 'No live AI or sponsor calls were made. No customer commitments, production changes, public deployment, remote repository creation or competition submission occurred. The local deterministic product is functional; the five eve AI definitions compile but remain disconnected from the durable dashboard path.',
 '', '## Known release blockers',
 '', '- Four moderate dependency audit entries remain around an unpatched sprintf-js chain. The high undici finding was patched; final audit has zero high/critical entries.',
 '- Development model connection/budget, tested sponsor integration and live five-agent execution are missing.',
 '- Production identity, tenant database, cross-booking stock/capacity, protected-data handling and backup restoration are not implemented or certified.',
 '- Organizer prebuilding/existing-assets/IP/submission rules and exact scoring/eligibility remain unverified.',
 '- Independent OS 2.6 challenge has not occurred. Product Quality checks are not an independent model review.',
 '', '## Evidence validity',
 '', 'Timing measures this environment and these inputs only; not customer time savings or a performance guarantee. Audit chains detect record changes relative to stored hashes, not a malicious database administrator who rewrites both. Links inside archived packets refer to their original live mission; use the archive packet links above or `/api/acceptance` for saved evidence.',
 '', 'See source-manifest.json for final authored-file digests. Governance validator results are declaration-only, not runtime certification or execution authority.',
 ];
writeFileSync('docs/TEST_REPORT.md',lines.join('\n')+'\n');
const files=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);e.isDirectory()?walk(p):files.push(p);}}
for(const dir of ['src','agent','public','tests','scripts','docs','.aizoya','.github'])walk(dir);
files.push('package.json','package-lock.json','tsconfig.json','README.md','AGENTS.md','.gitignore');
const manifest=files.sort().map(file=>({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}));
writeFileSync('evidence/source-manifest.json',JSON.stringify({generatedAt:new Date().toISOString(),files:manifest},null,2));
console.log(JSON.stringify({tests,passes,fails,browserChecks:b.results.length,scenarioRuns:a.results.length,sourceFiles:manifest.length,release:'HOLD'}));
