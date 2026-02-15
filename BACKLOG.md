# STS — Product Backlog

## Bugs / Known Issues
- [ ] SQLite migration `b265b6b652b6` (cascade deletes) fails on SQLite — needs batch mode rewrite
- [ ] `.playwright-mcp/` logs accumulating in repo root (add to .gitignore)
- [ ] Diagnostic logging in `trigger_page_for_ticket` should be cleaned up (currently `logger.warning` level)
- [ ] Alarm sound missing — `alarm.mp3` needs to be added to `mobile/android/app/src/main/res/raw/` and sound references uncommented in `channels.ts` and `messageHandler.ts`
- [x] Notification permission prompt only fires on login — if user denies, no re-prompt until next login/logout cycle

## Polish
- [x] Proper release keystore for APK signing
- [ ] App icon — replace default React Native launcher icon with STS branding
- [ ] Splash screen — add a branded splash instead of blank white
- [ ] Loading states — add skeleton loaders on Dashboard and TicketDetail screens
- [ ] Error states — show user-friendly error messages when API calls fail (currently silent)
- [ ] Pull-to-refresh indicator color — match accent color
- [x] Enrich other notifications (ticket assigned, status changed) with more context like comment notifications

## Discord Integration
- [ ] **Channel notifications** — post to a configured Discord channel on key events:
  - [ ] SEV1/SEV2 ticket created or escalated (with priority, title, assignee, link)
  - [ ] Ticket status changes (especially OPEN → IN_PROGRESS, → COMPLETED)
  - [ ] Escalation events (priority upgraded automatically)
  - [ ] Configurable per-queue: which channel, which events to post
- [ ] **Slash commands** — allow users to interact with STS from Discord:
  - [ ] `/sts create` — cut a new ticket (modal with title, description, priority, queue, assignee)
  - [ ] `/sts list` — list open tickets (filterable by queue, assignee, priority)
  - [ ] `/sts status <ticket-id>` — view ticket details
  - [ ] `/sts assign <ticket-id> <user>` — reassign a ticket
  - [ ] `/sts ack <ticket-id>` — acknowledge a page
  - [ ] `/sts close <ticket-id>` — close/complete a ticket
- [ ] **Discord bot setup** — register bot with interactions endpoint, handle verification
- [ ] **User linking** — map Discord users to STS users (already have Discord OAuth, leverage existing `discord_id` on User model)

## Feature Parity with Web
- [ ] Ticket sorting (by date, priority, status)
- [ ] Ticket due date picker on CreateTicketScreen (currently text input)
- [ ] Category/Type/Item (CTI) pickers on CreateTicketScreen
- [ ] Queue member invite by username search
- [ ] Discord server sync for queue creation
- [ ] Avatar display on ticket cards and comments
- [ ] Ticket edit history / audit log

## New Mobile Features
- [x] Push notifications (FCM + Notifee)
- [x] Disruptive paging for SEV1/SEV2
- [x] Pageable hours settings per user per queue
- [x] Ticket escalation based on due dates
- [ ] Offline support — cache tickets locally, sync when back online
- [ ] Biometric lock — require fingerprint/face to open app (keychain already in place)
- [ ] iOS build and distribution (TestFlight)
- [ ] Deep links — tap notification opens specific ticket

## Infrastructure
- [ ] CI/CD pipeline for automated APK builds (GitHub Actions)
- [ ] Automated version bumping (`versionCode` / `versionName`)
- [ ] Google Play internal testing track setup
- [ ] Apple Developer account + App Store Connect setup
- [ ] End-to-end tests (Detox or Maestro)
- [ ] Sentry or Bugsnag for crash reporting
- [ ] Rate limiting on FCM sends to avoid quota exhaustion
