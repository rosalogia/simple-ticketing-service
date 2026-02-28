/**
 * Global setup for E2E tests: reset and re-seed the E2E database
 * so every test run starts with a clean slate.
 */
import { execSync } from 'child_process';

const isCI = !!process.env.CI;
const pgPort = isCI ? '5432' : '5435';
const pgUser = isCI ? 'sts' : (process.env.USER ?? 'postgres');
const pgPassword = isCI ? 'test' : '';
const dbName = 'sts_e2e';

export default async function globalSetup() {
  const databaseUrl = pgPassword
    ? `postgresql://${pgUser}:${pgPassword}@localhost:${pgPort}/${dbName}`
    : `postgresql://${pgUser}@localhost:${pgPort}/${dbName}`;

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    DATABASE_URL: databaseUrl,
  };

  // Ensure the database exists
  try {
    execSync(`createdb -h localhost -p ${pgPort} -U ${pgUser} ${dbName} 2>/dev/null`, {
      env,
      stdio: 'pipe',
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
  });

  console.log('[global-setup] Database reset complete.');
}
