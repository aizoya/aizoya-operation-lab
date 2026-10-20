import { defineAgent } from 'eve';
export default defineAgent({ description: 'Sales: assess structured demand and budget for one mission.', model: 'openai/gpt-6-luna-fast', defaultTools: false,
  limits: { maxInputTokensPerSession: 4000, maxOutputTokensPerSession: 1000, maxTokenCostUsdPerSession: 0.02 } });
