# Security posture and release boundary

Development alpha only. Sensitive/real customer data prohibited. No production
authority or claim of complete compliance, penetration testing or security certification.

## Enforced in the tested local path

- Strict input contracts reject extra fields, unknown role/action names and invalid money/count types.
- Server binds 127.0.0.1; Host allowlist prevents arbitrary-host routing/DNS rebinding.
- Random HttpOnly, SameSite=Strict local sessions; same-origin POST checks; JSON only.
- No user-selected tenant in HTTP. One representative demo tenant. Engine APIs enforce tenant lookup.
- SQL is parameterized. Static file routes are an explicit allowlist.
- CSP restricts content and frame embedding; textContent renders results instead of HTML injection.
- Worker subprocess environment excludes application credentials; bounded stdin/stdout and kill timeout.
- Node worker permission mode limits filesystem reads and denies writes/subprocess creation. Network egress is not covered by this Node version; no outbound worker tool is implemented.
- Claims and results use lease tokens; idempotency conflicts reject changed requests.
- Data, task and proposal hashes are checked against hash-chained events.
- Human local review binds exact proposal hash and current evidence; no execution route exists.
- No third-party telemetry, recording, replay, customer uploads or outbound model calls.
- Error responses use bounded codes, not input, exception text or credentials.

## Actual dependency finding

Initial npm audit found 5 moderate and 1 high vulnerable package entries. The high
undici finding was patched through an exact guarded-fetch dependency override to
7.29.1. Final audit must be read from `evidence/npm-audit.json`.

An unpatched sprintf-js issue remains transitively associated with just-bash,
eve and @vercel/connect: four moderate entries arising from the dependency chain,
not four independent exploitable findings. Official advisory:
https://github.com/advisories/GHSA-hp3w-g68c-fv3c (no patched version listed).
The demo imports zod and Node core, not eve/just-bash. Shell tools are disabled in
the optional model definitions. This limits reachability but does not waive the
finding or establish security approval. Do not deploy the optional AI runtime
until remediation/replacement and independent review resolve it. No forced
downgrade to an obsolete eve API was applied to hide the audit warning.

## Important limitations

Local sessions are anonymous development capability cookies, NOT production
identity verification. Any local user opening the page can use the representative
tenant. Do not expose this server to a network or load real customer data.
SQLite is local unencrypted storage; protected by the host, not a managed tenant
database. Production auth, role mapping, encryption, retention/deletion, backup
restoration and multi-tenant operational testing remain required.

The chain is not externally signed. Node permission mode is not a container for
hostile generated code. No adversarial model evaluation or live prompt-injection
test is claimed. Quality's deterministic recheck is not an independent OS review.
No Snyk or Prelint scan was run. The bundled source scanner is a limited heuristic,
not a replacement for SAST, secret scanning or a professional review.

The restaurant proposal is not an actual offer. Synthetic stock and capacity do
not reserve real availability across missions. Ingredient/cross-contact data,
food handling, taxes, fees, labor and delivery must be confirmed by the operator.

## Governance sources actually read

- https://github.com/aizoya/AIZOYA/blob/main/.aizoya/os-version-registry.json
- https://github.com/aizoya/AIZOYA/blob/main/docs/AIZOYA_OS_2_6_SECOND_OPINION_GATE_2026-09-18.md

The registry identifies 2.6 as approved. R1 architecture/security and competition
claims need independent challenge before promotion. This packet is REVIEW_REQUIRED;
no independent reviewer verdict is invented. No pending OS 2.7 implementation
was copied or promoted. Existing repositories and production settings were preserved.
