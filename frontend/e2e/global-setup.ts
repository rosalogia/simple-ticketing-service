/**
 * Global setup for E2E tests: reset and re-seed the E2E database
 * so every test run starts with a clean slate.
 *
 * In CI, the npm test:e2e script already runs reset-test-db.sh before
 * Playwright, so we skip this to avoid duplicate work and auth issues.
 */
import { execSync } from 'child_process';

export default async function globalSetup() {
  if (process.env.CI) return;

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

  console.log('[global-setup] Resetting E2E database...');

  // seed() drops all tables, runs Alembic migrations, and inserts sample data
  execSync('uv run python -m app.seed', {
    cwd: '../backend',
    env,
    stdio: 'inherit',
    timeout: 60000,
  });

  console.log('[global-setup] Database reset complete.');
}
