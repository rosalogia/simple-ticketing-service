import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../types";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface Props {
  user: User;
  onLogout: () => void;
}

export default function UserProfileMenu({ user, onLogout }: Props) {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.display_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
        setDisplayName(user.display_name);
        setError(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, user.display_name]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === user.display_name) {
      setEditing(false);
      setDisplayName(user.display_name);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateMe({ display_name: trimmed });
      updateUser(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDisplayName(user.display_name);
    setError(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-700 flex items-center justify-center text-stone-300 text-xs sm:text-sm font-medium">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-stone-200 text-sm font-medium hidden sm:inline">
          {user.display_name}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-stone-900 border border-stone-700 rounded-xl shadow-xl z-50 p-4">
          <div className="mb-3">
            <label className="text-xs text-stone-400 font-medium uppercase tracking-wider">
              Display Name
            </label>
            {editing ? (
              <div className="mt-1.5">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  className="w-full px-2.5 py-1.5 text-sm bg-stone-800 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-accent/50"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                />
                {error && (
                  <p className="text-xs text-red-400 mt-1">{error}</p>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleCancel}
                    className="text-xs text-stone-400 hover:text-stone-200 px-2 py-1 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!displayName.trim() || saving}
                    className="text-xs font-medium text-white bg-stone-700 hover:bg-stone-600 px-3 py-1 rounded-md transition-colors disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm text-stone-200">{user.display_name}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-stone-700 pt-3 space-y-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/settings/api-keys");
              }}
              className="text-sm text-stone-400 hover:text-stone-200 transition-colors w-full text-left flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              API Keys
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="text-sm text-stone-400 hover:text-stone-200 transition-colors w-full text-left"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
