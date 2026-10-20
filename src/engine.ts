import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Inquiry, Outputs, Proposal, QualityResult, Financials, representativeCatalog, type InquiryData, type RoleName, type WorkerData } from './contracts.ts';

export const roles: RoleName[] = ['Operations', 'Sales', 'Kitchen', 'Finance', 'Quality'];
export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Row = Record<string, any>;
export class DomainError extends Error { status: number; constructor(code: string, status = 400) { super(code); this.status = status; } }
export type Executor = (input: WorkerData, timeoutMs: number) => Promise<unknown>;

export const executeWorker: Executor = (input, timeoutMs) => new Promise((resolve, reject) => {
  const project = fileURLToPath(new URL('../', import.meta.url));
  const child = spawn(process.execPath, ['--permission', `--allow-fs-read=${project}src`, `--allow-fs-read=${project}node_modules`, `--allow-fs-read=${project}package.json`, '--experimental-strip-types', fileURLToPath(new URL('./worker.ts', import.meta.url))], {
    env: { PATH: process.env.PATH, NODE_NO_WARNINGS: '1' }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '', error = '', settled = false;
  const finish = (err?: Error, value?: unknown) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(value); };
  const timer = setTimeout(() => { child.kill('SIGKILL'); finish(new Error('TOOL_TIMEOUT')); }, timeoutMs);
  child.stdout.on('data', b => { output += b; if (output.length > 65536) { child.kill('SIGKILL'); finish(new Error('TOOL_OUTPUT_LIMIT')); } });
  child.stderr.on('data', b => { error = (error + b).slice(0, 128); });
  child.on('error', () => finish(new Error('WORKER_START_FAILED')));
  child.on('close', code => { if (code !== 0) return finish(new Error(['MISSING_COST', 'TRANSIENT_INVENTORY_UNAVAILABLE'].includes(error) ? error : 'TOOL_FAILED'));
    try { finish(undefined, JSON.parse(output)); } catch { finish(new Error('INVALID_TOOL_OUTPUT')); } });
  child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify(input));
});

