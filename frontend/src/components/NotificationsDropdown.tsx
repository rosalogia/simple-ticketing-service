import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { QueueInvite, Notification } from "../types";
import { inviteApi, notificationApi, api } from "../api/client";

interface Props {
  onInviteAccepted: () => void;
}

type FeedItem =
  | { kind: "invite"; data: QueueInvite; time: string }
  | { kind: "notification"; data: Notification; time: string };

export default function NotificationsDropdown({ onInviteAccepted }: Props) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<QueueInvite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, notifs] = await Promise.all([
        inviteApi.getMyInvites(),
        notificationApi.list(),
      ]);
      setInvites(inv);
      setNotifications(notifs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  // Poll every 30s to update badge count
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

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

  // Merge feeds by created_at descending
  const feed: FeedItem[] = [
    ...invites.map((i) => ({ kind: "invite" as const, data: i, time: i.created_at })),
    ...notifications.map((n) => ({ kind: "notification" as const, data: n, time: n.created_at })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const badgeCount = invites.length + notifications.filter((n) => !n.read).length;

  const handleAccept = async (inviteId: number) => {
    setActionInProgress(`invite-${inviteId}`);
    try {
      await inviteApi.acceptInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      onInviteAccepted();
    } catch {
      // ignore
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    setActionInProgress(`invite-${inviteId}`);
    try {
      await inviteApi.declineInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      // ignore
    } finally {
      setActionInProgress(null);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.read) {
      try {
        await notificationApi.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    // Navigate to ticket if linked
    if (notif.ticket_id) {
      try {
        const ticket = await api.getTicket(notif.ticket_id);
        setOpen(false);
        navigate(`/queues/${ticket.queue_id}/tickets/${ticket.id}`);
      } catch {
        // ticket may have been deleted
      }
    }
  };

  const handleAcknowledge = async (notif: Notification) => {
    if (!notif.ticket_id) return;
    setActionInProgress(`notif-${notif.id}`);
    try {
      await api.acknowledgeTicket(notif.ticket_id);
      await notificationApi.markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (notifId: number) => {
    try {
      await notificationApi.delete(notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-stone-400 hover:text-stone-200 transition-colors p-1"
        title="Notifications"
      >
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-200">
              Notifications
            </span>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && feed.length === 0 ? (
              <div className="px-4 py-6 text-center text-stone-500 text-sm">
                Loading...
              </div>
            ) : feed.length === 0 ? (
              <div className="px-4 py-6 text-center text-stone-500 text-sm">
                No notifications
              </div>
            ) : (
              feed.map((item) => {
                if (item.kind === "invite") {
                  const invite = item.data;
                  return (
                    <div
                      key={`invite-${invite.id}`}
                      className="px-4 py-3 border-b border-stone-800 last:border-b-0 border-l-2 border-l-accent"
                    >
                      <div className="text-xs text-accent font-medium mb-1">
                        Queue Invitation
                      </div>
                      <div className="text-sm text-stone-200 mb-1">
                        <span className="font-medium">
                          {invite.invited_by.display_name}
                        </span>{" "}
                        invited you to{" "}
                        <span className="font-medium">{invite.queue.name}</span>
                      </div>
                      <div className="text-xs text-stone-500 mb-2">
                        Role: {invite.role}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(invite.id)}
                          disabled={actionInProgress === `invite-${invite.id}`}
                          className="px-3 py-1 text-xs font-medium text-white bg-stone-700 hover:bg-stone-600 disabled:opacity-40 rounded-md transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(invite.id)}
                          disabled={actionInProgress === `invite-${invite.id}`}
                          className="px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-200 disabled:opacity-40 rounded-md transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                }

                const notif = item.data;
                const isPage = notif.type === "page";
                return (
                  <div
                    key={`notif-${notif.id}`}
                    className={`px-4 py-3 border-b border-stone-800 last:border-b-0 ${
                      !notif.read ? "border-l-2 border-l-stone-400" : ""
                    } ${notif.ticket_id ? "cursor-pointer hover:bg-stone-800/50" : ""}`}
                    onClick={
                      !isPage && notif.ticket_id
                        ? () => handleNotificationClick(notif)
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-stone-500 font-medium mb-1">
                          {notif.type === "comment" && "Comment"}
                          {notif.type === "assignment" && "Assignment"}
                          {notif.type === "status_change" && "Status Change"}
                          {notif.type === "escalation" && "Escalation"}
                          {notif.type === "page" && "Page"}
                        </div>
                        <div
                          className={`text-sm mb-0.5 truncate ${
                            notif.read ? "text-stone-400" : "text-stone-200 font-medium"
                          }`}
                        >
                          {notif.title}
                        </div>
                        <div className="text-xs text-stone-500 truncate">
                          {notif.body}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notif.id);
                        }}
                        className="text-stone-600 hover:text-stone-400 transition-colors shrink-0 p-0.5"
                        title="Delete notification"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {isPage && notif.ticket_id && !notif.read && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcknowledge(notif);
                          }}
                          disabled={actionInProgress === `notif-${notif.id}`}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-md transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notif);
                          }}
                          className="px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-200 rounded-md transition-colors"
                        >
                          View Ticket
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
