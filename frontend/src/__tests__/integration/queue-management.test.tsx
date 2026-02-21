import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import QueueList from "../../components/QueueList";
import { mockQueue } from "../mocks/data";

describe("Queue Management Integration", () => {
  it("queue list renders and supports navigation", async () => {
    const user = userEvent.setup();
    const onSelectQueue = vi.fn();
    const onCreateQueue = vi.fn();

    render(
      <QueueList
        queues={[mockQueue]}
        onSelectQueue={onSelectQueue}
        onCreateQueue={onCreateQueue}
      />
    );

    // Queue card should be visible
    expect(screen.getByText("Test Queue")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();

    // Click queue to navigate
    await user.click(screen.getByText("Test Queue"));
    expect(onSelectQueue).toHaveBeenCalledWith(1);
  });

  it("empty queue list shows empty state and create button", async () => {
    const user = userEvent.setup();
    const onCreateQueue = vi.fn();

    render(
      <QueueList
        queues={[]}
        onSelectQueue={vi.fn()}
        onCreateQueue={onCreateQueue}
      />
    );

    expect(screen.getByText(/not a member of any queues/i)).toBeInTheDocument();
  });

  it("multiple queues render correctly", () => {
    const queues = [
      mockQueue,
      {
        ...mockQueue,
        id: 2,
        name: "Second Queue",
        my_role: "MEMBER" as const,
        member_count: 5,
      },
    ];

    render(
      <QueueList
        queues={queues}
        onSelectQueue={vi.fn()}
        onCreateQueue={vi.fn()}
      />
    );

    expect(screen.getByText("Test Queue")).toBeInTheDocument();
    expect(screen.getByText("Second Queue")).toBeInTheDocument();
    expect(screen.getByText("5 members")).toBeInTheDocument();
    expect(screen.getByText("member")).toBeInTheDocument();
  });
});
