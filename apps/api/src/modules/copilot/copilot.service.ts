import { v4 as uuidv4 } from "uuid";
import type { CopilotAnswer } from "@campus-os/shared-types";

import { env } from "../../config/env.js";
import { CopilotSession } from "../../db/models.js";
import type { AuthUser } from "../../shared/middleware/auth.js";
import { AnthropicProvider } from "../../providers/copilot/anthropic/AnthropicProvider.js";
import { OllamaProvider } from "../../providers/copilot/ollama/OllamaProvider.js";

export async function runCopilot(query: string, user: AuthUser, sessionExternalId?: string): Promise<CopilotAnswer> {
  const session = sessionExternalId
    ? await CopilotSession.findOneAndUpdate(
        { externalId: sessionExternalId },
        { $setOnInsert: { externalId: sessionExternalId, userId: user.mongoId, title: query.slice(0, 80) || "Copilot session" } },
        { upsert: true, new: true },
      )
    : await CopilotSession.create({
        externalId: `cp-${uuidv4()}`,
        userId: user.mongoId,
        title: query.slice(0, 80) || "Copilot session",
      });

  const provider = env.COPILOT_PROVIDER === "anthropic" ? new AnthropicProvider() : new OllamaProvider();
  return provider.answer(query, { user, sessionId: String(session._id) });
}
