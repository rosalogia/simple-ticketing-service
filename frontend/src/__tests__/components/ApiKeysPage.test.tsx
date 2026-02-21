import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import ApiKeysPage from "../../components/ApiKeysPage";
import { ToastProvider } from "../../components/Toast";
import { mockApiKey } from "../mocks/data";

function renderPage(props?: Partial<React.ComponentProps<typeof ApiKeysPage>>) {
  const defaultProps = {
    currentUserId: 1,
    onBack: vi.fn(),
    ...props,
  };
  return {
    ...render(
      <ToastProvider>
        <ApiKeysPage {...defaultProps} />
      </ToastProvider>
    ),
    props: defaultProps,
  };
}

describe("ApiKeysPage", () => {
  it("empty state rendering", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No active API keys.")).toBeInTheDocument();
    });
  });

  it("create key shows one-time raw key", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("API Keys")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/key name/i);
    await user.type(input, "Test Key");
    await user.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText(/won't be shown again/i)).toBeInTheDocument();
      expect(screen.getByText("sts_abcdefghijklmnop")).toBeInTheDocument();
    });
  });

  it("revoke calls API and refreshes list", async () => {
    let callCount = 0;
    server.use(
      http.get("/api/api-keys/", () => {
        callCount++;
        // First call returns the key, second call (after revoke) returns empty
        if (callCount <= 1) {
          return HttpResponse.json([mockApiKey]);
        }
        return HttpResponse.json([]);
      })
    );

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Test Key")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Revoke"));

    // After revoke, list is refreshed (returns empty)
    await waitFor(() => {
      expect(screen.getByText("No active API keys.")).toBeInTheDocument();
    });
  });
});
