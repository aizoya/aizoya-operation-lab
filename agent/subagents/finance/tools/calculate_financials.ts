import { defineTool } from 'eve/tools';
import { WorkerInput, Financials } from '../../../../src/contracts.ts';
import { runRole } from '../../../../src/agents.ts';
export default defineTool({ description: 'Calculate integer-cent price and contribution from supplied synthetic costs.',
  inputSchema: WorkerInput.omit({ role: true }), outputSchema: Financials,
  execute(input) { return Financials.parse(runRole({ ...input, role: 'Finance' })); } });
