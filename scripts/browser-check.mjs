import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync, chmodSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { once } from 'node:events';
import { startServer } from '../src/server.ts';
import serverChromium from '@sparticuz/chromium';
const moduleRoot=process.env.PLAYWRIGHT_MODULE_ROOT??process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if(!moduleRoot)throw Error('Set PLAYWRIGHT_MODULE_ROOT to the directory containing the playwright package.');
const require = createRequire(moduleRoot + '/package.json');
const { chromium } = require('playwright');
mkdirSync('.browser-temp',{recursive:true});
// Extract only the trusted package's executable. The generic tar helper attempts
// ownership changes unsupported by this workspace. No dependency source is patched.
writeFileSync('.browser-temp/chromium',brotliDecompressSync(readFileSync('node_modules/@sparticuz/chromium/bin/chromium.br')));
chmodSync('.browser-temp/chromium',0o700);
const browser = await chromium.launch({executablePath:process.cwd()+'/.browser-temp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
mkdirSync('evidence',{recursive:true});
const errors=[]; const results=[];
const {server,engine}=startServer({port:0,dbPath:':memory:'});
await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));
 const start=performance.now();await page.goto(base);
 await page.evaluate(()=>{window.__spoken=[];window.__cancelCount=0;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){window.__cancelCount++;},getVoices(){return [{lang:'en-US',name:'Test voice'}];},speak(u){window.__spoken.push(u.text);}}});});
 await page.getByRole('button',{name:'Build my proposal'}).click();
 await page.getByRole('button',{name:'Record local proposal review'}).waitFor({timeout:20000});
 const readyMs=performance.now()-start;
 const proposalText=await page.locator('#result').innerText();
 if(!proposalText.includes('Kitchen capacity: 150 servings') || !proposalText.includes('Unresolved:') || !proposalText.includes('Evidence: 5/5 assessments saved'))throw Error('Decision does not combine feasibility, evidence and unresolved review');
 if(await page.getByRole('button',{name:/^Watch /}).count())throw Error('Recorded recovery clips exposed for unrelated normal mission');
 await page.getByText('Assumptions and human checks',{exact:true}).click();
 await page.evaluate(()=>{window.__disclosure=document.querySelector('#result details.assumptions');});
 await page.waitForTimeout(2800);
 if(!(await page.locator('#result details.assumptions').evaluate(n=>n.open)) || !(await page.evaluate(()=>window.__disclosure===document.querySelector('#result details.assumptions'))))throw Error('Polling replaced or closed an unchanged disclosure');
 results.push({name:'assumptions disclosure remains open and retains its DOM node across polling',passed:true});
 await page.getByRole('button',{name:'Hear Finance',exact:true}).click();
 if(!(await page.locator('#voice-transcript').innerText()).includes('$836.79'))throw Error('Voice transcript does not reflect measured proposal');
 const spoken=await page.evaluate(()=>window.__spoken);if(spoken.length!==1 || !spoken[0].includes('$836.79'))throw Error('Opt-in speech was not invoked correctly');
 await page.getByRole('button',{name:'Stop voice',exact:true}).click();
 if(await page.evaluate(()=>window.__cancelCount)<2)throw Error('Stop voice did not cancel');
 results.push({name:'opt-in voice uses proposal facts and stop control (mocked speech; audio quality untested)',passed:true});
 if(!proposalText.includes('$836.79')||!proposalText.includes('$251.04'))throw Error('Unexpected financial result');
 await page.screenshot({path:'evidence/desktop-proposal.png',fullPage:true});
 await page.getByRole('button',{name:'Record local proposal review'}).click();
 await page.getByText('Review recorded. No commitment sent.').waitFor();
 await page.reload();await page.getByText('Review recorded. No commitment sent.').waitFor();
 const evidence=page.locator('.event a').first();const response=await page.request.get(new URL(await evidence.getAttribute('href'),base).href);if(response.status()!==200)throw Error('Evidence link failed');
 results.push({name:'desktop inquiry→five role workers→review→reload→evidence link',passed:true,durationMs:readyMs});
 const parentId=(await page.locator('#mission-label').innerText()).split(' ')[1];
 await page.getByRole('button',{name:'Revise this request',exact:true}).click();
 await page.locator('[name=guests]').fill('65');
 await page.getByRole('button',{name:'Rebuild revised proposal'}).click();
 await page.getByRole('button',{name:'Record local proposal review'}).waitFor({timeout:20000});
 const revisionId=(await page.locator('#mission-label').innerText()).split(' ')[1];
 if(parentId===revisionId)throw Error('Revision overwrote original mission');
 const revision=await(await page.request.get(base+`/api/missions/${revisionId}`)).json();
 if(revision.inquiry.guests!==65 || revision.review!==null || !revision.auditValid || !revision.events.some(e=>e.payload.type==='mission.revised_from' && e.payload.parentMissionId===parentId))throw Error('Revision lineage or independent review failed');
 const parent=await(await page.request.get(base+`/api/missions/${parentId}`)).json();
 if(parent.state!=='REVIEWED_LOCAL'||parent.inquiry.guests!==50)throw Error('Revision changed parent');
 results.push({name:'browser revision changes guests, preserves parent and requires a new review',passed:true});
 await page.getByText('Test a disruption',{exact:true}).click();
 await page.locator('[name=scenario]').selectOption('shortage');await page.locator('[name=guests]').fill('50');await page.getByRole('button',{name:'Build my proposal'}).click();
 await page.getByText('INVENTORY SHORTAGE',{exact:true}).waitFor({timeout:20000});
 if(await page.getByRole('button',{name:'Record local proposal review'}).count())throw Error('Review exposed for blocked proposal');
 if(await page.getByRole('button',{name:'Preview customer draft',exact:true}).count())throw Error('Customer draft exposed for blocked proposal');
 results.push({name:'shortage blocks review in browser',passed:true});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByText('INVENTORY SHORTAGE',{exact:true}).waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile horizontal overflow');
 await page.screenshot({path:'evidence/mobile-proposal.png',fullPage:true});
 results.push({name:'390px mobile rendering and persisted mission',passed:true,horizontalOverflow:overflow});
 const blockedId=(await page.locator('#mission-label').innerText()).split(' ')[1];
 await page.getByRole('button',{name:'Draft revision for 11 guests',exact:true}).click();
 if(await page.locator('[name=guests]').getAttribute('max')!=='500')throw Error('Unexpected intake limits');
 await page.getByRole('button',{name:'Rebuild revised proposal'}).click();
 await page.getByRole('button',{name:'Record local proposal review'}).waitFor({timeout:20000});
 const recoveredId=(await page.locator('#mission-label').innerText()).split(' ')[1];
 const recovered=await(await page.request.get(base+`/api/missions/${recoveredId}`)).json();
 await page.getByRole('button',{name:'Preview customer draft',exact:true}).click();
 const draftText=await page.locator('.customer-draft pre').innerText();
 if(!draftText.includes('Guests: 11') || !draftText.includes('$239.26') || draftText.includes('$167.48') || draftText.includes('$71.78') || !draftText.includes('Not a confirmed offer'))throw Error('Customer draft missing terms or disclosing internal finances');
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download customer draft',exact:true}).click();const draftDownload=await downloadEvent;
 if(!draftDownload.suggestedFilename().startsWith('catering-draft-'))throw Error('Draft export failed');
 const changed=await page.locator('.recovery-comparison').innerText();if(!changed.includes('50') || !changed.includes('11') || !changed.includes('Blocked') || !changed.includes('Passed'))throw Error('Original/revision comparison missing');
 results.push({name:'blocked order cannot draft; recovered customer draft excludes internal cost/margin and exports with terms',passed:true});
 if((await page.locator('#voice-transcript').innerText()).includes('$836.79'))throw Error('Previous mission voice transcript carried into recovered proposal');
 if(recovered.inquiry.guests!==11 || recovered.inquiry.scenario!=='shortage' || recovered.review!==null || !recovered.events.some(e=>e.payload.parentMissionId===blockedId))throw Error('Recovery did not preserve constraints and lineage');
 const mediaConfig=await(await page.request.get(base+'/api/config')).json();
 const availableClips=mediaConfig.agents.filter(a=>a.clip);
 for(const a of mediaConfig.agents){if(a.portrait){const image=await page.request.get(base+a.portrait);if(image.status()!==200 || image.headers()['content-type']!=='image/jpeg')throw Error('Portrait not served as JPEG');}}
 if(availableClips.length){
  if(await page.getByRole('button',{name:/^Watch /}).count()!==availableClips.length)throw Error('Matching recovery clips missing');
  const role=availableClips[0].role;
  for(const a of availableClips){const response=await page.request.get(base+a.clip);if(response.status()!==200 || response.headers()['content-type']!=='video/webm')throw Error('Clip not served as WebM');}
  await page.getByRole('button',{name:`Watch ${role}`,exact:true}).click();
  if(!(await page.locator('#voice-transcript').innerText()).includes('prerecorded explanation'))throw Error('Clip presented as live');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=1);
  await page.getByRole('button',{name:'Stop voice',exact:true}).click();
  if(!(await page.locator('video').evaluate(n=>n.paused && n.hidden)))throw Error('Stop did not stop clip');
  results.push({name:'Masky local assets load; recordings gated to matching recovery; stop control works',passed:true,availableClips:availableClips.length});
  await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:'evidence/showcase-recovery.png',fullPage:true});await page.setViewportSize({width:390,height:844});
 }
 results.push({name:'stock-constrained guest recovery reruns checks without clearing shortage scenario',passed:true});
 await page.getByText('Test a disruption',{exact:true}).click();
 await page.locator('[name=scenario]').selectOption('normal');await page.locator('[name=budget]').fill('1');
 await page.getByRole('button',{name:'Build my proposal'}).click();
 await page.getByText('BUDGET BELOW REQUIRED PRICE',{exact:true}).waitFor({timeout:20000});
 const budgetButton=page.getByRole('button',{name:/Draft budget revision to/});await budgetButton.click();
 await page.getByRole('button',{name:'Rebuild revised proposal'}).click();
 await page.getByRole('button',{name:'Record local proposal review'}).waitFor({timeout:20000});
 results.push({name:'budget recovery proposes explicit new budget and requires independent review',passed:true});
 let mockCalls=0;
 const liveServer=startServer({port:0,dbPath:':memory:',ai:{key:()=> 'test-only',approved:()=>true,transport:async(_url,request)=>{mockCalls++;const body=JSON.parse(request.body);const output=body.tool_choice?[{type:'function_call',name:'read_role_assessment',call_id:`test_${mockCalls}`,arguments:'{}'}]:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Mock provider read the saved role evidence.',nextAction:'Operator must verify the proposal.'})}]}];return new Response(JSON.stringify({id:`mock_${mockCalls}`,status:'completed',model:'gpt-6-luna',service_tier:'priority',usage:{input_tokens:200,output_tokens:80},output}));}}});
 await once(liveServer.server,'listening');
 try{const livePage=await browser.newPage();livePage.on('pageerror',e=>errors.push(e.message));await livePage.goto(`http://127.0.0.1:${liveServer.server.address().port}`);await livePage.getByRole('button',{name:'Build my proposal'}).click();await livePage.getByRole('button',{name:'Record local proposal review'}).waitFor();await livePage.getByRole('button',{name:'Run five live AI reviews',exact:true}).click();await livePage.getByText('Quality · DONE',{exact:true}).waitFor({timeout:20000});if(mockCalls!==10)throw Error('AI browser flow did not execute ten bounded requests');if(await livePage.locator('.ai-response').count()!==5)throw Error('AI browser flow missing role results');await livePage.reload();await livePage.getByText('Quality · DONE',{exact:true}).waitFor();if(mockCalls!==10)throw Error('AI reload repeated provider calls');await livePage.close();results.push({name:'five-role AI browser flow, tool handoffs and reload persistence (mock provider; no live API verification)',passed:true});}
 finally{liveServer.server.close();await once(liveServer.server,'close');liveServer.engine.close();}
 const archive=await page.request.get(base+'/api/acceptance');const report=await archive.json();if(report.results.length!==7)throw Error('Acceptance archive missing scenarios');for(const r of report.results){const packet=await page.request.get(base+r.artifactUrl);if(packet.status()!==200)throw Error('Acceptance artifact missing');}
 results.push({name:'seven recorded acceptance packets reachable from authenticated dashboard',passed:true});
 const hostile='<img src=x onerror="window.__xssExecuted=true">';
 await page.route('**/api/missions',async route=>{
   const response=await route.fetch();const missions=await response.json();
   for(const mission of missions){if(mission.events[0])mission.events[0].payload.code=hostile;if(mission.proposal)mission.proposal.quality.blockers=[hostile];}
   await route.fulfill({response,json:missions});
 });
 await page.waitForFunction(value=>document.querySelector('#events')?.textContent?.includes(value),hostile);
 if(await page.locator('#events img').count() || await page.evaluate(()=>Boolean(window.__xssExecuted)))throw Error('Audit field parsed as executable HTML');
 if(!(await page.locator('#result').innerText()).includes('<img src=x onerror=') || await page.locator('#result img').count())throw Error('Blocker field parsed as HTML');
 const reflective=await page.request.get(base+'/api/acceptance/'+encodeURIComponent(hostile));
 if(reflective.status()!==404 || !(reflective.headers()['content-type']??'').startsWith('application/json') || (await reflective.text()).includes(hostile))throw Error('Unknown route reflected HTML');
 results.push({name:'hostile audit text stays literal and unknown API route does not reflect HTML',passed:true});
 if(errors.length)throw Error(errors.join(';'));
 writeFileSync('evidence/browser-report.json',JSON.stringify({at:new Date().toISOString(),browser:'Chromium headless',results,errors},null,2));
 console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();server.close();await once(server,'close');engine.close();}
