import {test, expect} from '@playwright/test';

const APP1_URL = process.env.APP1_URL ?? 'http://localhost:4000/';

test.describe('App1', () => {
  test('renders the notes UI', async ({page}) => {
    await page.goto(APP1_URL);
    await expect(page.getByText('React Notes')).toBeVisible();
    await expect(page.getByRole('button', {name: 'New'})).toBeVisible();
  });
});
