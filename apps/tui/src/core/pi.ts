import { Type, getModel, stream, complete, Context, Tool, StringEnum, Model } from '@mariozechner/pi-ai';

// Fully typed with auto-complete support for both providers and models
const model = getModel('openrouter', 'anthropic/claude-3.7-sonnet:thinking');


// Build a conversation context (easily serializable and transferable between models)
const input = prompt("Enter a prompt: ");
if(input === null) {
    process.exit(1);
}

const context: Context = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: input, timestamp: Date.now() }],
};

// Option 1: Streaming with all event types
const s = stream(model, context, {
    reasoning: "high"
});

for await (const event of s) {
  switch (event.type) {
    case 'start':
      console.log(`Starting with ${event.partial.model}`);
      break;
    case 'text_start':
      console.log('\n[Text started]');
      break;
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'text_end':
      console.log('\n[Text ended]', JSON.stringify(event.partial));
      break;
    case 'thinking_start':
      console.log('[Model is thinking...]');
      break;
    case 'thinking_delta':
      process.stdout.write(event.delta);
      break;
    case 'thinking_end':
      console.log('[Thinking complete]');
      break;
    case 'toolcall_start':
      console.log(`\n[Tool call started: index ${event.contentIndex}]`);
      break;
    case 'toolcall_delta':
      // Partial tool arguments are being streamed
      const partialCall = event.partial.content[event.contentIndex];
      if (partialCall?.type === 'toolCall') {
        console.log(`[Streaming args for ${partialCall.name}]`);
      }
      break;
    case 'toolcall_end':
      console.log(`\nTool called: ${event.toolCall.name}`);
      console.log(`Arguments: ${JSON.stringify(event.toolCall.arguments)}`);
      break;
    case 'done':
      console.log(`\nFinished: ${event.reason}`);
      break;
    case 'error':
      console.error(`Error: ${event.error}`);
      break;
  }
}

// Get the final message after streaming, add it to the context
const finalMessage = await s.result();
context.messages.push(finalMessage);


console.log(`Total tokens: ${finalMessage.usage.input} in, ${finalMessage.usage.output} out`);
console.log(`Cost: $${finalMessage.usage.cost.total.toFixed(4)}`);

// Option 2: Get complete response without streaming
const response = await complete(model, context);

for (const block of response.content) {
  if (block.type === 'text') {
    console.log(block.text);
  } else if (block.type === 'toolCall') {
    console.log(`Tool: ${block.name}(${JSON.stringify(block.arguments)})`);
  }
}