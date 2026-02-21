import { http, HttpResponse } from "msw";
import {
  mockUser,
  mockOtherUser,
  mockQueue,
  mockQueueMember,
  mockTicket,
  mockComment,
  mockStats,
  mockAuthStatus,
  mockCategories,
  mockSettings,
} from "./data";

export const handlers = [
  // Auth
  http.get("/api/auth/me", () => HttpResponse.json(mockAuthStatus)),

  // Users
  http.get("/api/users/", () => HttpResponse.json([mockUser, mockOtherUser])),
  http.patch("/api/users/me", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockUser, ...body });
  }),

  // Queues
  http.get("/api/queues/", () => HttpResponse.json([mockQueue])),
  http.post("/api/queues/", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockQueue, ...body, id: 2, my_role: "OWNER", member_count: 1 },
      { status: 201 }
    );
  }),
  http.get("/api/queues/:id", () => HttpResponse.json(mockQueue)),
  http.get("/api/queues/:id/members", () =>
    HttpResponse.json([
      mockQueueMember,
      { ...mockQueueMember, id: 2, user: mockOtherUser, role: "MEMBER" },
    ])
  ),
  http.post("/api/queues/:id/members", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: 3, user: mockOtherUser, role: body.role || "MEMBER", joined_at: new Date().toISOString() },
      { status: 201 }
    );
  }),
  http.get("/api/queues/:id/my-settings", () =>
    HttpResponse.json(mockSettings)
  ),
  http.put("/api/queues/:id/my-settings", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockSettings, ...body });
  }),

  // Tickets
  http.get("/api/tickets/", () =>
    HttpResponse.json({ tickets: [mockTicket], total: 1 })
  ),
  http.get("/api/tickets/stats", () => HttpResponse.json(mockStats)),
  http.get("/api/tickets/:id", () => HttpResponse.json(mockTicket)),
  http.post("/api/tickets/", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockTicket, ...body, id: 2 },
      { status: 201 }
    );
  }),
  http.patch("/api/tickets/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockTicket, ...body });
  }),
  http.delete("/api/tickets/:id", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/tickets/:id/escalate", () =>
    HttpResponse.json({ ...mockTicket, priority: "SEV2" })
  ),
  http.post("/api/tickets/:id/page", () => HttpResponse.json(mockTicket)),
  http.post("/api/tickets/:id/acknowledge", () =>
    HttpResponse.json({ status: "acknowledged" })
  ),

  // Comments
  http.get("/api/tickets/:id/comments", () =>
    HttpResponse.json([mockComment])
  ),
  http.post("/api/tickets/:id/comments", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockComment, id: 2, content: body.content },
      { status: 201 }
    );
  }),
  http.patch("/api/tickets/:ticketId/comments/:commentId", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockComment,
      content: body.content,
      updated_at: new Date().toISOString(),
    });
  }),
  http.delete("/api/tickets/:ticketId/comments/:commentId", () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Categories
  http.get("/api/categories/", () => HttpResponse.json(mockCategories)),

  // API Keys
  http.get("/api/api-keys/", () => HttpResponse.json([])),
  http.post("/api/api-keys/", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 1,
        key_prefix: "sts_abcd",
        name: body.name,
        key: "sts_abcdefghijklmnop",
        created_at: new Date().toISOString(),
        last_used_at: null,
        revoked_at: null,
      },
      { status: 201 }
    );
  }),
  http.delete("/api/api-keys/:id", () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Devices
  http.post("/api/devices/token", () =>
    HttpResponse.json({ status: "created" }, { status: 201 })
  ),

  // Health
  http.get("/api/health", () => HttpResponse.json({ status: "ok" })),
];
