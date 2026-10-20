import { z } from 'zod';

export const Role = z.enum(['Operations', 'Sales', 'Kitchen', 'Finance', 'Quality']);
export type RoleName = z.infer<typeof Role>;
export const Inquiry = z.strictObject({
  guests: z.number().int().min(1).max(500),
  menu: z.enum(['chicken', 'vegetable']),
  serviceAt: z.iso.datetime(),
  budgetCents: z.number().int().min(100).max(10_000_000),
  allergens: z.array(z.enum(['milk', 'wheat', 'soy', 'peanut', 'sesame'])).max(5),
  scenario: z.enum(['normal', 'shortage', 'capacity', 'stale', 'transient', 'timeout', 'missing_cost']).default('normal'),
});
export type InquiryData = z.infer<typeof Inquiry>;
const Money = z.number().int().nonnegative().max(100_000_000);
export const Catalog = z.strictObject({
  version: z.literal('synthetic-v1'), capturedAt: z.iso.datetime(), expiresAt: z.iso.datetime(),
  availableServings: z.number().int().nonnegative(), capacity: z.number().int().positive(),
  foodCostPerGuest: Money.nullable(), laborPerGuest: Money, packagingPerGuest: Money,
  fixedDeliveryCost: Money, overheadBps: z.number().int().min(0).max(5000),
  minimumMarginBps: z.number().int().min(0).max(9000),
  minimumLeadHours: z.number().int().positive(),
  recipeAllergens: z.array(z.string()), crossContactUnknown: z.boolean(),
});
export type CatalogData = z.infer<typeof Catalog>;
export const Assessment = z.strictObject({
  role: z.literal('Operations'), leadHours: z.number().nonnegative(), leadTimeOk: z.boolean(),
  source: z.literal('mission-snapshot'),
});
export const Demand = z.strictObject({
  role: z.literal('Sales'), guests: z.number().int().positive(),
  budgetCents: Money, budgetPerGuestCents: Money, menu: z.enum(['chicken', 'vegetable']),
});
export const Feasibility = z.strictObject({
  role: z.literal('Kitchen'), requiredServings: z.number().int().positive(),
  availableServings: z.number().int().nonnegative(), capacity: z.number().int().positive(),
  shortage: z.number().int().nonnegative(), capacityOk: z.boolean(), sourceFresh: z.boolean(),
  allergenConflict: z.boolean(), crossContactUnknown: z.boolean(),
});
export const Financials = z.strictObject({
  role: z.literal('Finance'), costCents: Money, quoteCents: Money, profitCents: Money,
  marginBps: z.number().int().min(0).max(10000), budgetOk: z.boolean(),
  minimumMarginBps: z.number().int().min(0).max(9000),
  taxStatus: z.literal('EXCLUDED_REQUIRES_REVIEW'),
  currency: z.literal('USD'), source: z.literal('synthetic-cost-snapshot'),
});
export const QualityResult = z.strictObject({
  role: z.literal('Quality'), passed: z.boolean(), blockers: z.array(z.string().max(100)).max(20),
  foodSafetyStatus: z.literal('HUMAN_RECIPE_AND_HANDLING_REVIEW_REQUIRED'),
});
export const Outputs = { Operations: Assessment, Sales: Demand, Kitchen: Feasibility, Finance: Financials, Quality: QualityResult };
export type Output = z.infer<typeof Assessment | typeof Demand | typeof Feasibility | typeof Financials | typeof QualityResult>;
export const WorkerInput = z.strictObject({
  missionId: z.uuid(), role: Role, attempt: z.number().int().min(1).max(3),
  inquiry: Inquiry, snapshot: Catalog, assessedAt: z.iso.datetime(),
  previous: z.record(z.string(), z.unknown()),
});
export type WorkerData = z.infer<typeof WorkerInput>;
export const Proposal = z.strictObject({
  missionId: z.uuid(), guests: z.number().int().positive(), menu: z.string(),
  serviceAt: z.iso.datetime(), financials: Financials, quality: QualityResult,
  assumptions: z.array(z.string()), executionAuthorized: z.literal(false),
  status: z.enum(['APPROVAL_READY', 'BLOCKED']), source: z.literal('REPRESENTATIVE_DATA'),
});
export const ReviewRequest = z.strictObject({ proposalHash: z.string().regex(/^[a-f0-9]{64}$/), confirm: z.literal(true) });

export function representativeCatalog(inquiry: InquiryData, now = new Date()): CatalogData {
  return Catalog.parse({ version: 'synthetic-v1', capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (inquiry.scenario === 'stale' ? -1000 : 3600_000)).toISOString(),
    availableServings: inquiry.scenario === 'shortage' ? 12 : 200,
    capacity: inquiry.scenario === 'capacity' ? 20 : 150,
    foodCostPerGuest: inquiry.scenario === 'missing_cost' ? null : inquiry.menu === 'chicken' ? 620 : 460,
    laborPerGuest: 260, packagingPerGuest: 95, fixedDeliveryCost: 4500, overheadBps: 1000,
    minimumMarginBps: 3000, minimumLeadHours: 24,
    recipeAllergens: inquiry.menu === 'chicken' ? ['milk'] : ['soy'], crossContactUnknown: inquiry.allergens.length > 0,
  });
}
