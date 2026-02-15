import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  children: React.ReactNode;
}

// Shared close function — opening any InfoPopover closes the previous one
let closeActive: (() => void) | null = null;

export default function InfoPopover({ children }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      close();
      closeActive = null;
    } else {
      // Close any other open popover first
      closeActive?.();
      setOpen(true);
      closeActive = close;
    }
  };

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        popRef.current?.contains(target)
      )
        return;
      close();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Clean up closeActive ref on unmount
  useEffect(() => {
    return () => {
      if (closeActive === close) closeActive = null;
    };
  });

  if (!open) {
    return (
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold leading-none text-stone-400 border border-stone-300 hover:text-stone-600 hover:border-stone-400 transition-colors flex-shrink-0 cursor-pointer"
        aria-label="More info"
      >
        ?
      </button>
    );
  }

  // Desktop popover positioning
  const rect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold leading-none text-stone-500 border border-stone-400 hover:text-stone-600 hover:border-stone-400 transition-colors flex-shrink-0 cursor-pointer"
        aria-label="More info"
      >
        ?
      </button>
      {createPortal(
        <>
          {/* Mobile: backdrop + centered card */}
          <div
            className="sm:hidden fixed inset-0 z-50"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div
                ref={popRef}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-2xl border border-stone-200 p-4 max-w-sm w-full text-sm text-stone-600 leading-relaxed info-popover-content"
              >
                {children}
              </div>
            </div>
          </div>

          {/* Desktop: positioned popover */}
          {rect && (
            <div
              ref={popRef}
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:block fixed z-50 bg-white rounded-xl shadow-xl border border-stone-200 p-4 text-sm text-stone-600 leading-relaxed info-popover-content"
              style={{
                top: rect.bottom + 6,
                left: Math.max(8, Math.min(rect.left - 140, window.innerWidth - 336)),
                width: 320,
              }}
            >
              {children}
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}

/* ── Help content constants ────────────────────────────────────── */

export function PriorityHelp() {
  return (
    <>
      <div className="font-semibold text-ink mb-2">Priority Levels</div>
      <div className="space-y-1.5">
        <p>
          <span className="font-semibold text-sev1">SEV-1 (Urgent):</span>{" "}
          Critical issue requiring immediate attention. Pages every 15 min
          (open) or 2 h (in progress).
        </p>
        <p>
          <span className="font-semibold text-sev2">SEV-2 (High):</span>{" "}
          Important issue. Pages every 30 min (open) or 8 h (in progress).
        </p>
        <p>
          <span className="font-semibold text-sev3">SEV-3 (Normal):</span>{" "}
          Standard priority. No paging.
        </p>
        <p>
          <span className="font-semibold text-sev4">SEV-4 (Low):</span>{" "}
          Minor issue. No paging.
        </p>
      </div>
      <p className="mt-2.5 pt-2.5 border-t border-stone-100 text-stone-500 text-xs">
        Tickets with due dates are automatically escalated to higher severity
        as the deadline approaches.
      </p>
    </>
  );
}

export function EscalationHelp() {
  return (
    <>
      <div className="font-semibold text-ink mb-2">Escalation Rules</div>
      <p className="mb-2">
        Tickets are automatically escalated (severity increased) based on
        their due date:
      </p>
      <ul className="space-y-1 ml-3">
        <li className="flex gap-1.5">
          <span className="text-stone-400 select-none">&bull;</span>
          <span>
            <span className="font-medium text-ink-light">7 days before due:</span>{" "}
            First escalation
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="text-stone-400 select-none">&bull;</span>
          <span>
            <span className="font-medium text-ink-light">On due date:</span>{" "}
            Second escalation
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="text-stone-400 select-none">&bull;</span>
          <span>
            <span className="font-medium text-ink-light">After due date:</span>{" "}
            Escalates once per day
          </span>
        </li>
      </ul>
      <p className="mt-2.5 pt-2.5 border-t border-stone-100 text-stone-500 text-xs">
        Escalation pauses when a ticket is Blocked, Completed, or Cancelled.
        Tickets already at SEV-1 cannot escalate further.
      </p>
    </>
  );
}

export function PagingHelp() {
  return (
    <>
      <div className="font-semibold text-ink mb-2">Paging Schedule</div>
      <p className="mb-2">
        SEV-1 and SEV-2 tickets in Open or In Progress status send repeated
        notifications to the assignee:
      </p>
      <table className="w-full text-xs border-collapse mb-2">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="text-left py-1 pr-2 font-semibold text-stone-500" />
            <th className="text-left py-1 px-2 font-semibold text-stone-500">
              Open
            </th>
            <th className="text-left py-1 pl-2 font-semibold text-stone-500">
              In Progress
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-stone-100">
            <td className="py-1.5 pr-2 font-semibold text-sev1">SEV-1</td>
            <td className="py-1.5 px-2">Every 15 min</td>
            <td className="py-1.5 pl-2">Every 2 hours</td>
          </tr>
          <tr>
            <td className="py-1.5 pr-2 font-semibold text-sev2">SEV-2</td>
            <td className="py-1.5 px-2">Every 30 min</td>
            <td className="py-1.5 pl-2">Every 8 hours</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2.5 pt-2.5 border-t border-stone-100 text-stone-500 text-xs">
        Acknowledging a page does not stop future pages — it just records
        that you saw it.
      </p>
    </>
  );
}
