import {test, expect} from '@playwright/test';

const APP2_URL = process.env.APP2_URL ?? 'http://localhost:4001/';

test.describe('App2', () => {
  test('renders the notes UI', async ({page}) => {
    await page.goto(APP2_URL);
    await expect(page.getByText('React Notes')).toBeVisible();
    await expect(page.getByRole('button', {name: 'New'})).toBeVisible();
  });
});
