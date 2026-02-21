import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import CommentThread from "../../components/CommentThread";
import { mockComment, mockUser, mockOtherUser } from "../mocks/data";
import type { Comment } from "../../types";

function renderThread(props?: Partial<React.ComponentProps<typeof CommentThread>>) {
  const defaultProps = {
    comments: [mockComment],
    ticketId: 1,
    currentUserId: 1,
    onCommentAdded: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <MemoryRouter>
        <CommentThread {...defaultProps} />
      </MemoryRouter>
    ),
    props: defaultProps,
  };
}

describe("CommentThread", () => {
  it("renders comment list with authors", () => {
    renderThread();

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Test comment")).toBeInTheDocument();
  });

  it("shows edit/delete buttons only for own comments", () => {
    const otherComment: Comment = {
      ...mockComment,
      id: 2,
      user: mockOtherUser,
      content: "Other person's comment",
    };
    renderThread({ comments: [mockComment, otherComment] });

    // Own comment has Edit and Delete
    const editButtons = screen.getAllByText("Edit");
    const deleteButtons = screen.getAllByText("Delete");
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it("post comment calls API and onCommentAdded", async () => {
    const user = userEvent.setup();
    const { props } = renderThread();

    const textarea = screen.getByPlaceholderText(/add a comment/i);
    await user.type(textarea, "New comment");
    await user.click(screen.getByText("Post Comment"));

    await waitFor(() => {
      expect(props.onCommentAdded).toHaveBeenCalled();
    });
  });

  it("edit inline flow saves comment", async () => {
    const user = userEvent.setup();
    const { props } = renderThread();

    await user.click(screen.getByText("Edit"));

    // Should show textarea with existing content and Save/Cancel buttons
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    const editTextarea = screen.getByDisplayValue("Test comment");
    await user.clear(editTextarea);
    await user.type(editTextarea, "Updated comment");
    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(props.onCommentAdded).toHaveBeenCalled();
    });
  });

  it("delete flow calls API and onCommentAdded", async () => {
    const user = userEvent.setup();
    const { props } = renderThread();

    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(props.onCommentAdded).toHaveBeenCalled();
    });
  });

  it("shows edited badge when updated_at is set", () => {
    const editedComment: Comment = {
      ...mockComment,
      updated_at: "2025-01-02T00:00:00Z",
    };
    renderThread({ comments: [editedComment] });

    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("renders empty state when no comments", () => {
    renderThread({ comments: [] });
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });
});
