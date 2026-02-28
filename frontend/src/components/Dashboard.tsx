import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Ticket, TicketStats, TicketFilters, TicketStatus } from "../types";
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

const DEFAULT_STATUS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED"];
const DEFAULT_FILTERS: TicketFilters = { status: DEFAULT_STATUS };

const STAT_TO_STATUS: Record<string, TicketStatus> = {
  open_count: "OPEN",
  in_progress_count: "IN_PROGRESS",
  blocked_count: "BLOCKED",
  completed_count: "COMPLETED",
};

export default function Dashboard({
  currentUserId,
  queueId,
  onSelectTicket,
}: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("assigned_to_me");
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS);
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
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  const activeStatKey = useMemo(() => {
    if (filters.due_before && !filters.due_after) return "overdue_count";
    if (filters.status?.length === 1) {
      const entry = Object.entries(STAT_TO_STATUS).find(([, v]) => v === filters.status![0]);
      return entry ? entry[0] : null;
    }
    return null;
  }, [filters]);

  const handleStatClick = (key: string) => {
    if (activeStatKey === key) {
      setFilters(DEFAULT_FILTERS);
      setPage(0);
      return;
    }
    setPage(0);
    if (key === "overdue_count") {
      const today = new Date().toISOString().split("T")[0];
      setFilters({ status: DEFAULT_STATUS, due_before: today });
    } else {
      const status = STAT_TO_STATUS[key];
      if (status) {
        setFilters({ status: [status] });
      }
    }
  };

  const handleFilterChange = (f: TicketFilters) => {
    setFilters(f);
    setPage(0);
  };

  return (
    <div>
      {/* Tab bar + create button */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
        <div className="flex items-center gap-1 bg-paper-warm rounded-lg p-1 border border-stone-200 min-w-0">
          <button
            onClick={() => handleTabChange("assigned_to_me")}
            className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === "assigned_to_me"
                ? "bg-white text-ink shadow-sm"
                : "text-stone-500 hover:text-ink-light"
            }`}
          >
            To Me
            <span className="hidden sm:inline"> (Assigned)</span>
          </button>
          <button
            onClick={() => handleTabChange("assigned_by_me")}
            className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === "assigned_by_me"
                ? "bg-white text-ink shadow-sm"
                : "text-stone-500 hover:text-ink-light"
            }`}
          >
            By Me
            <span className="hidden sm:inline"> (Assigned)</span>
          </button>
        </div>

        <button
          onClick={() => navigate(`/queues/${queueId}/performance/${currentUserId}`)}
          className="p-2 text-stone-400 hover:text-ink transition-colors rounded-lg hover:bg-stone-100"
          title="My Performance"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-sm flex-shrink-0"
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
          <span className="hidden sm:inline">New Ticket</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 sm:mb-5">
        <StatsWidgets stats={stats} onCardClick={handleStatClick} activeKey={activeStatKey} />
      </div>

      {/* Filter sidebar + Ticket list */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <FilterSidebar filters={filters} defaultFilters={DEFAULT_FILTERS} onChange={handleFilterChange} />
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
