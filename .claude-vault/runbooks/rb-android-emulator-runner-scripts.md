---
type: runbook
component: "[[mobile]]"
trigger: Writing or debugging CI scripts for reactivecircus/android-emulator-runner
last_used: 2026-02-25
---

## Trigger
Any time a GitHub Actions workflow uses `reactivecircus/android-emulator-runner@v2` and needs to run non-trivial commands in the `script` parameter.

## Prerequisites
- Understanding that the action splits multi-line `script` values into separate `sh -c` calls per line.

## Steps

1. **Never use multi-line scripts inline.** Control flow (`for`, `if`, `while`), variable capture across lines (`PID=$!` then `kill $PID`), and `trap` handlers all break when split into separate `sh -c` calls.

2. **Always call a shell script file instead:**
   ```yaml
   script: path/to/script.sh [args]
   ```

3. **Ensure the script has `trap cleanup EXIT`** to kill any backgrounded processes. Without this, a failed script leaves orphan processes running until the CI job times out (6 hours default).

4. **Pass configuration via environment variables** rather than inline arguments when possible:
   ```yaml
   env:
     DETOX_CONFIG: android.ci.debug
   ```

5. **For STS mobile E2E specifically**, use:
   ```yaml
   script: mobile/scripts/run-e2e.sh --headless --record-logs all
   env:
     DETOX_CONFIG: android.ci.debug
   ```

## Rollback
N/A — this is a preventive pattern, not a corrective action.

## Escalation
If the emulator itself fails to boot, check the `api-level`, `target`, and `arch` settings. API level 34 with `google_apis` and `x86_64` is known to work. See [[inc-001-mobile-e2e-ci-hang]] for prior investigation.
