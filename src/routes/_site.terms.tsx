import { createFileRoute } from "@tanstack/react-router";

const title = "Terms — CampusOS AI";
const description =
  "Terms covering use of the CampusOS AI demonstration environment, including Copilot recommendations and operational actions.";

export const Route = createFileRoute("/_site/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    heading: "Demonstration environment",
    body: "This deployment is provided for evaluation. Resource, booking and utilisation data is synthetic and must not be relied upon for real scheduling decisions.",
  },
  {
    heading: "Copilot recommendations",
    body: "Copilot produces recommendations from the data available to it. Recommendations are advisory: a human approves every action before it is committed.",
  },
  {
    heading: "Acceptable use",
    body: "Do not use the environment to store confidential institutional data, attempt to bypass access controls, or resell access.",
  },
  {
    heading: "Availability",
    body: "The demonstration environment may change or be withdrawn without notice as the product develops.",
  },
  {
    heading: "Contact",
    body: "Questions about these terms can be directed to operations@campusos.ai.",
  },
];

function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-label text-primary">Legal</p>
      <h1 className="text-display mt-4">Terms of use</h1>
      <p className="text-meta mt-3">Last updated: this demonstration release</p>

      <div className="divide-border border-border mt-10 divide-y border-t">
        {sections.map((s) => (
          <section key={s.heading} className="py-6">
            <h2 className="text-[15px] font-medium tracking-tight">{s.heading}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
