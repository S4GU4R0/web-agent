'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  LayoutGrid,
  History,
  Box
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { useChats, useNotionSync, useCredits } from '@/lib/hooks';
import { Settings } from './Settings';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { currentChatId, setCurrentChatId, setSelectedModelId, selectedModelId } = useStore();
  const { chats, createChat } = useChats();
  const { sync, syncing, lastSyncAt } = useNotionSync();
  const { balance } = useCredits();
  const [isOnline, setIsOnline] = useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCreateChat = async () => {
    const id = await createChat('New Chat', selectedModelId);
    setCurrentChatId(id);
  };

  return (
    <aside className={cn(
      "h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        {!collapsed && <span className="font-bold text-lg text-emerald-600 dark:text-emerald-500">Web Agent</span>}
        <button 
          onClick={handleCreateChat}
          className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          title="New Chat"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="p-2 space-y-1">
        <SidebarNavItem icon={<LayoutGrid size={18} />} label="Projects" collapsed={collapsed} />
        <SidebarNavItem icon={<History size={18} />} label="History" collapsed={collapsed} />
        <SidebarNavItem icon={<Box size={18} />} label="MCPs" collapsed={collapsed} />
      </nav>

      <div className="px-4 py-2">
        <hr className="border-zinc-200 dark:border-zinc-800" />
      </div>

      {/* Chat List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {!collapsed && <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Chats</div>}
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setCurrentChatId(chat.id);
              setSelectedModelId(chat.model_id || 'gpt-4o');
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors group",
              currentChatId === chat.id 
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-sm" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <MessageSquare size={18} className="shrink-0" />
            {!collapsed && (
              <span className="truncate text-sm text-left flex-1">{chat.title}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        {/* Sync Status */}
        {!collapsed && (
          <div className="px-3 py-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              {lastSyncAt ? <Cloud size={12} className="text-emerald-600 dark:text-emerald-500" /> : <CloudOff size={12} />}
              <span>{syncing ? 'Syncing...' : 'Synced'}</span>
            </div>
            <button onClick={() => sync()} disabled={syncing} className="hover:text-zinc-900 dark:hover:text-zinc-200">
              <RefreshCw size={10} className={cn(syncing && "animate-spin")} />
            </button>
          </div>
        )}

        {/* Offline Indicator */}
        {!collapsed && (
          <div className={cn(
            "px-3 py-1 flex items-center gap-2 text-[10px] font-bold rounded",
            isOnline ? "text-emerald-600/50 dark:text-emerald-500/50" : "text-amber-600 dark:text-amber-500 bg-amber-500/10"
          )}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isOnline ? "ONLINE" : "OFFLINE MODE"}</span>
          </div>
        )}

        {/* Credits */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
            <span>AI Credits</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-500">${balance.toFixed(2)}</span>
          </div>
        )}

        <button 
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <SettingsIcon size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white shadow-sm transition-colors z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}

function SidebarNavItem({ icon, label, collapsed }: { icon: React.ReactNode, label: string, collapsed: boolean }) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors group">
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
