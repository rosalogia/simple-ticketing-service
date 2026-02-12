import type { Queue } from "../types";

interface Props {
  queues: Queue[];
  onSelectQueue: (id: number) => void;
  onCreateQueue: () => void;
}

export default function QueueList({ queues, onSelectQueue, onCreateQueue }: Props) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">
          Your Queues
        </h1>
        <p className="text-stone-500 text-sm">
          Select a queue to view its tickets, or create a new one.
        </p>
      </div>

      {queues.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-stone-400 text-sm mb-6">
            You're not a member of any queues yet.
          </div>
          <button
            onClick={onCreateQueue}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Your First Queue
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {queues.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelectQueue(q.id)}
              className="w-full text-left bg-white rounded-xl border border-stone-200 shadow-sm p-5 hover:border-stone-300 hover:shadow transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    {q.icon_url ? (
                      <img src={q.icon_url} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-bold">
                        {q.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-ink tracking-tight">
                      {q.name}
                    </h3>
                    {q.discord_guild_id && (
                      <span className="text-xs text-[#5865F2] bg-[#5865F2]/10 px-1.5 py-0.5 rounded font-medium">
                        Discord
                      </span>
                    )}
                  </div>
                  {q.description && (
                    <p className="text-sm text-stone-500 truncate pl-[42px]">
                      {q.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-stone-400">{q.member_count} members</div>
                    {q.my_role && (
                      <div className="text-xs font-medium text-stone-500 capitalize">
                        {q.my_role.toLowerCase()}
                      </div>
                    )}
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={onCreateQueue}
            className="w-full text-left rounded-xl border-2 border-dashed border-stone-200 p-5 hover:border-stone-300 hover:bg-paper-warm transition-all group"
          >
            <div className="flex items-center gap-3 text-stone-400 group-hover:text-stone-600">
              <div className="w-8 h-8 rounded-lg border-2 border-dashed border-current flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-sm font-medium">Create a new queue</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
