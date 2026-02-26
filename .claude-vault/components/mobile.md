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

## Customer Impact
Mobile users get real-time page alerts for critical tickets. If mobile degrades, on-call responders may miss pages.
