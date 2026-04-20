import { describe, it, expect, beforeEach } from 'vitest';
import { WebAgentDatabase } from '../lib/db';
import 'fake-indexeddb/auto';

describe('WebAgentDatabase', () => {
  let db: WebAgentDatabase;

  beforeEach(async () => {
    db = new WebAgentDatabase();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('should create a chat', async () => {
    const chat = {
      id: 'chat-1',
      title: 'Test Chat',
      created_at: Date.now(),
      updated_at: Date.now(),
      model_id: 'gpt-4o',
    };
    await db.chats.add(chat);
    const result = await db.chats.get('chat-1');
    expect(result).toEqual(chat);
  });

  it('should add messages to a chat', async () => {
    const message = {
      id: 'msg-1',
      chat_id: 'chat-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: Date.now(),
    };
    await db.messages.add(message);
    const result = await db.messages.where('chat_id').equals('chat-1').toArray();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(message);
  });

  it('should handle settings', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' });
    const result = await db.settings.get('theme');
    expect(result?.value).toBe('dark');
  });
});
