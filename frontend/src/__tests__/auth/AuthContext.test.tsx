import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { AuthProvider, useAuth } from "../../auth/AuthContext";
import { mockUser, mockAuthStatus } from "../mocks/data";
import { authEvents } from "../../api/client";

function AuthDisplay() {
  const { user, devMode, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user?.display_name || "none"}</div>
      <div data-testid="devMode">{String(devMode)}</div>
    </div>
  );
}

describe("AuthContext", () => {
  it("calls /auth/me on mount and populates user", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Test User");
    });
  });

  it("sets devMode flag from API", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("devMode")).toHaveTextContent("true");
    });
  });

  it("handles unauthenticated state", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({
          authenticated: false,
          user: null,
          dev_mode: true,
          discord_client_id: null,
        })
      )
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("none");
    });
  });

  it("session-expired event clears user", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("Test User");
    });

    act(() => {
      authEvents.dispatchEvent(new Event("session-expired"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("none");
    });
  });
});
