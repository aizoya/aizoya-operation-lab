# Snyk setup status

Snyk registration completed following explicit approval of terms. Organization slug: hello-cZctfSbfyrMLosExs6ZmMB. Snyk Code enabled following explicit consent to upload only the restaurant project's source, and the setting remained enabled after reload.

Official CLI version 1.1308.1 installed in the workspace's vendor-tools directory. Default OAuth requires a localhost callback that cannot be reached from the separate cloud browser. User subsequently explicitly approved the documented token-based machine-login flow.

That pairing flow reached the browser's Authenticated confirmation. However, CLI authentication returned SNYK-0005 / HTTP 401. A subsequent `snyk whoami --experimental` access check independently returned SNYK-0005 / HTTP 401, reporting credentials unrecognized or access not provisioned. CLI authentication is therefore blocked, not verified.

No project source was uploaded, and no Snyk scan was run. Existing npm audit findings are separate and remain unresolved. No API key, session URL, or authentication value is included in this record.

## Successful reauthentication and source scan

User requested a fresh authentication attempt after the failure. A new documented token-based browser pairing succeeded: both the browser and CLI reported authentication, and an authenticated Snyk Code scan completed for the restaurant project. No overriding SNYK_TOKEN, SNYK_OAUTH_TOKEN or SNYK_API environment setting was present in the scoped check. The exact reason for the prior failed pairing is not established; successful retry does not prove a provisioning defect or expired challenge.

Snyk Code reported four open findings: HIGH path traversal at src/server.ts:52; MEDIUM DOM-based XSS at public/app.js:55; MEDIUM cleartext HTTP at src/server.ts:24; MEDIUM resource allocation without throttling at src/server.ts:24. Findings require triage and are not yet confirmed exploits. Report: evidence/snyk-code-2026-10-19.json.

A separate dependency scan was blocked by automatic approval review because package-lock.json disclosure was outside the explicit source-only consent. Its completion is not claimed. Earlier paragraphs describe historical failed attempts and are superseded for current CLI access by this successful source scan.
