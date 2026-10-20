# Development failures and corrections

Preserved narrative of material development/test failures; no first-pass success
claim. Actual final command outputs are retained by `scripts/checks.mjs`.

- Initial TypeScript checks exposed inferred database-row field typing problems;
  fixed explicit internal row types. Zod remains the external contract boundary.
- A test fixture executor type accepted fewer arguments than the worker executor;
  fixed it to use the shared Executor type.
- Initial eve build required just-bash; installed and pinned that dependency.
  Subsequent build compiled all five agent configurations. Dependency audit then
  exposed real findings; the high undici issue was patched, unpatched moderate
  sprintf-js chain remains a release blocker.
- First acceptance harness used an underscore in an idempotency key; corrected
  the harness to honor the constrained key contract. No key validation was loosened.
- Browser runtime lacked a Chromium binary. Standard download yielded truncated
  archives. Installed pinned Chromium from the package registry instead. The
  generic extraction helper attempted unsupported ownership changes; the test
  harness extracts only the package's compressed executable into its own scratch
  directory. No dependency source, browser protection or external site was bypassed.
- Browser checking initially assumed a server persisted across command network
  contexts; updated the harness to start its own isolated server in the same test.
- First browser evidence-link assertion used a relative URL in an API client;
  corrected the test URL construction. The product's browser links were valid.
- Final browser checks verified the full journey, blocked shortage, evidence
  retrieval and 390px layout. No physical iPhone or Safari test was performed.

These lessons are local engineering records, not an amendment to deployed OS policy.
