import { useState, useRef, useCallback } from "react";
import type { TicketFilters, TicketStatus, TicketPriority } from "../types";

interface Props {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
}

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITIES: { value: TicketPriority; label: string; dot: string }[] = [
  { value: "SEV1", label: "Sev-1", dot: "bg-sev1" },
  { value: "SEV2", label: "Sev-2", dot: "bg-sev2" },
  { value: "SEV3", label: "Sev-3", dot: "bg-sev3" },
  { value: "SEV4", label: "Sev-4", dot: "bg-sev4" },
];

export default function FilterSidebar({ filters, onChange }: Props) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange({ ...filters, search: value || undefined });
      }, 300);
    },
    [filters, onChange]
  );

  const toggleStatus = (status: TicketStatus) => {
    const current = filters.status || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...filters, status: next.length ? next : undefined });
  };

  const togglePriority = (priority: TicketPriority) => {
    const current = filters.priority || [];
    const next = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onChange({ ...filters, priority: next.length ? next : undefined });
  };

  const hasFilters =
    !!filters.search || !!filters.status?.length || !!filters.priority?.length;

  const clearAll = () => {
    setSearchValue("");
    onChange({});
  };

  return (
    <div className="w-56 flex-shrink-0 space-y-5">
      {/* Search */}
      <div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-paper-warm border border-stone-200 rounded-lg placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Status
        </h3>
        <div className="space-y-1">
          {STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-paper-warm cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.status?.includes(s.value) || false}
                onChange={() => toggleStatus(s.value)}
                className="rounded border-stone-300 text-accent focus:ring-accent/30 w-3.5 h-3.5"
              />
              <span className="text-sm text-ink-light">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Priority
        </h3>
        <div className="space-y-1">
          {PRIORITIES.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-paper-warm cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.priority?.includes(p.value) || false}
                onChange={() => togglePriority(p.value)}
                className="rounded border-stone-300 text-accent focus:ring-accent/30 w-3.5 h-3.5"
              />
              <span
                className={`w-2 h-2 rounded-full ${p.dot} flex-shrink-0`}
              />
              <span className="text-sm text-ink-light">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-xs text-ink-muted hover:text-ink-light transition-colors underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
