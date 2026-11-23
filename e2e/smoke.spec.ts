import { expect, test } from '@playwright/test';

test('sem sessão, a página inicial leva ao login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar\?next=%2F$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
});

test('valida o formulário de login antes de enviar', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Informe o e-mail')).toBeVisible();
  await expect(page.getByText('Informe a senha')).toBeVisible();
});

test('rota inexistente mostra página não encontrada', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});
