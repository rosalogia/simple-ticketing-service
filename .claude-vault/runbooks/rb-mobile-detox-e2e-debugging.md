---
type: runbook
component: "[[mobile]]"
trigger: Mobile Detox E2E tests failing or being written
last_used: 2026-02-28
---

## Trigger
Writing new Detox E2E tests for the mobile app, or debugging failures in existing ones.

## Prerequisites
- Android emulator (`sts_test` AVD) booted
- JAVA_HOME set correctly (nix store path changes on updates; resolve via `readlink -f $(which java)`)
- App APK rebuilt with `npm run test:e2e:build` after code changes (JS is bundled into APK via `-PbundleInDebug`, NOT served by Metro)

## Steps

### Before running tests
1. **Rebuild the APK** if any JS/TS code changed. The debug APK bundles JS statically — Metro is not used during Detox tests.
   ```bash
   JAVA_HOME=<path> npm run test:e2e:build
   ```

2. **Reset the test database** (done automatically by `npm run test:e2e`, but useful to know):
   ```bash
   scripts/reset-test-db.sh
   ```

3. **Verify seed data assumptions.** Check what the seed data actually contains before writing assertions:
   ```bash
   psql -p 5435 -d sts_e2e -c "SELECT t.id, t.title, t.due_date, t.status, u.username as assignee FROM tickets t JOIN users u ON t.assignee_id = u.id ORDER BY t.id;"
   ```
   Note: user_id=1 is `claude-bot`, not Alice. Alice=2, Bob=3, Carol=4, Dave=5.

### Common Detox pitfalls

4. **Async data loading:** Screens that load data via `useFocusEffect` won't have content immediately. Use `waitFor` with timeout instead of bare `expect`:
   ```typescript
   await waitFor(element(by.id('my-element')))
     .toBeVisible()
     .withTimeout(10000);
   ```

5. **Visibility vs existence:** Elements with absolute positioning (badges, overlays) may render at negative offsets and fail `toBeVisible()` (requires 75% on-screen). Use `toExist()` for such elements.

6. **Regex matchers:** Detox's `by.text()` with regex works differently than Playwright. Prefer exact text matches: `by.text('1 overdue')` not `by.text(/overdue/)`.

7. **Test isolation:** Each test does `device.reloadReactNative()` but the database persists across the full suite run. Earlier test suites (e.g., `tickets.test.ts`) may create additional data. Don't assume the DB only has seed data.

8. **Promise.all in load functions:** If a screen loads multiple endpoints in `Promise.all` inside a `try/catch`, one failure silently kills all loads. Separate into independent try/catch blocks.

### Reading test output

The test output is extremely noisy — backend HTTP logs, scheduler messages, and Detox framework chatter dominate. When capturing output to a file (`> /tmp/e2e-output.txt 2>&1`), use these patterns to find useful information:

**Test results summary** (pass/fail per test):
```bash
grep -E '✓|✕|Test Suites|Tests:' /tmp/e2e-output.txt
```

**Failure details** (error messages, stack traces, element state):
```bash
grep -E '● |Test Failed|was null|No views' /tmp/e2e-output.txt
```
Use `-C 10` for surrounding context on the failure messages.

**Whether a specific API endpoint was called:**
```bash
grep '/api/tickets/urgent' /tmp/e2e-output.txt
```
Backend logs each request with path + status code. Missing entries mean the request never reached the backend.

**Patterns that produce noise (avoid):**
- `grep -i error` — matches scheduler log lines, Firebase warnings, deprecation notices
- `grep HTTP` — every single API request, hundreds of lines
- `grep detox` — framework lifecycle messages, not test results

**Important:** Don't pipe `npm run test:e2e` through `grep` directly — the output is mixed stdout/stderr and `grep` may buffer indefinitely waiting for matches. Always redirect to a file first, then search the file.

### Debugging failures

9. **Check backend logs** in the test output — look for whether the expected API endpoint was actually called. Missing calls usually mean the request failed before reaching the backend (token not set, wrong URL, etc.).

10. **Check actual element state** in the Detox error output. The "Got:" line shows the element's position (`x`, `y`), dimensions, and visibility — invaluable for layout issues.

## Rollback
N/A — tests are read-only.

## Escalation
- If JAVA_HOME is stale: `readlink -f $(which java)` to find current nix store path, then derive JAVA_HOME by stripping `/bin/java`.
- If emulator won't boot: check `$ANDROID_HOME/emulator/emulator -list-avds` and `.detoxrc.js` for AVD name match.
- See [[rb-android-emulator-runner-scripts]] for CI-specific issues.
