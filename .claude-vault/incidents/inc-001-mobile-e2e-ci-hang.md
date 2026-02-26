---
type: incident
severity: sev3
status: resolved
affected_components:
  - "[[mobile]]"
symptoms:
  - "Mobile E2E CI job ran for 2+ hours without completing"
  - "Postgres container logging 'role root does not exist' every 5 seconds"
root_cause: android-emulator-runner splits multi-line script into separate sh -c calls
duration_minutes: 120
---

## Detection
Manual observation — PR #28 CI run had been going for 2 hours.

## Symptoms
- `mobile-e2e` job hung indefinitely on the "Run mobile E2E tests" step.
- Postgres service container logged `FATAL: role "root" does not exist` every 5 seconds (the `pg_isready` health check running as root).
- Backgrounded uvicorn process kept running with APScheduler firing every minute.

## Investigation
1. Checked GitHub Actions logs for the `reactivecircus/android-emulator-runner@v2` step.
2. Found the action splits the multi-line `script` block into separate `sh -c` invocations per line.
3. Line `for i in $(seq 1 30); do` was executed alone as `sh -c 'for i in $(seq 1 30); do'`, producing `Syntax error: end of file unexpected (expecting "done")`.
4. The emulator was killed after the script error, but the backgrounded `uvicorn` process (started with `&`) continued running indefinitely.
5. The Postgres "role root" errors were from `pg_isready` health checks running as root user — cosmetic, not the cause.

## Root Cause
`reactivecircus/android-emulator-runner@v2` does not execute the `script` parameter as a single shell script. It splits on newlines and runs each line as a separate `sh -c` invocation. Multi-line constructs like `for` loops, `if` blocks, and variable captures across lines (`PID=$!` on one line, `kill $PID` on another) break silently or with confusing errors.

Additionally, the inline script had no `trap` cleanup, so the backgrounded uvicorn process was never killed when the script failed.

## Resolution
Replaced the inline multi-line script with a single-line call to `mobile/scripts/run-e2e.sh`, which already existed and handles:
- Backend startup and health check loop
- `adb reverse` port forwarding
- Detox test execution
- `trap cleanup EXIT` for reliable process cleanup

Added `DETOX_CONFIG` env var support so CI can override the default Detox configuration (`android.ci.debug` vs `android.emu.debug`).

Commit: `28fcf16` on branch `feat/mobile-detox-e2e`.

## Prevention
- Never use multi-line `script` blocks with `reactivecircus/android-emulator-runner@v2`. Always call a shell script file instead.
- Always use `trap` cleanup for backgrounded processes in CI scripts.
- See [[rb-android-emulator-runner-scripts]].
