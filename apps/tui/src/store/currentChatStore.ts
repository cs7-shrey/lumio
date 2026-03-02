import { create } from 'zustand';
import type { Message as ChatMessage } from '@mariozechner/pi-ai';

interface CurrentChatStore {
	messages: ChatMessage[];
	addMessage: (message: ChatMessage) => void;
	clearMessages: () => void;
	setLastMessage: (message: ChatMessage) => void;
}

export const useCurrentChatStore = create<CurrentChatStore>((set, get) => ({
	messages: [],
	addMessage: (message) =>
		set((state) => ({
			messages: [...state.messages, message],
		})),
	clearMessages: () => {
		set({
			messages: [],
		});
	},
	setLastMessage: (message) => {
		if(get().messages.length == 0) return;
		set((state) => ({
			messages: [...state.messages.slice(0, state.messages.length-1), message]
		}))
	}
}));
