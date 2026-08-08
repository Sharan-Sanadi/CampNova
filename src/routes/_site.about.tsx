import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/campusos/ui/primitives";

const title = "About CampusOS AI — Building the autonomous campus";
const description =
  "Why CampusOS AI exists: campus operations deserve an intelligence layer that understands, predicts and acts, not another booking form.";

export const Route = createFileRoute("/_site/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-label text-primary">About</p>
      <h1 className="text-display mt-4">Campuses run on decisions, not records.</h1>

      <div className="text-muted-foreground mt-8 space-y-5 text-[15px] leading-relaxed">
        <p>
          Most campus software is a filing cabinet with a login. It stores what happened, then asks a
          person to work out what to do about it — usually across four systems and a group chat.
        </p>
        <p>
          CampusOS AI takes the opposite position. The physical campus is a live system with capacity,
          pressure and constraints, so the software that runs it should reason about that system
          continuously: understand the current state, predict where it strains, and act.
        </p>
        <p>
          The Northgate Campus deployment is our reference environment — real resource shapes, real
          scheduling collisions, and a Copilot that resolves them with its reasoning on display.
          Every recommendation is auditable, because operational trust is earned, not assumed.
        </p>
      </div>

      <Panel className="mt-12 p-6">
        <p className="text-label text-muted-foreground/80">Operating principle</p>
        <p className="mt-3 text-sm leading-relaxed">
          Intelligence without accountability is noise. CampusOS never takes an action a human cannot
          inspect, and never hides the data behind a recommendation.
        </p>
      </Panel>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/copilot">Try the Copilot</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
