import { Link } from "react-router-dom";

export default function Overview() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        What is STS?
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Simple Ticketing Service — collaborative tickets between people
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          STS is a bidirectional ticketing system. Unlike traditional ticketing
          where customers submit requests to a support team, STS lets anyone
          ticket anyone else — for reading recommendations, urgent favors,
          household chores, or anything in between.
        </p>

        <p>
          Tickets are organized into <strong className="text-ink">queues</strong>,
          which act as shared spaces for a group of people. Each ticket has a{" "}
          <strong className="text-ink">severity level</strong> that determines
          how urgently it needs attention, and the system has built-in mechanisms
          to make sure nothing falls through the cracks.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Core Concepts</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <ConceptCard
            to="/docs/queues"
            title="Queues"
            description="Shared spaces that group tickets and members together. Members have roles (Owner, Member, Viewer) that control what they can do."
          />
          <ConceptCard
            to="/docs/severity-levels"
            title="Severity Levels"
            description="Four priority tiers (SEV1–SEV4) that drive how urgently a ticket is handled and whether it triggers paging."
          />
          <ConceptCard
            to="/docs/paging"
            title="Paging"
            description="Repeated push notifications for high-severity tickets that continue at set intervals until someone acknowledges them."
          />
          <ConceptCard
            to="/docs/escalation"
            title="Escalation"
            description="Automatic priority upgrades as due dates approach, ensuring urgent work doesn't sit at a low severity."
          />
          <ConceptCard
            to="/docs/tickets"
            title="Tickets"
            description="The core unit of work. Tickets move through statuses from Open to Completed, with notifications at each step."
          />
          <ConceptCard
            to="/docs/api-keys"
            title="API Keys"
            description="Programmatic access for bots, integrations, and automation. Create tickets and manage queues via the API."
          />
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">How It Works</h2>

        <ol className="list-decimal list-outside ml-5 space-y-3">
          <li>
            <strong className="text-ink">Create or join a queue</strong> — a
            queue is a group of people who can ticket each other. You can create
            one manually or import a Discord server.
          </li>
          <li>
            <strong className="text-ink">Create a ticket</strong> — assign it to
            someone in the queue with a severity level and optional due date.
            They'll be notified immediately.
          </li>
          <li>
            <strong className="text-ink">Work the ticket</strong> — the assignee
            moves it through statuses (Open → In Progress → Completed). Comments
            keep everyone in the loop.
          </li>
          <li>
            <strong className="text-ink">Let the system help</strong> — paging
            ensures SEV1/SEV2 tickets get attention, and escalation auto-upgrades
            priority as due dates approach.
          </li>
        </ol>
      </div>
    </div>
  );
}

function ConceptCard({
  to,
  title,
  description,
}: {
  to: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="block p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm transition-all group"
    >
      <h3 className="text-sm font-semibold text-ink group-hover:text-accent transition-colors mb-1">
        {title}
      </h3>
      <p className="text-stone-500 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
