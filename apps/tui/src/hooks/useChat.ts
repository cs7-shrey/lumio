import { useRef, useState } from 'react';
import { useCurrentChatStore } from '../store/currentChatStore.js';
import { Message, getModel, stream, Context, AssistantMessageEventStream, validateToolArguments, ToolResultMessage } from '@mariozechner/pi-ai';
import { bashTool, bashSchema } from '../core/tools/tools.js';
import { buildSystemPrompt } from '../core/system-prompt.js';
import { ToolRunner } from '../core/tools/runner.js';
import type { Static } from "@sinclair/typebox";

// Fully typed with auto-complete support for both providers and models
const model = getModel('openrouter', 'anthropic/claude-3.7-sonnet:thinking');

const runningToolCalls = [];


const runner = new ToolRunner();

export function useChat() {
	const [query, setQuery] = useState('');
	const [generating, setGenerating] = useState(false);
	const contextRef = useRef<Context>({
		systemPrompt: buildSystemPrompt({
			tools: [bashTool]
		}),
		messages: [],
		tools: [bashTool]
	})
	const { messages, addMessage, setLastMessage } = useCurrentChatStore();

	const processStream = async(chatStream: AssistantMessageEventStream) => {
		let toolCallCount = 0;
		for await (const event of chatStream) {
			switch (event.type) {
				case 'start':
					addMessage(event.partial);
					break;
				case 'text_start':
					setLastMessage(event.partial);
					break;
				case 'text_delta':
					setLastMessage(event.partial);
					break;
				case 'text_end':
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
					const toolCall = event.toolCall;
					switch (toolCall.name) {
						case "bash":
							const validatedArgs: Static<typeof bashSchema> = validateToolArguments(bashTool, toolCall)
							runner.addToolCall({
								id: toolCall.id,
								arguments: validatedArgs,
								tool: bashTool,
							})
							toolCallCount++;
							break;
						default:
							console.log("Unknown tool selected");
					}
					break;
				case 'done':
					contextRef.current.messages.push(event.message);
					break;
				case 'error':
					console.error(`Error: ${JSON.stringify(event.error)}`);
					break;
			}
		}
		return toolCallCount;
	};

	const processStreamWithToolCalls = async (firstStream: AssistantMessageEventStream) => {
		let currentStream = firstStream;
		let toolCallCount = 0;
		do {
			toolCallCount = await processStream(currentStream);
			if(toolCallCount == 0) {
				runner.stream.close();
			}
			let remainingToolCalls = toolCallCount;
			for await (const event of runner.stream) {
				remainingToolCalls--;

				switch(event.status) {
					case "completed":
						const toolMessage: ToolResultMessage = {
							role: "toolResult",
							toolCallId: event.toolCallId,
							toolName: event.toolName,
							content: [{ type: "text", text: event.result.text }],
							isError: false,
							timestamp: Date.now(),

						}
						contextRef.current.messages.push(toolMessage);
						addMessage(toolMessage);
						break;
					case "failed":
						console.log("tool call failed");
				}

				if(remainingToolCalls === 0) break;
			}
			if(toolCallCount > 0) {
				// console.log("Tool results found streaming again", JSON.stringify(contextRef.current.messages));
				currentStream = stream(model, contextRef.current, {
					reasoning: "high"
				})
			}
		}
		while(toolCallCount > 0);

		runner.clear()
		setGenerating(false);
	}

	const submit = async() => {
		if(generating || query.trim() === '') return;

		try {
			setGenerating(true);
			const now = Date.now();

			const newMessages: Message[] = [...messages, { role: 'user', content: query, timestamp: now }];
			addMessage({ role: 'user', content: query, timestamp: now });
			setQuery('');

			contextRef.current.messages = newMessages;

			const chatStream = stream(model, contextRef.current, {
				reasoning: 'high'
			});

			processStreamWithToolCalls(chatStream).catch((err) => {
				console.log(JSON.stringify(err));
			});
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
