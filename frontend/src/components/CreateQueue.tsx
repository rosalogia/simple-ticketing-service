import { useState, useEffect } from "react";
import type { DiscordServerInfo } from "../types";
import { queueApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Tab = "manual" | "discord";

interface Props {
  devMode: boolean;
  onCreated: (queueId: number) => void;
  onCancel: () => void;
}

export default function CreateQueue({ devMode, onCreated, onCancel }: Props) {
  const { discordClientId } = useAuth();
  const [tab, setTab] = useState<Tab>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Discord tab state
  const [servers, setServers] = useState<DiscordServerInfo[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "discord" && !devMode) {
      setLoadingServers(true);
      setDiscordError("");
      queueApi
        .getDiscordServers()
        .then(setServers)
        .catch((err) => setDiscordError(err.message))
        .finally(() => setLoadingServers(false));
    }
  }, [tab, devMode]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const queue = await queueApi.createQueue({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(queue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create queue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (guildId: string) => {
    setImportingId(guildId);
    setDiscordError("");
    try {
      const queue = await queueApi.createFromDiscord(guildId);
      onCreated(queue.id);
    } catch (err) {
      setDiscordError(err instanceof Error ? err.message : "Failed to import server");
    } finally {
      setImportingId(null);
    }
  };

  const botInviteUrl = discordClientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(discordClientId)}&scope=bot&permissions=0`
    : null;

  return (
    <div className="max-w-lg mx-auto py-12">
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-ink-light mb-5 transition-colors group"
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="group-hover:-translate-x-0.5 transition-transform"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink tracking-tight mb-6">
        Create Queue
      </h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-paper-warm rounded-lg p-1 border border-stone-200 mb-6">
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            tab === "manual"
              ? "bg-white text-ink shadow-sm"
              : "text-stone-500 hover:text-ink-light"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setTab("discord")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            tab === "discord"
              ? "bg-white text-ink shadow-sm"
              : "text-stone-500 hover:text-ink-light"
          }`}
        >
          From Discord
        </button>
      </div>

      {/* Manual tab */}
      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="text-sm text-sev1 bg-sev1-bg border border-sev1-border rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Queue Name <span className="text-sev1">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Housemates, Work Team"
              required
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this queue for?"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-ink-light hover:bg-paper-warm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {submitting ? "Creating..." : "Create Queue"}
            </button>
          </div>
        </form>
      )}

      {/* Discord tab */}
      {tab === "discord" && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          {devMode ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              Discord integration is not available in dev mode.
            </div>
          ) : loadingServers ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              Loading your Discord servers...
            </div>
          ) : discordError ? (
            <div className="text-sm text-sev1 bg-sev1-bg border border-sev1-border rounded-lg px-3 py-2">
              {discordError}
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              No eligible servers found. You need to be an admin on a server that hasn't been imported yet.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-stone-400 mb-3">
                Showing servers where you're an admin. Members and roles will be synced.
              </p>
              {servers.map((s) => (
                <div
                  key={s.guild_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {s.icon_url ? (
                      <img src={s.icon_url} alt="" className="w-9 h-9 rounded-lg" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 text-sm font-bold">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{s.name}</div>
                    </div>
                  </div>
                  {s.bot_present ? (
                    <button
                      onClick={() => handleImport(s.guild_id)}
                      disabled={importingId === s.guild_id}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
                    >
                      {importingId === s.guild_id ? "Importing..." : "Import"}
                    </button>
                  ) : botInviteUrl ? (
                    <a
                      href={botInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-[#5865F2] bg-[#5865F2]/10 hover:bg-[#5865F2]/20 rounded-lg transition-colors"
                    >
                      Add Bot First
                    </a>
                  ) : (
                    <span className="text-xs text-stone-400">Bot not configured</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
