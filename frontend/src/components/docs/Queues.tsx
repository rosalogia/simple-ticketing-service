export default function Queues() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Queues
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Shared spaces that organize tickets and members
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          A queue is a group of people who can create and manage tickets
          together. Every ticket belongs to exactly one queue, and every queue
          member has a role that determines what they can do.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Roles</h2>

        <p>
          Each member of a queue has one of three roles. Roles control ticket
          creation permissions, queue management access, and notification
          behavior.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Role</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Create Tickets</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Manage Members</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Queue Settings</th>
                <th className="text-left py-2.5 font-semibold text-ink">Delete Queue</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">Owner</td>
                <td className="py-2.5 pr-4">Any severity</td>
                <td className="py-2.5 pr-4">Yes</td>
                <td className="py-2.5 pr-4">Yes</td>
                <td className="py-2.5">Yes</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">Member</td>
                <td className="py-2.5 pr-4">Restricted by max severity</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5">No</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink">Viewer</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5 pr-4">No</td>
                <td className="py-2.5">No</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Member Max Severity
        </h2>

        <p>
          Queue owners can configure a{" "}
          <strong className="text-ink">member max severity</strong> setting that
          limits which severity levels members can assign when creating tickets.
          Owners are always unrestricted.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Example</p>
          <p className="text-stone-600">
            If a queue's member max severity is set to{" "}
            <span className="font-mono text-sev2 font-medium">SEV2</span>,
            members can create SEV2, SEV3, and SEV4 tickets but cannot create
            SEV1 tickets. Only the queue owner can create SEV1 tickets in that
            queue.
          </p>
        </div>

        <p>
          The default member max severity is SEV1, meaning members have no
          restrictions unless the owner changes it.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Discord Import
        </h2>

        <p>
          You can create a queue by importing a Discord server. This
          automatically creates the queue and adds all server members. The STS
          Discord bot must be present in the server for this to work.
        </p>

        <p>
          After import, you can sync members at any time to pick up new server
          members or remove people who have left.
        </p>
      </div>
    </div>
  );
}
