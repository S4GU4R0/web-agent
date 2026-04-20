"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export const ModelPicker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedModelId, setSelectedModelId } = useStore();
  
  const models = useLiveQuery(() => db.models.toArray()) || [];
  const selectedModel = models.find(m => m.id === selectedModelId) || models[0] || { id: 'puter', name: 'Puter AI', provider: 'puter' };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors border border-zinc-700/50 text-zinc-200"
      >
        <span>{selectedModel.name}</span>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-40 py-1 overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Select Model
            </div>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModelId(model.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-800 transition-colors",
                  selectedModelId === model.id ? "text-white" : "text-zinc-400"
                )}
              >
                <div className="flex flex-col items-start text-left">
                  <span>{model.name}</span>
                  <span className="text-[10px] text-zinc-600">{model.provider}</span>
                </div>
                {selectedModelId === model.id && <Check size={14} className="text-emerald-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
