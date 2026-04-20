import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Message, type Chat, type MCP } from './db';
import { chatService } from './chat-service';
import { notionSyncService } from './notion-sync';
import { mcpService } from './mcp-service';
import { creditService } from './credit-service';
import { voiceService } from './voice-service';
import { useState } from 'react';

export function useVoice() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const start = async () => {
    try {
      const apiKey = (await db.settings.get('openai_api_key'))?.value;
      if (!apiKey) throw new Error('OpenAI API key not found');
      await voiceService.start(apiKey);
      setActive(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const stop = () => {
    voiceService.stop();
    setActive(false);
  };

  return { start, stop, active, error };
}

export function useCredits() {
  const balance = useLiveQuery(() => db.settings.get('credit_balance'));
  const features = useLiveQuery(() => db.settings.where('key').startsWith('feature_').toArray());
  
  const unlockedFeatures = new Set(
    features?.filter(f => f.value === true).map(f => f.key.replace('feature_', '')) || []
  );

  return {
    balance: balance?.value || 0,
    addCredits: creditService.addCredits.bind(creditService),
    hasFeature: (key: string) => unlockedFeatures.has(key),
    unlockFeature: creditService.unlockFeature.bind(creditService),
  };
}

export function useMCPs() {
  const mcps = useLiveQuery(() => db.mcps.toArray());
  return {
    mcps: mcps || [],
    registerMCP: mcpService.registerMCP.bind(mcpService),
    getTools: mcpService.getTools.bind(mcpService),
  };
}

export function useNotionSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const lastSyncAt = useLiveQuery(() => db.settings.get('last_sync_at'));

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await notionSyncService.sync();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSyncing(false);
    }
  };

  return {
    sync,
    syncing,
    error,
    lastSyncAt: lastSyncAt?.value,
  };
}

export function useChats() {
  const chats = useLiveQuery(() => db.chats.orderBy('updated_at').reverse().toArray());
  return {
    chats: chats || [],
    createChat: chatService.createChat.bind(chatService),
  };
}

export function useMessages(chatId?: string) {
  const messages = useLiveQuery(
    () => (chatId ? db.messages.where('chat_id').equals(chatId).sortBy('timestamp') : Promise.resolve([] as Message[])),
    [chatId]
  );

  return {
    messages: messages || [],
    sendMessage: (content: string, onToken?: (token: string) => void) => {
      if (!chatId) return Promise.reject('No chat selected');
      return chatService.sendMessage(chatId, content, onToken);
    },
  };
}
