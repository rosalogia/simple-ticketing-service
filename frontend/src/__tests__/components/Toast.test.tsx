import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../../components/Toast";

function ToastTrigger() {
  const { showError, showSuccess } = useToast();
  return (
    <div>
      <button onClick={() => showError("Error msg")}>Show Error</button>
      <button onClick={() => showSuccess("Success msg")}>Show Success</button>
    </div>
  );
}

describe("Toast", () => {
  it("error toast appears", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText("Show Error").click();
    });

    expect(screen.getByText("Error msg")).toBeInTheDocument();
  });

  it("success toast appears", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText("Show Success").click();
    });

    expect(screen.getByText("Success msg")).toBeInTheDocument();
  });

  it("auto-dismiss after timeout", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText("Show Error").click();
    });

    expect(screen.getByText("Error msg")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByText("Error msg")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
