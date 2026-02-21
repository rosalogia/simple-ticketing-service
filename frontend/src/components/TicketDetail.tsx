import { useState, useEffect, useCallback, useMemo } from "react";
import type { Ticket, Comment as CommentType, QueueMember, TicketStatus } from "../types";
import { api, queueApi } from "../api/client";
import { useToast } from "./Toast";
import CommentThread from "./CommentThread";
import InfoPopover, { PriorityHelp, EscalationHelp, PagingHelp } from "./InfoPopover";

interface Props {
  ticketId: number;
  currentUserId: number;
  onBack: () => void;
}

const priorityMeta: Record<string, { label: string; cls: string }> = {
  SEV1: { label: "Sev-1 \u00B7 Urgent", cls: "bg-sev1-bg text-sev1 border border-sev1-border" },
  SEV2: { label: "Sev-2 \u00B7 High", cls: "bg-sev2-bg text-sev2 border border-sev2-border" },
  SEV3: { label: "Sev-3 \u00B7 Normal", cls: "bg-sev3-bg text-sev3 border border-sev3-border" },
  SEV4: { label: "Sev-4 \u00B7 Low", cls: "bg-sev4-bg text-sev4 border border-sev4-border" },
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-status-open-bg text-status-open" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-status-progress-bg text-status-progress" },
  BLOCKED: { label: "Blocked", cls: "bg-status-blocked-bg text-status-blocked" },
  COMPLETED: { label: "Completed", cls: "bg-status-done-bg text-status-done" },
  CANCELLED: { label: "Cancelled", cls: "bg-status-cancel-bg text-status-cancel" },
};

type StatusAction = { label: string; status: TicketStatus; variant: string };

