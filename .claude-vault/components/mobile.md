---
type: component
name: mobile
health: stable
dependencies:
  - "[[backend]]"
dependents: []
---

## Summary
React Native mobile app (bare workflow, TypeScript) for STS. Provides on-the-go ticket management, push notification alerting with alarm-style page alerts (siren sound on Android via native `SirenPlayer` module), and pageable hours configuration.

## Interfaces
- Communicates with backend via `src/api/client.ts` fetch wrapper with `Authorization: Bearer` token.
- Auth via Discord OAuth → token stored in react-native-keychain.
- FCM push notifications via `@react-native-firebase/messaging` + Notifee.
- Navigation: `@react-navigation` with native stack + bottom tabs.

## Health
Stable. Active development (Detox E2E tests recently added).

## Limitations
- Android-focused (SirenPlayer native module is Android-only).
- Bare workflow — requires native build tooling.

## Caution Areas
- `src/notifications/` — FCM message handling, action handlers, token management.
- `src/screens/PageAlertScreen.tsx` — full-screen alarm UI; plays siren sound.
- `android/` native code — SirenPlayer Java module, notification channels.
- Detox E2E tests in `e2e/` — require running emulator.
- CI uses `reactivecircus/android-emulator-runner@v2` — **never use multi-line `script` blocks** (splits into separate `sh -c` calls). Always call `mobile/scripts/run-e2e.sh` instead. See [[rb-android-emulator-runner-scripts]] and [[inc-001-mobile-e2e-ci-hang]].

## Key Invariants
- [[inv-mobile-ci-typecheck]] — CI must typecheck before running tests
- [[inv-no-e2e-mocking]] — E2E tests must not mock

## Key Runbooks
- [[rb-mobile-detox-e2e-debugging]] — Writing and debugging Detox E2E tests
- [[rb-android-emulator-runner-scripts]] — CI emulator runner gotchas

## Customer Impact
Mobile users get real-time page alerts for critical tickets. If mobile degrades, on-call responders may miss pages.
