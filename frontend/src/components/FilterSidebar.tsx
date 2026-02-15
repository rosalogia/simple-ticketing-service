import { useState, useRef, useCallback } from "react";
import type { TicketFilters, TicketStatus, TicketPriority } from "../types";

interface Props {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  defaultFilters?: TicketFilters;
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

export default function FilterSidebar({ filters, defaultFilters, onChange }: Props) {
  const [searchValue, setSearchValue] = useState(filters.search || "");
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const defaults = defaultFilters || {};
  const statusDiffers =
    JSON.stringify([...(filters.status || [])].sort()) !==
    JSON.stringify([...(defaults.status || [])].sort());
  const hasFilters =
    !!filters.search || statusDiffers || !!filters.priority?.length || !!filters.due_before;

  const clearAll = () => {
    setSearchValue("");
    onChange(defaults);
  };

  const activeFilterCount =
    (filters.status?.length || 0) + (filters.priority?.length || 0);

  return (
    <div className="w-full lg:w-56 lg:flex-shrink-0 space-y-3 lg:space-y-5">
      {/* Search - always visible */}
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

      {/* Toggle button on mobile */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="lg:hidden flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-ink-light transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="14" y2="12" />
          <line x1="4" y1="18" x2="8" y2="18" />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-stone-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Filter checkboxes - collapsible on mobile */}
      <div className={`space-y-4 lg:space-y-5 ${expanded ? "block" : "hidden lg:block"}`}>
        {/* Status */}
        <div>
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Status
          </h3>
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0 lg:space-y-1">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-2 lg:gap-2.5 py-1 px-2 lg:px-1 rounded-md hover:bg-paper-warm cursor-pointer transition-colors border border-stone-200 lg:border-transparent"
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
          <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0 lg:space-y-1">
            {PRIORITIES.map((p) => (
              <label
                key={p.value}
                className="flex items-center gap-2 lg:gap-2.5 py-1 px-2 lg:px-1 rounded-md hover:bg-paper-warm cursor-pointer transition-colors border border-stone-200 lg:border-transparent"
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
    </div>
  );
}
