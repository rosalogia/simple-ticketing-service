import { useState, useEffect, useCallback } from "react";
import type { Ticket, TicketStats, TicketFilters } from "../types";
import { api } from "../api/client";
import { useToast } from "./Toast";
import StatsWidgets from "./StatsWidgets";
import FilterSidebar from "./FilterSidebar";
import TicketList from "./TicketList";
import TicketForm from "./TicketForm";

type Tab = "assigned_to_me" | "assigned_by_me";

interface Props {
  currentUserId: number;
  queueId: number;
  users: { id: number }[];
  onSelectTicket: (id: number) => void;
}

export default function Dashboard({
  currentUserId,
  queueId,
  onSelectTicket,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("assigned_to_me");
  const [filters, setFilters] = useState<TicketFilters>({});
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { showError } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const baseFilter: TicketFilters =
      activeTab === "assigned_to_me"
        ? { assignee_id: currentUserId }
        : { assigner_id: currentUserId };

    try {
      const [ticketRes, statsRes] = await Promise.all([
        api.getTickets({ ...baseFilter, ...filters, queue_id: queueId, skip: page * pageSize, limit: pageSize }),
        api.getTicketStats({
          queue_id: queueId,
          ...(activeTab === "assigned_to_me"
            ? { assignee_id: currentUserId }
            : { assigner_id: currentUserId }),
        }),
      ]);
      setTickets(ticketRes.tickets);
      setTotal(ticketRes.total);
      setStats(statsRes);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUserId, filters, queueId, page, pageSize, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFilters({});
    setPage(0);
  };

  return (
    <div>
      {/* Tab bar + create button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-paper-warm rounded-lg p-1 border border-stone-200">
          <button
            onClick={() => handleTabChange("assigned_to_me")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "assigned_to_me"
                ? "bg-white text-ink shadow-sm"
                : "text-stone-500 hover:text-ink-light"
            }`}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => handleTabChange("assigned_by_me")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "assigned_by_me"
                ? "bg-white text-ink shadow-sm"
                : "text-stone-500 hover:text-ink-light"
            }`}
          >
            Assigned by Me
          </button>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-sm"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5">
        <StatsWidgets stats={stats} />
      </div>

      {/* Filter sidebar + Ticket list */}
      <div className="flex gap-6">
        <FilterSidebar filters={filters} onChange={(f) => { setFilters(f); setPage(0); }} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-stone-400 text-sm">Loading tickets...</div>
          </div>
        ) : (
          <TicketList
            tickets={tickets}
            total={total}
            activeTab={activeTab}
            onSelectTicket={onSelectTicket}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <TicketForm
          queueId={queueId}
          currentUserId={currentUserId}
          onClose={() => setShowCreate(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
