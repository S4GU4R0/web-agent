'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Cloud,
  Mic,
  CreditCard,
  Lock,
  ExternalLink,
  Trash2,
  Plus,
  Save,
  Database,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useCredits, useCustomModels, useMCPs } from '@/lib/hooks';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'keys' | 'models' | 'mcps' | 'billing' | 'data';

export function Settings({ open, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('keys');
  const [openaiKey, setOpenaiKey] = useState('');
  const [notionToken, setNotionToken] = useState('');
  const [notionChatsDb, setNotionChatsDb] = useState('');
  const [notionMsgsDb, setNotionMsgsDb] = useState('');
  const { balance, hasFeature } = useCredits();

  const { models: customModels, addModel, removeModel } = useCustomModels();
  const [showAddModelForm, setShowAddModelForm] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName || !newModelId || !newModelBaseUrl) return;

    await addModel({
      name: newModelName,
      provider: 'openai-compatible',
      model_id: newModelId,
      base_url: newModelBaseUrl,
      api_key: newModelApiKey
    });

    setNewModelName('');
    setNewModelId('');
    setNewModelBaseUrl('');
    setNewModelApiKey('');
    setShowAddModelForm(false);
  };

  const handleDeleteModel = async (id: string) => {
    await removeModel(id);
  };

  const { mcps, registerMCP } = useMCPs();
  const [showAddMcpForm, setShowAddMcpForm] = useState(false);
  const [mcpName, setMcpName] = useState('');
  const [mcpType, setMcpType] = useState<'http' | 'oauth'>('http');
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [mcpApiKey, setMcpApiKey] = useState('');
  const [mcpClientId, setMcpClientId] = useState('');
  const [mcpClientSecret, setMcpClientSecret] = useState('');
  const [mcpAuthUrl, setMcpAuthUrl] = useState('');
  const [mcpTokenUrl, setMcpTokenUrl] = useState('');

  const handleAddMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName || !mcpEndpoint) return;

    const config: Record<string, string> = {};
    if (mcpType === 'http' && mcpApiKey) config.apiKey = mcpApiKey;
    if (mcpType === 'oauth') {
      config.clientId = mcpClientId;
      config.clientSecret = mcpClientSecret;
      config.authUrl = mcpAuthUrl;
      config.tokenUrl = mcpTokenUrl;
      config.redirectUri = window.location.origin + '/oauth/callback';
    }

    const mcpId = await registerMCP(mcpName, mcpType, mcpEndpoint, config);

    if (mcpType === 'oauth' && mcpAuthUrl) {
      const authUrl = new URL(mcpAuthUrl);
      authUrl.searchParams.append('client_id', mcpClientId);
      authUrl.searchParams.append('redirect_uri', config.redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('state', mcpId);
      window.location.href = authUrl.toString();
    } else {
      setMcpName('');
      setMcpEndpoint('');
      setMcpApiKey('');
      setMcpClientId('');
      setMcpClientSecret('');
      setMcpAuthUrl('');
      setMcpTokenUrl('');
      setShowAddMcpForm(false);
    }
  };

  const handleDeleteMcp = async (id: string) => {
    await db.mcps.delete(id);
  };

  const [dataStatus, setDataStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExportData = async () => {
    setDataStatus('loading');
    try {
      const exportData = {
        chats: await db.chats.toArray(),
        messages: await db.messages.toArray(),
        mcps: await db.mcps.toArray(),
        customModels: await db.customModels.toArray(),
        settings: await db.settings.toArray(),
        version: 1,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `web-agent-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDataStatus('success');
      setTimeout(() => setDataStatus('idle'), 3000);
    } catch (e) {
      console.error('Export failed:', e);
      setErrorMessage('Failed to export data.');
      setDataStatus('error');
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDataStatus('loading');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Simple validation
      if (!data.chats || !data.messages) {
        throw new Error('Invalid backup file format.');
      }

      await db.transaction('rw', [db.chats, db.messages, db.mcps, db.customModels, db.settings], async () => {
        if (data.chats) await db.chats.bulkPut(data.chats);
        if (data.messages) await db.messages.bulkPut(data.messages);
        if (data.mcps) await db.mcps.bulkPut(data.mcps);
        if (data.customModels) await db.customModels.bulkPut(data.customModels);
        if (data.settings) await db.settings.bulkPut(data.settings);
      });

      setDataStatus('success');
      setTimeout(() => {
        setDataStatus('idle');
        window.location.reload(); // Reload to refresh all hooks
      }, 1500);
    } catch (e) {
      console.error('Import failed:', e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to import data.');
      setDataStatus('error');
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This includes chat history, API keys, and custom models. This action cannot be undone.')) {
      return;
    }

    setDataStatus('loading');
    try {
      await db.transaction('rw', [db.chats, db.messages, db.mcps, db.customModels, db.settings], async () => {
        await db.chats.clear();
        await db.messages.clear();
        await db.mcps.clear();
        await db.customModels.clear();
        await db.settings.clear();
      });
      
      setDataStatus('success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error('Clear failed:', e);
      setErrorMessage('Failed to clear data.');
      setDataStatus('error');
    }
  };

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
          <TabButton 
            active={activeTab === 'data'} 
            onClick={() => setActiveTab('data')} 
            icon={<Database size={18} />} 
            label="Data Management" 
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
              {activeTab === 'data' && 'Data Management'}
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
                      <div className="text-sm font-medium">Model Configuration</div>
                      <div className="text-xs text-zinc-500">{(customModels?.length || 0) + 3} models available</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddModelForm(!showAddModelForm)}
                    className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                  >
                    {showAddModelForm ? 'Cancel' : <><Plus size={14} /> Add Custom Model</>}
                  </button>
                </div>

                {showAddModelForm && (
                  <form onSubmit={handleAddModel} className="p-4 bg-zinc-950 border border-emerald-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Friendly Name</label>
                        <input 
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="e.g. My Llama 3"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Model ID</label>
                        <input 
                          value={newModelId}
                          onChange={(e) => setNewModelId(e.target.value)}
                          placeholder="e.g. llama-3-70b"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Base URL</label>
                      <input 
                        value={newModelBaseUrl}
                        onChange={(e) => setNewModelBaseUrl(e.target.value)}
                        placeholder="https://api.together.xyz/v1"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">API Key (Optional)</label>
                      <input 
                        type="password"
                        value={newModelApiKey}
                        onChange={(e) => setNewModelApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save Model
                    </button>
                  </form>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Built-in Models</h3>
                  <div className="space-y-3">
                    <ModelItem name="GPT-4o" provider="OpenAI" status="active" />
                    <ModelItem name="GPT-4o mini" provider="OpenAI" status="active" />
                    <ModelItem name="Puter AI" provider="Puter.js" status="ready" />
                  </div>
                </div>

                {customModels && customModels.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Custom Models</h3>
                    <div className="space-y-3">
                      {customModels.map(model => (
                        <ModelItem 
                          key={model.id} 
                          name={model.name} 
                          provider={model.model_id} 
                          status="custom" 
                          onDelete={() => handleDeleteModel(model.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="space-y-6">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                      <Cloud size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">MCP Tools</div>
                      <div className="text-xs text-zinc-500">{(mcps?.length || 0)} MCPs registered</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddMcpForm(!showAddMcpForm)}
                    className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                  >
                    {showAddMcpForm ? 'Cancel' : <><Plus size={14} /> Add MCP</>}
                  </button>
                </div>

                {showAddMcpForm && (
                  <form onSubmit={handleAddMcp} className="p-4 bg-zinc-950 border border-emerald-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">MCP Name</label>
                        <input 
                          value={mcpName}
                          onChange={(e) => setMcpName(e.target.value)}
                          placeholder="e.g. My Tools"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Type</label>
                        <select 
                          value={mcpType}
                          onChange={(e) => setMcpType(e.target.value as 'http' | 'oauth')}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                        >
                          <option value="http">HTTP</option>
                          <option value="oauth">OAuth 2.0</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Endpoint URL</label>
                      <input 
                        value={mcpEndpoint}
                        onChange={(e) => setMcpEndpoint(e.target.value)}
                        placeholder="https://mcp.example.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    {mcpType === 'http' ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">API Key (Optional)</label>
                        <input 
                          type="password"
                          value={mcpApiKey}
                          onChange={(e) => setMcpApiKey(e.target.value)}
                          placeholder="Bearer token or API key"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2 border-t border-zinc-800 mt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Client ID</label>
                            <input 
                              value={mcpClientId}
                              onChange={(e) => setMcpClientId(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Client Secret</label>
                            <input 
                              type="password"
                              value={mcpClientSecret}
                              onChange={(e) => setMcpClientSecret(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Authorization URL</label>
                          <input 
                            value={mcpAuthUrl}
                            onChange={(e) => setMcpAuthUrl(e.target.value)}
                            placeholder="https://example.com/oauth/authorize"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase px-1">Token URL</label>
                          <input 
                            value={mcpTokenUrl}
                            onChange={(e) => setMcpTokenUrl(e.target.value)}
                            placeholder="https://example.com/oauth/token"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {mcpType === 'oauth' ? <><ExternalLink size={16} /> Authenticate & Save</> : <><Save size={16} /> Save MCP</>}
                    </button>
                  </form>
                )}

                <div className="space-y-3">
                  {mcps?.map(mcp => (
                    <div key={mcp.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                          mcp.type === 'oauth' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {mcp.type === 'oauth' ? 'OA' : 'H'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{mcp.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">{mcp.endpoint}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded uppercase font-bold",
                          mcp.type === 'oauth' && !mcp.config?.accessToken ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {mcp.type === 'oauth' && !mcp.config?.accessToken ? 'Pending Auth' : 'Active'}
                        </span>
                        <button 
                          onClick={() => handleDeleteMcp(mcp.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!mcps || mcps.length === 0) && !showAddMcpForm && (
                    <div className="text-center py-12 text-zinc-500">
                      <Cloud size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No MCPs registered yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                      <Database size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Local Data Storage</div>
                      <div className="text-xs text-zinc-500">Manage your local chat history and settings</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleExportData}
                      disabled={dataStatus === 'loading'}
                      className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors gap-3 group disabled:opacity-50"
                    >
                      <Download size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <div className="text-sm font-medium">Export Data</div>
                      <div className="text-[10px] text-zinc-500 text-center">Download a JSON backup of all your data</div>
                    </button>

                    <label className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors gap-3 group cursor-pointer">
                      <Upload size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <div className="text-sm font-medium">Import Data</div>
                      <div className="text-[10px] text-zinc-500 text-center">Restore from a previously exported JSON file</div>
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportData}
                        disabled={dataStatus === 'loading'}
                      />
                    </label>
                  </div>

                  {dataStatus === 'loading' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 py-2 animate-pulse">
                      <Database size={16} />
                      <span>Processing...</span>
                    </div>
                  )}

                  {dataStatus === 'success' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-500 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                      <span>Operation completed successfully!</span>
                    </div>
                  )}

                  {dataStatus === 'error' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-500 py-2 bg-red-500/5 rounded-lg border border-red-500/20">
                      <AlertTriangle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-400">Danger Zone</div>
                      <div className="text-xs text-zinc-500">Irreversible actions on your data</div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-500">
                    Clearing all data will permanently delete your chat history, messages, registered MCPs, custom models, and settings. This cannot be undone.
                  </p>

                  <button 
                    onClick={handleClearData}
                    disabled={dataStatus === 'loading'}
                    className="w-full py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 group"
                  >
                    <Trash2 size={16} />
                    Clear All Local Data
                  </button>
                </div>
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

function ModelItem({ name, provider, status, onDelete }: { name: string, provider: string, status: string, onDelete?: () => void }) {
  return (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between group">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-zinc-500">{provider}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-bold">{status}</span>
        {onDelete && (
          <button 
            onClick={onDelete}
            className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )}
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
