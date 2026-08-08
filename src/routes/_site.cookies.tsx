import { createFileRoute } from "@tanstack/react-router";

const title = "Cookies — CampusOS AI";
const description =
  "How the CampusOS AI demonstration environment uses local storage and cookies for session and theme preferences.";

export const Route = createFileRoute("/_site/cookies")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

const sections = [
  {
    heading: "What we store",
    body: "The demonstration environment stores a single theme preference key locally in your browser so light or dark mode persists between visits. Nothing else is written to disk.",
  },
  {
    heading: "No tracking cookies",
    body: "There are no advertising, profiling or third-party analytics cookies in this deployment. No cross-site identifiers are set.",
  },
  {
    heading: "Session state",
    body: "Sign-in is mocked for the demonstration. When real authentication is connected, a first-party session cookie will be issued and scoped to this domain only.",
  },
  {
    heading: "Clearing preferences",
    body: "Clearing site data in your browser removes the stored theme preference. CampusOS then follows your operating system appearance setting.",
  },
  {
    heading: "Contact",
    body: "Questions about local storage or cookies can be directed to operations@campusos.ai.",
  },
];

function CookiesPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-label text-primary">Legal</p>
      <h1 className="text-display mt-4">Cookies &amp; local storage</h1>
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
