import { Static, TSchema } from "@sinclair/typebox";
import { AgentToolResult, type AgentTool } from "./tools.js"

interface ToolCallRequest<T extends TSchema> {
    id: string;
    arguments: Static<T>;
    tool: AgentTool<T>;
}

type ToolCallResult = {
    status: "completed"
    result: AgentToolResult<any>;
} | {
    status: "failed"
    error: string;
} | {
    status: "running";
}

export class ToolRunner {
    toolRequests: ToolCallRequest<any>[];
    toolResults: Record<string, ToolCallResult>;
    stream: ToolCallEventStream;

    constructor() {
        this.toolRequests = [];
        this.toolResults = {};
        this.stream = new ToolCallEventStream();
    }

    addToolCall<T extends TSchema>(toolRequest: ToolCallRequest<T>) {
        const toStart = this.toolRequests.length === 0;
        this.toolRequests.push(toolRequest);
        if (toStart) {
          this.startRun();
        }
    }

    startRun() {
        while(this.toolRequests.length != 0) {
            const toolRequest = this.toolRequests.shift()!;
            this.toolResults[toolRequest.id] = { status: "running" };

            // run tools
            (async () => {
                // await the tool run

                // TODO: catch if errors
                const result = await toolRequest.tool.execute(toolRequest.arguments)
                this.toolResults[toolRequest.id] = { status: "completed", result };
                this.stream.push({
                  toolCallId: toolRequest.id,
                  toolName: toolRequest.tool.name,
                  result,
                  status: "completed",
                  timestamp: new Date(),
                })
                // update result
                // emit events
            })()
        }
    }

    clear() {
      this.toolRequests = [];
      this.toolResults = {};
      this.stream.reset();   
    }
}

type JobStatus = "completed" | "failed" | "cancelled";

type ToolCallEvent = {
  toolCallId: string;
  toolName: string;
  status: "completed";
  result: AgentToolResult;
  timestamp: Date;
} | {
  toolId: string;
  toolName: string;
  status: "failed";
  error: string;
  timestamp: Date;
}

class ToolCallEventStream {
    private queue: ToolCallEvent[] = [];
    private waiters: Array<(event: ToolCallEvent) => void> = [];
    private closed = false;
  
    push(event: ToolCallEvent): void {
      if (this.closed) throw new Error("Stream is closed");
  
      if (this.waiters.length > 0) {
        this.waiters.shift()!(event);  // wake a waiting consumer directly
      } else {
        this.queue.push(event);        // buffer it
      }
    }
  
    close(): void {
      this.closed = true;
      this.waiters.forEach(w => w(null!));
      this.waiters = [];
    }

    reset(): void {
      this.closed = false;
      this.waiters.forEach(w => w(null!));
      this.waiters = [];
    }
  
    async *[Symbol.asyncIterator](): AsyncGenerator<ToolCallEvent> {
      while (true) {
        if (this.queue.length > 0) {
          yield this.queue.shift()!;
          continue;
        }
        if (this.closed) return;
  
        // Park until an event arrives
        const event = await new Promise<ToolCallEvent>(resolve => {
          this.waiters.push(resolve);
        });
  
        if (event) yield event;
      }
    }
}