import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { ToastProvider } from "../../components/Toast";
import Dashboard from "../../components/Dashboard";
import TicketDetail from "../../components/TicketDetail";
import { mockTicket } from "../mocks/data";

describe("Ticket Lifecycle Integration", () => {
  it("dashboard shows tickets and stats", async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <Dashboard
            currentUserId={1}
            queueId={1}
            users={[{ id: 1 }, { id: 2 }]}
            onSelectTicket={vi.fn()}
          />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for tickets to load (appears in both desktop table + mobile card)
    await waitFor(() => {
      expect(screen.getAllByText("Test Ticket").length).toBeGreaterThanOrEqual(1);
    });

    // Stats should be visible (stat labels may appear multiple times: stat widget + ticket badge + filter)
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
  });

  it("ticket detail shows info, allows status change, and shows comments", async () => {
    const user = userEvent.setup();

    server.use(
      http.patch("/api/tickets/:id", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...mockTicket, ...body });
      })
    );

    render(
      <MemoryRouter>
        <ToastProvider>
          <TicketDetail ticketId={1} currentUserId={1} onBack={vi.fn()} />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for ticket to load
    await waitFor(() => {
      expect(screen.getByText("Test Ticket")).toBeInTheDocument();
    });

    // Verify ticket metadata
    expect(screen.getByText(/Sev-3/)).toBeInTheDocument();

    // Change status to IN_PROGRESS
    await user.click(screen.getByText("Start Work"));

    await waitFor(() => {
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    // Comments section should be loaded
    await waitFor(() => {
      expect(screen.getByText("Test comment")).toBeInTheDocument();
    });

    // Post a new comment
    const textarea = screen.getByPlaceholderText(/add a comment/i);
    await user.type(textarea, "Follow-up comment");
    await user.click(screen.getByText("Post Comment"));

    // Comment should be submitted (onCommentAdded triggers reload)
    await waitFor(() => {
      expect(screen.getByText("Test comment")).toBeInTheDocument();
    });
  });

  it("create ticket from dashboard and view it", async () => {
    const user = userEvent.setup();
    const onSelectTicket = vi.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <Dashboard
            currentUserId={1}
            queueId={1}
            users={[{ id: 1 }, { id: 2 }]}
            onSelectTicket={onSelectTicket}
          />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/New Ticket/)).toBeInTheDocument();
    });

    // Open create form
    await user.click(screen.getByText(/New Ticket/));

    await waitFor(() => {
      expect(screen.getByText("Create Ticket")).toBeInTheDocument();
    });

    // Fill in the form
    await user.type(
      screen.getByPlaceholderText(/what needs to be done/i),
      "Integration test ticket"
    );

    // Wait for members to load
    await waitFor(() => {
      expect(screen.getByText(/Test User \(you\)/)).toBeInTheDocument();
    });

    // Find assignee select by looking for selects containing member options
    const selects = screen.getAllByRole("combobox");
    const assigneeSelect = selects.find((s) =>
      Array.from(s.querySelectorAll("option")).some((o) =>
        o.textContent?.includes("Test User")
      )
    )!;
    await user.selectOptions(assigneeSelect, "1");

    // Submit
    await user.click(screen.getByText("Create Ticket"));

    // Form should close (TicketForm calls onClose and onCreated)
    await waitFor(() => {
      expect(screen.queryByText("Create Ticket")).not.toBeInTheDocument();
    });
  });
});
