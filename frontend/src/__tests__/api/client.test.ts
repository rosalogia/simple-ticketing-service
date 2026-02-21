import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

// Reset module state between tests
beforeEach(() => {
  vi.resetModules();
});

describe("API client", () => {
  it("includes correct Content-Type header", async () => {
    let capturedHeaders: Headers | undefined;
    server.use(
      http.get("/api/users/", ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json([]);
      })
    );

    const { api } = await import("../../api/client");
    await api.getUsers();
    expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
  });

  it("includes credentials in requests", async () => {
    // The fetch call should use credentials: "include"
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.get("/api/users/", () => HttpResponse.json([]))
    );

    const { api } = await import("../../api/client");
    await api.getUsers();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" })
    );
    fetchSpy.mockRestore();
  });

  it("dev mode adds X-User-Id header", async () => {
    let capturedHeaders: Headers | undefined;
    server.use(
      http.get("/api/users/", ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json([]);
      })
    );

    const { api, setDevModeUserId } = await import("../../api/client");
    setDevModeUserId(42);
    await api.getUsers();
    expect(capturedHeaders?.get("X-User-Id")).toBe("42");
  });

  it("401 dispatches session-expired event", async () => {
    server.use(
      http.get("/api/users/", () =>
        HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
      )
    );

    const { api, authEvents } = await import("../../api/client");
    const handler = vi.fn();
    authEvents.addEventListener("session-expired", handler);

    await expect(api.getUsers()).rejects.toThrow();
    expect(handler).toHaveBeenCalled();
    authEvents.removeEventListener("session-expired", handler);
  });

  it("204 returns undefined", async () => {
    server.use(
      http.delete("/api/tickets/1", () =>
        new HttpResponse(null, { status: 204 })
      )
    );

    const { api } = await import("../../api/client");
    const result = await api.deleteTicket(1);
    expect(result).toBeUndefined();
  });

  it("builds complex query strings for ticket filters", async () => {
    let capturedUrl = "";
    server.use(
      http.get("/api/tickets/", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ tickets: [], total: 0 });
      })
    );

    const { api } = await import("../../api/client");
    await api.getTickets({
      queue_id: 1,
      status: ["OPEN", "IN_PROGRESS"],
      priority: ["SEV1"],
      search: "bug",
      sort_by: "priority",
      sort_order: "asc",
    });

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("queue_id")).toBe("1");
    expect(url.searchParams.getAll("status")).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(url.searchParams.getAll("priority")).toEqual(["SEV1"]);
    expect(url.searchParams.get("search")).toBe("bug");
    expect(url.searchParams.get("sort_by")).toBe("priority");
    expect(url.searchParams.get("sort_order")).toBe("asc");
  });
});
