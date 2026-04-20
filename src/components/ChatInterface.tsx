"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronDown, 
  Wrench, 
  Plus, 
  Phone,
  Send,
  User,
  Bot as BotIcon,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages, useChats, useVoice } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { ModelPicker } from "./ModelPicker";
import { Message } from "@/lib/db";
import { Mic, MicOff } from "lucide-react";

export const ChatInterface = () => {
  const { currentChatId } = useStore();
  const { messages: rawMessages, sendMessage } = useMessages(currentChatId);
  const { start: startVoice, stop: stopVoice, active: voiceActive } = useVoice();
  const messages = rawMessages as Message[];
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentChatId || isLoading) return;

    const content = input;
    setInput("");
    setIsLoading(true);

    try {
      await sendMessage(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-500">
        <BotIcon size={48} className="mb-4 opacity-20" />
        <p>Select a chat or create a new one to start</p>
      </div>
    );
  }

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isTyping = lastMessage && 
                  lastMessage.role === 'assistant' && 
                  lastMessage.content === '' && 
                  isLoading;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Header / Top Bar */}
      <div className="h-14 flex items-center px-6 border-b border-zinc-900/50 justify-between">
        <div className="flex items-center gap-4">
           <span className="text-zinc-500 font-medium ml-12">Chat Session</span>
        </div>
        <div className="flex items-center gap-2">
           <div className={cn(
             "px-2 py-1 rounded text-[10px] font-bold border",
             isLoading ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
           )}>
             {isLoading ? "PROCESSING" : "IDLE"}
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
             <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                <Plus size={32} />
             </div>
             <p className="text-sm">This chat is empty. Send a message to begin.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={msg.id} className={cn(
            "flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                <BotIcon size={18} className="text-zinc-400" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === 'user' 
                ? "bg-zinc-800 text-zinc-100" 
                : "bg-transparent text-zinc-300"
            )}>
              {msg.content || (idx === messages.length - 1 && isLoading ? "..." : "")}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 border border-zinc-600">
                <User size={18} className="text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
               <Loader2 size={18} className="text-zinc-600 animate-spin" />
            </div>
            <div className="h-8 bg-zinc-900 rounded-2xl w-24" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm focus-within:border-zinc-700 transition-colors">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="How can I help you today?"
            className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-zinc-600 min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-2">
            <ModelPicker />
            <div className="flex items-center gap-2">
              <ActionButton icon={<Wrench size={18} />} />
              <ActionButton 
                icon={isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                primary
              />
              <ActionButton 
                icon={voiceActive ? <Mic size={18} className="text-red-500 animate-pulse" /> : <Mic size={18} />} 
                onClick={() => voiceActive ? stopVoice() : startVoice()}
                active={voiceActive}
              />
            </div>
          </div>
        </div>
        {voiceActive && (
          <div className="flex justify-center mt-2">
            <div className="flex gap-1 items-center">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1 bg-red-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 20 + 5}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
              <span className="text-[10px] text-zinc-500 font-bold ml-2">LISTENING...</span>
            </div>
          </div>
        )}
        <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-widest">
          Powered by Web-Agent Offline Engine
        </p>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, onClick, disabled, primary, active }: { icon: React.ReactNode, onClick?: () => void, disabled?: boolean, primary?: boolean, active?: boolean }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-2 rounded-lg transition-all",
      primary 
        ? "bg-zinc-100 text-zinc-950 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600" 
        : active
          ? "bg-red-500/10 text-red-500 border border-red-500/50"
          : "text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-50"
    )}
  >
    {icon}
  </button>
);
