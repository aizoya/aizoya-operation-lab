import { defineTool } from 'eve/tools';
import { WorkerInput, Assessment } from '../../src/contracts.ts';
import { runRole } from '../../src/agents.ts';
export default defineTool({ description: 'Assess lead time from a representative mission. No side effects.',
  inputSchema: WorkerInput.omit({ role: true }), outputSchema: Assessment,
  execute(input) { return Assessment.parse(runRole({ ...input, role: 'Operations' })); } });
