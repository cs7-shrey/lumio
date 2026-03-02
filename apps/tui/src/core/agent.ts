import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import type { Message } from '../types/index.js';
import { env } from '@lumio/env';

const openrouter = createOpenRouter({
	apiKey: env.OPENROUTER_API_KEY,
});

export const generateAgentResponse = async (
	messages: Message[],
): Promise<string> => {
	const { text } = await generateText({
		model: openrouter('anthropic/claude-sonnet-4.5'),
		messages: messages.map((message) => ({
			role: message.sender === 'user' ? 'user' : 'assistant',
			content: message.content,
		})),
	});

	return text;
};
