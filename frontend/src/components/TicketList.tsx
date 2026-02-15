import type { Ticket } from "../types";
import InfoPopover, { PriorityHelp } from "./InfoPopover";

interface Props {
  tickets: Ticket[];
  total: number;
  activeTab: "assigned_to_me" | "assigned_by_me";
  onSelectTicket: (id: number) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const priorityBadge: Record<
  string,
  { label: string; cls: string }
> = {
  SEV1: { label: "Sev-1", cls: "bg-sev1-bg text-sev1 border-sev1-border" },
  SEV2: { label: "Sev-2", cls: "bg-sev2-bg text-sev2 border-sev2-border" },
  SEV3: { label: "Sev-3", cls: "bg-sev3-bg text-sev3 border-sev3-border" },
  SEV4: { label: "Sev-4", cls: "bg-sev4-bg text-sev4 border-sev4-border" },
};

const statusBadge: Record<
  string,
  { label: string; cls: string }
> = {
  OPEN: { label: "Open", cls: "bg-status-open-bg text-status-open" },
  IN_PROGRESS: {
    label: "In Progress",
    cls: "bg-status-progress-bg text-status-progress",
  },
  BLOCKED: { label: "Blocked", cls: "bg-status-blocked-bg text-status-blocked" },
  COMPLETED: { label: "Completed", cls: "bg-status-done-bg text-status-done" },
  CANCELLED: { label: "Cancelled", cls: "bg-status-cancel-bg text-status-cancel" },
};

function isOverdue(ticket: Ticket): boolean {
  if (!ticket.due_date) return false;
  if (ticket.status === "COMPLETED" || ticket.status === "CANCELLED") return false;
  return new Date(ticket.due_date) < new Date();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TicketList({
  tickets,
  total,
  activeTab,
  onSelectTicket,
  page,
  pageSize,
  onPageChange,
}: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-stone-300 text-4xl mb-3">
            <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="text-stone-400 text-sm">No tickets found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-stone-400 mb-3">
        {total} ticket{total !== 1 ? "s" : ""}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-16">
                ID
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Title
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-24">
                <span className="inline-flex items-center gap-1.5">
                  Priority
                  <InfoPopover><PriorityHelp /></InfoPopover>
                </span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-28">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-32">
                Due Date
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-36">
                {activeTab === "assigned_to_me" ? "From" : "Assignee"}
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const overdue = isOverdue(ticket);
              const pBadge = priorityBadge[ticket.priority];
              const sBadge = statusBadge[ticket.status];
              const person =
                activeTab === "assigned_to_me"
                  ? ticket.assigner
                  : ticket.assignee;

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`ticket-row border-b border-stone-50 last:border-b-0 cursor-pointer hover:bg-paper-warm ${overdue ? "border-l-[3px] border-l-sev1" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="ticket-id">#{ticket.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-ink truncate max-w-md">
                      {ticket.title}
                    </div>
                    {ticket.comment_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {ticket.comment_count}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md border ${pBadge.cls}`}
                    >
                      {pBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${sBadge.cls}`}
                    >
                      {sBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ticket.due_date ? (
                      <span
                        className={`text-sm ${overdue ? "text-sev1 font-semibold" : "text-stone-600"}`}
                      >
                        {formatDate(ticket.due_date)}
                      </span>
                    ) : (
                      <span className="text-stone-300 text-sm">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-stone-600">
                      {person.display_name}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {tickets.map((ticket) => {
          const overdue = isOverdue(ticket);
          const pBadge = priorityBadge[ticket.priority];
          const sBadge = statusBadge[ticket.status];
          const person =
            activeTab === "assigned_to_me"
              ? ticket.assigner
              : ticket.assignee;

          return (
            <div
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={`bg-white rounded-xl border border-stone-200 shadow-sm p-3.5 cursor-pointer active:bg-paper-warm transition-colors ${overdue ? "border-l-[3px] border-l-sev1" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink leading-snug line-clamp-2">
                    {ticket.title}
                  </div>
                </div>
                <span className="ticket-id flex-shrink-0">#{ticket.id}</span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${pBadge.cls}`}>
                  {pBadge.label}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sBadge.cls}`}>
                  {sBadge.label}
                </span>
                {ticket.due_date && (
                  <span className={`text-[10px] ${overdue ? "text-sev1 font-semibold" : "text-stone-500"}`}>
                    {formatDate(ticket.due_date)}
                  </span>
                )}
                {ticket.comment_count > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-stone-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {ticket.comment_count}
                  </span>
                )}
                <span className="text-[10px] text-stone-400 ml-auto">
                  {person.display_name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="text-xs text-stone-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-ink-light bg-white border border-stone-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    i === page
                      ? "bg-stone-900 text-white"
                      : "text-stone-500 hover:text-ink-light bg-white border border-stone-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </span>
            <span className="sm:hidden text-xs text-stone-500">
              {page + 1}/{totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-ink-light bg-white border border-stone-200 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
