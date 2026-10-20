# Connect the live AI on your Mac

This update adds a direct OpenAI Responses API adapter to the existing dashboard. It uses the native `gpt-6-luna` model with Fast mode, matching the existing `openai/gpt-6-luna-fast` selection. The five eve configuration files are preserved. This is a direct dashboard adapter, not a claim that the optional eve service is running.

## Start

Stop the old server with Control-C. Extract this ZIP into a new folder. From Terminal inside the new folder:

```sh
npm ci --ignore-scripts
npm run live
```

Paste your EXISTING OpenAI API key into the hidden Terminal prompt, then press Return. It stays in process memory and is not written to the project, chat or a file. The old key created for this event may expire after one day. Do not share the key or a screenshot of it.

The launcher asks you to type YES to authorize representative mission data going to OpenAI and bounded provider use. This is separate from your ChatGPT subscription. It reserves $0.02 for each request, at most twelve requests and $2.00 in workspace reservations. Each request has a 10,000-byte request cap, 1,500 output-token cap and thirty-second timeout. There are no automatic retries. Reservations remain after failures because billing may be uncertain. This is an internal conservative budget policy, not a provider-side account spending limit. Provider invoicing has not been reconciled.

Open http://127.0.0.1:3419. Build one representative mission and wait for all five operational checks. Click **Run five live AI reviews**. Use this first on the mission you want to show judges, since a complete review uses ten of the twelve request slots.

The live panel should show Operations, Sales, Kitchen, Finance and Quality reaching DONE, with generated explanations. The evidence trail should include `ai.response_received`, `ai.tool_completed` and `ai.advice_saved`. Completed roles persist in SQLite and do not repeat on refresh. Running or uncertain writes are not silently retried after a crash.

The API adapter is implemented and verified with mocks, not yet against this account. A real successful Mac run is required before claiming live inference.

## Specific errors

- OPENAI_KEY_MISSING: this server did not receive a key. Start with npm run live.
- OPENAI_UNAUTHORIZED: OpenAI rejected the key. Check the exact project key, revocation and expiry. This does not mean local code cannot use cloud AI.
- OPENAI_ACCESS_DENIED: the key/project lacks access to the selected operation or model.
- OPENAI_RATE_OR_QUOTA_LIMIT: review account billing, quota or request limits. This generic status does not identify which condition occurred.
- AI_RESPONSE_INCOMPLETE: the response hit a limit or did not finish. It is not shown as a completed review.
- AI_BUDGET_EXHAUSTED: no further provider requests can be made under this workspace reservation policy.
- AI_REVIEW_RUNNING_OR_UNCERTAIN: another run or interrupted write requires reconciliation rather than a blind retry.

## Authority and privacy

Models can request only `read_role_assessment`, with no arguments. The server supplies typed representative mission facts and the most recent team advice. It does not give a model credentials, email tools, purchases or arbitrary network tools. Generated advice cannot change inventory, quote, margin, quality status, proposal hash or review authority. Customer output remains a draft. Masky Watch clips are still prerecorded and separate from live AI text.

Only the existing strict representative inquiry schema is accepted. No real customer contact or restaurant operational data is enabled by this update. The key is omitted from child worker environments, evidence and ZIP packaging.

References: https://developers.openai.com/api/docs/guides/function-calling and https://developers.openai.com/api/docs/models/gpt-6-luna. Current installed eve agent-config documentation explains that Gateway string IDs and direct OpenAI credentials use different routing paths.
