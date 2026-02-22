export default function OnBehalfOf() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        On Behalf Of
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Creating tickets and comments as another user
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          STS supports creating tickets and comments "on behalf of" another
          user. This is designed for automated systems, bots, and integrations
          that need to attribute actions to real team members rather than a
          generic service account.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">How It Works</h2>

        <p>
          When you create an API key, STS automatically creates a <strong className="text-ink">bot user</strong> linked
          to that key. The bot user's display name matches the API key's name — so if you name
          your key "Monitoring Bot", tickets will show "Assigned by Monitoring Bot".
        </p>

        <p>
          When a ticket is created with <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono">on_behalf_of</code> set
          to a real user's ID, two identities are recorded:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Field</th>
                <th className="text-left py-2.5 font-semibold text-ink">Who</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">Assigner</td>
                <td className="py-2.5">
                  The API key's bot user — the app that created the ticket
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink">On Behalf Of</td>
                <td className="py-2.5">
                  The real person the action is attributed to
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The same pattern applies to comments. The comment is attributed to
          the bot user, with the real user recorded in on_behalf_of.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Bot Users</h2>

        <p>
          Bot users are automatically created when you create an API key. They have a
          few special properties:
        </p>

        <ul className="list-disc list-outside ml-5 space-y-3">
          <li>
            Their <strong className="text-ink">display name</strong> matches
            the API key name you chose at creation
          </li>
          <li>
            They are <strong className="text-ink">hidden</strong> from the
            general user list — they won't appear in assignee pickers or user
            switchers
          </li>
          <li>
            They are marked with <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono">is_bot: true</code> in
            the API response
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Notification Behavior
        </h2>

        <p>
          When the assigner is a bot user, notifications are routed to
          the <strong className="text-ink">on_behalf_of</strong> user instead.
          So if "Monitoring Bot" creates a ticket on behalf of Alice and assigns
          it to Bob, and Bob later changes the ticket status, Alice will receive
          the notification — not the bot.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Use Cases</h2>

        <ul className="list-disc list-outside ml-5 space-y-3">
          <li>
            <strong className="text-ink">Monitoring alerts</strong> — an
            automated system detects an issue and creates a SEV1 ticket
            attributed to the on-call engineer
          </li>
          <li>
            <strong className="text-ink">Slack or Discord bots</strong> — a
            chatbot lets users create tickets via chat commands, attributing
            them to the person who typed the command
          </li>
          <li>
            <strong className="text-ink">MCP integrations</strong> — AI
            assistants creating tickets on behalf of the user they're helping
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-ink pt-4">API Example</h2>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm font-mono overflow-x-auto">
          <pre className="text-stone-700">{`POST /api/tickets
X-Api-Key: sts_abc123...

{
  "title": "Deploy hotfix",
  "assignee_id": 42,
  "queue_id": 1,
  "priority": "SEV2",
  "on_behalf_of": 7
}`}</pre>
        </div>

        <p className="text-sm text-stone-500">
          This creates a ticket where the API key's bot user is the assigner,
          user 7 is the on_behalf_of user, and user 42 is the assignee.
        </p>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Requires API Key Auth</p>
          <p className="text-stone-600">
            The on-behalf-of feature is only available when authenticating with
            an API key. Session-based authentication (browser login) does not
            support creating actions on behalf of another user.
          </p>
        </div>
      </div>
    </div>
  );
}