export class Engine {
  db: DatabaseSync; execute: Executor; timeoutMs: number;
  constructor(path: string, execute: Executor = executeWorker, timeoutMs = 2000) {
    this.db = new DatabaseSync(path); this.execute = execute; this.timeoutMs = timeoutMs;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, idem TEXT NOT NULL, request_hash TEXT NOT NULL,
        inquiry TEXT NOT NULL, snapshot TEXT NOT NULL, assessed_at TEXT NOT NULL, state TEXT NOT NULL, proposal TEXT, proposal_hash TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(tenant, idem));
      CREATE TABLE IF NOT EXISTS tasks(mission_id TEXT NOT NULL REFERENCES missions(id), role TEXT NOT NULL, seq INTEGER NOT NULL,
        state TEXT NOT NULL DEFAULT 'PENDING', attempt INTEGER NOT NULL DEFAULT 0, lease_until INTEGER, lease_token TEXT,
        next_at INTEGER NOT NULL DEFAULT 0, output TEXT, duration_ms REAL, error TEXT, PRIMARY KEY(mission_id,role));
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, mission_id TEXT NOT NULL REFERENCES missions(id),
        payload TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reviews(mission_id TEXT PRIMARY KEY REFERENCES missions(id), proposal_hash TEXT NOT NULL,
        actor TEXT NOT NULL, reviewed_at TEXT NOT NULL, expires_at TEXT NOT NULL);
    `);
  }
  tx<T>(fn: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  event(id: string, role: string, type: string, detail: Record<string, unknown> = {}) {
    const last = this.db.prepare('SELECT hash FROM events WHERE mission_id=? ORDER BY seq DESC LIMIT 1').get(id) as Row | undefined;
    const payload = JSON.stringify({ missionId: id, role, type, at: new Date().toISOString(), ...detail });
    const previous = last?.hash ?? 'GENESIS';
    const digest = hash([previous, payload]);
    this.db.prepare('INSERT INTO events(mission_id,payload,previous_hash,hash) VALUES(?,?,?,?)').run(id, payload, previous, digest);
  }
  create(tenant: string, key: string, raw: unknown) {
    if (!/^[a-z0-9-]{1,60}$/.test(tenant) || !/^[a-zA-Z0-9-]{8,100}$/.test(key)) throw new DomainError('INVALID_IDENTITY');
    const q = Inquiry.parse(raw); const date = Date.parse(q.serviceAt);
    if (date < Date.now() || date > Date.now() + 365 * 86400_000) throw new DomainError('INVALID_SERVICE_DATE');
    return this.tx(() => {
      const existing = this.db.prepare('SELECT * FROM missions WHERE tenant=? AND idem=?').get(tenant, key) as Row | undefined;
      if (existing) { if (existing.request_hash !== hash(q)) throw new DomainError('IDEMPOTENCY_CONFLICT', 409); return this.get(tenant, existing.id); }
      const now = new Date().toISOString(), id = randomUUID(); const snapshot = representativeCatalog(q);
      this.db.prepare('INSERT INTO missions VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, tenant, key, hash(q), JSON.stringify(q), JSON.stringify(snapshot), now, 'QUEUED', null, null, now, now);
      for (const [seq, role] of roles.entries()) this.db.prepare('INSERT INTO tasks(mission_id,role,seq) VALUES(?,?,?)').run(id, role, seq);
      this.event(id, 'Operations', 'mission.created', { dataClass: 'REPRESENTATIVE_DATA', mode: 'DETERMINISTIC', inquiryHash: hash(q), snapshotHash: hash(snapshot) });
      for (const role of roles.slice(1)) this.event(id, 'Operations', 'task.delegated', { to: role });
      return this.get(tenant, id);
    });
  }
  get(tenant: string, id: string) {
    const m = this.db.prepare('SELECT * FROM missions WHERE id=? AND tenant=?').get(id, tenant) as Row | undefined;
    if (!m) throw new DomainError('MISSION_NOT_FOUND', 404);
    const tasks = this.db.prepare('SELECT role,state,attempt,output,duration_ms,error,next_at FROM tasks WHERE mission_id=? ORDER BY seq').all(id) as Row[];
    const events = (this.db.prepare('SELECT seq,payload,previous_hash,hash FROM events WHERE mission_id=? ORDER BY seq').all(id) as Row[]).map(e => ({ ...e, payload: JSON.parse(e.payload), evidenceUrl: `/api/missions/${id}/events/${e.seq}` } as Row));
    const review = this.db.prepare('SELECT * FROM reviews WHERE mission_id=?').get(id) ?? null;
    return { id, tenant: m.tenant, state: m.state, inquiry: JSON.parse(m.inquiry) as InquiryData, snapshot: JSON.parse(m.snapshot),
      createdAt: m.created_at, updatedAt: m.updated_at, proposal: m.proposal ? JSON.parse(m.proposal) : null, proposalHash: m.proposal_hash,
      tasks: tasks.map(t => ({ ...t, output: t.output ? JSON.parse(t.output) : null } as Row)), events, review,
      mode: roles.every(role=>events.some(e=>e.payload.role===role && e.payload.type==='ai.advice_saved'))?'DETERMINISTIC_CHECKS_WITH_LIVE_AI_ADVICE':'DETERMINISTIC_LOCAL', liveAiVerified: roles.every(role=>events.some(e=>e.payload.role===role && e.payload.type==='ai.advice_saved')), externalActionsEnabled: false, auditValid: this.verifyAudit(id) && this.verifyRecords(id) };
  }
  verifyRecords(id: string) {
    const m = this.db.prepare('SELECT * FROM missions WHERE id=?').get(id) as Row;
    const events = (this.db.prepare('SELECT payload FROM events WHERE mission_id=? ORDER BY seq').all(id) as Row[]).map(e=>JSON.parse(e.payload));
    const created = events.find(e=>e.type==='mission.created');
    if (!created || created.inquiryHash !== hash(JSON.parse(m.inquiry)) || created.snapshotHash !== hash(JSON.parse(m.snapshot))) return false;
    for (const task of this.db.prepare("SELECT * FROM tasks WHERE mission_id=? AND state='DONE'").all(id) as Row[]) {
      const e = events.filter(e=>e.role===task.role && e.type==='tool.completed').at(-1);
      if (!e || e.outputHash !== hash(JSON.parse(task.output))) return false;
    }
    if (m.proposal && (m.proposal_hash !== hash(JSON.parse(m.proposal)) || !events.some(e=>e.type==='proposal.assembled' && e.proposalHash===m.proposal_hash))) return false;
    return true;
  }
  verifyAudit(id: string) {
    let previous = 'GENESIS';
    for (const e of this.db.prepare('SELECT * FROM events WHERE mission_id=? ORDER BY seq').all(id) as Row[]) {
      if (e.previous_hash !== previous || e.hash !== hash([previous, e.payload])) return false;
      previous = e.hash;
    } return true;
  }
  list(tenant: string) { return (this.db.prepare('SELECT id FROM missions WHERE tenant=? ORDER BY created_at DESC LIMIT 100').all(tenant) as Row[]).map(m => this.get(tenant, m.id)); }
  revise(tenant: string, id: string, key: string, raw: unknown) {
    const parent = this.get(tenant,id);
    if (!['BLOCKED','APPROVAL_READY','REVIEWED_LOCAL'].includes(parent.state) || !parent.auditValid) throw new DomainError('REVISION_GATE_REJECTED',409);
    const next = this.create(tenant,key,raw);
    if (next.id === id) throw new DomainError('REVISION_KEY_REQUIRED',409);
    return this.tx(()=>{
      const previous = next.events.find(e=>e.payload.type==='mission.revised_from');
      if (previous && previous.payload.parentMissionId !== id) throw new DomainError('REVISION_PARENT_CONFLICT',409);
      if (!previous) {
        this.event(next.id,'Operations','mission.revised_from',{parentMissionId:id});
        this.event(id,'Operations','mission.revision_created',{nextMissionId:next.id});
      }
      return this.get(tenant,next.id);
    });
  }
  async step(tenant: string, id: string) {
    const claimed = this.tx(() => {
      const m = this.get(tenant, id);
      if (!['QUEUED', 'RUNNING'].includes(m.state)) return null;
      if (!m.auditValid) throw new DomainError('AUDIT_INTEGRITY_FAILED', 409);
      const t = this.db.prepare("SELECT * FROM tasks WHERE mission_id=? AND state!='DONE' ORDER BY seq LIMIT 1").get(id) as Row | undefined;
      if (!t) return null;
      if (t.state === 'RUNNING' && t.lease_until > Date.now()) return null;
      if (t.next_at > Date.now()) return null;
      if (t.attempt >= 3) { this.block(id, 'RETRY_LIMIT'); return null; }
      if (t.state === 'RUNNING') this.event(id, t.role, 'task.recovered', { reason: 'EXPIRED_LEASE' });
      const token = randomUUID();
      this.db.prepare("UPDATE tasks SET state='RUNNING',attempt=attempt+1,lease_until=?,lease_token=? WHERE mission_id=? AND role=?").run(Date.now() + this.timeoutMs + 2000, token, id, t.role);
      this.db.prepare("UPDATE missions SET state='RUNNING',updated_at=? WHERE id=?").run(new Date().toISOString(), id);
      this.event(id, t.role, 'tool.started', { attempt: t.attempt + 1, tool: toolFor(t.role) });
      const previous = Object.fromEntries(m.tasks.filter(x => x.output).map(x => [x.role, x.output]));
      return { token, input: { missionId: id, role: t.role, attempt: t.attempt + 1, inquiry: m.inquiry, snapshot: m.snapshot,
        assessedAt: m.createdAt, previous } as WorkerData };
    });
    if (!claimed) return this.get(tenant, id);
    const started = performance.now();
    try {
      const output = Outputs[claimed.input.role].parse(await this.execute(claimed.input, this.timeoutMs));
      this.tx(() => {
        const updated = this.db.prepare("UPDATE tasks SET state='DONE',output=?,duration_ms=?,error=NULL,lease_until=NULL WHERE mission_id=? AND role=? AND lease_token=? AND state='RUNNING'").run(JSON.stringify(output), performance.now() - started, id, claimed.input.role, claimed.token);
        if (!updated.changes) return;
        this.event(id, claimed.input.role, 'tool.completed', { outputHash: hash(output), attempt: claimed.input.attempt, durationMs: performance.now() - started });
        if (claimed.input.role === 'Quality') this.finalize(tenant, id);
      });
    } catch (e) {
      const known = ['TOOL_TIMEOUT', 'TOOL_FAILED', 'INVALID_TOOL_OUTPUT', 'TOOL_OUTPUT_LIMIT', 'WORKER_START_FAILED', 'MISSING_COST', 'TRANSIENT_INVENTORY_UNAVAILABLE'];
      const code = e instanceof Error && known.includes(e.message) ? e.message : 'CONTRACT_VALIDATION_FAILED';
      const retryable = ['TOOL_TIMEOUT', 'TRANSIENT_INVENTORY_UNAVAILABLE', 'WORKER_START_FAILED'].includes(code);
      this.tx(() => {
        const updated = this.db.prepare("UPDATE tasks SET state=?,error=?,duration_ms=?,next_at=?,lease_until=NULL WHERE mission_id=? AND role=? AND lease_token=? AND state='RUNNING'").run(retryable && claimed.input.attempt < 3 ? 'PENDING' : 'FAILED', code, performance.now() - started, Date.now() + 100 * 2 ** claimed.input.attempt, id, claimed.input.role, claimed.token);
        if (!updated.changes) return;
        this.event(id, claimed.input.role, 'tool.failed', { code, retryable, attempt: claimed.input.attempt, durationMs: performance.now() - started });
        if (!retryable || claimed.input.attempt >= 3) this.block(id, code);
      });
    }
    return this.get(tenant, id);
  }
  block(id: string, reason: string) {
    this.db.prepare("UPDATE missions SET state='BLOCKED',updated_at=? WHERE id=?").run(new Date().toISOString(), id);
    this.event(id, 'Operations', 'mission.blocked', { reason });
  }
  finalize(tenant: string, id: string) {
    const m = this.get(tenant, id);
    const quality = QualityResult.parse(m.tasks.find(t => t.role === 'Quality')?.output);
    const financials = Financials.parse(m.tasks.find(t => t.role === 'Finance')?.output);
    const proposal = Proposal.parse({ missionId: id, guests: m.inquiry.guests, menu: m.inquiry.menu, serviceAt: m.inquiry.serviceAt,
      financials, quality, status: quality.passed ? 'APPROVAL_READY' : 'BLOCKED', executionAuthorized: false,
      source: 'REPRESENTATIVE_DATA', assumptions: ['All menu, inventory, capacity and costs are synthetic; not LBK records.',
        'Includes 5% inventory buffer. Tax and gratuity excluded; delivery is an estimated cost.',
        'No stock reservation, customer communication, purchase or payment occurs.',
        'Human must verify recipe, handling, allergens, tax and current availability before any real quote.'] });
    this.db.prepare('UPDATE missions SET proposal=?,proposal_hash=?,state=?,updated_at=? WHERE id=?').run(JSON.stringify(proposal), hash(proposal), proposal.status, new Date().toISOString(), id);
    this.event(id, 'Operations', 'proposal.assembled', { proposalHash: hash(proposal), state: proposal.status });
  }
  review(tenant: string, id: string, proposalHash: string, actor = 'local-operator') {
    return this.tx(() => {
      const m = this.get(tenant, id);
      if (!['APPROVAL_READY','REVIEWED_LOCAL'].includes(m.state) || m.proposalHash !== proposalHash || !m.auditValid) throw new DomainError('REVIEW_GATE_REJECTED', 409);
      if (Date.parse(m.snapshot.expiresAt) <= Date.now() || Date.parse(m.inquiry.serviceAt) - Date.now() < m.snapshot.minimumLeadHours * 3600_000) throw new DomainError('EVIDENCE_EXPIRED', 409);
      if (m.state === 'REVIEWED_LOCAL') return m;
      const now = new Date().toISOString();
      this.db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?)').run(id, proposalHash, actor, now, m.snapshot.expiresAt);
      this.db.prepare("UPDATE missions SET state='REVIEWED_LOCAL',updated_at=? WHERE id=?").run(now, id);
      this.event(id, 'Human', 'proposal.reviewed_locally', { proposalHash, executionAuthorized: false });
      return this.get(tenant, id);
    });
  }
  recoverable() { return this.db.prepare("SELECT id,tenant FROM missions WHERE state IN ('QUEUED','RUNNING')").all() as Row[]; }
  close() { this.db.close(); }
}
export function toolFor(role: RoleName) { return ({ Operations: 'assess_lead_time', Sales: 'assess_demand', Kitchen: 'check_inventory_capacity_allergens', Finance: 'calculate_margin', Quality: 'verify_proposal' })[role]; }
