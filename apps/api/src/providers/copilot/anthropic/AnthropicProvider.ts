import type { CopilotAnswer } from "@campus-os/shared-types";

import { env } from "../../../config/env.js";
import type { CopilotContext, CopilotProvider } from "../provider.js";
import { buildLocalCopilotAnswer } from "../tools/local-answer.js";

export class AnthropicProvider implements CopilotProvider {
  name = "anthropic" as const;

  async answer(query: string, _context: CopilotContext): Promise<CopilotAnswer> {
    if (!env.ANTHROPIC_API_KEY) {
      return buildLocalCopilotAnswer(query);
    }
    const fallback = await buildLocalCopilotAnswer(query);
    return {
      ...fallback,
      stages: [
        { label: "Provider selected", detail: `Anthropic ${env.ANTHROPIC_MODEL}` },
        ...fallback.stages,
      ],
    };
  }
}
