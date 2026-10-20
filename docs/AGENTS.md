# Five specialist roles

The local engine runs five deterministic role workers. The eve agent definitions
represent the planned AI advisory layer and are compiled, not live validated.

| Role | Structured inputs | Outputs | Actual authored tool | Permission |
|---|---|---|---|---|
| Operations | Mission envelope and time snapshot | Lead hours, lead-time result; final proposal from results | assess_operations / local assess_lead_time | Assess, delegate, assemble; no commitments |
| Sales | Inquiry and mission ID | Guests, budget, per-guest budget, menu | assess_demand | Read and calculate demand |
| Kitchen | Inquiry, Sales, catalog | Required servings, available servings, capacity, freshness, allergen flags | check_feasibility | Read/check; no reservations |
| Finance | Inquiry, Sales, Kitchen, costs | Cost, pre-tax quote, contribution, margin, budget result | calculate_financials | Calculate; no billing/payments |
| Quality | All prior outputs and catalog | Passed/blockers, human handling-review requirement | verify_proposal | Recompute/check; no approval authority |

Each WorkerInput requires missionId, literal role enum, bounded attempt count,
strict inquiry/catalog, assessedAt, and prior structured outputs. Local task
records and events bind all results to that mission. The optional AI tools fix
the role in code; the model cannot select another role through a tool argument.

## Implemented avatar and voice behavior — October 19

Five fictional robot portraits and five preset-voice talking-head clips were created with Masky and are served locally. No human likeness or voice cloning was used. The runtime does not send mission data to Masky.

| Role | Preset voice | Explanation in the recorded recovery |
|---|---|---|
| Operations | Serene Assistant | Coordinated five checks; original stock block; revised human review |
| Sales | Warm American Female | Guest count and budget; customer agreement to the changed order |
| Kitchen | French Chef | Fifty guests cannot be covered; eleven guests need twelve servings |
| Finance | Comforting Male Conversationalist | $239.26 proposed price and 30% contribution margin before tax |
| Quality | English Casual Conversationalist | Automated checks passed; human handling, allergen and tax checks remain |

**Hear** reads the current role assessment with device speech. **Watch** plays a labeled prerecorded clip only for a matching 50-to-11 guest chicken/shortage recovery with passing checks and fresh evidence. A visible transcript accompanies both. Stop voice stops either mode. Changing missions cancels playback.

These assets do not turn deterministic workers into live model agents. Physical Mac playback of this update and event acceptance remain to be verified. See [Masky asset record](../MASKY_ASSETS_2026-10-19.md).
