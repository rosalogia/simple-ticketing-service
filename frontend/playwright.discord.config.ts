/**
 * Playwright config for Discord integration E2E tests.
 *
 * These tests run the backend with DEBUG=false (production-like mode)
 * and use a Discord bot token to test the Discord integration UI
 * without needing browser-based OAuth login.
 *
 * Local-only — not run in CI. Requires env vars:
 *   TEST_USER_A_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
 *
 * Usage:
 *   npx playwright test --config playwright.discord.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

const backendPort = 8002;
const frontendPort = 5175;
const dbName = 'sts_e2e';

const pgPort = '5435';
const pgUser = process.env.USER ?? 'postgres';
const databaseUrl = `postgresql://${pgUser}@localhost:${pgPort}/${dbName}`;

const discordClientId = process.env.DISCORD_CLIENT_ID ?? '';
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET ?? '';
const discordBotToken = process.env.TEST_USER_A_BOT_TOKEN ?? '';
const redirectUri = `http://localhost:${frontendPort}/api/auth/callback`;

export default defineConfig({
  globalSetup: './e2e/discord/global-setup.ts',
  testDir: './e2e/discord',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },

  projects: [
    { name: 'discord', use: {} },
  ],

  webServer: [
    {
      command: [
        `DATABASE_URL="${databaseUrl}"`,
        'DEBUG=false',
        `DISCORD_CLIENT_ID="${discordClientId}"`,
        `DISCORD_CLIENT_SECRET="${discordClientSecret}"`,
        `DISCORD_REDIRECT_URI="${redirectUri}"`,
        `DISCORD_BOT_TOKEN="${discordBotToken}"`,
        `SESSION_SECRET_KEY="e2e-test-secret-key-discord"`,
        `ALLOWED_ORIGINS="http://localhost:${frontendPort}"`,
        `uv run uvicorn app.main:app --port ${backendPort}`,
      ].join(' '),
      cwd: '../backend',
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `VITE_API_PORT=${backendPort} npx vite --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 15_000,
    },
  ],
});
