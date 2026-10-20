import { Assessment, Demand, Feasibility, Financials, QualityResult, WorkerInput, type WorkerData } from './contracts.ts';

export const identities = [
  { role: 'Operations', initials: 'OP', color: '#655ee8', character: 'Calm coordinator', voice: 'Clear, steady; browser speech optional', tools: ['assess_lead_time', 'delegate_tasks', 'assemble_proposal'] },
  { role: 'Sales', initials: 'SA', color: '#1e7991', character: 'Attentive demand analyst', voice: 'Warm, concise; no impersonation', tools: ['assess_demand'] },
  { role: 'Kitchen', initials: 'KI', color: '#bd683b', character: 'Practical production planner', voice: 'Direct, precise', tools: ['check_inventory', 'check_capacity', 'check_allergens'] },
  { role: 'Finance', initials: 'FI', color: '#39775c', character: 'Conservative cost reviewer', voice: 'Measured, numerical', tools: ['calculate_cost', 'calculate_margin'] },
  { role: 'Quality', initials: 'QA', color: '#9b5683', character: 'Skeptical verifier', voice: 'Explicit about uncertainty', tools: ['verify_evidence', 'check_proposal'] },
] as const;

export function calculateFinancials(guests: number, budgetCents: number, c: WorkerData['snapshot']) {
  if (c.foodCostPerGuest === null) throw new Error('MISSING_COST');
  const direct = guests * (c.foodCostPerGuest + c.laborPerGuest + c.packagingPerGuest) + c.fixedDeliveryCost;
  const costCents = direct + Math.ceil(direct * c.overheadBps / 10000);
  // Integer cents. Gross contribution margin = (revenue - cost) / revenue; not markup.
  const quoteCents = Math.ceil(costCents * 10000 / (10000 - c.minimumMarginBps));
  return Financials.parse({ role: 'Finance', costCents, quoteCents, profitCents: quoteCents - costCents,
    marginBps: Math.floor((quoteCents - costCents) * 10000 / quoteCents), budgetOk: quoteCents <= budgetCents,
    minimumMarginBps: c.minimumMarginBps, taxStatus: 'EXCLUDED_REQUIRES_REVIEW', currency: 'USD', source: 'synthetic-cost-snapshot' });
}

export function runRole(raw: unknown): unknown {
  const input = WorkerInput.parse(raw);
  const { role, inquiry: q, snapshot: c, previous: p } = input;
  switch (role) {
    case 'Operations': {
      const leadHours = Math.max(0, (Date.parse(q.serviceAt) - Date.parse(input.assessedAt)) / 3600_000);
      return Assessment.parse({ role, leadHours, leadTimeOk: leadHours >= c.minimumLeadHours, source: 'mission-snapshot' });
    }
    case 'Sales': return Demand.parse({ role, guests: q.guests, budgetCents: q.budgetCents,
      budgetPerGuestCents: Math.floor(q.budgetCents / q.guests), menu: q.menu });
    case 'Kitchen': {
      Demand.parse(p.Sales);
      const requiredServings = Math.ceil(q.guests * 105 / 100);
      return Feasibility.parse({ role, requiredServings, availableServings: c.availableServings, capacity: c.capacity,
        shortage: Math.max(0, requiredServings - c.availableServings), capacityOk: requiredServings <= c.capacity,
        sourceFresh: Date.parse(c.expiresAt) > Date.parse(input.assessedAt),
        allergenConflict: q.allergens.some(a => c.recipeAllergens.includes(a)), crossContactUnknown: c.crossContactUnknown });
    }
    case 'Finance': Demand.parse(p.Sales); Feasibility.parse(p.Kitchen); return calculateFinancials(q.guests, q.budgetCents, c);
    case 'Quality': {
      const ops = Assessment.parse(p.Operations), sales = Demand.parse(p.Sales), kitchen = Feasibility.parse(p.Kitchen), finance = Financials.parse(p.Finance);
      const expected = calculateFinancials(q.guests, q.budgetCents, c);
      const blockers = [];
      for (const checkedRole of ['Operations', 'Sales', 'Kitchen'] as const) {
        const expectedOutput = runRole({ ...input, role: checkedRole });
        if (JSON.stringify(p[checkedRole]) !== JSON.stringify(expectedOutput)) blockers.push(`${checkedRole.toUpperCase()}_RECONCILIATION_FAILED`);
      }
      if (!ops.leadTimeOk || Date.parse(q.serviceAt) - Date.now() < c.minimumLeadHours * 3600_000) blockers.push('INSUFFICIENT_LEAD_TIME');
      if (sales.guests !== q.guests || sales.budgetCents !== q.budgetCents) blockers.push('DEMAND_MISMATCH');
      if (kitchen.shortage > 0) blockers.push('INVENTORY_SHORTAGE');
      if (!kitchen.capacityOk) blockers.push('CAPACITY_EXCEEDED');
      if (!kitchen.sourceFresh || Date.parse(c.expiresAt) <= Date.now()) blockers.push('STALE_INVENTORY');
      if (kitchen.allergenConflict) blockers.push('ALLERGEN_CONFLICT');
      if (kitchen.crossContactUnknown) blockers.push('CROSS_CONTACT_REVIEW_REQUIRED');
      if (!finance.budgetOk) blockers.push('BUDGET_BELOW_REQUIRED_PRICE');
      if (finance.marginBps < c.minimumMarginBps) blockers.push('MARGIN_BELOW_FLOOR');
      if (JSON.stringify(finance) !== JSON.stringify(expected)) blockers.push('FINANCIAL_RECONCILIATION_FAILED');
      return QualityResult.parse({ role, passed: blockers.length === 0, blockers, foodSafetyStatus: 'HUMAN_RECIPE_AND_HANDLING_REVIEW_REQUIRED' });
    }
  }
}
