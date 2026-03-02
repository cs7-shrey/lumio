import { useState } from 'react';
import { useCurrentChatStore } from '../store/currentChatStore.js';
import { Message, getModel, stream, Context, AssistantMessageEventStream } from '@mariozechner/pi-ai';

// Fully typed with auto-complete support for both providers and models
const model = getModel('openrouter', 'anthropic/claude-3.7-sonnet:thinking');

export function useChat() {
	const [query, setQuery] = useState('');
	const [generating, setGenerating] = useState(false);
	const { messages, addMessage, setLastMessage } = useCurrentChatStore();

	const processStream = async(chatStream: AssistantMessageEventStream) => {
		for await (const event of chatStream) {
			switch (event.type) {
				case 'start':
					addMessage(event.partial);
					break;
				case 'text_start':
					console.log('\n[Text started]');
					setLastMessage(event.partial);
					break;
				case 'text_delta':
					setLastMessage(event.partial);
					break;
				case 'text_end':
					console.log('\n[Text ended]');
					setLastMessage(event.partial);
					break;
				case 'thinking_start':
					setLastMessage(event.partial);
					break;
				case 'thinking_delta':
					setLastMessage(event.partial);
					break;
				case 'thinking_end':
					setLastMessage(event.partial);
					break;
				case 'toolcall_start':
					setLastMessage(event.partial);
					break;
				case 'toolcall_delta':
					setLastMessage(event.partial);
					break;
				case 'toolcall_end':
					console.log(`Arguments: ${JSON.stringify(event.toolCall.arguments)}`);
					setLastMessage(event.partial);
					break;
				case 'done':
					break;
				case 'error':
					console.error(`Error: ${JSON.stringify(event.error)}`);
					break;
			}
		}

		setGenerating(false);
	};

	const submit = async() => {
		if(generating || query.trim() === '') return;

		try {
			setGenerating(true);
			const now = Date.now();

			const newMessages: Message[] = [...messages, { role: 'user', content: query, timestamp: now }];
			addMessage({ role: 'user', content: query, timestamp: now });
			setQuery('');

			const context: Context = {
				systemPrompt: 'You are a helpful assistant.',
				messages: newMessages
			};

			const chatStream = stream(model, context, {
				reasoning: 'high'
			});

			processStream(chatStream);
		} catch (error) {
			console.error(error);
			setGenerating(false);
		}
	};

	return {
		query,
		setQuery,
		messages,
		generating,
		submit
	};
}
