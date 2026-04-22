'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Mic, MicOff, AlertCircle } from 'lucide-react';
import { useMessages, useVoice } from '@/lib/hooks';
import { ModelPicker } from './ModelPicker';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  chatId: string;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useMessages(chatId);
  const { start: startVoice, stop: stopVoice, active: voiceActive } = useVoice();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const content = input;
    setInput('');
    await sendMessage(content);
  };

  const toggleVoice = () => {
    if (voiceActive) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <ModelPicker />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <p>This chat is empty. Send a message to begin.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-4 max-w-3xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-emerald-600 text-white" : (msg.is_error ? "bg-red-950 text-red-500" : "bg-zinc-800 text-emerald-500")
              )}>
                {msg.role === 'user' ? <User size={18} /> : (msg.is_error ? <AlertCircle size={18} /> : <Bot size={18} />)}
              </div>
              <div className={cn(
                "flex-1 p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-zinc-900 text-zinc-200 rounded-tr-none" 
                  : cn(
                      "bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-tl-none",
                      msg.is_error && "border-red-900/50 bg-red-950/20 text-red-200"
                    )
              )}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.tokens_used && (
                  <div className="mt-2 text-[10px] text-zinc-500 font-mono">
                    {msg.tokens_used} tokens
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-black via-black to-transparent">
        <form 
          onSubmit={handleSend}
          className="max-w-3xl mx-auto relative group"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can I help you today?"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "p-2 rounded-xl transition-all",
                voiceActive 
                  ? "bg-emerald-500/20 text-emerald-500 animate-pulse" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {voiceActive ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
        <p className="text-center text-[10px] text-zinc-600 mt-2">
          Agent may produce inaccurate information. Powered by OpenAI & Puter.js
        </p>
      </div>
    </div>
  );
}
