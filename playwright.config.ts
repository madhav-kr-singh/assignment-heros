import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ponytail: Load .env.local manually and log for diagnostics
const env: Record<string, string> = {};
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  console.log('Playwright config loading env from:', envPath);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const index = trimmed.indexOf('=');
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        env[key] = val;
      }
    });
    console.log('Successfully loaded env keys:', Object.keys(env));
  } else {
    console.error('File does not exist:', envPath);
  }
} catch (error) {
  console.error('Failed to load env variables in Playwright config:', error);
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env,
  },
});
