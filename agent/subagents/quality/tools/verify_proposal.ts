import { defineTool } from 'eve/tools';
import { WorkerInput, QualityResult } from '../../../../src/contracts.ts';
import { runRole } from '../../../../src/agents.ts';
export default defineTool({ description: 'Reconcile results against synthetic evidence; no execution authority.',
  inputSchema: WorkerInput.omit({ role: true }), outputSchema: QualityResult,
  execute(input) { return QualityResult.parse(runRole({ ...input, role: 'Quality' })); } });
