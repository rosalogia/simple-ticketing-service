export default function PageableHours() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Pageable Hours
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Per-user schedules that control when pages are delivered
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          Each user has a per-queue schedule that defines when they can be
          paged. Outside of these hours, most pages are held — protecting users
          from disruptions during off-hours while still allowing truly critical
          issues to break through.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Default Schedule
        </h2>

        <p>
          By default, pageable hours are set to <strong className="text-ink">9:00 AM – 5:00 PM every day</strong> in
          the <strong className="text-ink">America/New_York</strong> timezone.
          You can customize the schedule per day with different start and end
          times, and set your own timezone.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Schedule Format</p>
          <p className="text-stone-600 mb-3">
            Each day of the week has a start and end time in 24-hour format.
            Midnight-wrapping schedules are supported — for example, a night
            shift from 22:00 to 06:00.
          </p>
          <div className="font-mono text-xs bg-stone-800 text-stone-200 rounded-lg p-3 overflow-x-auto">
            <pre>{`{
  "mon": { "start": "09:00", "end": "17:00" },
  "tue": { "start": "09:00", "end": "17:00" },
  "wed": { "start": "09:00", "end": "17:00" },
  "thu": { "start": "09:00", "end": "17:00" },
  "fri": { "start": "09:00", "end": "17:00" },
  "sat": { "start": "09:00", "end": "17:00" },
  "sun": { "start": "09:00", "end": "17:00" }
}`}</pre>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          How Severity Affects Off-Hours Behavior
        </h2>

        <p>
          SEV1 and SEV2 pages behave differently outside pageable hours.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-sev2-border bg-sev2-bg p-4">
            <p className="font-semibold text-sm text-sev2 mb-1">
              SEV2 — Strict
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              SEV2 pages are <strong>never sent</strong> outside pageable hours.
              The page is simply skipped until the next check during pageable
              hours.
            </p>
          </div>
          <div className="rounded-xl border border-sev1-border bg-sev1-bg p-4">
            <p className="font-semibold text-sm text-sev1 mb-1">
              SEV1 — Opt-Out
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              SEV1 pages are sent <strong>anytime</strong> by default,
              regardless of schedule. Users who don't want off-hours SEV1 pages
              can enable the opt-out setting.
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          SEV1 Off-Hours Opt-Out
        </h2>

        <p>
          The <strong className="text-ink">sev1_off_hours_opt_out</strong>{" "}
          setting lets users choose whether SEV1 pages should respect their
          pageable hours schedule.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Setting</th>
                <th className="text-left py-2.5 font-semibold text-ink">Behavior</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">Off (default)</td>
                <td className="py-2.5">
                  SEV1 pages are delivered at any time, even outside pageable
                  hours. This is the safest default for truly critical issues.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink">On</td>
                <td className="py-2.5">
                  SEV1 pages respect your pageable hours schedule. You will not
                  be paged for SEV1 tickets outside your configured hours.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Per-Queue Settings
        </h2>

        <p>
          Pageable hours, timezone, and the SEV1 opt-out are configured
          independently for each queue. This means you can have different
          schedules for different teams or contexts — for example, a work queue
          with business-hours paging and a personal queue with 24/7 paging.
        </p>
      </div>
    </div>
  );
}
