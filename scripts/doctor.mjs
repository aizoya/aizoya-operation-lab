import { existsSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const checks = [];
checks.push({ check: 'Node.js 24', passed: Number(process.versions.node.split('.')[0]) === 24 });
for (const dependency of ['zod', 'eve']) {
  let passed = false;
  try { require.resolve(dependency); passed = true; } catch {}
  checks.push({ check: `${dependency} installed`, passed });
}
for (const path of ['public/index.html', 'public/app.js', 'public/style.css', 'evidence/acceptance-report.json',
  ...['normal', 'shortage', 'capacity', 'stale', 'transient', 'timeout', 'missing_cost'].map(s => `evidence/mission-${s}.json`),
  ...['operations','sales','kitchen','finance','quality'].flatMap(role=>['jpg','webm'].map(extension=>`public/media/${role}.${extension}`))]) {
  checks.push({ check: path, passed: existsSync(path) && lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink() });
}
console.log(JSON.stringify({
  checks,
  dashboard: 'Deterministic local workers; no model credentials needed',
  optionalAi: 'Dashboard has direct OpenAI live-role adapter; start with npm run live. Separate eve definitions are preserved.',
  liveAiVerified: false,
  avatarMedia: 'Five local Masky portraits and prerecorded recovery explanations; no live Masky calls',
  externalActionsEnabled: false,
  networkRequestsMade: 0,
}, null, 2));
if (checks.some(c => !c.passed)) process.exitCode = 1;
