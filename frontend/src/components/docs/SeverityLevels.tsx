export default function SeverityLevels() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Severity Levels
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Four priority tiers that determine urgency and paging behavior
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          Every ticket has a severity level from SEV1 (most urgent) to SEV4
          (least urgent). Severity controls whether a ticket triggers paging
          notifications and how aggressively the system follows up.
        </p>

        <div className="grid gap-3">
          <div className="rounded-xl border border-sev1-border bg-sev1-bg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-sev1 bg-white/70 px-2 py-0.5 rounded border border-sev1-border">
                SEV1
              </span>
              <span className="text-sm font-semibold text-sev1">Critical</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Requires immediate attention. Pages are sent every 15 minutes when
              open, every 2 hours when in progress. SEV1 pages are delivered
              even outside pageable hours by default.
            </p>
          </div>

          <div className="rounded-xl border border-sev2-border bg-sev2-bg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-sev2 bg-white/70 px-2 py-0.5 rounded border border-sev2-border">
                SEV2
              </span>
              <span className="text-sm font-semibold text-sev2">High</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Should be handled soon. Pages are sent every 30 minutes when open,
              every 8 hours when in progress. SEV2 pages strictly respect
              pageable hours.
            </p>
          </div>

          <div className="rounded-xl border border-sev3-border bg-sev3-bg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-sev3 bg-white/70 px-2 py-0.5 rounded border border-sev3-border">
                SEV3
              </span>
              <span className="text-sm font-semibold text-sev3">Medium</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Standard work item. No paging — the assignee is notified once at
              creation and when comments are added, but the system will not send
              follow-up pages.
            </p>
          </div>

          <div className="rounded-xl border border-sev4-border bg-sev4-bg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-sev4 bg-white/70 px-2 py-0.5 rounded border border-sev4-border">
                SEV4
              </span>
              <span className="text-sm font-semibold text-sev4">Low</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">
              Can wait. Useful for backlog items, reading recommendations, or
              nice-to-haves. No paging.
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Comparison</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Level</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Pageable</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Open Interval</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">In Progress Interval</th>
                <th className="text-left py-2.5 font-semibold text-ink">Off-Hours</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev1">SEV1</td>
                <td className="py-2.5 pr-4">Yes</td>
                <td className="py-2.5 pr-4">15 min</td>
                <td className="py-2.5 pr-4">2 hrs</td>
                <td className="py-2.5">Pages by default (opt-out available)</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev2">SEV2</td>
                <td className="py-2.5 pr-4">Yes</td>
                <td className="py-2.5 pr-4">30 min</td>
                <td className="py-2.5 pr-4">8 hrs</td>
                <td className="py-2.5">No pages outside hours</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev3">SEV3</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5 pr-4">—</td>
                <td className="py-2.5 pr-4">—</td>
                <td className="py-2.5">—</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-mono font-medium text-sev4">SEV4</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5 pr-4">—</td>
                <td className="py-2.5 pr-4">—</td>
                <td className="py-2.5">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Role Restrictions
        </h2>

        <p>
          Queue owners can create tickets at any severity. Members are limited
          by the queue's{" "}
          <strong className="text-ink">member max severity</strong> setting —
          for example, if set to SEV2, members can create SEV2, SEV3, and SEV4
          tickets but not SEV1. Viewers cannot create tickets at all.
        </p>
      </div>
    </div>
  );
}
