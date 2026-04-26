import { Client } from '@notionhq/client';
import { db, type Chat, type Message } from './db';

export interface NotionSyncConfig {
  token: string;
  chatsDatabaseId: string;
  messagesDatabaseId: string;
}

export class NotionSyncService {
  private client: Client | null = null;
  private config: NotionSyncConfig | null = null;

  async init() {
    const token = await db.settings.get('notion_token');
    const chatsDatabaseId = await db.settings.get('notion_chats_db_id');
    const messagesDatabaseId = await db.settings.get('notion_messages_db_id');

    if (token?.value && chatsDatabaseId?.value && messagesDatabaseId?.value) {
      this.config = {
        token: token.value,
        chatsDatabaseId: chatsDatabaseId.value,
        messagesDatabaseId: messagesDatabaseId.value,
      };
      this.client = new Client({ auth: this.config.token });
      return true;
    }
    return false;
  }

  async sync(force: boolean = false) {
    const initialized = await this.init();
    if (!initialized || !this.client || !this.config) {
      console.warn('Notion sync not configured');
      return;
    }

    try {
      console.log(`Starting Notion sync (force: ${force})...`);
      await this.syncChats(force);
      await this.syncMessages(force);
      
      await db.settings.put({ key: 'last_sync_at', value: Date.now() });
      console.log('Notion sync completed successfully');
    } catch (error) {
      console.error('Notion sync failed:', error);
      throw error;
    }
  }

  async forceSync() {
    return this.sync(true);
  }

  private async syncChats(force: boolean) {
    if (!this.client || !this.config) return;

    const localChats = await db.chats.toArray();
    const notionChats = await this.fetchAllPages(this.config.chatsDatabaseId);

    const notionMap = new Map(
      notionChats.map((page: any) => [
        page.properties.id.rich_text[0]?.plain_text,
        page
      ])
    );

    for (const chat of localChats) {
      const notionPage = notionMap.get(chat.id);
      
      if (!notionPage) {
        await this.rateLimitedCall(() => this.client!.pages.create({
          parent: { database_id: this.config!.chatsDatabaseId },
          properties: this.mapChatToNotionProperties(chat),
        }));
      } else {
        const notionUpdatedAt = propsToNumber(notionPage.properties.updated_at) || 0;
        if (force || chat.updated_at > notionUpdatedAt) {
          await this.rateLimitedCall(() => this.client!.pages.update({
            page_id: notionPage.id,
            properties: this.mapChatToNotionProperties(chat),
          }));
        } else if (notionUpdatedAt > chat.updated_at) {
          await db.chats.put(this.mapNotionToChat(notionPage));
        }
      }
    }

    // Also handle chats that exist in Notion but not locally
    for (const [id, notionPage] of notionMap) {
      if (!localChats.find(c => c.id === id)) {
        await db.chats.put(this.mapNotionToChat(notionPage));
      }
    }
  }

  private async syncMessages(force: boolean) {
    if (!this.client || !this.config) return;

    const localMessages = await db.messages.toArray();
    const notionMessages = await this.fetchAllPages(this.config.messagesDatabaseId);

    const notionMap = new Map(
      notionMessages.map((page: any) => [
        page.properties.id.rich_text[0]?.plain_text,
        page
      ])
    );

    for (const msg of localMessages) {
      const notionPage = notionMap.get(msg.id);
      if (!notionPage) {
        await this.rateLimitedCall(() => this.client!.pages.create({
          parent: { database_id: this.config!.messagesDatabaseId },
          properties: this.mapMessageToNotionProperties(msg),
        }));
      } else if (force) {
        await this.rateLimitedCall(() => this.client!.pages.update({
          page_id: notionPage.id,
          properties: this.mapMessageToNotionProperties(msg),
        }));
      }
      // Messages are generally immutable in our app, so we don't handle updates unless forced
    }

    // Pull missing messages from Notion
    for (const [id, notionPage] of notionMap) {
      if (!localMessages.find(m => m.id === id)) {
        await db.messages.put(this.mapNotionToMessage(notionPage));
      }
    }
  }

  private async rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
    // Basic delay to avoid hitting rate limits (3 requests per second)
    await new Promise(resolve => setTimeout(resolve, 350));
    return fn();
  }

  private async fetchAllPages(databaseId: string) {
    if (!this.client) return [];
    let results: any[] = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const response: any = await this.rateLimitedCall(() => this.client!.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
      }));
      results = results.concat(response.results);
      if (!response.has_more) break;
      cursor = response.next_cursor;
    }
    return results;
  }

  private mapChatToNotionProperties(chat: Chat): any {
    return {
      id: { rich_text: [{ text: { content: chat.id } }] },
      title: { title: [{ text: { content: chat.title } }] },
      created_at: { number: chat.created_at },
      updated_at: { number: chat.updated_at },
      model_id: { rich_text: [{ text: { content: chat.model_id } }] },
      system_prompt: { rich_text: [{ text: { content: chat.system_prompt || '' } }] },
    };
  }

  private mapNotionToChat(page: any): Chat {
    const props = page.properties;
    return {
      id: props.id.rich_text[0]?.plain_text || page.id,
      title: props.title.title[0]?.plain_text || 'Untitled',
      created_at: props.created_at.number,
      updated_at: props.updated_at.number,
      model_id: props.model_id.rich_text[0]?.plain_text || 'default',
      system_prompt: props.system_prompt.rich_text[0]?.plain_text,
    };
  }

  private mapMessageToNotionProperties(msg: Message): any {
    return {
      id: { rich_text: [{ text: { content: msg.id } }] },
      chat_id: { rich_text: [{ text: { content: msg.chat_id } }] },
      role: { select: { name: msg.role } },
      content: { rich_text: [{ text: { content: msg.content.substring(0, 2000) } }] }, // Notion rich text limit
      timestamp: { number: msg.timestamp },
      tokens_used: { number: msg.tokens_used || 0 },
      is_error: { checkbox: !!msg.is_error },
    };
  }

  private mapNotionToMessage(page: any): Message {
    const props = page.properties;
    return {
      id: props.id.rich_text[0]?.plain_text || page.id,
      chat_id: props.chat_id.rich_text[0]?.plain_text || '',
      role: props.role.select.name as any,
      content: props.content.rich_text[0]?.plain_text || '',
      timestamp: props.timestamp.number,
      tokens_used: props.tokens_used.number || 0,
      is_error: props.is_error.checkbox,
    };
  }
}

function propsToNumber(prop: any): number | null {
  return prop?.number || null;
}

export const notionSyncService = new NotionSyncService();
