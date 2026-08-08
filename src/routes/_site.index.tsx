import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Capabilities,
  ClosingCta,
  CopilotSection,
  Ecosystem,
  Hero,
  ValueShift,
  Workflow,
} from "@/components/campusos/site/sections";
import { ImmersiveCampus } from "@/experience/ImmersiveCampus";

const title = "CampusOS AI — The Intelligence Layer for the Autonomous Campus";
const description =
  "CampusOS AI understands, predicts and acts across campus resources, bookings and operations — with an AI Copilot that reasons over real data.";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  // The scroll narrative is measured against the landing content itself.
  const narrativeRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={narrativeRef} className="relative">
      <ImmersiveCampus scrollTarget={narrativeRef} />
      {/* Existing CampusOS sections, unchanged — simply layered above the scene. */}
      <div className="relative z-10">
        <Hero />
        <ValueShift />
        <Workflow />
        <CopilotSection />
        <Capabilities />
        <Ecosystem />
        <ClosingCta />
      </div>
    </div>
  );
}
