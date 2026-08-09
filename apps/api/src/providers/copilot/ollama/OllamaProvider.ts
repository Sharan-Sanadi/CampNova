import { CopilotAnswerSchema, type CopilotAnswer } from "@campus-os/shared-types";

import { env } from "../../../config/env.js";
import { CopilotMessage } from "../../../db/models.js";
import type { CopilotContext, CopilotProvider } from "../provider.js";
import { copilotToolDefinitions, executeCopilotTool, type ToolTrace } from "../tools/tools.js";
import { buildLocalCopilotAnswer } from "../tools/local-answer.js";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
};

function systemPrompt() {
  return `You are CampusOS AI. Use the provided tools when helpful. Return ONLY valid JSON matching the CopilotAnswer schema. The response is one final object, not streamed phases. Populate stages with the actual reasoning/tool steps.`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found");
  return JSON.parse(match[0]);
}

export class OllamaProvider implements CopilotProvider {
  name = "ollama" as const;

  async answer(query: string, context: CopilotContext): Promise<CopilotAnswer> {
    const traces: ToolTrace[] = [];
    try {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt() },
        { role: "user", content: query },
      ];
      let response = await this.chat(messages);
      const toolCalls = response.tool_calls ?? [];
      if (toolCalls.length) {
        messages.push({ role: "assistant", content: response.content ?? null, tool_calls: toolCalls });
        for (const call of toolCalls) {
          let args: unknown = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = await executeCopilotTool(call.function.name, args);
          traces.push({ name: call.function.name, args, result });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
        messages.push({
          role: "user",
          content: "Return ONLY valid JSON matching the CopilotAnswer schema. Do not include markdown.",
        });
        response = await this.chat(messages);
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const answer = CopilotAnswerSchema.parse(extractJson(response.content ?? ""));
          await this.persistTrace(context.sessionId, context.user.mongoId, query, answer, traces);
          return answer;
        } catch (error) {
          if (attempt === 2) throw error;
          messages.push({
            role: "user",
            content:
              "Your previous response was invalid. Retry with ONLY valid JSON matching the CopilotAnswer schema. No prose, no markdown.",
          });
          response = await this.chat(messages);
        }
      }
      throw new Error("unreachable");
    } catch (error) {
      const fallback = await buildLocalCopilotAnswer(query);
      await this.persistTrace(context.sessionId, context.user.mongoId, query, fallback, [
        ...traces,
        { name: "ollama_fallback", args: { error: error instanceof Error ? error.message : String(error) }, result: "local deterministic answer" },
      ]);
      return fallback;
    }
  }

  private async chat(messages: ChatMessage[]) {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        tools: copilotToolDefinitions,
        temperature: 0.2,
      }),
    });
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) throw new Error("Ollama returned no message");
    return message;
  }

  private async persistTrace(
    sessionId: string,
    userId: string,
    query: string,
    answer: CopilotAnswer,
    traces: ToolTrace[],
  ) {
    await CopilotMessage.create([
      { sessionId, userId, role: "user", content: query, toolTrace: null },
      { sessionId, userId, role: "assistant", content: JSON.stringify(answer), toolTrace: traces },
    ]);
  }
}
