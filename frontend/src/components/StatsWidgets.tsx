import type { TicketStats } from "../types";

interface Props {
  stats: TicketStats | null;
  onCardClick?: (key: string) => void;
  activeKey?: string | null;
}

const cards = [
  {
    key: "open_count" as const,
    label: "Open",
    color: "text-status-open",
    bg: "bg-status-open-bg",
    border: "border-sev3-border",
  },
  {
    key: "in_progress_count" as const,
    label: "In Progress",
    color: "text-status-progress",
    bg: "bg-status-progress-bg",
    border: "border-sev2-border",
  },
  {
    key: "blocked_count" as const,
    label: "Blocked",
    color: "text-status-blocked",
    bg: "bg-status-blocked-bg",
    border: "border-sev1-border",
  },
  {
    key: "overdue_count" as const,
    label: "Overdue",
    color: "text-sev1",
    bg: "bg-sev1-bg",
    border: "border-sev1-border",
  },
  {
    key: "completed_count" as const,
    label: "Completed",
    color: "text-status-done",
    bg: "bg-status-done-bg",
    border: "border-green-200",
  },
] as const;

export default function StatsWidgets({ stats, onCardClick, activeKey }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
      {cards.map((card) => {
        const isActive = activeKey === card.key;
        return (
          <div
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={`${card.bg} border ${card.border} rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 ${
              onCardClick ? "cursor-pointer transition-all hover:ring-2 hover:ring-stone-300" : ""
            } ${isActive ? "ring-2 ring-stone-900" : ""}`}
          >
            <div className={`text-xl sm:text-2xl font-bold tracking-tight ${card.color}`}>
              {stats ? stats[card.key] : "\u2014"}
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-stone-500 mt-0.5">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
