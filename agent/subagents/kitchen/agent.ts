import { defineAgent } from 'eve';
export default defineAgent({ description: 'Kitchen: verify stock, capacity and allergen evidence.', model: 'openai/gpt-6-luna-fast', defaultTools: false,
  limits: { maxInputTokensPerSession: 4000, maxOutputTokensPerSession: 1000, maxTokenCostUsdPerSession: 0.02 } });
