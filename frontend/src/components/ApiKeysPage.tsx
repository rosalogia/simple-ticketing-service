import { useState, useEffect, useCallback } from "react";
import type { ApiKey } from "../types";
import { apiKeysApi } from "../api/client";
import { useToast } from "./Toast";

interface Props {
  currentUserId: number;
  onBack: () => void;
}

export default function ApiKeysPage({ currentUserId, onBack }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showError } = useToast();

  const loadKeys = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const data = await apiKeysApi.list();
      setKeys(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showError]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const result = await apiKeysApi.create(name);
      setRevealedKey(result.key);
      setNewKeyName("");
      loadKeys();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (keyId: number) => {
    try {
      await apiKeysApi.revoke(keyId);
      loadKeys();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelative = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

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
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink tracking-tight mb-6">
        API Keys
      </h1>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-800 mb-1">
                API key created — copy it now, it won't be shown again
              </p>
              <code className="block text-sm bg-emerald-100 text-emerald-900 px-3 py-2 rounded-lg font-mono break-all">
                {revealedKey}
              </code>
            </div>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 mt-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-ink mb-1">Create API Key</h3>
        <p className="text-xs text-stone-400 mb-4">
          API keys let external tools (like Claude via MCP) access STS as you.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Claude Desktop)"
            maxLength={100}
            className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newKeyName.trim() || creating}
            className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 rounded-lg transition-colors"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* Active keys */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-ink mb-4">
          Active Keys {!loading && `(${activeKeys.length})`}
        </h3>

        {loading ? (
          <p className="text-sm text-stone-400">Loading...</p>
        ) : activeKeys.length === 0 ? (
          <p className="text-sm text-stone-400">No active API keys.</p>
        ) : (
          <div className="space-y-2">
            {activeKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-paper-warm transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{k.name}</span>
                    <code className="text-xs text-stone-400 font-mono">
                      {k.key_prefix}...
                    </code>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-400">
                    <span>Created {formatDate(k.created_at)}</span>
                    <span>
                      {k.last_used_at
                        ? `Last used ${formatRelative(k.last_used_at)}`
                        : "Never used"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="text-xs text-stone-400 hover:text-sev1 px-2 py-1 rounded transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-stone-400 mb-4">
            Revoked Keys ({revokedKeys.length})
          </h3>
          <div className="space-y-2">
            {revokedKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg opacity-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-500 line-through">{k.name}</span>
                    <code className="text-xs text-stone-400 font-mono">
                      {k.key_prefix}...
                    </code>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Revoked {formatDate(k.revoked_at!)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
