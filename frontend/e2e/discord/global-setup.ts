/**
 * Global setup for Discord E2E tests.
 * Validates required env vars, resets the E2E database, and creates
 * a test user with a real Discord bot token for API testing.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_ENV_VARS = [
  'TEST_USER_A_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
];

export default async function globalSetup() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Discord E2E tests require the following env vars: ${missing.join(', ')}\n` +
      'These tests are local-only. See playwright.discord.config.ts for details.'
    );
  }

  const pgPort = '5435';
  const pgUser = process.env.USER ?? 'postgres';
  const dbName = 'sts_e2e';
  const databaseUrl = `postgresql://${pgUser}@localhost:${pgPort}/${dbName}`;

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    DATABASE_URL: databaseUrl,
  };

  // Ensure the database exists
  try {
    execSync(`createdb -h localhost -p ${pgPort} -U ${pgUser} ${dbName} 2>/dev/null`, {
      env,
      stdio: 'pipe',
      timeout: 10000,
    });
  } catch {
    // Already exists — that's fine
  }

  console.log('[discord-setup] Resetting E2E database...');
  execSync('uv run python -m app.seed', {
    cwd: '../backend',
    env,
    stdio: 'inherit',
    timeout: 60000,
  });
  console.log('[discord-setup] Database reset complete.');

  // Create a test user with a Discord bot token session via psql.
  const botToken = process.env.TEST_USER_A_BOT_TOKEN!;
  const sessionId = `discord-e2e-${Date.now()}`;

  // Use a SQL file to avoid shell quoting issues with the bot token
  const sqlFile = join(__dirname, '.discord-setup.sql');
  const sql = [
    `INSERT INTO users (username, display_name, discord_id, created_at) VALUES ('test-bot-a', 'Test Bot A', 'bot-a-${Date.now()}', NOW());`,
    `INSERT INTO sessions (id, user_id, discord_access_token, created_at, expires_at) VALUES ('${sessionId}', (SELECT id FROM users WHERE username = 'test-bot-a'), '${botToken}', NOW(), NOW() + INTERVAL '30 days');`,
  ].join('\n');

  writeFileSync(sqlFile, sql);
  execSync(`psql -h localhost -p ${pgPort} -U ${pgUser} -d ${dbName} -f "${sqlFile}"`, {
    env,
    stdio: 'inherit',
    timeout: 10000,
  });

  // Write session ID to a temp file so test workers can read it
  const sessionFile = join(__dirname, '.discord-session-id');
  writeFileSync(sessionFile, sessionId);
  console.log('[discord-setup] Created bot token session:', sessionId);
}
