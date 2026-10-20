import { defineTool } from 'eve/tools';
import { WorkerInput, Demand } from '../../../../src/contracts.ts';
import { runRole } from '../../../../src/agents.ts';
export default defineTool({ description: 'Assess representative guest count and budget; no commitments.',
  inputSchema: WorkerInput.omit({ role: true }), outputSchema: Demand,
  execute(input) { return Demand.parse(runRole({ ...input, role: 'Sales' })); } });
