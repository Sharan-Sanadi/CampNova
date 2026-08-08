import { createFileRoute } from "@tanstack/react-router";

const title = "Privacy — CampusOS AI";
const description =
  "How CampusOS AI handles campus operational data, personal information and access controls in this demonstration deployment.";

export const Route = createFileRoute("/_site/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    heading: "Scope of this notice",
    body: "CampusOS AI is presented here as a demonstration deployment using synthetic Northgate Campus data. No live student or staff records are processed by this environment.",
  },
  {
    heading: "Data we handle",
    body: "In a production deployment CampusOS processes resource inventories, timetables, booking records and the identity of the requesting staff member. Copilot requests are evaluated against that operational data only.",
  },
  {
    heading: "Access control",
    body: "Access is scoped by institutional role. Operational actions such as reservations and relocations are recorded with the acting user and the evidence the recommendation was based on.",
  },
  {
    heading: "Retention",
    body: "Operational records are retained for the academic period defined by the institution. Copilot reasoning traces are retained only as long as needed for audit and review.",
  },
  {
    heading: "Contact",
    body: "Questions about data handling can be directed to operations@campusos.ai.",
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-label text-primary">Legal</p>
      <h1 className="text-display mt-4">Privacy</h1>
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
