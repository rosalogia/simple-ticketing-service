import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import TicketDetail from "../../components/TicketDetail";
import { ToastProvider } from "../../components/Toast";
import { mockTicket, mockUser, mockOtherUser } from "../mocks/data";

function renderDetail(props?: Partial<React.ComponentProps<typeof TicketDetail>>) {
  const defaultProps = {
    ticketId: 1,
    currentUserId: 1,
    onBack: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <MemoryRouter>
        <ToastProvider>
          <TicketDetail {...defaultProps} />
        </ToastProvider>
      </MemoryRouter>
    ),
    props: defaultProps,
  };
}

describe("TicketDetail", () => {
  it("renders ticket info", async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    // Priority and status badges
    expect(screen.getByText(/Sev-3/)).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    // Assignee appears in sidebar
    expect(screen.getAllByText("Test User").length).toBeGreaterThanOrEqual(1);
  });

  it("status action buttons for OPEN ticket", async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    // OPEN ticket should show Start Work, Block, Complete, Cancel
    expect(screen.getByText("Start Work")).toBeInTheDocument();
    expect(screen.getByText("Block")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("COMPLETED ticket shows Reopen", async () => {
    server.use(
      http.get("/api/tickets/:id", () =>
        HttpResponse.json({ ...mockTicket, status: "COMPLETED" })
      )
    );

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    expect(screen.getByText("Reopen")).toBeInTheDocument();
    expect(screen.queryByText("Start Work")).not.toBeInTheDocument();
  });

  it("status action calls API", async () => {
    server.use(
      http.patch("/api/tickets/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...mockTicket, ...body });
      })
    );

    const user = userEvent.setup();
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Start Work")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Start Work"));

    await waitFor(() => {
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  it("edit mode shows form fields and saves", async () => {
    const user = userEvent.setup();
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    // Click the ticket Edit button (first one, larger button in header)
    const editButtons = screen.getAllByText("Edit");
    await user.click(editButtons[0]);

    // Should show Save and Cancel buttons
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    // Should show editable title input
    expect(screen.getByDisplayValue("Test Ticket")).toBeInTheDocument();
  });

  it("back button calls onBack", async () => {
    const user = userEvent.setup();
    const { props } = renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to Dashboard"));

    expect(props.onBack).toHaveBeenCalled();
  });
});
