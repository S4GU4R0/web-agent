'use client';

import { ChatInterface } from "@/components/ChatInterface";
import { useStore } from "@/lib/store";

export default function Home() {
  const currentChatId = useStore((state) => state.currentChatId);

  return (
    <div className="h-full w-full">
      {currentChatId ? (
        <ChatInterface chatId={currentChatId} />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-zinc-600 dark:text-zinc-400">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Welcome to Web Agent</h1>
            <p>Select a chat or create a new one to start</p>
          </div>
        </div>
      )}
    </div>
  );
}
