import { useState, useRef, useEffect, useCallback } from "react";
import type { QueueInvite } from "../types";
import { inviteApi } from "../api/client";

interface Props {
  onInviteAccepted: () => void;
}

export default function NotificationsDropdown({ onInviteAccepted }: Props) {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<QueueInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inviteApi.getMyInvites();
      setInvites(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open) fetchInvites();
  }, [open, fetchInvites]);

  // Poll every 30s when closed to update badge count
  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, [fetchInvites]);

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

  const handleAccept = async (inviteId: number) => {
    setActionInProgress(inviteId);
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
    setActionInProgress(inviteId);
    try {
      await inviteApi.declineInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      // ignore
    } finally {
      setActionInProgress(null);
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
        {invites.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {invites.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-700">
            <span className="text-sm font-semibold text-stone-200">
              Notifications
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && invites.length === 0 ? (
              <div className="px-4 py-6 text-center text-stone-500 text-sm">
                Loading...
              </div>
            ) : invites.length === 0 ? (
              <div className="px-4 py-6 text-center text-stone-500 text-sm">
                No pending invitations
              </div>
            ) : (
              invites.map((invite) => (
                <div
                  key={invite.id}
                  className="px-4 py-3 border-b border-stone-800 last:border-b-0"
                >
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
                      disabled={actionInProgress === invite.id}
                      className="px-3 py-1 text-xs font-medium text-white bg-stone-700 hover:bg-stone-600 disabled:opacity-40 rounded-md transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(invite.id)}
                      disabled={actionInProgress === invite.id}
                      className="px-3 py-1 text-xs font-medium text-stone-400 hover:text-stone-200 disabled:opacity-40 rounded-md transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
