export default function Escalation() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Escalation
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Automatic priority upgrades as due dates approach
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          When a ticket has a due date, the system can automatically increase
          its severity as the deadline approaches. This ensures that work which
          seemed low-priority at creation gets appropriate attention before it's
          overdue.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Escalation Ladder
        </h2>

        <p>
          Each escalation bumps the priority up by one level. SEV1 is the
          ceiling — once a ticket reaches SEV1, it cannot be escalated further.
        </p>

        <div className="flex items-center gap-2 sm:gap-3 py-4 flex-wrap">
          <span className="font-mono text-xs font-semibold text-sev4 bg-sev4-bg border border-sev4-border px-3 py-1.5 rounded-lg">
            SEV4
          </span>
          <Arrow />
          <span className="font-mono text-xs font-semibold text-sev3 bg-sev3-bg border border-sev3-border px-3 py-1.5 rounded-lg">
            SEV3
          </span>
          <Arrow />
          <span className="font-mono text-xs font-semibold text-sev2 bg-sev2-bg border border-sev2-border px-3 py-1.5 rounded-lg">
            SEV2
          </span>
          <Arrow />
          <span className="font-mono text-xs font-semibold text-sev1 bg-sev1-bg border border-sev1-border px-3 py-1.5 rounded-lg">
            SEV1
          </span>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          When Escalation Triggers
        </h2>

        <p>
          A background job checks for escalation every 30 minutes. The timing
          of escalation depends on how close the ticket is to its due date.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Timing</th>
                <th className="text-left py-2.5 font-semibold text-ink">Behavior</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">7 days before due</td>
                <td className="py-2.5">
                  One escalation. Only if the ticket was created at least 7
                  days before the due date (prevents spam for short-deadline
                  tickets).
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">On the due date</td>
                <td className="py-2.5">One escalation.</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">After the due date</td>
                <td className="py-2.5">
                  Escalates once per day until the ticket reaches SEV1 or is
                  resolved.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Pausing & Resuming
        </h2>

        <p>
          Escalation is automatically paused when a ticket enters a terminal or
          blocked status, and resumes when it returns to an active status.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
            <p className="font-medium text-ink mb-1">Escalation pauses when</p>
            <ul className="list-disc list-outside ml-4 text-stone-600 space-y-1">
              <li>Ticket status is Blocked</li>
              <li>Ticket status is Completed</li>
              <li>Ticket status is Cancelled</li>
            </ul>
          </div>
          <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
            <p className="font-medium text-ink mb-1">Escalation resumes when</p>
            <ul className="list-disc list-outside ml-4 text-stone-600 space-y-1">
              <li>Ticket returns to Open</li>
              <li>Ticket returns to In Progress</li>
            </ul>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Escalation &amp; Paging
        </h2>

        <p>
          When automatic escalation bumps a ticket to SEV1 or SEV2, an immediate
          page is triggered for the assignee. This means the assignee will know
          right away that the ticket's priority has increased and needs more
          urgent attention.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Manual Escalation</p>
          <p className="text-stone-600">
            In addition to automatic escalation, anyone in the queue can
            manually escalate a ticket's priority by one level at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-400 flex-shrink-0"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
