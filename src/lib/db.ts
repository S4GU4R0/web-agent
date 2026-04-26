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

export interface CustomModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  base_url: string;
  api_key: string;
}

export interface Transaction {
  id: string;
  type: 'top-up' | 'usage';
  amount: number; // in "credits" (e.g., 1 credit = $0.01)
  description: string;
  timestamp: number;
}

export class WebAgentDatabase extends Dexie {
  chats!: EntityTable<Chat, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  mcps!: EntityTable<MCP, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  customModels!: EntityTable<CustomModel, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;

  constructor() {
    super('WebAgentDB');
    this.version(1).stores({
      chats: 'id, updated_at',
      messages: 'id, chat_id, timestamp',
      mcps: 'id, name',
      settings: 'key',
    });
    this.version(2).stores({
      chats: 'id, updated_at',
      messages: 'id, chat_id, timestamp',
      mcps: 'id, name',
      settings: 'key',
      customModels: 'id, name, model_id',
    });
    this.version(3).stores({
      chats: 'id, updated_at',
      messages: 'id, chat_id, timestamp',
      mcps: 'id, name',
      settings: 'key',
      customModels: 'id, name, model_id',
      transactions: 'id, timestamp, type',
    });
  }
}

export const db = new WebAgentDatabase();

// Initial data
db.on('populate', async () => {
  await db.settings.add({ key: 'theme', value: 'dark' });
  await db.settings.add({ key: 'credit_balance', value: 1000 }); // $10.00 in credits (1 credit = $0.01)
  await db.settings.add({ key: 'notion_auto_sync', value: false });
  await db.settings.add({ key: 'default_model', value: 'puter' });
});
