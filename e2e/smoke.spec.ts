import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('catalog → estimate → quantity → discount → clear', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByText('СметаПро', { exact: true })).toBeVisible();
  const addButton = page.getByRole('button', { name: 'В смету' }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  const mobileEstimateTab = page.getByRole('button', { name: /^Смета \(1\)$/ });
  if (await mobileEstimateTab.isVisible().catch(() => false)) {
    await mobileEstimateTab.click();
  }

  await expect(page.getByRole('heading', { name: 'Позиции сметы' })).toBeVisible();
  const estimateQuantity = page.locator('input[title="Количество"]').first();
  await expect(estimateQuantity).toHaveValue('1');
  await estimateQuantity.fill('2.5');
  await estimateQuantity.blur();
  await expect(estimateQuantity).toHaveValue('2.5');

  await page.getByRole('button', { name: '10%', exact: true }).click();
  await expect(page.getByText('скидка 10%', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Очистить смету', exact: true }).click();
  const confirmYes = page.getByRole('button', { name: 'Да', exact: true }).filter({ visible: true }).last();
  await expect(confirmYes).toBeVisible();
  await confirmYes.click();
  await expect(page.getByRole('heading', { name: 'Смета пока пуста' })).toBeVisible();
});

test('settings opens and contains install action and Telegram contact', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Настройки' }).click();

  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Установка приложения/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Связаться в Telegram' })).toBeVisible();
});
