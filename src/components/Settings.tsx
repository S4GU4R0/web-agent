'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Settings as SettingsIcon, 
  Cpu, 
  Cloud,
  Mic,
  CreditCard,
  Lock,
  ExternalLink
} from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useCredits } from '@/lib/hooks';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'keys' | 'models' | 'mcps' | 'billing';

export function Settings({ open, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('keys');
  const [openaiKey, setOpenaiKey] = useState('');
  const [notionToken, setNotionToken] = useState('');
  const [notionChatsDb, setNotionChatsDb] = useState('');
  const [notionMsgsDb, setNotionMsgsDb] = useState('');
  const { balance, addCredits, hasFeature } = useCredits();

  useEffect(() => {
    if (open) {
      db.settings.get('openai_api_key').then(s => setOpenaiKey(s?.value || ''));
      db.settings.get('notion_token').then(s => setNotionToken(s?.value || ''));
      db.settings.get('notion_chats_db_id').then(s => setNotionChatsDb(s?.value || ''));
      db.settings.get('notion_messages_db_id').then(s => setNotionMsgsDb(s?.value || ''));
    }
  }, [open]);

  const saveSetting = async (key: string, value: string) => {
    await db.settings.put({ key, value });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl h-[600px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-zinc-800 bg-zinc-950 p-4 space-y-2">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 px-2">Settings</div>
          <TabButton 
            active={activeTab === 'keys'} 
            onClick={() => setActiveTab('keys')} 
            icon={<Key size={18} />} 
            label="API Keys" 
          />
          <TabButton 
            active={activeTab === 'models'} 
            onClick={() => setActiveTab('models')} 
            icon={<Cpu size={18} />} 
            label="Models" 
          />
          <TabButton 
            active={activeTab === 'mcps'} 
            onClick={() => setActiveTab('mcps')} 
            icon={<Cloud size={18} />} 
            label="MCPs" 
          />
          <TabButton 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')} 
            icon={<CreditCard size={18} />} 
            label="Billing" 
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-zinc-900">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">
              {activeTab === 'keys' && 'API Configurations'}
              {activeTab === 'models' && 'Model Management'}
              {activeTab === 'mcps' && 'MCP Tools'}
              {activeTab === 'billing' && 'Credits & Billing'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {activeTab === 'keys' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-200">AI Providers</h3>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">OpenAI API Key</label>
                    <input 
                      type="password"
                      value={openaiKey}
                      onChange={(e) => {
                        setOpenaiKey(e.target.value);
                        saveSetting('openai_api_key', e.target.value);
                      }}
                      placeholder="sk-..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-200">Cloud Sync (Notion)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">Integration Token</label>
                      <input 
                        type="password"
                        value={notionToken}
                        onChange={(e) => {
                          setNotionToken(e.target.value);
                          saveSetting('notion_token', e.target.value);
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500">Chats Database ID</label>
                        <input 
                          value={notionChatsDb}
                          onChange={(e) => {
                            setNotionChatsDb(e.target.value);
                            saveSetting('notion_chats_db_id', e.target.value);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500">Messages Database ID</label>
                        <input 
                          value={notionMsgsDb}
                          onChange={(e) => {
                            setNotionMsgsDb(e.target.value);
                            saveSetting('notion_messages_db_id', e.target.value);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'models' && (
              <div className="space-y-6">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Installed Models</div>
                      <div className="text-xs text-zinc-500">3 models available</div>
                    </div>
                  </div>
                  <button className="text-xs font-semibold text-emerald-500 hover:text-emerald-400">Add New</button>
                </div>

                <div className="space-y-3">
                  <ModelItem name="GPT-4o" provider="OpenAI" status="active" />
                  <ModelItem name="GPT-4o mini" provider="OpenAI" status="active" />
                  <ModelItem name="Puter AI" provider="Puter.js" status="ready" />
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                    <div className="text-xs text-zinc-500 font-bold uppercase">Balance</div>
                    <div className="text-3xl font-mono text-emerald-500">${balance.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-600">at-cost credits</div>
                  </div>
                  <div className="p-6 bg-emerald-600 rounded-2xl flex flex-col justify-between group cursor-pointer hover:bg-emerald-500 transition-colors">
                    <div className="text-xs text-emerald-100 font-bold uppercase">Actions</div>
                    <div className="text-xl font-bold text-white flex items-center justify-between">
                      Top Up 
                      <ExternalLink size={20} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-200">Feature Unlocks</h3>
                  <div className="space-y-3">
                    <FeatureItem 
                      unlocked={hasFeature('realtime_voice')} 
                      icon={<Mic size={18} />} 
                      title="Realtime Voice" 
                      price="$10.00" 
                    />
                    <FeatureItem 
                      unlocked={hasFeature('cloud_sync')} 
                      icon={<Cloud size={18} />} 
                      title="Advanced Cloud Sync" 
                      price="$5.00" 
                    />
                    <FeatureItem 
                      unlocked={hasFeature('encryption')} 
                      icon={<Lock size={18} />} 
                      title="E2E Encryption" 
                      price="$5.00" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mcps' && (
              <div className="text-center py-20 text-zinc-500">
                <Cloud size={48} className="mx-auto mb-4 opacity-20" />
                <p>Register HTTP or OAuth MCPs to extend Agent capabilities.</p>
                <button className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors">
                  Add MCP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
        active 
          ? "bg-emerald-600/10 text-emerald-500 font-medium" 
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ModelItem({ name, provider, status }: { name: string, provider: string, status: string }) {
  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-zinc-500">{provider}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">{status}</span>
      </div>
    </div>
  );
}

function FeatureItem({ unlocked, icon, title, price }: { unlocked: boolean, icon: React.ReactNode, title: string, price: string }) {
  return (
    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", unlocked ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 bg-zinc-900")}>
          {icon}
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {unlocked ? (
        <span className="text-xs font-bold text-emerald-500">UNLOCKED</span>
      ) : (
        <button className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          Buy {price}
        </button>
      )}
    </div>
  );
}
