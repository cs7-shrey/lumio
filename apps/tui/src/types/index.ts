export type MessageSender = 'user' | 'llm';

export type ChatMessage = {
	sender: MessageSender;
	content: string;
};

export type Message = ChatMessage;
