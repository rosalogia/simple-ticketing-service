import { useState, useEffect } from "react";
import type { QueueMember, CategoriesResponse } from "../types";
import { api, queueApi } from "../api/client";
import InfoPopover, { PriorityHelp } from "./InfoPopover";

interface Props {
  queueId: number;
  currentUserId: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function TicketForm({
  queueId,
  currentUserId,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [priority, setPriority] = useState("SEV3");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [item, setItem] = useState("");
  const [cti, setCti] = useState<CategoriesResponse | null>(null);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCategories(queueId).then(setCti).catch(console.error);
    queueApi.getMembers(queueId).then(setMembers).catch(console.error);
  }, [queueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || assigneeId === "") return;

    setSubmitting(true);
    setError("");
    try {
      await api.createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        assignee_id: Number(assigneeId),
        queue_id: queueId,
        priority,
        due_date: dueDate || undefined,
        category: category.trim() || undefined,
        type: type.trim() || undefined,
        item: item.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-end sm:items-start justify-center sm:pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="modal-content bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-stone-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-ink tracking-tight">
            New Ticket
          </h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Assign a task to someone in this queue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="text-sm text-sev1 bg-sev1-bg border border-sev1-border rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Title <span className="text-sev1">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, details, or instructions..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-colors"
            />
          </div>

          {/* Assignee + Priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-light mb-1">
                Assignee <span className="text-sev1">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              >
                <option value="">Select person...</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.display_name}
                    {m.user.id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-light mb-1">
                Priority
                <InfoPopover><PriorityHelp /></InfoPopover>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              >
                <option value="SEV1">Sev-1 (Urgent)</option>
                <option value="SEV2">Sev-2 (High)</option>
                <option value="SEV3">Sev-3 (Normal)</option>
                <option value="SEV4">Sev-4 (Low)</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-paper-warm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          {/* CTI */}
          <div>
            <label className="block text-sm font-medium text-ink-light mb-1.5">
              Categorization
              <span className="font-normal text-stone-400 ml-1">
                (optional)
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <input
                  list="cat-opts"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
                <datalist id="cat-opts">
                  {cti?.categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <input
                  list="type-opts"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Type"
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
                <datalist id="type-opts">
                  {cti?.types.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <input
                  list="item-opts"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Item"
                  className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-paper-warm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
                <datalist id="item-opts">
                  {cti?.items.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-ink-light hover:bg-paper-warm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || assigneeId === "" || submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
