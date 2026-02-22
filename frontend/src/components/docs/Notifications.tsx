export default function Notifications() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        Notifications
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Push notifications that keep everyone in the loop
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          STS sends push notifications to keep assigners and assignees informed
          about ticket activity. Notifications are delivered via Firebase Cloud
          Messaging to the mobile app.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Notification Types
        </h2>

        <div className="space-y-3">
          <NotificationType
            title="Ticket Assigned"
            recipient="Assignee"
            description="Sent when a new ticket is created and assigned to you. Includes the ticket's severity level and title."
          />
          <NotificationType
            title="Ticket Reassigned"
            recipient="Old & new assignee"
            description="The previous assignee is notified they've been replaced. The new assignee receives an assignment notification."
          />
          <NotificationType
            title="Status Changed"
            recipient="Assigner"
            description="Sent when the assignee changes the ticket's status (e.g., from Open to In Progress, or to Completed)."
          />
          <NotificationType
            title="Comment Added"
            recipient="Assigner & assignee"
            description="Sent when a comment is added to a ticket. Includes a preview of the comment text (up to 100 characters). The commenter does not receive their own notification."
          />
          <NotificationType
            title="Page"
            recipient="Assignee"
            description="A disruptive notification for SEV1/SEV2 tickets. Sent immediately at creation and repeated at intervals until acknowledged. Respects pageable hours settings."
          />
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Self-Notification Suppression
        </h2>

        <p>
          The system avoids sending unnecessary notifications to people about
          their own actions:
        </p>

        <ul className="list-disc list-outside ml-5 space-y-2">
          <li>
            If you assign a ticket to yourself, you won't receive the
            assignment notification.
          </li>
          <li>
            If you change the status of a ticket you created, you won't receive
            the status change notification.
          </li>
          <li>
            If you post a comment, you won't receive the comment notification
            (but the other party will).
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Device Registration
        </h2>

        <p>
          To receive notifications, you need the STS mobile app installed with
          push notifications enabled. The app registers your device token with
          the server when you sign in. You can have multiple devices registered
          — all of them will receive notifications.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">No Device Tokens</p>
          <p className="text-stone-600">
            If you don't have any devices registered (i.e., you haven't signed
            into the mobile app), notifications are silently skipped. The
            system won't error — it just has nowhere to send them.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationType({
  title,
  recipient,
  description,
}: {
  title: string;
  recipient: string;
  description: string;
}) {
  return (
    <div className="border border-stone-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="font-semibold text-sm text-ink">{title}</p>
        <span className="text-xs text-stone-400 whitespace-nowrap flex-shrink-0">
          {recipient}
        </span>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
    </div>
  );
}
