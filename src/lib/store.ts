import { create } from 'zustand';

interface WebAgentState {
  currentChatId: string | undefined;
  setCurrentChatId: (id: string | undefined) => void;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
}

export const useStore = create<WebAgentState>((set) => ({
  currentChatId: undefined,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  selectedModelId: 'gpt-4o', // Default model
  setSelectedModelId: (id) => set({ selectedModelId: id }),
}));