function getStatusActions(current: TicketStatus): StatusAction[] {
  switch (current) {
    case "OPEN":
      return [
        { label: "Start Work", status: "IN_PROGRESS", variant: "bg-status-progress-bg text-status-progress hover:bg-amber-100" },
        { label: "Block", status: "BLOCKED", variant: "bg-sev1-bg text-sev1 hover:bg-red-100" },
        { label: "Complete", status: "COMPLETED", variant: "bg-status-done-bg text-status-done hover:bg-green-100" },
        { label: "Cancel", status: "CANCELLED", variant: "bg-stone-100 text-stone-500 hover:bg-stone-200" },
      ];
    case "IN_PROGRESS":
      return [
        { label: "Block", status: "BLOCKED", variant: "bg-sev1-bg text-sev1 hover:bg-red-100" },
        { label: "Complete", status: "COMPLETED", variant: "bg-status-done-bg text-status-done hover:bg-green-100" },
        { label: "Cancel", status: "CANCELLED", variant: "bg-stone-100 text-stone-500 hover:bg-stone-200" },
      ];
    case "BLOCKED":
      return [
        { label: "Resume", status: "IN_PROGRESS", variant: "bg-status-progress-bg text-status-progress hover:bg-amber-100" },
        { label: "Cancel", status: "CANCELLED", variant: "bg-stone-100 text-stone-500 hover:bg-stone-200" },
      ];
    case "COMPLETED":
    case "CANCELLED":
      return [
        { label: "Reopen", status: "OPEN", variant: "bg-status-open-bg text-status-open hover:bg-blue-100" },
      ];
    default:
      return [];
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useCountdown(targetIso: string | null): string | null {
  const targetMs = useMemo(
    () => (targetIso ? new Date(targetIso).getTime() : null),
    [targetIso]
  );
  const [display, setDisplay] = useState<string | null>(() => {
    if (targetMs === null) return null;
    return formatCountdown(targetMs - Date.now());
  });

  useEffect(() => {
    if (targetMs === null) {
      setDisplay(null);
      return;
    }
    const tick = () => setDisplay(formatCountdown(targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return display;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Any moment";
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function TicketDetail({
  ticketId,
  currentUserId,
  onBack,
}: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [paging, setPaging] = useState(false);
  const { showError } = useToast();

  const loadTicket = useCallback(() => {
    api.getTicket(ticketId).then((t) => {
      setTicket(t);
      queueApi.getMembers(t.queue_id).then(setMembers).catch(() => {});
    }).catch((err) =>
      showError(err instanceof Error ? err.message : "Failed to load ticket")
    );
  }, [ticketId, showError]);

  const loadComments = useCallback(() => {
    api.getComments(ticketId).then(setComments).catch((err) =>
      showError(err instanceof Error ? err.message : "Failed to load comments")
    );
  }, [ticketId, showError]);

  useEffect(() => {
    loadTicket();
    loadComments();
  }, [loadTicket, loadComments]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      const updated = await api.updateTicket(ticketId, { status: newStatus });
      setTicket(updated);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const startEditing = () => {
    if (!ticket) return;
    setEditData({
      title: ticket.title,
      description: ticket.description || "",
      priority: ticket.priority,
      assignee_id: ticket.assignee.id,
      due_date: ticket.due_date || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editData.title !== ticket?.title) payload.title = editData.title;
      if ((editData.description || "") !== (ticket?.description || ""))
        payload.description = editData.description || null;
      if (editData.priority !== ticket?.priority) payload.priority = editData.priority;
      if (editData.assignee_id !== ticket?.assignee.id)
        payload.assignee_id = editData.assignee_id;
      if ((editData.due_date || "") !== (ticket?.due_date || ""))
        payload.due_date = editData.due_date || null;

      if (Object.keys(payload).length > 0) {
        const updated = await api.updateTicket(ticketId, payload);
        setTicket(updated);
      }
      setEditing(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const escalationCountdown = useCountdown(ticket?.next_escalation_at ?? null);
  const pageCountdown = useCountdown(ticket?.next_page_at ?? null);

  if (!ticket) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  const pMeta = priorityMeta[ticket.priority];
  const sMeta = statusMeta[ticket.status];
  const actions = getStatusActions(ticket.status);
  const isOverdue =
    ticket.due_date &&
    ticket.status !== "COMPLETED" &&
    ticket.status !== "CANCELLED" &&
    new Date(ticket.due_date) < new Date();
  const cti = [ticket.category, ticket.type, ticket.item].filter(Boolean).join(" / ");

  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-ink-light mb-5 transition-colors group"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="group-hover:-translate-x-0.5 transition-transform"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 md:gap-6">
        {/* Main content */}
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="ticket-id">#{ticket.id}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${pMeta.cls}`}>
                      {pMeta.label}
                    </span>
                    <InfoPopover><PriorityHelp /></InfoPopover>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${sMeta.cls}`}>
                      {sMeta.label}
                    </span>
                  </div>
                  {editing ? (
                    <input
                      type="text"
                      value={editData.title as string}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      className="text-xl font-bold text-ink tracking-tight w-full px-2 py-1 border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  ) : (
                    <h1 className="text-xl font-bold text-ink tracking-tight">
                      {ticket.title}
                    </h1>
                  )}
                </div>
                {!editing ? (
                  <button
                    onClick={startEditing}
                    className="flex-shrink-0 text-sm text-stone-400 hover:text-ink-light px-3 py-1.5 rounded-lg hover:bg-paper-warm transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditing(false)}
                      className="text-sm text-stone-400 hover:text-ink-light px-3 py-1.5 rounded-lg hover:bg-paper-warm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="px-4 sm:px-6 pb-5 border-t border-stone-50 pt-4">
              {editing ? (
                <textarea
                  value={editData.description as string}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              ) : ticket.description ? (
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
              ) : (
                <p className="text-sm text-stone-400 italic">No description</p>
              )}
            </div>

            {/* Edit fields for priority/assignee/due date */}
            {editing && (
              <div className="px-4 sm:px-6 pb-5 border-t border-stone-50 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-1">Priority <InfoPopover><PriorityHelp /></InfoPopover></label>
                  <select
                    value={editData.priority as string}
                    onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="SEV1">Sev-1</option>
                    <option value="SEV2">Sev-2</option>
                    <option value="SEV3">Sev-3</option>
                    <option value="SEV4">Sev-4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Assignee</label>
                  <select
                    value={editData.assignee_id as number}
                    onChange={(e) => setEditData({ ...editData, assignee_id: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.display_name}
                        {m.user.id === currentUserId ? " (you)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editData.due_date as string}
                    onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            )}

            {/* Status actions */}
            {!editing && actions.length > 0 && (
              <div className="px-4 sm:px-6 pb-5 border-t border-stone-50 pt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-400 mr-1">Actions</span>
                {actions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${action.variant}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <CommentThread
              comments={comments}
              ticketId={ticketId}
              currentUserId={currentUserId}
              onCommentAdded={loadComments}
            />
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4 order-first md:order-none">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
            <div>
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Assigned to
              </div>
              <div className="text-sm font-semibold text-ink-light">
                {ticket.assignee.display_name}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Assigned by
              </div>
              <div className="text-sm font-semibold text-ink-light">
                {ticket.assigner.display_name}
              </div>
              {ticket.on_behalf_of && (
                <div className="text-xs text-stone-400 mt-0.5">
                  on behalf of {ticket.on_behalf_of.display_name}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Due Date
              </div>
              <div
                className={`text-sm font-medium ${isOverdue ? "text-sev1" : "text-stone-600"}`}
              >
                {ticket.due_date ? formatDate(ticket.due_date) : "\u2014"}
                {isOverdue && (
                  <span className="ml-1.5 text-xs font-semibold text-sev1 bg-sev1-bg px-1.5 py-0.5 rounded">
                    Overdue
                  </span>
                )}
              </div>
            </div>
            {(escalationCountdown !== null || ticket.escalation_paused || pageCountdown !== null) && (
              <div className="space-y-3 pt-3 border-t border-stone-100">
                {(escalationCountdown !== null || ticket.escalation_paused) && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                      Next Escalation
                      <InfoPopover><EscalationHelp /></InfoPopover>
                    </div>
                    {ticket.escalation_paused ? (
                      <div className="text-sm italic text-stone-400">Paused</div>
                    ) : (
                      <div className="text-sm font-semibold font-mono tracking-tight text-amber-600">
                        {escalationCountdown}
                      </div>
                    )}
                    {!ticket.escalation_paused && ticket.priority !== "SEV1" && (
                      <button
                        disabled={escalating}
                        onClick={async () => {
                          setEscalating(true);
                          try {
                            await api.escalateTicket(ticketId);
                            loadTicket();
                          } catch (err) {
                            showError(err instanceof Error ? err.message : "Failed to escalate");
                          } finally {
                            setEscalating(false);
                          }
                        }}
                        className="mt-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                      >
                        {escalating ? "Escalating…" : "Escalate Now"}
                      </button>
                    )}
                  </div>
                )}
                {pageCountdown !== null && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                      Next Page
                      <InfoPopover><PagingHelp /></InfoPopover>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold font-mono tracking-tight ${ticket.priority === "SEV1" ? "text-sev1" : "text-sev2"}`}>
                        {pageCountdown}
                      </span>
                      {ticket.page_acknowledged && (
                        <span className="text-xs text-stone-400">(Acked)</span>
                      )}
                    </div>
                    <button
                      disabled={paging}
                      onClick={async () => {
                        setPaging(true);
                        try {
                          await api.pageTicket(ticketId);
                          loadTicket();
                        } catch (err) {
                          showError(err instanceof Error ? err.message : "Failed to page");
                        } finally {
                          setPaging(false);
                        }
                      }}
                      className={`mt-1 px-2 py-0.5 text-xs font-medium rounded disabled:opacity-50 ${ticket.priority === "SEV1" ? "bg-sev1-bg text-sev1 hover:bg-red-200" : "bg-sev2-bg text-sev2 hover:bg-orange-200"}`}
                    >
                      {paging ? "Paging…" : "Page Now"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {cti && (
              <div>
                <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Category
                </div>
                <div className="text-sm text-stone-600">{cti}</div>
              </div>
            )}
            <div className="pt-3 border-t border-stone-100">
              <div className="text-xs text-stone-400 space-y-1">
                <div>Created {formatDateTime(ticket.created_at)}</div>
                <div>Updated {formatDateTime(ticket.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
