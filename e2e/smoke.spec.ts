import { expect, test } from '@playwright/test';

test('a página inicial carrega e abre o modal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Clube de Poker' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir modal' }).click();
  await expect(page.getByRole('dialog', { name: 'Exemplo de modal' })).toBeVisible();
});

test('rota inexistente mostra página não encontrada', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});
