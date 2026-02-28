import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { UserPerformanceMetrics, TicketPriority } from "../types";
import { queueApi } from "../api/client";

interface Props {
  queueId: number;
  userId: number;
  onBack: () => void;
}

const SEV_COLORS: Record<string, string> = {
  sev1: "#dc2626",
  sev2: "#ea580c",
  sev3: "#2563eb",
  sev4: "#6b7280",
};

function formatHours(hours: number | null): string {
  if (hours === null) return "\u2014";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

export default function PerformanceDashboard({ queueId, userId, onBack }: Props) {
  const [metrics, setMetrics] = useState<UserPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(12);
  const [sevFilter, setSevFilter] = useState<TicketPriority | "ALL">("ALL");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await queueApi.getUserPerformance(queueId, userId, weeks);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [queueId, userId, weeks]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-stone-400 text-sm">Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-sev1 text-sm">{error}</div>
        <button onClick={onBack} className="text-sm text-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const { user } = metrics;

  // Chart data
  const chartData = metrics.tickets_per_week_by_severity.map((w) => ({
    week: new Date(w.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sev1: w.sev1,
    sev2: w.sev2,
    sev3: w.sev3,
    sev4: w.sev4,
  }));

  // Resolution bar widths
  const totalEsc = metrics.resolved_before_escalation_count + metrics.resolved_after_escalation_count;
  const totalDue = metrics.resolved_before_due_count + metrics.resolved_after_due_count + metrics.resolved_no_due_date_count;

  const sevBars =
    sevFilter === "ALL"
      ? (["sev1", "sev2", "sev3", "sev4"] as const)
      : [sevFilter.toLowerCase() as "sev1" | "sev2" | "sev3" | "sev4"];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-sm text-stone-500 hover:text-ink transition-colors mb-3 flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-lg font-medium">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-ink">{user.display_name}</h1>
            <p className="text-xs text-stone-400">Performance Dashboard</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Unclosed Tickets" value={metrics.unclosed_ticket_count} />
        <StatCard
          label="Oldest Unclosed"
          value={metrics.oldest_unclosed_ticket_age_days !== null ? `${metrics.oldest_unclosed_ticket_age_days}d` : "\u2014"}
        />
        <StatCard label="Avg Close Time" value={formatHours(metrics.avg_time_to_close_hours)} />
        <StatCard label="Avg Pickup Time" value={formatHours(metrics.avg_time_to_start_hours)} />
      </div>

      {/* Resolution quality */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-ink mb-4">Resolution Quality</h3>
        <div className="space-y-4">
          {/* Escalation bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span>Escalation</span>
              <span>{metrics.total_completed} completed</span>
            </div>
            {totalEsc > 0 ? (
              <div className="flex h-6 rounded-md overflow-hidden">
                <div
                  className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(metrics.resolved_before_escalation_count / totalEsc) * 100}%` }}
                >
                  {metrics.resolved_before_escalation_count > 0 && metrics.resolved_before_escalation_count}
                </div>
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(metrics.resolved_after_escalation_count / totalEsc) * 100}%` }}
                >
                  {metrics.resolved_after_escalation_count > 0 && metrics.resolved_after_escalation_count}
                </div>
              </div>
            ) : (
              <div className="h-6 bg-stone-100 rounded-md flex items-center justify-center text-xs text-stone-400">
                No data
              </div>
            )}
            <div className="flex gap-4 mt-1 text-xs text-stone-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Before escalation
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> After escalation
              </span>
            </div>
          </div>

          {/* Due date bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span>Due Date</span>
            </div>
            {totalDue > 0 ? (
              <div className="flex h-6 rounded-md overflow-hidden">
                <div
                  className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(metrics.resolved_before_due_count / totalDue) * 100}%` }}
                >
                  {metrics.resolved_before_due_count > 0 && metrics.resolved_before_due_count}
                </div>
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(metrics.resolved_after_due_count / totalDue) * 100}%` }}
                >
                  {metrics.resolved_after_due_count > 0 && metrics.resolved_after_due_count}
                </div>
                <div
                  className="bg-stone-300 flex items-center justify-center text-stone-600 text-xs font-medium"
                  style={{ width: `${(metrics.resolved_no_due_date_count / totalDue) * 100}%` }}
                >
                  {metrics.resolved_no_due_date_count > 0 && metrics.resolved_no_due_date_count}
                </div>
              </div>
            ) : (
              <div className="h-6 bg-stone-100 rounded-md flex items-center justify-center text-xs text-stone-400">
                No data
              </div>
            )}
            <div className="flex gap-4 mt-1 text-xs text-stone-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Before due
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> After due
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" /> No due date
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Tickets per Week</h3>
          <div className="flex items-center gap-2">
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value as TicketPriority | "ALL")}
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
            >
              <option value="ALL">All Severities</option>
              <option value="SEV1">SEV1</option>
              <option value="SEV2">SEV2</option>
              <option value="SEV3">SEV3</option>
              <option value="SEV4">SEV4</option>
            </select>
            <select
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-paper-warm focus:outline-none focus:ring-1 focus:ring-accent/30"
            >
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={26}>26 weeks</option>
              <option value={52}>52 weeks</option>
            </select>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {sevBars.map((sev) => (
                <Bar
                  key={sev}
                  dataKey={sev}
                  stackId="severity"
                  fill={SEV_COLORS[sev]}
                  name={sev.toUpperCase()}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-stone-400">
            No ticket data for this period
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
      <div className="text-xs text-stone-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
