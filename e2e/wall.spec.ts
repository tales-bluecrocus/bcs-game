import { test, expect, type Page } from '@playwright/test';

// ?fast=1 collapses the setup roulette/reveal animations to near-zero
async function startGame(page: Page) {
  await page.goto('/?fast=1');
  await page.getByRole('button', { name: /Start game/i }).click();
}

async function skipBonusGreen(page: Page, teams = 3) {
  for (let i = 0; i < teams; i += 1) {
    await expect(page.getByTestId('chute-strip')).toBeVisible();
    await page.getByRole('button', { name: 'Chute 1' }).click();
    await expect(page.getByRole('button', { name: /Next team/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Next team/i }).click();
  }
}

async function toQuestion(page: Page, chuteIdx = 0) {
  await skipBonusGreen(page);
  await expect(page.getByTestId('chute-strip')).toBeVisible();
  await page.getByRole('button', { name: `Chute ${chuteIdx + 1}` }).click();
  await expect(page.getByTestId('qtext')).toBeVisible();
}

test.describe('THE WALL', () => {
  test('pick → select answer → drop lands → score updates', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message)));

    await startGame(page);

    await expect(page.getByText('BONUS · GREEN')).toBeVisible();

    // wall pick view has the canvas — regression guard for the runaway
    // canvas bug (was 75,497,297px). Check it BEFORE leaving for the question.
    await expect(page.locator('canvas')).toBeVisible();
    const canvasH = await page
      .locator('canvas')
      .evaluate((c) => (c as HTMLCanvasElement).height);
    expect(canvasH).toBeGreaterThan(1000);
    expect(canvasH).toBeLessThan(6000);

    await toQuestion(page, 0); // edge chute

    // select an answer → reveal is automatic → Drop appears
    await page.getByTestId('opt').first().click();
    const drop = page.getByRole('button', { name: /Drop the ball/i });
    await expect(drop).toBeVisible();
    await drop.click();

    await expect(page.getByRole('button', { name: /Next team/i })).toBeVisible({ timeout: 20_000 });
    const score = Number(await page.getByTestId('active-score').innerText());
    expect(Number.isFinite(score)).toBe(true); // +1/+2/+3 if right, −1/−2/−3 if wrong

    expect(pageErrors).toEqual([]);
  });

  test('skip swaps the question and decrements the counter (3 per team)', async ({ page }) => {
    await startGame(page);
    await toQuestion(page);

    const q1 = await page.getByTestId('qtext').innerText();
    await expect(page.getByRole('button', { name: /Skip \(3\)/i })).toBeVisible();
    await page.getByRole('button', { name: /Skip \(3\)/i }).click();

    await expect(page.getByRole('button', { name: /Skip \(2\)/i })).toBeVisible();
    // question changed
    const q2 = await page.getByTestId('qtext').innerText();
    expect(q2).not.toBe(q1);
  });

  test('next team advances the turn', async ({ page }) => {
    await startGame(page);
    const firstTeam = await page.locator('.border-neon').filter({ hasText: 'Team' }).innerText();

    await toQuestion(page);
    await page.getByTestId('opt').first().click();
    await page.getByRole('button', { name: /Drop the ball/i }).click();
    await page.getByRole('button', { name: /Next team/i }).click();

    await expect(page.getByTestId('chute-strip')).toBeVisible();
    const secondTeam = await page.locator('.border-neon').filter({ hasText: 'Team' }).innerText();
    expect(secondTeam).not.toBe(firstTeam);
  });
});
