import Dexie, { type EntityTable } from 'dexie';

export interface Chat {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  system_prompt?: string;
  model_id: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  tokens_used?: number;
  tool_calls?: any[];
  tool_call_id?: string;
  is_error?: boolean;
}

export interface MCP {
  id: string;
  name: string;
  type: 'http' | 'oauth';
  endpoint: string;
  config?: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    authUrl?: string;
    tokenUrl?: string;
    redirectUri?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    [key: string]: any;
  };
}

export interface Setting {
  key: string;
  value: any;
}

export class WebAgentDatabase extends Dexie {
  chats!: EntityTable<Chat, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  mcps!: EntityTable<MCP, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('WebAgentDB');
    this.version(1).stores({
      chats: 'id, updated_at',
      messages: 'id, chat_id, timestamp',
      mcps: 'id, name',
      settings: 'key',
    });
  }
}

export const db = new WebAgentDatabase();

// Initial data
db.on('populate', async () => {
  await db.settings.add({ key: 'theme', value: 'dark' });
  await db.settings.add({ key: 'credit_balance', value: 10.0 });
  await db.settings.add({ key: 'notion_auto_sync', value: false });
  await db.settings.add({ key: 'default_model', value: 'puter' });
});
