import type { AuthUser } from "../../shared/middleware/auth.js";
import type { CopilotAnswer } from "@campus-os/shared-types";

export type CopilotContext = {
  user: AuthUser;
  sessionId: string;
};

export interface CopilotProvider {
  name: "ollama" | "anthropic";
  answer(query: string, context: CopilotContext): Promise<CopilotAnswer>;
}
