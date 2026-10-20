# aizoya-autonomous-operations

Isolated restaurant operations development alpha. Built for Franklyn Rosario,
MBA-ITM, Founder & CEO of AIZOYA. This is an engineering working name, not a new
cleared brand or an approved release.

## Getting started

Node.js 24 is required. Install pinned dependencies, then start the local product:

```bash
npm ci --ignore-scripts
npm run doctor
npm run demo
```

Open `http://127.0.0.1:3419` on the same computer. This loopback URL is not a
public deployment and will not open this workspace's app on an iPhone elsewhere.
The responsive interface was tested at 390px in Chromium; physical iPhone/Safari
testing remains outstanding.

Enter guests, menu, service time and budget. The Operations, Sales, Kitchen,
Finance and Quality workers persist a mission, check the request and assemble a
proposal. Try shortages, stale data, missing costs, or a transient tool failure.
Review is local only. No customer communication, stock reservation or payment exists.

For laptop setup and the three-minute demonstration, see [Laptop demo](LAPTOP_DEMO_2026-10-19.md).
Create a source-only checkpoint with `python3 scripts/package-source.py /absolute/path/outside-project.zip`.
The packager excludes environment files and runtime data, rejects selected symlinks and stops on common embedded credential patterns. This heuristic is not a complete secrets audit.

The functioning product path is **deterministic**. Five eve AI agent definitions
and typed tools are compiled separately; live model credentials were absent and
no inference was performed. The optional eve advisory layer is NOT yet connected
to the dashboard's durable engine. Do not present this as a verified live five-AI
system. The dashboard now includes a bounded direct OpenAI adapter for live role reviews. See [live setup](LIVE_AI_START_HERE.md). Successful real-account inference remains unverified until the Mac run.

Masky supplies five fictional portraits and five prerecorded talking-head explanations for the exact shortage-recovery demo. These are local assets, not live provider calls. Other sponsor runtime integrations are not connected.

## Verify

```bash
npm run typecheck
npm test
npm run verify
npm run build
node scripts/checks.mjs
```

`evidence/acceptance-report.json` contains measured scenario timing and links to
mission packets. `docs/TEST_REPORT.md` explains scope and limitations. Browser
automation is in `scripts/browser-check.mjs`; it uses Playwright supplied by the
Codex runtime, or set `PLAYWRIGHT_MODULE_ROOT` to a directory containing Playwright.
Its Chromium package is pinned. Browser binaries and node_modules are not packaged.

## Deliverables

- [Architecture and contracts](docs/ARCHITECTURE.md)
- [Role, avatar and voice plans](docs/AGENTS.md)
- [Sponsor and judge research](docs/SPONSORS_AND_JUDGES.md)
- [Event gate register](docs/EVENT_GATES.md)
- [Business model and measurement plan](docs/BUSINESS_MODEL.md)
- [Security and readiness](docs/SECURITY.md)
- [Judging script](docs/JUDGING_SCRIPT.md)
- [Independent review packet](docs/REVIEW_PACKET.md)

OS 2.6 governs. The canonical registry on main and active independent-review
policy were read before implementation. No OS 2.7 proposal was activated. Existing
projects, production configuration, DNS, customers and provider access were not changed.

Release and event submission remain HOLD. This build is reusable development
evidence, not a claim of production readiness, customer validation or eligibility.
