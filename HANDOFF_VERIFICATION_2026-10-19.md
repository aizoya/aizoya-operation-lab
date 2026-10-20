# Clean source-package verification

Verified October 19, 2026 at approximately 15:15 Pacific.

Extracted checkpoint version 11 into a separate directory and installed the pinned dependencies with `npm ci --ignore-scripts --offline` using the development machine's existing npm cache. No dependency folder was copied into the extracted app.

| Check | Result |
| --- | --- |
| Pinned dependency installation | 153 packages installed |
| Startup preflight | All 13 checks passed |
| TypeScript | Passed |
| Node tests | 27 passed; zero failed |
| Optional five-agent eve build | Passed; compilation only |
| Browser journeys | Nine passed; zero page errors |
| Initial proposal render | Approximately 2.94 seconds in this run |
| Mobile width | 390px; no horizontal overflow |

The browser journey exercises the real local HTTP server, five deterministic workers, local review, reload, evidence retrieval, linked revisions, shortage blocking, guest-count recovery, budget recovery and hostile-text rendering. Voice invocation and Stop use mocked browser speech, so audio performance is not verified.

This validates the source-package handoff in the Linux development environment. It does not establish installation on Franklyn's physical Mac, Safari behavior, live inference, real business results, clean security findings, production readiness or hackathon eligibility.

No OpenAI key was entered or used. No provider inference charges, production deployment or event submission occurred. Snyk findings and dependency limitations documented elsewhere remain open.
