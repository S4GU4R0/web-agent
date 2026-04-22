'use client';

import React, { useState } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', description: 'Fast and efficient' },
  { id: 'puter', name: 'Puter AI', provider: 'Puter.js', description: 'No API key needed' },
];

export function ModelPicker() {
  const [open, setOpen] = useState(false);
  const { selectedModelId, setSelectedModelId, currentChatId } = useStore();

  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];

  const handleModelSelect = async (modelId: string) => {
    setSelectedModelId(modelId);
    if (currentChatId) {
      await db.chats.update(currentChatId, { model_id: modelId });
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors text-sm font-medium border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
      >
        <Sparkles size={16} className="text-emerald-600 dark:text-emerald-500" />
        <span>{selectedModel.name}</span>
        <ChevronDown size={14} className={cn("transition-transform opacity-50", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-30 p-1">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Select Model
            </div>
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={cn(
                  "w-full flex flex-col items-start p-3 rounded-lg transition-colors text-left group",
                  selectedModelId === model.id ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn(
                    "text-sm font-medium",
                    selectedModelId === model.id ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-900 dark:text-zinc-200"
                  )}>
                    {model.name}
                  </span>
                  {selectedModelId === model.id && <Check size={14} className="text-emerald-600 dark:text-emerald-500" />}
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{model.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
