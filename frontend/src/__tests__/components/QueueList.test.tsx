import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QueueList from "../../components/QueueList";
import { mockQueue } from "../mocks/data";

function renderQueueList(
  props?: Partial<React.ComponentProps<typeof QueueList>>
) {
  const defaultProps = {
    queues: [mockQueue],
    onSelectQueue: vi.fn(),
    onCreateQueue: vi.fn(),
    ...props,
  };
  return {
    ...render(<QueueList {...defaultProps} />),
    props: defaultProps,
  };
}

describe("QueueList", () => {
  it("renders queue cards with name and role", () => {
    renderQueueList();

    expect(screen.getByText("Test Queue")).toBeInTheDocument();
    // Role is displayed in lowercase
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("renders member count", () => {
    renderQueueList();
    expect(screen.getByText("2 members")).toBeInTheDocument();
  });

  it("click calls onSelectQueue", async () => {
    const user = userEvent.setup();
    const { props } = renderQueueList();

    await user.click(screen.getByText("Test Queue"));
    expect(props.onSelectQueue).toHaveBeenCalledWith(1);
  });

  it("renders empty state when no queues", () => {
    renderQueueList({ queues: [] });
    expect(screen.getByText(/not a member of any queues/i)).toBeInTheDocument();
  });
});
