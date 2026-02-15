import { useState, useEffect, useCallback } from "react";
import type { Queue, QueueMember, QueueRole, User, WeekSchedule } from "../types";
import { queueApi, api } from "../api/client";
import { useToast } from "./Toast";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];
const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { start: "09:00", end: "17:00" },
  tue: { start: "09:00", end: "17:00" },
  wed: { start: "09:00", end: "17:00" },
  thu: { start: "09:00", end: "17:00" },
  fri: { start: "09:00", end: "17:00" },
  sat: { start: "09:00", end: "17:00" },
  sun: { start: "09:00", end: "17:00" },
};

interface Props {
  queueId: number;
  currentUserId: number;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function QueueSettings({
  queueId,
  currentUserId,
  onBack,
  onDeleted,
  onUpdated,
}: Props) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMaxSev, setEditMaxSev] = useState<string>("SEV1");
  const [saving, setSaving] = useState(false);
  const [addUserId, setAddUserId] = useState<number | "">("");
  const [addRole, setAddRole] = useState<QueueRole>("MEMBER");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [settingsTz, setSettingsTz] = useState("America/New_York");
  const [sev1OptOut, setSev1OptOut] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { showError } = useToast();

  const loadData = useCallback(() => {
    queueApi.getQueue(queueId).then((q) => {
      setQueue(q);
      setEditName(q.name);
      setEditDesc(q.description || "");
      setEditMaxSev(q.member_max_severity);
    });
    queueApi.getMembers(queueId).then(setMembers);
    api.getUsers().then(setAllUsers);
    queueApi.getMySettings(queueId).then((s) => {
      setSchedule(s.schedule || DEFAULT_SCHEDULE);
      setSettingsTz(s.timezone);
      setSev1OptOut(s.sev1_off_hours_opt_out);
    }).catch(() => {});
  }, [queueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await queueApi.updateQueue(queueId, {
        name: editName,
        description: editDesc || undefined,
        member_max_severity: editMaxSev,
      });
      setEditing(false);
      loadData();
      onUpdated();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: number, role: QueueRole) => {
    try {
      await queueApi.updateMemberRole(queueId, userId, role);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await queueApi.removeMember(queueId, userId);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleAddMember = async () => {
    if (addUserId === "") return;
    try {
      await queueApi.addMember(queueId, Number(addUserId), addRole);
      setAddUserId("");
      setAddRole("MEMBER");
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    try {
      await queueApi.deleteQueue(queueId);
      onDeleted();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await queueApi.updateMySettings(queueId, {
        schedule,
        timezone: settingsTz,
        sev1_off_hours_opt_out: sev1OptOut,
      });
      setSchedule(updated.schedule || DEFAULT_SCHEDULE);
      setSettingsTz(updated.timezone);
      setSev1OptOut(updated.sev1_off_hours_opt_out);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await queueApi.syncDiscord(queueId);
      loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  };

  if (!queue) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  const memberUserIds = new Set(members.map((m) => m.user.id));
  const nonMembers = allUsers.filter((u) => !memberUserIds.has(u.id));

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-ink-light mb-5 transition-colors group"
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="group-hover:-translate-x-0.5 transition-transform"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-ink tracking-tight mb-6">
        Queue Settings
      </h1>

      {/* Queue info */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1">
                Member Max Severity
              </label>
              <select
                value={editMaxSev}
                onChange={(e) => setEditMaxSev(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="SEV1">SEV1 (Members can create all severities)</option>
                <option value="SEV2">SEV2 (Members can create SEV2-4)</option>
                <option value="SEV3">SEV3 (Members can create SEV3-4)</option>
                <option value="SEV4">SEV4 (Members can only create SEV4)</option>
              </select>
              <p className="text-xs text-stone-400 mt-1">
                Controls the maximum severity level that MEMBER-role users can set when creating tickets. Owners are unrestricted.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-sm text-stone-500 hover:text-ink-light hover:bg-paper-warm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{queue.name}</h2>
              {queue.description && (
                <p className="text-sm text-stone-500 mt-1">{queue.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                <span>Max member severity: {queue.member_max_severity}</span>
                {queue.discord_guild_id && (
                  <span className="text-[#5865F2] bg-[#5865F2]/10 px-1.5 py-0.5 rounded font-medium">
                    Discord Linked
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-stone-400 hover:text-ink-light px-3 py-1.5 rounded-lg hover:bg-paper-warm transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Discord sync */}
      {queue.discord_guild_id && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Discord Sync</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Add new server members to this queue (additive only).
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-1.5 text-sm font-medium text-[#5865F2] bg-[#5865F2]/10 hover:bg-[#5865F2]/20 disabled:opacity-40 rounded-lg transition-colors"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      )}

      {/* Pageable Hours */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-ink mb-1">Your Pageable Hours</h3>
        <p className="text-xs text-stone-400 mb-4">
          SEV2 pages are only sent during these hours. Toggle a day off to disable pages that day.
        </p>

        <div className="space-y-2 mb-4">
          {DAY_KEYS.map((day) => {
            const dayConfig = schedule[day];
            const enabled = !!dayConfig;
            return (
              <div key={day} className="flex items-center gap-3 py-1.5">
                <label className="flex items-center gap-2 w-24">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() =>
                      setSchedule((prev) => ({
                        ...prev,
                        [day]: enabled ? null : { start: "09:00", end: "17:00" },
                      }))
                    }
                    className="accent-stone-900"
                  />
                  <span className={`text-sm font-medium ${enabled ? "text-ink" : "text-stone-400"}`}>
                    {DAY_LABELS[day]}
                  </span>
                </label>
                {enabled && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={dayConfig!.start}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day]!, start: e.target.value },
                        }))
                      }
                      className="px-2 py-1 text-xs border border-stone-200 rounded-md bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-xs text-stone-400">to</span>
                    <select
                      value={dayConfig!.end}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day]!, end: e.target.value },
                        }))
                      }
                      className="px-2 py-1 text-xs border border-stone-200 rounded-md bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-ink-light">Timezone</label>
            <select
              value={settingsTz}
              onChange={(e) => setSettingsTz(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
            >
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={sev1OptOut}
              onChange={(e) => setSev1OptOut(e.target.checked)}
              className="accent-stone-900"
            />
            Disable SEV1 off-hours pages
          </label>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-4 py-1.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
          >
            {savingSettings ? "Saving..." : "Save Pageable Hours"}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-ink mb-4">
          Members ({members.length})
        </h3>

        <div className="space-y-2 mb-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-paper-warm transition-colors"
            >
              <div className="flex items-center gap-3">
                {m.user.avatar_url ? (
                  <img src={m.user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-medium">
                    {m.user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-ink">
                    {m.user.display_name}
                  </span>
                  {m.user.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-stone-400">(you)</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user.id, e.target.value as QueueRole)}
                  disabled={m.user.id === currentUserId}
                  className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-paper-warm disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                >
                  <option value="OWNER">Owner</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                {m.user.id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(m.user.id)}
                    className="text-stone-400 hover:text-sev1 transition-colors p-1"
                    title="Remove member"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add member */}
        {nonMembers.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value ? Number(e.target.value) : "")}
              className="flex-1 px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
            >
              <option value="">Add a member...</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as QueueRole)}
              className="px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
            >
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              onClick={handleAddMember}
              disabled={addUserId === ""}
              className="px-3 py-1.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-sev1-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-sev1 mb-2">Danger Zone</h3>
        <p className="text-xs text-stone-500 mb-4">
          Deleting this queue will permanently remove all its tickets and comments.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-sev1 font-medium">Are you sure?</span>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm text-stone-500 hover:text-ink-light rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-1.5 text-sm font-medium text-sev1 bg-sev1-bg hover:bg-red-100 border border-sev1-border rounded-lg transition-colors"
          >
            Delete Queue
          </button>
        )}
      </div>
    </div>
  );
}
