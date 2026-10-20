const $ = s => document.querySelector(s);
let current = null, config, lastMissions = [], requestKey = null, revisionParent = null;
let renderedFingerprint = null, speechGeneration = 0;
const expandedAssumptions = new Map();
const aiPanel=elPanel();let aiFingerprint='';
function elPanel(){const section=document.createElement('section');section.className='card live-ai';$('#team').closest('section').after(section);return section;}
function displayAdvice(text){
 return String(text)
  .replace(/\b(\d[\d,]*)[- ]cents?\b/gi,(_,n)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n.replaceAll(',',''))/100))
  .replace(/\b(\d[\d,]*)[- ]basis[- ]points?\b/gi,(_,n)=>`${Number(n.replaceAll(',',''))/100}%`)
  .replace(/\bnet profit\b|\bprofit\b/gi,m=>m.toLowerCase()==='net profit'?m:'contribution (not net profit)');
}
async function refreshAI(){
 const id=current;if(!id)return;const data=await api(`/api/missions/${id}/live-ai`);if(current!==id)return;
 const fp=JSON.stringify([id,data]);if(fp===aiFingerprint)return;aiFingerprint=fp;
 const s=data.status,busy=data.roles.some(r=>r.state==='RUNNING');aiPanel.replaceChildren(el('div','LIVE MODEL WORKSPACE','eyebrow'),el('h2','Five roles. Live evidence review.'));
 aiPanel.append(el('p',`${s.provider} · ${s.model} (${s.serviceTier}) · ${s.calls}/${s.maxCalls} requests · ${money(Math.round(s.reservedUsd*100))} reserved of ${money(Math.round(s.budgetUsd*100))}. Reservations are conservative limits, not invoiced charges.`,'fine'));
 const readiness=!s.configured?'OpenAI key missing in this server. Start with npm run live to enter your existing key privately.':!s.approved?'Live API use has not been approved. Restart with npm run live.':busy?'The specialists are reading their evidence and responding.':'Ready for a bounded live review. AI advice cannot change the checked proposal.';
 aiPanel.append(el('p',readiness));
 const run=el('button',busy?'Live review in progress…':'Run five live AI reviews');run.disabled=!data.eligible || !s.configured || !s.approved || busy || s.calls>=s.maxCalls || data.roles.length===5 && data.roles.every(r=>r.state==='DONE');
 run.onclick=async()=>{run.disabled=true;try{await api(`/api/missions/${id}/live-ai`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});aiFingerprint='';await refreshAI();}catch(e){$('#error').textContent=e.message;run.disabled=false;}};aiPanel.append(run);
 for(const role of config.agents){const result=data.roles.find(r=>r.role===role.role);if(!result)continue;const row=el('div','','ai-response');row.append(el('strong',`${role.role} · ${result.state}`));if(result.result){row.append(el('p',displayAdvice(result.result.summary)),el('p',`Suggested next action: ${displayAdvice(result.result.nextAction)}`));}if(result.error)row.append(el('p',result.error,'blocker'));aiPanel.append(row);}
 aiPanel.append(el('p','Live generated advice is advisory. Deterministic stock, budget, margin and human review gates remain authoritative. Masky Watch clips remain prerecorded.','fine'));
}
const clipPlayer=document.createElement('video');clipPlayer.controls=true;clipPlayer.playsInline=true;clipPlayer.hidden=true;clipPlayer.className='worker-clip';$('#voice-transcript').before(clipPlayer);
function stopMedia(){clipPlayer.pause();clipPlayer.hidden=true;clipPlayer.removeAttribute('src');}
function matchesRecordedRecovery(m){const parentId=m?.events.find(e=>e.payload.type==='mission.revised_from')?.payload.parentMissionId;const parent=lastMissions.find(x=>x.id===parentId);return m?.inquiry.guests===11 && m.inquiry.menu==='chicken' && m.inquiry.scenario==='shortage' && m.proposal?.quality.passed && m.proposal.financials.quoteCents===23926 && m.proposal.financials.marginBps===3000 && m.tasks.find(t=>t.role==='Kitchen')?.output?.requiredServings===12 && parent?.inquiry.guests===50 && parent.state==='BLOCKED' && parent.proposal?.quality.blockers.includes('INVENTORY_SHORTAGE') && Date.parse(m.snapshot.expiresAt)>Date.now();}
const recordedLines={Operations:'I coordinated the five checks. Stock blocked the fifty guest request. The eleven guest revision now needs human review.',Sales:'I checked the guest count and budget. Reducing guests changes the offer and needs customer agreement.',Kitchen:'Stock cannot cover fifty guests. Eleven guests need twelve servings including the buffer, so the revised order fits available stock.',Finance:'For eleven guests, the proposed price is two hundred thirty-nine dollars and twenty-six cents. Contribution margin is thirty percent, before tax.',Quality:'The revised checks passed. Allergens, handling and tax still need human review. No customer commitment was sent.'};
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
async function api(path, options) { const r = await fetch(path, options); const data = await r.json(); if (!r.ok) throw Error(data.error || 'REQUEST_FAILED'); return data; }
function roleBrief(role,m){
  const output=m?.tasks.find(t=>t.role===role)?.output;
  if(!output)return `${role}: My assessment is not available yet.`;
  switch(role){
    case 'Operations':return `Operations: I checked lead time for ${m.inquiry.guests} guests. ${output.leadTimeOk?'There is enough preparation time.':'Preparation time is too short; this request needs revision.'}`;
    case 'Sales':return `Sales: I checked demand: ${output.guests} guests and a ${money(output.budgetCents)} budget. Any change to the order needs customer agreement.`;
    case 'Kitchen':return `Kitchen: We need ${output.requiredServings} servings, including the buffer. ${output.shortage?`There is a shortage of ${output.shortage} servings.`:'The stock check passed.'} ${output.capacityOk?'Capacity is sufficient.':'Kitchen capacity is exceeded.'}`;
    case 'Finance':return `Finance: The estimated cost is ${money(output.costCents)}. The proposed price before tax is ${money(output.quoteCents)}. ${output.budgetOk?'This fits the customer budget.':'This exceeds the customer budget.'}`;
    case 'Quality':return `Quality: ${output.passed?'The automated checks passed. Human recipe, handling and tax review is still required.':`The proposal is blocked: ${output.blockers.map(b=>b.replaceAll('_',' ')).join(', ')}.`}`;
  }
}
function speakBrief(role,text){
  stopMedia();
  const generation=++speechGeneration;
  $('#voice-transcript').textContent=text;
  if(!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  const index=config.agents.findIndex(a=>a.role===role);
  const voices=window.speechSynthesis.getVoices().filter(v=>/^en(?:-|$)/i.test(v.lang));
  if(voices.length)utterance.voice=voices[index%voices.length];
  utterance.rate=[0.95,1.02,1,0.9,0.93][index]??1;
  utterance.onerror=event=>{if(generation!==speechGeneration || ['canceled','interrupted'].includes(event.error))return;$('#voice-transcript').textContent=`${text} Audio is unavailable; the transcript remains available.`;};
  window.speechSynthesis.speak(utterance);
}
$('#stop-voice').onclick=()=>{speechGeneration++;stopMedia();if('speechSynthesis' in window)window.speechSynthesis.cancel();};
function renderTeam(m) {
  $('#team').replaceChildren(...config.agents.map(a => {
    const t = m?.tasks.find(t => t.role === a.role); const n = el('div', '', `agent ${t?.state.toLowerCase() || ''}`);
    const avatar = el('div', a.initials, 'avatar'); avatar.style.backgroundColor = a.color;
    if(a.portrait){const image=el('img','');image.src=a.portrait;image.alt=`${a.role} fictional robot, created with Masky`;avatar.replaceChildren(image);}
    n.append(avatar, el('strong', a.role), el('small', t ? `${t.state} · ${t.attempt} attempt(s)` : a.character));
    if(t?.output){const brief=el('button',`Hear ${a.role}`,'secondary');brief.onclick=()=>speakBrief(a.role,roleBrief(a.role,m));n.append(brief);}
    if(a.clip && matchesRecordedRecovery(m)){const clip=el('button',`Watch ${a.role}`,'secondary');clip.onclick=()=>{speechGeneration++;if('speechSynthesis' in window)window.speechSynthesis.cancel();stopMedia();clipPlayer.src=a.clip;clipPlayer.hidden=false;$('#voice-transcript').textContent=`Masky · prerecorded explanation of this representative recovery: ${recordedLines[a.role]}`;clipPlayer.play().catch(()=>{$('#voice-transcript').textContent+=' Press play to hear the clip.';});};n.append(clip);}return n;
  }));
}
function customerDraft(m){
  const p=m.proposal;
  return ['CATERING PROPOSAL DRAFT','Representative data. Not a confirmed offer or reservation.',`Reference: ${m.id}`,`Guests: ${p.guests}`,`Menu: ${p.menu==='chicken'?'Chicken, rice & sides':'Vegetable, rice & sides'}`,`Service: ${new Date(p.serviceAt).toLocaleString()}`,`Proposed subtotal before tax: ${money(p.financials.quoteCents)}`,'Tax and gratuity excluded. Final total requires restaurant verification.','Subject to recipe, handling, allergen, availability and tax verification.','Any change to guest count or budget requires customer agreement.','No order, stock reservation, customer message, purchase or payment has been made.'].join('\n');
}
function saveText(filename,text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=el('a','');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function render(m) {
  // Polling must not replace unchanged controls, steal focus or close disclosures.
  // Freshness is included so recovery suggestions disappear when their evidence expires.
  const fingerprint=JSON.stringify([m,Date.parse(m.snapshot.expiresAt)>Date.now()]);
  if(fingerprint===renderedFingerprint)return;
  if(!matchesRecordedRecovery(m))stopMedia();
  if(current!==m.id){
    stopMedia();
    speechGeneration++;
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    $('#voice-transcript').textContent="Choose a role's Hear button after its assessment completes.";
  }
  renderedFingerprint=fingerprint;
  current = m.id; renderTeam(m); $('#state').textContent = m.state.replaceAll('_', ' ');
  $('#mission-label').textContent = `Mission ${m.id} · saved ${new Date(m.updatedAt).toLocaleTimeString()}`;
  $('#audit').textContent = m.auditValid ? 'Hash chain verified' : 'AUDIT FAILED';
  $('.notice').textContent=m.liveAiVerified?'Representative data · Deterministic checks + five completed live AI role reviews':'Representative data · Deterministic checks · Live AI role review available when configured';
  $('#metrics').replaceChildren(el('span', `${m.tasks.filter(t => t.state === 'DONE').length}/5 tasks complete`), el('span', `${m.tasks.reduce((n,t) => n + (t.duration_ms || 0),0).toFixed(0)} ms last attempts`), el('span', `${m.events.filter(e => e.payload.type === 'tool.failed').length} failed attempts`), el('span', `AI responses received: ${m.events.filter(e=>e.payload.type==='ai.response_received').length}`));
  $('#events').replaceChildren(...m.events.slice().reverse().map(e => {
    const n = el('div', '', 'event'); const title = document.createElement('div');
    title.textContent=`${e.payload.role} · ${e.payload.type}${e.payload.code ? ` · ${e.payload.code}` : ''}`;
    const link = el('a', 'Evidence ↗'); link.href = e.evidenceUrl; link.target = '_blank'; link.rel = 'noopener'; n.append(title, link); return n;
  }));
  const box = $('#result'); box.replaceChildren(el('div', '03 / THE DECISION', 'eyebrow'));
  if (m.proposal) {
    const p = m.proposal, f = p.financials;
    box.append(el('h2', m.state === 'REVIEWED_LOCAL' ? 'Review recorded. No commitment sent.' : p.quality.passed ? 'Ready for your review.' : 'Resolve these checks first.'));
    const numbers = el('div', '', 'numbers');
    for (const [label, value] of [['Proposed price · before tax',money(f.quoteCents)],['Estimated cost',money(f.costCents)],['Projected contribution',money(f.profitCents)]]) { const n = el('div', ''); n.append(el('small', label), el('strong', value)); numbers.append(n); }
    box.append(numbers, el('p', `${p.guests} guests · ${p.menu} menu · ${(f.marginBps/100).toFixed(2)}% contribution margin (not net profit).`));
    const kitchen=m.tasks.find(t=>t.role==='Kitchen')?.output;
    const checks=el('div','','proposal-checks');
    if(kitchen){checks.append(el('p',`Stock: ${kitchen.availableServings} servings available · ${kitchen.requiredServings} required, including 5% buffer.`),el('p',`Kitchen capacity: ${kitchen.capacity} servings · ${kitchen.capacityOk?'within capacity':'capacity exceeded'}.`));}
    checks.append(el('p',`Evidence: ${m.tasks.filter(t=>t.state==='DONE').length}/5 assessments saved · ${m.auditValid?'audit chain verified':'audit verification failed'}.`),el('p',`Unresolved: ${p.quality.blockers.length?`${p.quality.blockers.length} blocking check(s), listed below; `:''}human recipe, handling, allergens and tax verification.`));
    box.append(checks);
    const c=m.snapshot,direct=p.guests*(c.foodCostPerGuest+c.laborPerGuest+c.packagingPerGuest)+c.fixedDeliveryCost;
    if(c.foodCostPerGuest!==null && direct+Math.ceil(direct*c.overheadBps/10000)===f.costCents){
      const costs=el('details','','cost-breakdown');costs.append(el('summary','Inspect the estimated cost'));
      const table=el('table','','comparison');table.append(el('caption','Representative cost assumptions'));
      for(const [label,value] of [['Food',p.guests*c.foodCostPerGuest],['Labor',p.guests*c.laborPerGuest],['Packaging',p.guests*c.packagingPerGuest],['Delivery estimate',c.fixedDeliveryCost],['Overhead allocation',Math.ceil(direct*c.overheadBps/10000)],['Total estimated cost',f.costCents]]){const row=el('tr','');row.append(el('th',label),el('td',money(value)));table.append(row);}costs.append(table);box.append(costs);
    }
    if (p.quality.passed) box.append(el('div', 'Capacity, stock, budget and margin checks passed against representative inputs.', 'good'));
    for (const b of p.quality.blockers) {
      const blocker=document.createElement('div');blocker.className='blocker';
      blocker.textContent=b.replaceAll('_',' ');box.appendChild(blocker);
    }
    const details = el('details','','assumptions'); details.open=expandedAssumptions.get(m.id)??false;details.ontoggle=()=>expandedAssumptions.set(m.id,details.open);details.append(el('summary','Assumptions and human checks')); const ul=el('ul',''); for(const a of p.assumptions) ul.append(el('li',a)); details.append(ul); box.append(details);
    if (m.state === 'APPROVAL_READY') {
      const review = el('button', 'Record local proposal review'); review.id = 'review';
      review.onclick = async () => { review.disabled = true; try { render(await api(`/api/missions/${m.id}/review`,{ method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({proposalHash:m.proposalHash,confirm:true}) })); } catch(e) { $('#error').textContent=e.message; review.disabled=false; } }; box.append(review);
    }
    const download = el('button','Download evidence packet','secondary'); download.onclick = () => { const url=URL.createObjectURL(new Blob([JSON.stringify(m,null,2)],{type:'application/json'})); const a=el('a','');a.href=url;a.download=`mission-${m.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); };box.append(download);
    if(p.quality.passed && m.auditValid && Date.parse(m.snapshot.expiresAt)>Date.now()){
      const preview=el('button','Preview customer draft','secondary');
      preview.onclick=()=>{if(Date.parse(m.snapshot.expiresAt)<=Date.now()){preview.disabled=true;$('#error').textContent='Inventory evidence expired. Rebuild before preparing a draft.';return;}let draft=box.querySelector('.customer-draft');if(draft){draft.hidden=!draft.hidden;return;}draft=el('section','','customer-draft');draft.append(el('h3','Customer proposal draft'),el('p','Representative data. Restaurant verification and customer agreement required.','fine'));const content=el('pre',customerDraft(m));draft.append(content);const save=el('button','Download customer draft','secondary');save.onclick=()=>{if(Date.parse(m.snapshot.expiresAt)<=Date.now()){$('#error').textContent='Evidence expired. Rebuild before downloading a draft.';return;}saveText(`catering-draft-${m.id}.txt`,customerDraft(m));};draft.append(save);box.append(draft);};box.append(preview);
    }
  } else {
    box.append(el('h2',m.state === 'BLOCKED' ? 'Mission needs attention.' : 'Your team is checking the request.'));
    const failed=m.tasks.find(t=>t.error);box.append(el('p',failed ? `${failed.role}: ${failed.error}. No external action was taken.` : 'Results and evidence are saved after each specialist finishes.'));
  }
  const parentEvent=m.events.find(e=>e.payload.type==='mission.revised_from');
  if(parentEvent){
    const parent=lastMissions.find(x=>x.id===parentEvent.payload.parentMissionId);
    box.append(el('p',`Revision of mission ${parentEvent.payload.parentMissionId.slice(0,8)}. This proposal requires its own review.`, 'fine'));
    if(parent?.proposal && m.proposal){const comparison=el('section','','recovery-comparison');comparison.append(el('h3','What changed'));const table=el('table','','comparison');table.append(el('caption','Saved original and revised proposals'));const heading=el('tr','');heading.append(el('th',''),el('th','Original request'),el('th','Revised draft'));table.append(heading);for(const [label,before,after] of [['Guests',parent.inquiry.guests,m.inquiry.guests],['Price before tax',money(parent.proposal.financials.quoteCents),money(m.proposal.financials.quoteCents)],['Automated checks',parent.proposal.quality.passed?'Passed':'Blocked',m.proposal.quality.passed?'Passed':'Blocked']]){const row=el('tr','');row.append(el('th',label),el('td',String(before)),el('td',String(after)));table.append(row);}comparison.append(table,el('p','This alternative changes the requested order. Customer agreement remains outstanding.','fine'));box.append(comparison);}
  }
  if(['BLOCKED','APPROVAL_READY','REVIEWED_LOCAL'].includes(m.state) && m.auditValid){
    const revise=el('button','Revise this request','secondary');
    revise.onclick=()=>{
      revisionParent=m.id;requestKey=null;
      const form=$('#inquiry');
      for(const field of ['guests','menu','scenario']) form.elements.namedItem(field).value=m.inquiry[field];
      form.elements.namedItem('budget').value=(m.inquiry.budgetCents/100).toFixed(2);
      form.elements.namedItem('allergen').value=m.inquiry.allergens[0]??'';
      const service=new Date(m.inquiry.serviceAt);service.setMinutes(service.getMinutes()-service.getTimezoneOffset());
      form.elements.namedItem('serviceAt').value=service.toISOString().slice(0,16);
      $('#revision-context').textContent=`Revising mission ${m.id.slice(0,8)}. Update the request and rebuild to create linked evidence.`;
      $('#start').textContent='Rebuild revised proposal ↗';$('#cancel-revision').hidden=false;
      form.elements.namedItem('guests').focus();
    };box.append(revise);
    if(m.proposal && !m.proposal.quality.passed){
      const blockers=m.proposal.quality.blockers;
      const kitchen=m.tasks.find(t=>t.role==='Kitchen')?.output;
      const fresh=Date.parse(m.snapshot.expiresAt)>Date.now();
      if(fresh && kitchen && blockers.some(b=>['INVENTORY_SHORTAGE','CAPACITY_EXCEEDED'].includes(b))){
        const guestLimit=Math.floor(Math.min(kitchen.availableServings,kitchen.capacity)*100/105);
        if(guestLimit>=1 && guestLimit<m.inquiry.guests){
          box.append(el('p',`Current representative stock and capacity support at most ${guestLimit} guests with the 5% buffer. This changes the requested order; all checks must run again.`,'fine'));
          const reduce=el('button',`Draft revision for ${guestLimit} guests`,'secondary');
          reduce.onclick=()=>{revise.onclick();$('#inquiry').elements.namedItem('guests').value=guestLimit;};box.append(reduce);
        }
      }
      if(fresh && blockers.includes('BUDGET_BELOW_REQUIRED_PRICE')){
        const quote=m.proposal.financials.quoteCents;
        const budget=el('button',`Draft budget revision to ${money(quote)}`,'secondary');
        budget.onclick=()=>{revise.onclick();$('#inquiry').elements.namedItem('budget').value=(quote/100).toFixed(2);};box.append(budget);
        box.append(el('p','The customer must agree to any budget increase. Drafting a revision records no agreement.','fine'));
      }
    }
  }
}
async function refresh() {
  lastMissions=await api('/api/missions');$('#history').replaceChildren(...lastMissions.slice(0,8).map(m=>{ const b=el('button',`${m.inquiry.guests} guests · ${m.inquiry.menu}`);b.append(el('small',`${m.state.replaceAll('_',' ')} · ${m.id.slice(0,8)}`));b.onclick=()=>render(m);return b; }));
  if(current){ const m=lastMissions.find(x=>x.id===current);if(m)render(m);await refreshAI(); }
}
$('#inquiry').addEventListener('submit',async e=>{
  e.preventDefault();$('#error').textContent='';const form=new FormData(e.target);const button=$('#start');button.disabled=true;
  const input={guests:Number(form.get('guests')),menu:form.get('menu'),serviceAt:new Date(form.get('serviceAt')).toISOString(),budgetCents:Math.round(Number(form.get('budget'))*100),allergens:form.get('allergen')?[form.get('allergen')]:[],scenario:form.get('scenario')};
  // Preserve the same key and payload across an uncertain network retry.
  const body=JSON.stringify(input);if(!requestKey || requestKey.body!==body)requestKey={key:crypto.randomUUID(),body};
  const path=revisionParent?`/api/missions/${revisionParent}/revise`:'/api/missions';
  try{render(await api(path,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey.key},body}));resetRevision();await refresh();}catch(err){$('#error').textContent=err.message;}finally{button.disabled=false;}
});
function resetRevision(){revisionParent=null;requestKey=null;$('#revision-context').textContent='';$('#start').textContent='Build my proposal ↗';$('#cancel-revision').hidden=true;}
$('#cancel-revision').onclick=resetRevision;
const localDate=new Date(Date.now()+3*86400000);localDate.setMinutes(localDate.getMinutes()-localDate.getTimezoneOffset());$('[name=serviceAt]').value=localDate.toISOString().slice(0,16);
async function init(){config=await api('/api/config');renderTeam();await refresh();if(lastMissions[0]){render(lastMissions[0]);await refreshAI();}setInterval(()=>refresh().catch(()=>{$('#error').textContent='Connection interrupted. Saved missions remain available when the server returns.';}),1200);}init().catch(e=>$('#error').textContent=e.message);
