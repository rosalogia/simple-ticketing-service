export default function ApiKeys() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-2">
        API Keys
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Programmatic access for bots, integrations, and automation
      </p>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          API keys let you interact with STS programmatically — creating
          tickets, posting comments, and managing queues from scripts, bots, or
          other integrations without going through the browser.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Key Format</h2>

        <p>
          API keys use the format{" "}
          <code className="font-mono text-sm bg-stone-100 px-1.5 py-0.5 rounded text-ink">
            sts_
          </code>{" "}
          followed by 32 bytes of URL-safe base64. A typical key looks like:
        </p>

        <div className="font-mono text-xs bg-stone-800 text-stone-200 rounded-lg p-3 overflow-x-auto">
          sts_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Security</h2>

        <p>
          Keys are hashed with SHA-256 before being stored in the database. The
          raw key is shown exactly once — at creation — and cannot be retrieved
          afterward. If you lose a key, you'll need to create a new one.
        </p>

        <div className="bg-sev1-bg border border-sev1-border rounded-xl p-4 text-sm">
          <p className="font-medium text-sev1 mb-2">Important</p>
          <p className="text-stone-600">
            Copy your API key immediately after creating it. It will not be
            shown again. Store it securely — anyone with the key has full access
            to your account.
          </p>
        </div>

        <h2 className="text-xl font-semibold text-ink pt-4">Usage</h2>

        <p>
          Include your API key in the{" "}
          <code className="font-mono text-sm bg-stone-100 px-1.5 py-0.5 rounded text-ink">
            X-Api-Key
          </code>{" "}
          header of your HTTP requests:
        </p>

        <div className="font-mono text-xs bg-stone-800 text-stone-200 rounded-lg p-3 overflow-x-auto">
          <pre>{`curl -H "X-Api-Key: sts_your_key_here" \\
  https://simple-ticketing-service.up.railway.app/api/tickets`}</pre>
        </div>

        <p>
          The API key inherits the identity and permissions of the user who
          created it. Any action taken with the key is equivalent to that user
          performing the action directly.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Bot Users</h2>

        <p>
          Each API key automatically gets a <strong className="text-ink">bot user</strong> created
          alongside it. The bot user's display name matches the name you give the API key.
          When using the{" "}
          <code className="font-mono text-sm bg-stone-100 px-1.5 py-0.5 rounded text-ink">
            on_behalf_of
          </code>{" "}
          feature, the bot user appears as the assigner — so tickets show
          "Assigned by [Your Key Name]" rather than your personal account.
          See the{" "}
          <a href="/docs/on-behalf-of" className="text-accent hover:underline">
            On Behalf Of
          </a>{" "}
          docs for details.
        </p>

        <h2 className="text-xl font-semibold text-ink pt-4">Management</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2.5 pr-4 font-semibold text-ink">Action</th>
                <th className="text-left py-2.5 font-semibold text-ink">Details</th>
              </tr>
            </thead>
            <tbody className="text-stone-600">
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">Create</td>
                <td className="py-2.5">
                  Go to Settings &gt; API Keys and give the key a name. The raw
                  key is displayed once.
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 pr-4 font-medium text-ink">List</td>
                <td className="py-2.5">
                  View all your keys with their names, prefixes, and last-used
                  timestamps.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-ink">Revoke</td>
                <td className="py-2.5">
                  Permanently disable a key. Revoked keys cannot be re-enabled
                  — create a new one if needed.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-paper-warm border border-stone-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-ink mb-2">Key Identification</p>
          <p className="text-stone-600">
            Each key stores a prefix (the first 8 characters) so you can
            identify which key is which without exposing the full key. The
            system also tracks when each key was last used.
          </p>
        </div>
      </div>
    </div>
  );
}
