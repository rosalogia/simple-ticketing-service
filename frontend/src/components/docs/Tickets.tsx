export default function Tickets() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Tickets
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        The core unit of work in STS
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          A ticket represents something one person is asking another person to
          do. The person creating the ticket is the{" "}
          <strong className="text-ink">assigner</strong>, and the person
          responsible for completing it is the{" "}
          <strong className="text-ink">assignee</strong>.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Ticket Fields</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Field</th>
                <th className="text-left py-2.5 font-semibold text-ink">Description</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Title</td>
                <td className="py-2.5">Short summary of the request</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Description</td>
                <td className="py-2.5">Detailed explanation, context, or instructions</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Priority</td>
                <td className="py-2.5">Severity level (SEV1–SEV4) indicating urgency</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Assignee</td>
                <td className="py-2.5">The person responsible for completing the ticket</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Due Date</td>
                <td className="py-2.5">Optional deadline; drives automatic escalation if set</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink whitespace-nowrap">Category / Type / Item</td>
                <td className="py-2.5">Optional classification fields for organizing tickets within a queue</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Statuses</h2>

        <p>
          Every ticket has a status that tracks where it is in its lifecycle.
          Status changes trigger notifications to the assigner.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatusCard
            name="Open"
            color="bg-status-open-bg text-status-open border-blue-200"
            description="Newly created. Work has not started yet. Eligible for paging if SEV1/SEV2."
          />
          <StatusCard
            name="In Progress"
            color="bg-status-progress-bg text-status-progress border-amber-200"
            description="The assignee is actively working on it. Still eligible for paging at longer intervals."
          />
          <StatusCard
            name="Blocked"
            color="bg-status-blocked-bg text-status-blocked border-red-200"
            description="Waiting on external input or a dependency. Paging and escalation are paused."
          />
          <StatusCard
            name="Completed"
            color="bg-status-done-bg text-status-done border-green-200"
            description="The work is finished. Paging and escalation stop."
          />
          <StatusCard
            name="Cancelled"
            color="bg-status-cancel-bg text-status-cancel border-gray-200"
            description="No longer needed. The ticket is closed without being completed."
          />
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Lifecycle</h2>

        <ol className="list-decimal list-outside ml-5 space-y-3">
          <li>
            <strong className="text-ink">Creation</strong> — the assigner
            creates a ticket and assigns it to someone in the queue. The
            assignee receives a push notification. If the ticket is SEV1 or
            SEV2, paging begins immediately.
          </li>
          <li>
            <strong className="text-ink">Work</strong> — the assignee moves the
            ticket to In Progress. Comments can be added by either party to
            communicate updates.
          </li>
          <li>
            <strong className="text-ink">Resolution</strong> — the assignee
            marks the ticket as Completed (or Cancelled if it's no longer
            relevant). The assigner is notified of the status change.
          </li>
        </ol>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Reassignment</p>
          <p className="text-stone-600">
            Tickets can be reassigned to a different person at any time. When
            this happens, the old assignee is notified that they've been
            replaced, the new assignee receives an assignment notification, and
            page tracking is reset so the new assignee receives fresh pages.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  name,
  color,
  description,
}: {
  name: string;
  color: string;
  description: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="font-semibold text-sm mb-1">{name}</p>
      <p className="text-xs opacity-80 leading-relaxed">{description}</p>
    </div>
  );
}
