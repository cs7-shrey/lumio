import { Static, TSchema } from "@sinclair/typebox";
import { type AgentTool } from "./tools/tools.js";

interface BuildSystemPromptOptions {
    tools: AgentTool<any>[]
}

export function buildSystemPrompt (options: BuildSystemPromptOptions) {
    const tools = options.tools
	const toolsList = tools.length > 0 ? tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") : "(none)";

	let prompt = `You are an expert coding assistant operating inside lumio, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}`

    return prompt;
}