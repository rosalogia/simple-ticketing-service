import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const backendPort = 8001;
const frontendPort = 5174;
const dbName = 'sts_e2e';

const pgPort = isCI ? '5432' : '5435';
const pgUser = isCI ? 'sts' : (process.env.USER ?? 'postgres');
const pgPassword = isCI ? 'test' : '';
const databaseUrl = pgPassword
  ? `postgresql://${pgUser}:${pgPassword}@localhost:${pgPort}/${dbName}`
  : `postgresql://${pgUser}@localhost:${pgPort}/${dbName}`;

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  testIgnore: ['**/discord/**'],
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'html' : 'list',

  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },

  projects: [
    { name: 'chromium', use: {} },
  ],

  webServer: [
    {
      command: `DATABASE_URL="${databaseUrl}" DEBUG=true uv run uvicorn app.main:app --port ${backendPort}`,
      cwd: '../backend',
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: `VITE_API_PORT=${backendPort} npx vite --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: !isCI,
      timeout: 15_000,
    },
  ],
});
