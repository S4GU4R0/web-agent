import { v4 as uuidv4 } from 'uuid';
import { db, type Chat, type Message } from './db';
import { getProvider, type ModelMessage, type ModelTool } from './models';
import { notionSyncService } from './notion-sync';
import { mcpService } from './mcp-service';
import { creditService } from './credit-service';

export class ChatService {
  private async triggerAutoSync() {
    const autoSync = await db.settings.get('notion_auto_sync');
    if (autoSync?.value) {
      notionSyncService.sync().catch(e => console.error('Auto-sync failed:', e));
    }
  }

  async createChat(title: string, modelId?: string, systemPrompt?: string): Promise<string> {
    const defaultModel = await db.settings.get('default_model');
    const id = uuidv4();
    const now = Date.now();
    await db.chats.add({
      id,
      title,
      model_id: modelId || defaultModel?.value || 'puter',
      system_prompt: systemPrompt,
      created_at: now,
      updated_at: now,
    });
    this.triggerAutoSync();
    return id;
  }

  async getChats(): Promise<Chat[]> {
    return db.chats.orderBy('updated_at').reverse().toArray();
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return db.messages.where('chat_id').equals(chatId).sortBy('timestamp');
  }

  async sendMessage(
    chatId: string, 
    content: string, 
    onToken?: (token: string) => void
  ): Promise<void> {
    const chat = await db.chats.get(chatId);
    if (!chat) throw new Error('Chat not found');

    const userMessage: Message = {
      id: uuidv4(),
      chat_id: chatId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    await db.messages.add(userMessage);
    await db.chats.update(chatId, { updated_at: Date.now() });

    const history = await this.getMessages(chatId);
    let modelMessages: ModelMessage[] = history
      .filter(m => !m.is_error)
      .map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }));

    if (chat.system_prompt) {
      modelMessages.unshift({ role: 'system', content: chat.system_prompt });
    }

    let provider;
    const modelId = chat.model_id;
    
    if (modelId === 'puter' || modelId.startsWith('puter/')) {
        provider = getProvider('puter', {});
    } else {
        const settings = await db.settings.get('openai_api_key');
        provider = getProvider('openai', { apiKey: settings?.value || '' });
    }

    const allTools = await mcpService.getAllTools();

    while (true) {
        const assistantMessageId = uuidv4();
        let assistantContent = '';

        const assistantMessagePlaceholder: Message = {
          id: assistantMessageId,
          chat_id: chatId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };

        await db.messages.add(assistantMessagePlaceholder);

        try {
          const response = await provider.generateCompletion(modelMessages, {
            model: modelId,
            stream: true,
            tools: allTools,
            onToken: async (token) => {
              assistantContent += token;
              await db.messages.update(assistantMessageId, { content: assistantContent });
              if (onToken) onToken(token);
            }
          });
          
          await db.messages.update(assistantMessageId, { 
              content: response.content,
              tool_calls: response.tool_calls,
              tokens_used: response.usage?.total_tokens
          });

          if (response.usage) {
              const cost = creditService.calculateCost(response.usage.total_tokens, chat.model_id);
              await creditService.deductCredits(cost, `Chat usage: ${chat.model_id}`);
          }

          modelMessages.push(response);

          if (response.tool_calls && response.tool_calls.length > 0) {
              for (const tc of response.tool_calls) {
                  const toolInfo = allTools.find(t => t.name === tc.function.name);
                  if (toolInfo) {
                      const toolResult = await mcpService.callTool(
                          toolInfo.mcpId, 
                          toolInfo.originalName, 
                          JSON.parse(tc.function.arguments)
                      );
                      
                      const toolMessage: Message = {
                          id: uuidv4(),
                          chat_id: chatId,
                          role: 'tool',
                          content: JSON.stringify(toolResult),
                          tool_call_id: tc.id,
                          timestamp: Date.now(),
                      };
                      
                      await db.messages.add(toolMessage);
                      modelMessages.push({
                          role: 'tool',
                          content: toolMessage.content,
                          tool_call_id: tc.id
                      });
                  }
              }
              // Loop back to get next model response
              continue;
          }
          
          await db.chats.update(chatId, { updated_at: Date.now() });
          this.triggerAutoSync();
          break;
        } catch (error) {
          console.error('Failed to get completion:', error);
          await db.messages.update(assistantMessageId, { 
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            is_error: true
          });
          break;
        }
    }
  }
}

export const chatService = new ChatService();
