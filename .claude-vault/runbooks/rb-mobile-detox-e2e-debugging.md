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

### Keyboard, ScrollView, and autocomplete interactions

9. **`scrollTo('bottom')` fails with "Scrolling a lot without reaching the edge"** when the keyboard is open or dynamic content (like suggestion dropdowns) keeps expanding the scroll area. Fix: use `waitFor(...).toBeVisible().whileElement(scrollView).scroll(200, 'down')` to incrementally scroll until the target element appears, or dismiss the keyboard first. Note: even `whileElement().scroll()` can loop forever if the keyboard covers the target — always dismiss the keyboard before scrolling to a button near the bottom of the form.

10. **`tapReturnKey()` triggers `onBlur` on Android** — if your suggestions dropdown is gated on a `focused` state, pressing return will blur the input, hide suggestions, and the suggestion `testID` becomes null. Don't dismiss the keyboard before tapping a suggestion if suggestions close on blur.

11. **TextInput steals taps from adjacent TouchableOpacity/Pressable on Android.** When a suggestion list is rendered directly below a focused TextInput, tapping a suggestion may instead refocus the input. Solutions:
    - Use `testID` on suggestion items (not `by.text()`) to target them precisely.
    - Type a filter string first (to narrow suggestions), then use `whileElement(...).scroll()` to scroll the suggestion into the visible area away from the input.
    - If the suggestion `onPress` never fires, the input is likely intercepting the touch — consider dismissing the keyboard first, but only if suggestions remain visible after blur.

12. **`tapReturnKey()` on multiline TextInput inserts a newline, not dismiss.** On Android, a multiline TextInput's return key adds `\n` instead of dismissing the keyboard. To dismiss after typing in a multiline field, tap a nearby single-line TextInput first, then call `tapReturnKey()` on that:
    ```typescript
    await element(by.id('single-line-input')).tap();
    await element(by.id('single-line-input')).tapReturnKey();
    ```

13. **`by.text()` ambiguity with accumulated data.** Test suites run in alphabetical file order and the database persists across all suites. A `by.text('Housemates')` that matched one element in isolation may match two after a prior suite creates tickets. Use `.atIndex(0)` or `by.id()` for elements that could be duplicated.

### Running individual test files

14. **Don't use `npx detox test` directly** — it skips the backend and `adb reverse` setup. Use `scripts/run-e2e.sh <test-file>` to run a single file with the full stack:
    ```bash
    scripts/reset-test-db.sh && scripts/run-e2e.sh e2e/my-test.test.ts
    ```

### DateTimePicker (Android)

15. **`display="calendar"` causes ANR in Detox** — the full calendar view blocks the main thread and triggers Application Not Responding. Use `display="default"` (spinner dialog) for Android. The default display shows OK/Cancel buttons that Detox can tap via `by.text('OK')`.

16. **Cancel on Android DateTimePicker still fires `onChange`.** The `event.type` field distinguishes: `'set'` means OK was tapped, `'dismissed'` means Cancel. Always check `event.type === 'set'` before updating state.

### Debugging failures

17. **Check backend logs** in the test output — look for whether the expected API endpoint was actually called. Missing calls usually mean the request failed before reaching the backend (token not set, wrong URL, etc.).

18. **Check actual element state** in the Detox error output. The "Got:" line shows the element's position (`x`, `y`), dimensions, and visibility — invaluable for layout issues.

### grep and ripgrep

19. **ripgrep (`rg`) can't parse `-E` flag with Unicode characters.** The Grep tool in this environment uses `rg` under the hood. When searching E2E output for `✓` or `✕`, use system grep: `LC_ALL=en_US.UTF-8 /usr/bin/grep -E '(PASS|FAIL|✕|✓)' file.txt`.

## Rollback
N/A — tests are read-only.

## Escalation
- If JAVA_HOME is stale: `readlink -f $(which java)` to find current nix store path, then derive JAVA_HOME by stripping `/bin/java`.
- If emulator won't boot: check `$ANDROID_HOME/emulator/emulator -list-avds` and `.detoxrc.js` for AVD name match.
- See [[rb-android-emulator-runner-scripts]] for CI-specific issues.
