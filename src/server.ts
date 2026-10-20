import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Engine, DomainError } from './engine.ts';
import { ReviewRequest } from './contracts.ts';
import { identities } from './agents.ts';
import { LiveAI } from './live-ai.ts';

export function startServer(options: { port?: number; dbPath?: string; ai?:ConstructorParameters<typeof LiveAI>[1] } = {}) {
  const port = options.port ?? 3419;
  const dbPath = options.dbPath ?? resolve('.data/operations.sqlite');
  if (!options.dbPath) mkdirSync('.data', { recursive: true, mode: 0o700 });
  const engine = new Engine(dbPath);
  const liveAI = new LiveAI(engine,options.ai);
  const sessions = new Set<string>();
  let running = false;
  const runPending = async () => {
    if (running) return; running = true;
    try { for (const m of engine.recoverable()) await engine.step(m.tenant, m.id); }
    finally { running = false; }
  };
  const interval = setInterval(() => { void runPending().catch(() => {}); }, 250);
  const indexBody=readFileSync(new URL('../public/index.html',import.meta.url));
  const scriptBody=readFileSync(new URL('../public/app.js',import.meta.url));
  const styleBody=readFileSync(new URL('../public/style.css',import.meta.url));
  // Fixed, local sponsor assets only. No caller-selected filesystem paths or remote fetches.
  const media=new Map<string,{body:Buffer,mime:string}>();
  for(const role of ['operations','sales','kitchen','finance','quality']){
    for(const [extension,mime] of [['jpg','image/jpeg'],['webm','video/webm']]){
      const name=`${role}.${extension}`,file=new URL(`../public/media/${name}`,import.meta.url);
      if(existsSync(file))media.set(`/media/${name}`,{body:readFileSync(file),mime});
    }
  }
  const acceptanceReport=JSON.parse(readFileSync(fileURLToPath(new URL('../evidence/acceptance-report.json',import.meta.url)),'utf8'));
  const acceptancePackets=new Map([
    ['/api/acceptance/normal',JSON.parse(readFileSync(new URL('../evidence/mission-normal.json',import.meta.url),'utf8'))],
    ['/api/acceptance/shortage',JSON.parse(readFileSync(new URL('../evidence/mission-shortage.json',import.meta.url),'utf8'))],
    ['/api/acceptance/capacity',JSON.parse(readFileSync(new URL('../evidence/mission-capacity.json',import.meta.url),'utf8'))],
    ['/api/acceptance/stale',JSON.parse(readFileSync(new URL('../evidence/mission-stale.json',import.meta.url),'utf8'))],
    ['/api/acceptance/transient',JSON.parse(readFileSync(new URL('../evidence/mission-transient.json',import.meta.url),'utf8'))],
    ['/api/acceptance/timeout',JSON.parse(readFileSync(new URL('../evidence/mission-timeout.json',import.meta.url),'utf8'))],
    ['/api/acceptance/missing_cost',JSON.parse(readFileSync(new URL('../evidence/mission-missing_cost.json',import.meta.url),'utf8'))],
  ]);
  let requestWindow=Date.now(),requestCount=0;
  const server = createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${(server.address() as any)?.port ?? port}`;
    const host = req.headers.host;
    if (host !== new URL(origin).host && host !== `localhost:${(server.address() as any)?.port ?? port}`) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
    const send = (status: number, body: unknown) => {
      const json=JSON.stringify(body).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.writeHead(status);res.end(json);
    };
    try {
      if(Date.now()-requestWindow>=60000){requestWindow=Date.now();requestCount=0;}
      if(++requestCount>300){res.setHeader('Retry-After','60');send(429,{error:'RATE_LIMITED'});return;}
      const path = new URL(req.url ?? '/', origin).pathname;
      if (req.method === 'GET') {
        if(path==='/'){
          const session = randomBytes(32).toString('hex'); if (sessions.size > 100) sessions.clear(); sessions.add(session);
          res.setHeader('Set-Cookie', `ops_session=${session}; HttpOnly; SameSite=Strict; Path=/`);
          res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(indexBody);return;
        }
        if(path==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(scriptBody);return;}
        if(path==='/style.css'){res.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});res.end(styleBody);return;}
        if(media.has(path)){const asset=media.get(path)!;res.writeHead(200,{'Content-Type':asset.mime});res.end(asset.body);return;}
      }
      if (req.method === 'GET' && path === '/health') { send(200, { status: 'ok', scope: 'loopback-development' }); return; }
      const cookie = /(?:^|; )ops_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
      if (!cookie || ![...sessions].some(s => timingSafeEqual(Buffer.from(s), Buffer.from(cookie)))) throw new DomainError('LOCAL_SESSION_REQUIRED', 401);
      // No caller-selected tenant. This is deliberately a single synthetic tenant, not production auth.
      const tenant = 'representative-demo';
      if (req.method === 'GET' && path === '/api/config') { send(200, { agents: identities.map(a=>({...a,portrait:media.has(`/media/${a.role.toLowerCase()}.jpg`)?`/media/${a.role.toLowerCase()}.jpg`:null,clip:media.has(`/media/${a.role.toLowerCase()}.webm`)?`/media/${a.role.toLowerCase()}.webm`:null})), mode: 'DETERMINISTIC_LOCAL', liveAiVerified: false, integrations: media.size?['MASKY_PRERECORDED_ASSETS']:[], submission: 'HOLD_RULES_UNVERIFIED', governingOs: '2.6', productionEnabled: false }); return; }
      if(req.method==='GET' && path==='/api/acceptance'){
        const report=acceptanceReport;
        send(200,{...report,results:report.results.map((r:RowLike)=>({...r,artifactUrl:`/api/acceptance/${r.scenario}`}))});return;
      }
      if(req.method==='GET' && acceptancePackets.has(path)){send(200,acceptancePackets.get(path));return;}
      if (req.method === 'GET' && path === '/api/missions') { send(200, engine.list(tenant)); return; }
      if(req.method==='GET' && path==='/api/live-ai'){send(200,liveAI.status());return;}
      const liveMatch=/^\/api\/missions\/([a-f0-9-]{36})\/live-ai$/.exec(path);
      if(req.method==='GET' && liveMatch){send(200,liveAI.get(tenant,liveMatch[1]));return;}
      const match = /^\/api\/missions\/([a-f0-9-]{36})(?:\/events\/(\d+))?$/.exec(path);
      if (req.method === 'GET' && match) {
        const mission = engine.get(tenant, match[1]);
        if (match[2]) { const event = mission.events.find(e => e.seq === Number(match[2])); if (!event) throw new DomainError('EVENT_NOT_FOUND', 404); send(200, event); }
        else send(200, mission); return;
      }
      if (req.method !== 'POST') throw new DomainError('ROUTE_NOT_FOUND', 404);
      if (req.headers.origin !== origin && req.headers.origin !== origin.replace('127.0.0.1', 'localhost')) throw new DomainError('ORIGIN_REJECTED', 403);
      if (req.headers['content-type'] !== 'application/json') throw new DomainError('JSON_REQUIRED', 415);
      let body = ''; for await (const b of req) { body += b; if (body.length > 16000) throw new DomainError('BODY_TOO_LARGE', 413); }
      let input; try { input = JSON.parse(body); } catch { throw new DomainError('INVALID_JSON'); }
      if(liveMatch){
        if(JSON.stringify(input)!==JSON.stringify({confirm:true}))throw new DomainError('LIVE_AI_CONFIRMATION_REQUIRED',409);
        const status=liveAI.status();if(!status.configured)throw new DomainError('OPENAI_KEY_MISSING',409);if(!status.approved)throw new DomainError('LIVE_AI_APPROVAL_REQUIRED',409);
        const mission=engine.get(tenant,liveMatch[1]);if(!mission.auditValid || !mission.proposal || mission.tasks.some(t=>t.state!=='DONE') || Date.parse(mission.snapshot.expiresAt)<=Date.now())throw new DomainError('AI_MISSION_NOT_READY',409);
        const review=liveAI.get(tenant,liveMatch[1]);if(review.roles.some(r=>['RUNNING','UNCERTAIN'].includes(r.state)))throw new DomainError('AI_REVIEW_RUNNING_OR_UNCERTAIN',409);
        void liveAI.consult(tenant,liveMatch[1]).catch(()=>{});send(202,liveAI.get(tenant,liveMatch[1]));return;
      }
      if (path === '/api/missions') { const key = req.headers['idempotency-key']; if (typeof key !== 'string') throw new DomainError('IDEMPOTENCY_KEY_REQUIRED'); send(201, engine.create(tenant, key, input)); return; }
      const revision = /^\/api\/missions\/([a-f0-9-]{36})\/revise$/.exec(path);
      if (revision) { const key=req.headers['idempotency-key'];if(typeof key!=='string')throw new DomainError('IDEMPOTENCY_KEY_REQUIRED');send(201,engine.revise(tenant,revision[1],key,input));return; }
      const review = /^\/api\/missions\/([a-f0-9-]{36})\/review$/.exec(path);
      if (review) { const data = ReviewRequest.parse(input); send(200, engine.review(tenant, review[1], data.proposalHash)); return; }
      // There is intentionally no send, reserve, purchase, deploy, or submit endpoint.
      throw new DomainError('EXTERNAL_ACTION_DISABLED', 403);
    } catch (e) { send(e instanceof DomainError ? e.status : 400, { error: e instanceof DomainError ? e.message : 'VALIDATION_FAILED' }); }
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000; server.maxConnections = 25;
  server.listen(port, '127.0.0.1');
  server.on('close', () => { clearInterval(interval); });
  return { server, engine };
}
type RowLike = Record<string, any>;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = startServer({ port: Number(process.env.OPS_PORT ?? 3419) });
  server.on('listening', () => console.log(`AIZOYA local development demo: http://127.0.0.1:${(server.address() as any).port}\nRepresentative data · deterministic workers · live AI unverified · external actions disabled`));
}
