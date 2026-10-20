import { runRole } from './agents.ts';
import { WorkerInput } from './contracts.ts';
let body = '';
for await (const chunk of process.stdin) { body += chunk; if (body.length > 65536) process.exit(2); }
try {
  const data = WorkerInput.parse(JSON.parse(body));
  if (data.role === 'Kitchen' && data.inquiry.scenario === 'transient' && data.attempt === 1) throw new Error('TRANSIENT_INVENTORY_UNAVAILABLE');
  if (data.role === 'Kitchen' && data.inquiry.scenario === 'timeout') await new Promise(resolve => setTimeout(resolve, 30000));
  process.stdout.write(JSON.stringify(runRole(data)));
} catch (e) {
  const allowed = ['MISSING_COST', 'TRANSIENT_INVENTORY_UNAVAILABLE'];
  const code = e instanceof Error && allowed.includes(e.message) ? e.message : 'INVALID_WORKER_DATA';
  process.stderr.write(code); process.exitCode = 1;
}
