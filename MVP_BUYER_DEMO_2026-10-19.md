# MVP buyer demonstration

## Owner outcome

Prepare a catering draft with a checked contribution margin and verified operational constraints. The current prototype uses representative data. Operator demand, real time savings and willingness to pay are not yet validated.

## New working behavior

- Inspect food, labor, packaging, delivery and overhead assumptions alongside the estimated cost.
- Compare original and revised guest counts, price and automated-check outcomes from saved missions.
- Preview and download a customer draft for a passing, current, audit-valid proposal. The draft contains the menu, guest count, service time, subtotal and review conditions. It excludes internal costs and contribution.
- A blocked proposal cannot generate the customer draft. No draft is sent and no customer agreement is inferred.

## Demonstrate to a restaurant owner

1. Ask for a representative guest count and budget. Do not collect customer contact details.
2. Build with the inventory-shortage scenario. Explain why the original request cannot be fulfilled.
3. Apply the proposed guest revision and rerun the checks.
4. Open the estimated cost. Show how the quote preserves the target contribution margin.
5. Show What changed, then Preview customer draft and Download customer draft.
6. Use Watch Kitchen or Watch Finance for the matching 50-to-11 recovery. Record local review and inspect the saved evidence.

Ask the owner which step currently takes the most work, what information would need to come from their systems, and whether they would test this against a real inquiry. Do not claim a sale or a proven ROI from the technical demo.

## Technology priorities

Working now: Node.js/TypeScript, Zod contracts, SQLite persistence, constrained subprocess workers, deterministic financial checks, browser downloads, and local Masky media.

Most important missing technology: an authenticated, bounded live AI advisory layer connected to the existing tools. Keep arithmetic, inventory limits and review authority in deterministic code. Five compiled eve definitions are not live dashboard execution.

Later reuse: an operator pilot for LBK, then an isolated integration into PlateReach if the pilot shows value. Preserve per-business data and permission boundaries. Evaluate Flexprice for usage billing after a real paid workflow exists. Add a second orchestration platform only if it solves a demonstrated gap.
