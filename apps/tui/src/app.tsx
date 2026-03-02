import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useCurrentChatStore } from './store/currentChatStore.js';
import { Message, getModel, stream, Context, AssistantMessageEventStream } from '@mariozechner/pi-ai';

// Fully typed with auto-complete support for both providers and models
const model = getModel('openrouter', 'anthropic/claude-3.7-sonnet:thinking');

type Props = {
	name: string | undefined;
};

export default function App({}) {
	const [query, setQuery] = useState('');
	const { messages, addMessage, setLastMessage } = useCurrentChatStore();
	// const [interim, setInterim] = useState<AssistantMessage>();

	const [generating, setGenerating] = useState(false);

	const processStream = async(stream: AssistantMessageEventStream) => {
		for await (const event of stream) {
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
	}

	const onSubmit = async() => {
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

			// Option 1: Streaming with all event types
			const s = stream(model, context, {
				reasoning: "high"
			});

			processStream(s);
		} catch (error) {
			console.error(error);
			setGenerating(false);
		}
	}

	return (
		<Box
			alignItems="center"
			flexDirection='column'
		>
			<Box
				flexDirection='column'
				width={"100%"}
				alignItems='flex-start'
				gap={1}
			>
				{messages.map((message, index) => {
					switch(message.role) {
						case 'user':
							return (
								<Text key={index} backgroundColor={"gray"}>❯ {
									typeof message.content === "string" ? message.content : 
										typeof message.content.map((el) => el.type === "text" ? el.text : "")
								} </Text>
							)
						case 'assistant':
							return (
								message.content.map((content, index2) => {
									if(content.type === "thinking") {
										return <Text key={index * 10 + index2} color={"gray"}>
											{content.thinking}
										</Text>
									}
									else if(content.type === "text") {
										return <Text key={index * 10 + index2}>
											{content.text}
										</Text>
									}
									else {
										return <></>
									}
								})
							)
						default:
							return null
					}
				})}
			</Box>
			<Box
				borderBottom={true}
				borderTop={true}
				borderRight={false}
				borderLeft={false}
				borderColor={"gray"}
				borderStyle="single"
				width={"100%"}
				marginTop={1}
			><Text>❯ </Text>
				<TextInput
					showCursor={true}
					value={query} onChange={setQuery}
					onSubmit={() => {
						if(generating || query.trim() === '') return;
						onSubmit();
					}}
				/>
				{generating && <Text color={"green"}>Generating...</Text>}
			</Box>
		</Box>
	);
}
