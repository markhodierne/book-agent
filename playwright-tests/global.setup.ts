import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('Setting up Playwright tests...');

  // Launch browser for authentication and setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set up test environment
    await page.goto('http://localhost:3000');

    // Wait for the app to be ready
    await page.waitForSelector('body', { timeout: 10000 });

    console.log('Playwright setup complete');
  } catch (error) {
    console.error('Playwright setup failed:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

export default globalSetup;