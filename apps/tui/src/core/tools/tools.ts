import { Type, Tool, StringEnum } from '@mariozechner/pi-ai';
import type { Static, TSchema } from "@sinclair/typebox";
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const DEFAULT_MAX_LINES = 2000;
export const DEFAULT_MAX_BYTES = 50 * 1024; // 50KB
export const GREP_MAX_LINE_LENGTH = 500; // Max chars per grep match line

// Define tool parameters with TypeBox
const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: Type.Object({
    location: Type.String({ description: 'City name or coordinates' }),
    units: StringEnum(['celsius', 'fahrenheit'], { default: 'celsius' })
  })
};

const bookMeetingTool: Tool = {
  name: 'book_meeting',
  description: 'Schedule a meeting',
  parameters: Type.Object({
    title: Type.String({ minLength: 1 }),
    startTime: Type.String({ format: 'date-time' }),
    endTime: Type.String({ format: 'date-time' }),
    attendees: Type.Array(Type.String({ format: 'email' }), { minItems: 1 })
  })
};

export const bashSchema = Type.Object({
	command: Type.String({ description: "Bash command to execute" }),
	timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, no default timeout)" })),
});

export interface AgentToolResult<T = any> {
    text: string;
}

export interface AgentTool<T extends TSchema = TSchema, TResult = any> extends Tool<T> {
    label: string;      // for human readable
    execute: (params: Static<T>) => Promise<AgentToolResult<TResult>>
}

export const bashTool: AgentTool<typeof bashSchema> = {
    name: "bash",
    label: "bash",
    description: `Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). If truncated, full output is saved to a temp file. Optionally provide a timeout in seconds.`,
    parameters: bashSchema,
    execute: async ({ command, timeout }) => {
        return new Promise((resolve, reject) => {
            const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
            const args = process.platform === 'win32' ? ['/c', command] : ['-c', command];

            const child = spawn(shell, args, {
                cwd: process.cwd(),
                env: process.env,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            let timedOut = false;
            let timeoutHandle: NodeJS.Timeout | undefined;

            // Set timeout if provided
            if (timeout && timeout > 0) {
                timeoutHandle = setTimeout(() => {
                    timedOut = true;
                    child.kill('SIGTERM');
                    setTimeout(() => child.kill('SIGKILL'), 1000);
                }, timeout * 1000);
            }

            // Collect stdout
            child.stdout?.on('data', (data: Buffer) => {
                output += data.toString();
            });

            // Collect stderr
            child.stderr?.on('data', (data: Buffer) => {
                output += data.toString();
            });

            // Handle errors
            child.on('error', (err) => {
                if (timeoutHandle) clearTimeout(timeoutHandle);
                reject(new Error(`Failed to execute command: ${err.message}`));
            });

            // Handle process exit
            child.on('close', (code) => {
                if (timeoutHandle) clearTimeout(timeoutHandle);

                if (timedOut) {
                    if (output) output += '\n\n';
                    output += `Command timed out after ${timeout} seconds`;
                }

                // Truncate output if needed
                const outputBytes = Buffer.byteLength(output, 'utf-8');
                const outputLines = output.split('\n');
                let finalOutput = output;
                let tempFilePath: string | undefined;

                // Check if we need to truncate
                if (outputBytes > DEFAULT_MAX_BYTES || outputLines.length > DEFAULT_MAX_LINES) {
                    // Save full output to temp file
                    const tempId = randomBytes(8).toString('hex');
                    tempFilePath = join(tmpdir(), `bash-${tempId}.log`);
                    writeFileSync(tempFilePath, output, 'utf-8');

                    // Truncate to last N lines or bytes
                    if (outputLines.length > DEFAULT_MAX_LINES) {
                        const truncatedLines = outputLines.slice(-DEFAULT_MAX_LINES);
                        finalOutput = truncatedLines.join('\n');
                        finalOutput += `\n\n[Showing last ${DEFAULT_MAX_LINES} lines of ${outputLines.length}. Full output saved to: ${tempFilePath}]`;
                    } else {
                        // Truncate by bytes - take last N bytes
                        const buffer = Buffer.from(output, 'utf-8');
                        const truncatedBuffer = buffer.slice(-DEFAULT_MAX_BYTES);
                        finalOutput = truncatedBuffer.toString('utf-8');
                        finalOutput += `\n\n[Output truncated to ${DEFAULT_MAX_BYTES / 1024}KB. Full output saved to: ${tempFilePath}]`;
                    }
                }

                if (code !== 0 && code !== null && !timedOut) {
                    finalOutput += `\n\nCommand exited with code ${code}`;
                    reject(new Error(finalOutput));
                } else {
                    resolve({ text: finalOutput });
                }
            });
        });
    }
}