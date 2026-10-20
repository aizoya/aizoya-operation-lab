# AdaL runtime check

Account: hello@aizoya.com. Pro billing activation was previously verified in browser; CLI authentication was not completed.

Official installer source: https://adal.sylph.ai/install.sh

Installer resolved AdaL 1.10.2 and downloaded its Linux x64 distribution. Archive extraction returned unsupported ownership errors for uid/gid 1001. Standard installer completion and PATH setup did not occur. The extracted official executable nevertheless runs `--version` and `--help` successfully.

Interactive startup and a headless readiness prompt both failed before a model run. The headless result reported success=false, model=null, answer=null, tool_calls=[], exit_code=1.

Sanitized backend error:

```
Backend crashed during startup (code: 0, signal: null)
No API keys found in environment
Cannot watch frontend process 2: it is not running
psutil not available — cannot log memory diagnostics
```

The process-watch message is a troubleshooting lead, not a proven root cause. No vendor source was modified, no credentials were copied from the browser, and no further credits were purchased. CLI usage and Pro allowance remain unverified. This is a workspace-specific failure and does not establish that AdaL fails on a normal supported desktop.

Next: use a supported desktop/terminal or obtain vendor guidance on this environment. Keep the working restaurant demo independent of this blocker. AdaL account activation does not provide runtime inference credentials to the restaurant app.
