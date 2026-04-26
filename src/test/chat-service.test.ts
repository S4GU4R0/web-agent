import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../lib/chat-service';
import { db, WebAgentDatabase } from '../lib/db';
import { http, HttpResponse } from 'msw';
import { server } from './setup';
import 'fake-indexeddb/auto';

// Mock Dexie globally to use a fresh instance for each test if needed
// But here ChatService uses the exported 'db'. 
// We need to clear it between tests.

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(async () => {
    chatService = new ChatService();
    await db.chats.clear();
    await db.messages.clear();
    await db.settings.clear();
  });

  it('should create a new chat', async () => {
    const chatId = await chatService.createChat('New Chat', 'gpt-4o');
    expect(chatId).toBeDefined();
    const chat = await db.chats.get(chatId);
    expect(chat?.title).toBe('New Chat');
  });

  it('should send a message and receive a streamed response', async () => {
    const chatId = await chatService.createChat('Test Chat', 'gpt-4o');
    await db.settings.put({ key: 'openai_api_key', value: 'fake-key' });

    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: 'I am ' } }] }) + '\n\n'));
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ choices: [{ delta: { content: 'an AI.' } }] }) + '\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    const onToken = vi.fn();
    await chatService.sendMessage(chatId, 'Who are you?', onToken);

    const messages = await chatService.getMessages(chatId);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Who are you?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('I am an AI.');
    expect(onToken).toHaveBeenCalledTimes(2);
  });

  it('should deduct credits based on token usage', async () => {
    const chatId = await chatService.createChat('Billing Chat', 'gpt-4o');
    await db.settings.put({ key: 'openai_api_key', value: 'fake-key' });
    await db.settings.put({ key: 'credit_balance', value: 1000 });

    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ 
              choices: [{ delta: { content: 'Response' } }],
              usage: null 
            }) + '\n\n'));
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ 
              choices: [], 
              usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 } 
            }) + '\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      })
    );

    await chatService.sendMessage(chatId, 'Hello');
    
    const balance = (await db.settings.get('credit_balance'))?.value;
    // 100 tokens * 0.001 rate = 0.1, ceil = 1 credit.
    // 1000 - 1 = 999
    expect(balance).toBe(999);
  });
});
