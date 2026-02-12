import { useState } from "react";
import type { Comment } from "../types";
import { api } from "../api/client";

interface Props {
  comments: Comment[];
  ticketId: number;
  currentUserId: number;
  onCommentAdded: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CommentThread({
  comments,
  ticketId,
  currentUserId,
  onCommentAdded,
}: Props) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.addComment(ticketId, content.trim());
      setContent("");
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setEditSaving(true);
    setError(null);
    try {
      await api.updateComment(ticketId, editingId, editContent.trim());
      setEditingId(null);
      setEditContent("");
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    setError(null);
    try {
      await api.deleteComment(ticketId, commentId);
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-light mb-4">
        Comments
        <span className="ml-1.5 text-stone-400 font-normal">
          ({comments.length})
        </span>
      </h3>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm text-sev1 bg-sev1-bg border border-sev1-border rounded-lg">
          {error}
        </div>
      )}

      {comments.length > 0 ? (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => {
            const isOwn = comment.user.id === currentUserId;
            const isEditing = editingId === comment.id;

            return (
              <div
                key={comment.id}
                className="bg-paper-warm rounded-xl px-4 py-3 border border-stone-100"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-ink-light">
                    {comment.user.display_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {comment.updated_at && (
                      <span className="text-xs text-stone-400 italic">edited</span>
                    )}
                    <span className="text-xs text-stone-400">
                      {formatTimestamp(comment.created_at)}
                    </span>
                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-xs text-stone-400 hover:text-ink-light transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-stone-400 hover:text-sev1 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-1.5">
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-stone-400 hover:text-ink-light px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={!editContent.trim() || editSaving}
                        className="text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 px-3 py-1 rounded-md transition-colors disabled:opacity-40"
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-stone-400 mb-6">No comments yet.</p>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none transition-colors"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
