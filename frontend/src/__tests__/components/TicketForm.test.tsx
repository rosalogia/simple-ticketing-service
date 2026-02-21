import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import TicketForm from "../../components/TicketForm";
import { ToastProvider } from "../../components/Toast";

function renderForm(props?: Partial<React.ComponentProps<typeof TicketForm>>) {
  const defaultProps = {
    queueId: 1,
    currentUserId: 1,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <ToastProvider>
        <TicketForm {...defaultProps} />
      </ToastProvider>
    ),
    props: defaultProps,
  };
}

describe("TicketForm", () => {
  it("renders all form fields", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("New Ticket")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add context/i)).toBeInTheDocument();
    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
    expect(screen.getByText(/due date/i)).toBeInTheDocument();
  });

  it("submit disabled without title", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Create Ticket")).toBeInTheDocument();
    });

    const submitBtn = screen.getByText("Create Ticket");
    expect(submitBtn).toBeDisabled();
  });

  it("successful submit calls API and closes modal", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    // Wait for members to load (options appear with "(you)" suffix for current user)
    await waitFor(() => {
      expect(screen.getByText(/Test User \(you\)/)).toBeInTheDocument();
    });

    // Fill title
    await user.type(screen.getByPlaceholderText(/what needs to be done/i), "New task");

    // Select assignee - find the select by its option content
    const selects = screen.getAllByRole("combobox");
    const assigneeSelect = selects.find((s) =>
      Array.from(s.querySelectorAll("option")).some((o) => o.textContent?.includes("Test User"))
    )!;
    await user.selectOptions(assigneeSelect, "1");

    // Submit
    const submitBtn = screen.getByText("Create Ticket");
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(props.onCreated).toHaveBeenCalled();
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it("API failure shows error message", async () => {
    server.use(
      http.post("/api/tickets/", () =>
        HttpResponse.json({ detail: "Server error" }, { status: 500 })
      )
    );

    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByText(/Test User \(you\)/)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/what needs to be done/i), "Fail");
    const selects = screen.getAllByRole("combobox");
    const assigneeSelect = selects.find((s) =>
      Array.from(s.querySelectorAll("option")).some((o) => o.textContent?.includes("Test User"))
    )!;
    await user.selectOptions(assigneeSelect, "1");
    await user.click(screen.getByText("Create Ticket"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("members loaded into assignee dropdown", async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText("Test User (you)")).toBeInTheDocument();
      expect(screen.getByText("Other User")).toBeInTheDocument();
    });
  });
});
