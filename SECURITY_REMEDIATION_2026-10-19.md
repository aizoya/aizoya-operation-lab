# Snyk source finding remediation

The initial authenticated scan reported one high and three medium findings.

## Changes

Request-derived filesystem paths were removed from the acceptance-packet handler. The server now preloads seven explicit constant packet paths and serves them through a Map keyed by exact routes. Static assets are also loaded before request handling. This removes URL-to-filesystem path construction and repeated disk reads per request.

Added a bounded, process-wide 300-request-per-minute allowance before expensive handlers, with HTTP 429 and Retry-After. This is a loopback development control; a production service needs distributed, identity-aware quotas. Regression tests check traversal-like routes and a real burst exceeding the limit.

Audit event titles now assign textContent explicitly for remote event fields. The existing element helper also uses textContent; no HTML parsing was introduced.

The server continues binding only 127.0.0.1 and checking Host/Origin. HTTP is retained for this local development surface. This does not clear the HTTP scanner finding or authorize public serving; production requires TLS termination and production authentication.

## Verification

TypeScript passes. 27/27 Node tests pass, including route rejection and throttling. Eight browser journeys pass without page errors and without horizontal overflow at 390px. Original Snyk report is retained; the remediation rescan is a separate report. Scanner findings are not suppressed or marked ignored.

## Rescan result

The rescan no longer reports path traversal or resource allocation without limits. It reports two HIGH XSS warnings on server response serialization/static asset delivery, one MEDIUM DOM XSS warning on audit rendering, and one MEDIUM HTTP warning. Total remains four; this is not a clean scan. Current source uses JSON Content-Type with JSON.stringify for API data and preloaded static asset buffers for asset responses. XSS warnings remain open pending review; no exploit is claimed solely from the static report.

An additional browser regression injects an img/onerror payload into remote audit text, verifies literal rendering with no image node or script execution, and checks an encoded hostile API route returns non-reflective JSON 404. All nine browser journeys pass. This supports the narrow tested behavior; it does not establish absence of all XSS.

## Second hardening pass

Static asset routes now each serve an explicit preloaded constant buffer with a constant Content-Type. JSON response serialization escapes `<`, `>` and `&` as JSON Unicode escapes while preserving decoded values. Quality-blocker strings now assign textContent on a div before appendChild; browser injection coverage also includes this exact prior scanner sink.

The new authenticated Snyk report, evidence/snyk-code-hardening-2026-10-19.json, reports two open findings: one HIGH XSS on the JSON response helper and one MEDIUM cleartext HTTP on the loopback development server. DOM XSS and static-asset XSS are no longer reported. No findings were ignored. The JSON helper sets application/json; charset=utf-8, uses JSON.stringify plus HTML-sensitive-character escaping, and inherits nosniff. This supports further false-positive review, not an assertion of security clearance. Retain the high finding until independent review resolves it.

## JSON response review

The response helper now sets Content-Type explicitly through setHeader before writeHead and end. Added HTTP regression assertions for an encoded script payload, JSON 404 body, exact JSON Content-Type and nosniff. TypeScript and 27 tests pass. The subsequent scan (evidence/snyk-code-json-review-2026-10-19.json) still reports the same HIGH JSON-response XSS and MEDIUM loopback HTTP findings. The header change does not establish scanner clearance.

Reviewer question for the Snyk team: Can the HIGH javascript/XSS flow to src/server.ts JSON response end be reproduced when the body is JSON.stringify output with HTML-sensitive Unicode escapes, Content-Type application/json; charset=utf-8, nosniff and same-origin CSP? Please identify a concrete executable response or confirm the appropriate false-positive disposition. Existing browser tests cover hostile audit text and quality blockers; they are narrow regressions, not a complete security proof.

Public release remains blocked on independent resolution of the high finding, a production TLS/authentication design, and remaining product readiness requirements. Isolated development may continue.
