import { defineTool } from 'eve/tools';
import { WorkerInput, Feasibility } from '../../../../src/contracts.ts';
import { runRole } from '../../../../src/agents.ts';
export default defineTool({ description: 'Check representative inventory, capacity, freshness and allergens; read only.',
  inputSchema: WorkerInput.omit({ role: true }), outputSchema: Feasibility,
  execute(input) { return Feasibility.parse(runRole({ ...input, role: 'Kitchen' })); } });
