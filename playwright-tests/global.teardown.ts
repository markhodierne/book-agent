import { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('Tearing down Playwright tests...');

  // Clean up any global resources
  // For example, database cleanup, file cleanup, etc.

  console.log('Playwright teardown complete');
}

export default globalTeardown;