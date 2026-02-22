import { lazy, Suspense, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";

const sections = [
  { slug: "overview", label: "Overview" },
  { slug: "queues", label: "Queues" },
  { slug: "tickets", label: "Tickets" },
  { slug: "severity-levels", label: "Severity Levels" },
  { slug: "paging", label: "Paging" },
  { slug: "escalation", label: "Escalation" },
  { slug: "pageable-hours", label: "Pageable Hours" },
  { slug: "notifications", label: "Notifications" },
  { slug: "on-behalf-of", label: "On Behalf Of" },
  { slug: "api-keys", label: "API Keys" },
] as const;

export type DocSection = (typeof sections)[number]["slug"];

const sectionComponents: Record<DocSection, React.LazyExoticComponent<React.ComponentType>> = {
  overview: lazy(() => import("./Overview")),
  queues: lazy(() => import("./Queues")),
  tickets: lazy(() => import("./Tickets")),
  "severity-levels": lazy(() => import("./SeverityLevels")),
  paging: lazy(() => import("./Paging")),
  escalation: lazy(() => import("./Escalation")),
  "pageable-hours": lazy(() => import("./PageableHours")),
  notifications: lazy(() => import("./Notifications")),
  "on-behalf-of": lazy(() => import("./OnBehalfOf")),
  "api-keys": lazy(() => import("./ApiKeys")),
};

export default function DocsLayout() {
  const { section } = useParams<{ section?: string }>();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeSection = (section || "overview") as DocSection;

  if (section && !sections.some((s) => s.slug === section)) {
    return <Navigate to="/docs" replace />;
  }

  const ContentComponent = sectionComponents[activeSection];

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="text-lg font-bold tracking-tight text-stone-100 hover:text-white transition-colors"
            >
              STS
            </Link>
            <span className="text-stone-600">/</span>
            <Link
              to="/docs"
              className="text-stone-300 text-sm font-medium hover:text-white transition-colors"
            >
              Docs
            </Link>
          </div>
          {/* Mobile nav toggle */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden text-stone-400 hover:text-white transition-colors p-1"
            title="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileNavOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown — fixed below sticky header */}
      {mobileNavOpen && (
        <div className="fixed inset-x-0 top-14 z-30 lg:hidden">
          <nav className="bg-paper border-b border-stone-200 shadow-md">
            <ul className="max-w-[1100px] mx-auto px-3 sm:px-6 py-2 space-y-0.5">
              {sections.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={s.slug === "overview" ? "/docs" : `/docs/${s.slug}`}
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      activeSection === s.slug
                        ? "bg-stone-100 text-ink font-medium"
                        : "text-stone-500 hover:text-ink hover:bg-stone-50"
                    }`}
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-3 sm:px-6 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Sidebar — desktop only */}
          <nav className="hidden lg:block lg:w-48 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              <ul className="space-y-0.5">
                {sections.map((s) => (
                  <li key={s.slug}>
                    <Link
                      to={s.slug === "overview" ? "/docs" : `/docs/${s.slug}`}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        activeSection === s.slug
                          ? "bg-stone-100 text-ink font-medium"
                          : "text-stone-500 hover:text-ink hover:bg-stone-50"
                      }`}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="text-stone-400 text-sm py-8">Loading...</div>
              }
            >
              <ContentComponent />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
