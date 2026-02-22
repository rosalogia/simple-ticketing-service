import { Link } from "react-router-dom";

export default function Paging() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Paging
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Repeated push notifications that ensure urgent tickets get attention
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          When a SEV1 or SEV2 ticket is created, the assignee receives an
          immediate page — a push notification on their mobile device. If the
          page isn't acknowledged, the system will continue re-paging at fixed
          intervals until someone responds.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Re-Paging Intervals
        </h2>

        <p>
          A background job runs every minute to check whether any tickets need
          re-paging. The interval depends on the ticket's severity and current
          status.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Priority</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Status</th>
                <th className="text-left py-2.5 font-semibold text-ink">Interval</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev1">SEV1</td>
                <td className="py-2.5 pr-4">Open</td>
                <td className="py-2.5 font-medium text-ink">Every 15 minutes</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev1">SEV1</td>
                <td className="py-2.5 pr-4">In Progress</td>
                <td className="py-2.5 font-medium text-ink">Every 2 hours</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-mono font-medium text-sev2">SEV2</td>
                <td className="py-2.5 pr-4">Open</td>
                <td className="py-2.5 font-medium text-ink">Every 30 minutes</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-mono font-medium text-sev2">SEV2</td>
                <td className="py-2.5 pr-4">In Progress</td>
                <td className="py-2.5 font-medium text-ink">Every 8 hours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          SEV3 and SEV4 tickets are not pageable — the assignee is notified once
          at creation and that's it.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Acknowledgement</h2>

        <p>
          When a user receives a page, they can acknowledge it to stop
          re-paging. Acknowledgement signals "I've seen this and I'm handling
          it" without needing to change the ticket's status immediately.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Note</p>
          <p className="text-stone-600">
            If a ticket is reassigned to a different person, the acknowledgement
            is reset so the new assignee starts receiving fresh pages.
          </p>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Manual Paging</h2>

        <p>
          You can manually trigger an immediate page for any SEV1 or SEV2 ticket
          that is Open or In Progress. This is useful when you need someone's
          attention right now rather than waiting for the next automatic re-page.
          Manual pages still respect{" "}
          <Link
            to="/docs/pageable-hours"
            className="text-accent hover:underline"
          >
            pageable hours
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          When Paging Stops
        </h2>

        <ul className="list-disc list-outside ml-5 space-y-2">
          <li>The page is acknowledged by the assignee</li>
          <li>
            The ticket moves to a non-pageable status (Blocked, Completed, or
            Cancelled)
          </li>
          <li>
            The ticket's priority is downgraded to SEV3 or SEV4
          </li>
        </ul>
      </div>
    </div>
  );
}
