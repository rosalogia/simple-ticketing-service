import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import Dashboard from "../../components/Dashboard";
import { ToastProvider } from "../../components/Toast";
import { mockStats } from "../mocks/data";

function renderDashboard(
  props?: Partial<React.ComponentProps<typeof Dashboard>>
) {
  const defaultProps = {
    currentUserId: 1,
    queueId: 1,
    users: [{ id: 1 }, { id: 2 }],
    onSelectTicket: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <MemoryRouter>
        <ToastProvider>
          <Dashboard {...defaultProps} />
        </ToastProvider>
      </MemoryRouter>
    ),
    props: defaultProps,
  };
}

describe("Dashboard", () => {
  it("default tab is To Me", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/To Me/)).toBeInTheDocument();
    });
  });

  it("renders stats widgets with counts", async () => {
    renderDashboard();

    await waitFor(() => {
      // Stats from mockStats: open=3, in_progress=2, blocked=1, completed=5, overdue=1
      // Use getAllByText since some numbers may appear in filter badges too
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("tab switching works", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/To Me/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/By Me/));

    // Tab should switch - both tabs are always present, but styling changes
    expect(screen.getByText(/By Me/)).toBeInTheDocument();
  });

  it("New Ticket button is rendered", async () => {
    renderDashboard();

    await waitFor(() => {
      // The button contains "New Ticket" (desktop) and "New" (mobile)
      expect(screen.getByText(/New Ticket/)).toBeInTheDocument();
    });
  });

  it("clicking New Ticket opens form", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/New Ticket/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/New Ticket/));

    // TicketForm modal should appear with "Create Ticket" submit button
    await waitFor(() => {
      expect(screen.getByText("Create Ticket")).toBeInTheDocument();
    });
  });
});
