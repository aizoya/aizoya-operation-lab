import { Inquiry } from '../src/contracts.ts';
export const inquiry = (scenario = 'normal', patch = {}) => Inquiry.parse({guests:50,menu:'chicken',serviceAt:new Date(Date.now()+3*86400_000).toISOString(),budgetCents:150000,allergens:[],scenario,...patch});
