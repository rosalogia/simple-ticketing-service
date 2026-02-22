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
          When a ticket is created on behalf of someone, two identities are
          recorded:
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
                  The person being represented — the user the ticket is
                  attributed to
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink">On Behalf Of</td>
                <td className="py-2.5">
                  The actual creator — the API key holder or bot that made the
                  request
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The same pattern applies to comments. The comment is attributed to
          the specified user, with the actual commenter recorded separately.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">
          Notification Behavior
        </h2>

        <p>
          Notifications treat the attributed user (the assigner) as the
          creator. So if a bot creates a ticket on behalf of Alice and assigns
          it to Bob, Bob's notification will say "Alice assigned you" rather
          than showing the bot's name.
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
