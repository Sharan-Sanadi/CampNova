import { createFileRoute } from "@tanstack/react-router";
import { CopilotShell } from "@/components/campusos/copilot/CopilotShell";

export const Route = createFileRoute("/_shell/copilot")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Campus Copilot — CampusOS AI" },
      {
        name: "description",
        content:
          "Ask in natural language. CampusOS finds resources, reasons over campus data, recommends and acts.",
      },
      { property: "og:title", content: "AI Campus Copilot — CampusOS AI" },
      {
        property: "og:description",
        content: "Natural language operations for the autonomous campus.",
      },
    ],
  }),
  component: CopilotPage,
});

function CopilotPage() {
  const { q } = Route.useSearch();
  return <CopilotShell {...(q ? { initialQuery: q } : {})} />;
}
