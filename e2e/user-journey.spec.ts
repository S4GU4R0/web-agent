import { test, expect } from '@playwright/test';

test.describe('Web-Agent User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock OpenAI API calls
    await page.route('**/v1/chat/completions', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const postData = JSON.parse(request.postData() || '{}');
        
        if (postData.stream) {
          // Stream response
          const chunks = [
            { choices: [{ delta: { content: 'This is a mocked response ' }, index: 0 }] },
            { choices: [{ delta: { content: 'from OpenAI in E2E.' }, index: 0 }] },
            { choices: [{ delta: { content: '' }, index: 0, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }
          ];
          
          let body = chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
          
          await route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: body
          });
        } else {
          // Standard JSON response
          const json = {
            id: 'chatcmpl-mock',
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4o',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'This is a mocked response from OpenAI in E2E.',
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
          };
          await route.fulfill({ 
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(json) 
          });
        }
      } else {
        await route.continue();
      }
    });

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
        transaction.oncomplete = () => { db.close(); resolve(true); };
        transaction.onerror = () => reject(new Error('Transaction failed'));
      });
    }).catch(err => console.error('Failed to inject API key:', err));
  });

  test('should create a new chat and send a message', async ({ page }) => {
    // 1. Initial state check
    await expect(page.getByText('Select a chat or create a new one to start')).toBeVisible();

    // 2. Chat creation
    // The Plus button is in the sidebar header
    const newChatButton = page.locator('button:has(svg.lucide-plus)').first();
    await newChatButton.click();

    // Verify "New Chat" item appears in sidebar and empty state in chat area
    await expect(page.locator('nav').getByText('New Chat')).toBeVisible();
    await expect(page.getByText('This chat is empty. Send a message to begin.')).toBeVisible();
    
    // 3. Model Selection
    // Open model picker
    await page.getByRole('button', { name: /GPT-4o/i }).first().click();
    // Select a different model if available, otherwise just check it's open
    await expect(page.getByText('Select Model')).toBeVisible();
    // Select 'GPT-4o mini' (from initDb in db.ts)
    await page.getByRole('button', { name: /GPT-4o mini/i }).click();
    // Picker should close
    await expect(page.getByText('Select Model')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /GPT-4o mini/i })).toBeVisible();

    // 4. Message sending
    const input = page.getByPlaceholder('How can I help you today?');
    await input.fill('Hello Agent');
    await input.press('Enter');

    // Verify messages appearing
    await expect(page.getByText('Hello Agent')).toBeVisible();
    
    // Wait for the mock response - use a more flexible matcher and longer timeout
    const mockResponse = page.getByText(/mocked response/i);
    await expect(mockResponse).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/OpenAI in E2E/i)).toBeVisible();
  });

  test('should navigate to settings and back', async ({ page }) => {
    // Click Settings in sidebar
    await page.getByRole('button', { name: /Settings/i }).click();
    
    // Verify settings modal is visible
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /API Keys/i })).toBeVisible();
    
    // Switch to Models tab
    await page.getByRole('button', { name: /Models/i }).click();
    await expect(page.getByText('Installed Models')).toBeVisible();

    // Close settings using the X button
    await page.locator('button:has(svg.lucide-x)').click();
    await expect(page.getByRole('heading', { name: /Settings/i })).not.toBeVisible();
  });

  test('should persist chat history across reloads', async ({ page }) => {
    // Create a chat and send a message
    await page.locator('button:has(svg.lucide-plus)').first().click();
    const input = page.getByPlaceholder('How can I help you today?');
    await input.fill('Persistent message');
    await input.press('Enter');
    await expect(page.getByText('Persistent message')).toBeVisible();

    // Reload the page
    await page.reload();

    // Verify sidebar still has the chat
    await expect(page.locator('nav').getByText('New Chat')).toBeVisible();
    
    // Click the chat and verify message is still there
    await page.locator('nav').getByText('New Chat').first().click();
    await expect(page.getByText('Persistent message')).toBeVisible();
  });

  test('should support offline mode (simulated)', async ({ page, context }) => {
    // Create a chat
    await page.locator('button:has(svg.lucide-plus)').first().click();
    
    // Go offline
    await context.setOffline(true);
    
    const input = page.getByPlaceholder('How can I help you today?');
    await input.fill('Message while offline');
    await input.press('Enter');

    // It should still show the user message (offline first)
    await expect(page.getByText('Message while offline')).toBeVisible();
    
    // It will probably show an error for the AI response because the network is off and it's not mocked for offline error specifically in this test
    // But the fact that the user message appeared means it was saved to Dexie.
    
    // Back online
    await context.setOffline(false);
    await page.reload();
    
    // Verify it's still there
    await page.locator('nav').getByText('New Chat').first().click();
    await expect(page.getByText('Message while offline')).toBeVisible();
  });
});
