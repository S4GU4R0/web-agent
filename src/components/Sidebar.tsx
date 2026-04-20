"use client";

import React from "react";
import { 
  Plus, 
  MessageSquare, 
  History, 
  Cpu, 
  Settings as SettingsIcon, 
  Bot,
  Layers,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChats, useNotionSync, useCredits } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { Settings } from "./Settings";
import { RefreshCw, Coins } from "lucide-react";

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
}

export const Sidebar = ({ className, isOpen = true }: SidebarProps) => {
  const { chats, createChat } = useChats();
  const { syncing, sync } = useNotionSync();
  const { balance } = useCredits();
  const { currentChatId, setCurrentChatId, selectedModelId } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNewChat = async () => {
    const id = await createChat("New Chat", selectedModelId);
    setCurrentChatId(id);
  };

  return (
    <div className={cn(
      "flex flex-col h-full w-64 bg-zinc-950 text-zinc-400 border-r border-zinc-800 transition-all duration-300",
      !isOpen && "-ml-64",
      className
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2 text-white font-semibold">
          <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
            <Bot size={20} />
          </div>
          <span>WEB-AGENT</span>
        </div>
        <button 
          onClick={handleNewChat}
          className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
          Menu
        </div>
        <SidebarItem icon={<Layers size={18} />} label="Projects" />
        <SidebarItem icon={<Cpu size={18} />} label="MCPs" />
        
        <div className="mt-4 px-3 py-2">
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                    <Coins size={16} />
                 </div>
                 <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase leading-none">Credits</div>
                    <div className="text-sm font-semibold text-white leading-none mt-1">${balance.toFixed(2)}</div>
                 </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400 font-bold transition-colors"
              >
                TOP UP
              </button>
           </div>
        </div>

        <div className="mt-4 px-3 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
          Recent Chats
        </div>
        {chats.map((chat) => (
          <SidebarItem 
            key={chat.id} 
            icon={<MessageCircle size={18} />} 
            label={chat.title} 
            active={currentChatId === chat.id}
            onClick={() => setCurrentChatId(chat.id)}
          />
        ))}
      </nav>

      {/* Sync Status */}
      <div className="px-4 py-2 border-t border-zinc-800/50 flex items-center justify-between group">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
          <RefreshCw size={12} className={cn(syncing && "animate-spin")} />
          <span>{syncing ? "SYNCING..." : "CLOUD SYNC"}</span>
        </div>
        <button 
          onClick={() => sync()}
          disabled={syncing}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded"
        >
          <RefreshCw size={10} className="text-zinc-600" />
        </button>
      </div>

      {/* Credit Balance */}
      <div className="px-4 py-2 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
          <Coins size={12} className="text-amber-500" />
          <span>AI CREDITS</span>
        </div>
        <span className="text-[10px] font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded">
          {balance.toLocaleString()}
        </span>
      </div>

      {/* Offline Status */}
      <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-medium">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          isOnline ? "bg-emerald-500" : "bg-amber-500"
        )} />
        <span className={isOnline ? "text-emerald-500" : "text-amber-500"}>
          {isOnline ? "OFFLINE-READY" : "OFFLINE MODE"}
        </span>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800">
        <SidebarItem 
          icon={<SettingsIcon size={18} />} 
          label="Settings" 
          badge="*" 
          onClick={() => setIsSettingsOpen(true)}
        />
      </div>

      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon, label, badge, active, onClick }: SidebarItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
        active 
          ? "bg-zinc-800 text-white" 
          : "hover:bg-zinc-900 hover:text-zinc-200"
      )}
    >
      <span className="text-zinc-500">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && (
        <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
          {badge}
        </span>
      )}
    </button>
  );
};
