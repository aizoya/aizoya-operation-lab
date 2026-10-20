import { defineAgent } from 'eve';
export default defineAgent({ description: 'Quality: reconcile role outputs and expose blockers.', model: 'openai/gpt-6-luna-fast', defaultTools: false,
  limits: { maxInputTokensPerSession: 4000, maxOutputTokensPerSession: 1000, maxTokenCostUsdPerSession: 0.02 } });
