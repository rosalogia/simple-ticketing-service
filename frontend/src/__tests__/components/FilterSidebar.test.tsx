import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterSidebar from "../../components/FilterSidebar";
import type { TicketFilters, TicketStatus } from "../../types";

const DEFAULT_STATUS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED"];
const DEFAULT_FILTERS: TicketFilters = { status: DEFAULT_STATUS };

function renderSidebar(
  props?: Partial<React.ComponentProps<typeof FilterSidebar>>
) {
  const defaultProps = {
    filters: DEFAULT_FILTERS,
    defaultFilters: DEFAULT_FILTERS,
    onChange: vi.fn(),
    ...props,
  };
  return {
    ...render(<FilterSidebar {...defaultProps} />),
    props: defaultProps,
  };
}

describe("FilterSidebar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("search input debounces at 300ms", () => {
    vi.useFakeTimers();
    const { props } = renderSidebar();

    const searchInput = screen.getByPlaceholderText(/search tickets/i);

    // Simulate typing using fireEvent.change (works with React's synthetic events)
    fireEvent.change(searchInput, { target: { value: "bug" } });

    // Should not have called onChange yet (debounce)
    expect(props.onChange).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: "bug" })
    );
  });

  it("status checkbox toggles", () => {
    const { props } = renderSidebar();

    // COMPLETED is not checked by default (not in DEFAULT_STATUS)
    const completedCheckbox = screen.getByRole("checkbox", {
      name: /completed/i,
    });

    act(() => {
      completedCheckbox.click();
    });

    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.arrayContaining(["COMPLETED"]),
      })
    );
  });

  it("priority checkbox toggles", () => {
    const { props } = renderSidebar();

    const sev1Checkbox = screen.getByRole("checkbox", { name: /sev-1/i });

    act(() => {
      sev1Checkbox.click();
    });

    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: ["SEV1"],
      })
    );
  });

  it("clear all resets to defaults", () => {
    // Filters with search to make "Clear all" appear
    const { props } = renderSidebar({
      filters: { ...DEFAULT_FILTERS, search: "something" },
    });

    const clearBtn = screen.getByText(/clear all filters/i);

    act(() => {
      clearBtn.click();
    });

    expect(props.onChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });
});
