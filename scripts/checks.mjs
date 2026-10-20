import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
mkdirSync('evidence',{recursive:true});
const results=[];
function check(name,args,file,allowed=[0]){
 const start=performance.now();const run=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024});
 writeFileSync(`evidence/${file}`,run.stdout+(file.endsWith('.json')?'':run.stderr));
 const r={name,exitCode:run.status,durationMs:performance.now()-start,passed:allowed.includes(run.status),evidence:file};results.push(r);return run;
}
check('TypeScript contracts',['node_modules/typescript/bin/tsc'],'typecheck.log');
check('Unit integration security acceptance',['--experimental-strip-types','--test','--test-reporter=tap','tests/engine.test.ts','tests/http.test.ts','tests/recovery.test.ts'],'tests.tap');
check('Five eve agents compile',['node_modules/eve/bin/eve.js','build'],'eve-build.log');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const audit=spawnSync(npm,['audit','--json'],{encoding:'utf8',maxBuffer:20*1024*1024});
writeFileSync('evidence/npm-audit.json',audit.stdout);
let counts=null;try{counts=JSON.parse(audit.stdout).metadata.vulnerabilities;}catch{}
results.push({name:'Dependency audit',exitCode:audit.status,passed:audit.status===0,vulnerabilityCounts:counts,evidence:'npm-audit.json'});
const sbom=spawnSync(npm,['sbom','--sbom-format=cyclonedx'],{encoding:'utf8',maxBuffer:30*1024*1024});
writeFileSync('evidence/sbom.json',sbom.stdout);results.push({name:'CycloneDX SBOM',exitCode:sbom.status,passed:sbom.status===0,evidence:'sbom.json'});
const sourceFiles=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else sourceFiles.push(p);}}
for(const dir of ['src','agent','public','tests','scripts','docs','.aizoya','.github'])walk(dir);
sourceFiles.push('package.json','package-lock.json','tsconfig.json','README.md','AGENTS.md','.gitignore');
const manifest=sourceFiles.sort().map(file=>({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}));
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/sk-[A-Za-z0-9]{24,}/,/gh[pousr]_[A-Za-z0-9]{30,}/];
const findings=[];for(const file of sourceFiles){const s=readFileSync(file,'utf8');if(patterns.some(p=>p.test(s)))findings.push({file,code:'POSSIBLE_EMBEDDED_CREDENTIAL'});}
const htmlSinks=readFileSync('public/app.js','utf8').match(/innerHTML|insertAdjacentHTML|eval\(/g)??[];
results.push({name:'Limited authored-source credential and HTML sink scan',passed:findings.length===0&&htmlSinks.length===0,findings,htmlSinks,scope:'Heuristic only; not Snyk, Prelint or full SAST'});
writeFileSync('evidence/source-manifest.json',JSON.stringify({generatedAt:new Date().toISOString(),files:manifest},null,2));
writeFileSync('evidence/checks-report.json',JSON.stringify({generatedAt:new Date().toISOString(),results,releaseState:'HOLD',independentReview:'REVIEW_REQUIRED'},null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
