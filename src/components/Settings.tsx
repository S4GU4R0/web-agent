"use client";

import React, { useState, useEffect } from "react";
import { X, Key, Save, Cpu, Database, Plus, Trash2, Globe, Coins, Zap } from "lucide-react";
import { db, type Model, type MCP } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useCredits } from "@/lib/hooks";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "api_keys" | "models" | "mcps" | "billing" | "sync";

export const Settings = ({ isOpen, onClose }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("api_keys");
  const { balance, addCredits, hasFeature, unlockFeature } = useCredits();
  const [apiKeys, setApiKeys] = useState<{key: string, value: string}[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [mcps, setMcps] = useState<MCP[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for adding new items
  const [newModel, setNewModel] = useState<Partial<Model>>({ id: '', name: '', provider: 'openai', settings: { baseURL: '' } });
  const [newMcp, setNewMcp] = useState<Partial<MCP>>({ id: '', name: '', type: 'http', endpoint: '' });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const keys = await db.settings.toArray();
    setApiKeys(keys.filter(k => k.key.endsWith('_api_key')));
    setModels(await db.models.toArray());
    setMcps(await db.mcps.toArray());
  };

  const saveApiKey = async (provider: string, value: string) => {
    await db.settings.put({ key: `${provider}_api_key`, value });
    loadData();
  };

  const addModel = async () => {
    if (!newModel.id || !newModel.name) return;
    await db.models.add(newModel as Model);
    setNewModel({ id: '', name: '', provider: 'openai', settings: { baseURL: '' } });
    loadData();
  };

  const deleteModel = async (id: string) => {
    await db.models.delete(id);
    loadData();
  };

  const addMcp = async () => {
    if (!newMcp.id || !newMcp.name || !newMcp.endpoint) return;
    await db.mcps.add(newMcp as MCP);
    setNewMcp({ id: '', name: '', type: 'http', endpoint: '' });
    loadData();
  };

  const deleteMcp = async (id: string) => {
    await db.mcps.delete(id);
    loadData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database size={20} className="text-zinc-400" />
            Settings
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-zinc-800 p-2 space-y-1 bg-zinc-900/50">
            <TabButton active={activeTab === 'api_keys'} onClick={() => setActiveTab('api_keys')} icon={<Key size={16} />} label="API Keys" />
            <TabButton active={activeTab === 'models'} onClick={() => setActiveTab('models')} icon={<Globe size={16} />} label="Models" />
            <TabButton active={activeTab === 'mcps'} onClick={() => setActiveTab('mcps')} icon={<Cpu size={16} />} label="MCPs" />
            <TabButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={<Coins size={16} />} label="Billing" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'api_keys' && (
              <div className="space-y-6">
                <ApiKeyField label="OpenAI API Key" provider="openai" currentKeys={apiKeys} onSave={saveApiKey} />
                <ApiKeyField label="Anthropic API Key" provider="anthropic" currentKeys={apiKeys} onSave={saveApiKey} />
                <ApiKeyField label="Google Gemini API Key" provider="google" currentKeys={apiKeys} onSave={saveApiKey} />
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-6">
                <div className="space-y-4">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Installed Models</h3>
                   <div className="grid gap-2">
                      {models.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                           <div>
                              <div className="text-sm font-medium text-white">{m.name}</div>
                              <div className="text-[10px] text-zinc-500">{m.provider} • {m.id}</div>
                           </div>
                           <button onClick={() => deleteModel(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800 space-y-3">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase">Add Custom Model</h3>
                   <div className="grid grid-cols-2 gap-2">
                      <input 
                        placeholder="Model ID (e.g. llama3)" 
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                        value={newModel.id}
                        onChange={e => setNewModel({...newModel, id: e.target.value})}
                      />
                      <input 
                        placeholder="Display Name" 
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                        value={newModel.name}
                        onChange={e => setNewModel({...newModel, name: e.target.value})}
                      />
                   </div>
                   <input 
                      placeholder="Base URL (optional, for OpenAI compatible)" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                      value={newModel.settings?.baseURL}
                      onChange={e => setNewModel({...newModel, settings: { ...newModel.settings, baseURL: e.target.value }})}
                   />
                   <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                        value={newModel.provider}
                        onChange={e => setNewModel({...newModel, provider: e.target.value})}
                      >
                        <option value="openai">OpenAI Compatible</option>
                        <option value="anthropic">Anthropic</option Titre
                        <option value="google">Google</option>
                      </select>
                      <button 
                        onClick={addModel}
                        className="bg-zinc-100 text-zinc-950 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add
                      </button>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'mcps' && (
              <div className="space-y-6">
                <div className="space-y-4">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">MCP Integrations</h3>
                   {mcps.length === 0 ? (
                     <div className="text-center py-8 text-zinc-600 text-sm italic">No MCPs added yet.</div>
                   ) : (
                     <div className="grid gap-2">
                        {mcps.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                             <div>
                                <div className="text-sm font-medium text-white">{m.name}</div>
                                <div className="text-[10px] text-zinc-500">{m.type.toUpperCase()} • {m.endpoint}</div>
                             </div>
                             <button onClick={() => deleteMcp(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                     </div>
                   )}
                </div>

                <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800 space-y-3">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase">Add New MCP</h3>
                   <input 
                      placeholder="MCP Name (e.g. Filesystem)" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                      value={newMcp.name}
                      onChange={e => setNewMcp({...newMcp, name: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                   />
                   <input 
                      placeholder="Endpoint URL" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                      value={newMcp.endpoint}
                      onChange={e => setNewMcp({...newMcp, endpoint: e.target.value})}
                   />
                   <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                        value={newMcp.type}
                        onChange={e => setNewMcp({...newMcp, type: e.target.value as any})}
                      >
                        <option value="http">HTTP / SSE</option>
                        <option value="oauth">OAuth 2.0</option>
                      </select>
                      <button 
                        onClick={addMcp}
                        className="bg-zinc-100 text-zinc-950 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add MCP
                      </button>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-8">
                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 mb-4">
                      <Coins size={24} />
                   </div>
                   <div className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Available Balance</div>
                   <div className="text-4xl font-bold text-white mt-2">${balance.toFixed(2)}</div>
                   <p className="text-xs text-zinc-500 mt-4 max-w-[280px]">
                      Your AI credits are used to pay for model usage at cost. Top up whenever you need more.
                   </p>
                </div>

                <div className="space-y-4">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Top Up Credits</h3>
                   <div className="grid grid-cols-3 gap-3">
                      {[5, 10, 25].map(amount => (
                        <button 
                          key={amount}
                          onClick={() => addCredits(amount)}
                          className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors group"
                        >
                           <div className="text-lg font-bold text-white">${amount}</div>
                           <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400 mt-1">Buy Credits</div>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Unlock Features</h3>
                   <div className="grid gap-3">
                      <FeatureItem 
                        id="realtime_voice"
                        title="Realtime Voice" 
                        description="Low-latency audio interaction with various models."
                        price={10}
                        unlocked={hasFeature('realtime_voice')}
                        onUnlock={() => unlockFeature('realtime_voice')}
                      />
                      <FeatureItem 
                        id="unlimited_mcps"
                        title="Unlimited MCPs" 
                        description="Add more than 3 Model Context Protocol integrations."
                        price={5}
                        unlocked={hasFeature('unlimited_mcps')}
                        onUnlock={() => unlockFeature('unlimited_mcps')}
                      />
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ id, title, description, price, unlocked, onUnlock }: { id: string, title: string, description: string, price: number, unlocked: boolean, onUnlock: () => void }) => (
  <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl group">
    <div>
      <div className="text-sm font-medium text-white flex items-center gap-2">
        {title}
        {unlocked && <Zap size={12} className="text-emerald-500 fill-emerald-500" />}
      </div>
      <div className="text-[10px] text-zinc-500">{description}</div>
    </div>
    {unlocked ? (
      <div className="text-[10px] font-bold px-2 py-1 rounded text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
        UNLOCKED
      </div>
    ) : (
      <button 
        onClick={onUnlock}
        className="text-[10px] font-bold px-3 py-1.5 rounded bg-zinc-100 text-zinc-950 hover:bg-white transition-colors"
      >
        UNLOCK ${price}
      </button>
    )}
  </div>
);

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ApiKeyField = ({ label, provider, currentKeys, onSave }: { label: string, provider: string, currentKeys: any[], onSave: (p: string, v: string) => void }) => {
  const existing = currentKeys.find(k => k.key === `${provider}_api_key`);
  const [value, setValue] = useState(existing?.value || "");

  useEffect(() => {
    if (existing) setValue(existing.value);
  }, [existing]);

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
      <div className="flex gap-2">
        <input 
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter key..."
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 transition-colors"
        />
        <button 
          onClick={() => onSave(provider, value)}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors"
        >
          <Save size={18} />
        </button>
      </div>
    </div>
  );
};
