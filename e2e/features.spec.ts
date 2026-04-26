import { test, expect } from '@playwright/test';

test.describe('Advanced Features Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Inject a dummy API key so the provider doesn't throw
    await page.evaluate(async () => {
      const waitForDb = () => new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          if (attempts > 50) return reject(new Error('DB timed out'));
          const request = indexedDB.open('WebAgentDB');
          request.onsuccess = (event) => {
            const db = (event.target as any).result;
            if (db.objectStoreNames.contains('settings')) {
              resolve(db);
            } else {
              db.close();
              setTimeout(check, 200);
            }
          };
          request.onerror = () => reject(new Error('Failed to open DB'));
        };
        check();
      });

      const db: any = await waitForDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        store.put({ key: 'openai_api_key', value: 'sk-dummy' });
        store.put({ key: 'credit_balance', value: 2000 }); // $20.00
        transaction.oncomplete = () => { db.close(); resolve(true); };
        transaction.onerror = () => reject(new Error('Transaction failed'));
      });
    }).catch(err => console.error('Failed to inject initial data:', err));
    
    await page.reload(); // Ensure hooks pick up the new data
  });

  test('should manage custom models', async ({ page }) => {
    // Open Settings
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('button', { name: /Models/i }).click();

    // Add custom model
    await page.getByRole('button', { name: /Add Custom Model/i }).click();
    await page.getByPlaceholder('e.g. My Llama 3').fill('Test Custom Model');
    await page.getByPlaceholder('e.g. llama-3-70b').fill('test-model-id');
    await page.getByPlaceholder('https://api.together.xyz/v1').fill('https://custom-endpoint.com/v1');
    await page.getByRole('button', { name: /Save Model/i }).click();

    // Verify it appears in the list
    await expect(page.getByText('Test Custom Model')).toBeVisible();
    await expect(page.getByText('test-model-id')).toBeVisible();

    // Close settings
    await page.locator('button:has(svg.lucide-x)').click();

    // Open model picker and verify it's there
    // First need a chat to see the picker if it's in the chat interface
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.getByRole('button', { name: /GPT-4o/i }).first().click();
    await expect(page.getByText('Test Custom Model')).toBeVisible();
  });

  test('should handle billing and feature unlocks', async ({ page }) => {
    // Open Settings
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('button', { name: /Billing/i }).click();

    // Check initial balance
    await expect(page.getByText('$20.00')).toBeVisible();

    // Find Realtime Voice feature and "Buy" button
    const featureItem = page.locator('div', { hasText: 'Realtime Voice' });
    const buyButton = featureItem.getByRole('button', { name: /Buy/i });
    
    // Unlock feature (Mocking the process might be needed if there's external redirect, 
    // but here it seems it just deducts credits locally)
    await buyButton.click();

    // Verify it says UNLOCKED
    await expect(featureItem.getByText('UNLOCKED')).toBeVisible();

    // Check new balance ($20.00 - $10.00 = $10.00)
    await expect(page.getByText('$10.00')).toBeVisible();
  });

  test('should show MCP registration form', async ({ page }) => {
    // Open Settings
    await page.getByRole('button', { name: /Settings/i }).click();
    await page.getByRole('button', { name: /MCPs/i }).click();

    // Click Add MCP
    await page.getByRole('button', { name: /Add MCP/i }).click();

    // Check form fields for HTTP
    await expect(page.getByPlaceholder('e.g. My Tools')).toBeVisible();
    await expect(page.getByPlaceholder('https://mcp.example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Bearer token or API key')).toBeVisible();

    // Switch to OAuth
    await page.getByRole('combobox').selectOption('oauth');

    // Check OAuth fields
    await expect(page.getByText('Client ID')).toBeVisible();
    await expect(page.getByText('Client Secret')).toBeVisible();
    await expect(page.getByText('Authorization URL')).toBeVisible();
    await expect(page.getByText('Token URL')).toBeVisible();
  });
});
