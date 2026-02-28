import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Ticket, UrgentTicketsResponse } from "../types";
import { api } from "../api/client";

const PRIORITY_COLORS: Record<string, string> = {
  SEV1: "bg-red-600 text-white",
  SEV2: "bg-orange-600 text-white",
  SEV3: "bg-yellow-600 text-white",
  SEV4: "bg-stone-600 text-stone-200",
};

function relativeDate(dateStr: string): string {
  const due = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return "1 day overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

function TicketRow({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 hover:bg-stone-800/50 transition-colors border-b border-stone-800 last:border-b-0"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm text-stone-200 truncate flex-1 font-medium">
          {ticket.title}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${PRIORITY_COLORS[ticket.priority] || ""}`}
        >
          {ticket.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-500">
        {ticket.queue_name && (
          <span className="bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {ticket.queue_name}
          </span>
        )}
        <span>{ticket.due_date ? relativeDate(ticket.due_date) : ""}</span>
      </div>
    </button>
  );
}

export default function UrgentTicketsDropdown() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<UrgentTicketsResponse | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUrgent = useCallback(async () => {
    try {
      const result = await api.getUrgentTickets();
      setData(result);
    } catch {
      // ignore
    }
  }, []);

  // Fetch on mount and poll every 60s
  useEffect(() => {
    fetchUrgent();
    const interval = setInterval(fetchUrgent, 60000);
    return () => clearInterval(interval);
  }, [fetchUrgent]);

  // Refetch on open
  useEffect(() => {
    if (open) fetchUrgent();
  }, [open, fetchUrgent]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const totalCount = (data?.overdue_count ?? 0) + (data?.due_soon_count ?? 0);
  const hasOverdue = (data?.overdue_count ?? 0) > 0;

  const handleTicketClick = (ticket: Ticket) => {
    setOpen(false);
    navigate(`/queues/${ticket.queue_id}/tickets/${ticket.id}`);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-stone-400 hover:text-stone-200 transition-colors p-1"
        title="Urgent Tickets"
        data-testid="urgent-tickets-button"
      >
        {/* Clock icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {totalCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${
              hasOverdue ? "bg-red-500" : "bg-amber-500"
            }`}
            data-testid="urgent-badge"
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-700">
            <span className="text-sm font-semibold text-stone-200">
              Urgent Tickets
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-6 text-center text-stone-500 text-sm">
                No urgent tickets
              </div>
            ) : (
              <>
                {(data?.overdue_count ?? 0) > 0 && (
                  <>
                    <div className="px-4 py-2 bg-red-950/30 border-b border-stone-800">
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                        Overdue ({data!.overdue_count})
                      </span>
                    </div>
                    {data!.overdue.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => handleTicketClick(ticket)}
                      />
                    ))}
                  </>
                )}

                {(data?.due_soon_count ?? 0) > 0 && (
                  <>
                    <div className="px-4 py-2 bg-amber-950/30 border-b border-stone-800">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Due Soon ({data!.due_soon_count})
                      </span>
                    </div>
                    {data!.due_soon.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => handleTicketClick(ticket)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
