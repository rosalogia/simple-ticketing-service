import type {
  User,
  Ticket,
  TicketListResponse,
  TicketStats,
  Comment,
  CategoriesResponse,
  TicketFilters,
  AuthStatus,
  Queue,
  QueueMember,
  QueueRole,
  QueueInvite,
  Notification,
  DiscordServerInfo,
  UserQueueSettings,
  WeekSchedule,
  ApiKey,
  ApiKeyCreateResponse,
  PageBlockedInfo,
  PageResult,
} from "../types";

// In dev mode, this is set by the user switcher.
// In production, auth is handled by session cookies.
let devModeUserId: number | null = null;

export function setDevModeUserId(id: number) {
  devModeUserId = id;
}

export function getDevModeUserId(): number | null {
  return devModeUserId;
}

// Event target for auth state changes (401 responses)
export const authEvents = new EventTarget();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // In dev mode, continue sending X-User-Id header
  if (devModeUserId !== null) {
    headers["X-User-Id"] = String(devModeUserId);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      authEvents.dispatchEvent(new Event("session-expired"));
    }
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth API
export const authApi = {
  getStatus: () => request<AuthStatus>("/api/auth/me"),
  getLoginUrl: () => request<{ url: string }>("/api/auth/login"),
  logout: () =>
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }),
};

// Queue API
export const queueApi = {
  getQueues: () => request<Queue[]>("/api/queues/"),

  createQueue: (data: { name: string; description?: string }) =>
    request<Queue>("/api/queues/", { method: "POST", body: JSON.stringify(data) }),

  getQueue: (id: number) => request<Queue>(`/api/queues/${id}`),

  updateQueue: (id: number, data: { name?: string; description?: string; member_max_severity?: string }) =>
    request<Queue>(`/api/queues/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteQueue: (id: number) =>
    request<void>(`/api/queues/${id}`, { method: "DELETE" }),

  getMembers: (queueId: number) =>
    request<QueueMember[]>(`/api/queues/${queueId}/members`),

  inviteMember: (queueId: number, username: string, role: QueueRole = "MEMBER") =>
    request<QueueInvite>(`/api/queues/${queueId}/invites`, {
      method: "POST",
      body: JSON.stringify({ username, role }),
    }),

  updateMemberRole: (queueId: number, userId: number, role: QueueRole) =>
    request<QueueMember>(`/api/queues/${queueId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (queueId: number, userId: number) =>
    request<void>(`/api/queues/${queueId}/members/${userId}`, { method: "DELETE" }),

  // Discord
  getDiscordServers: () =>
    request<DiscordServerInfo[]>("/api/queues/discord-servers"),

  createFromDiscord: (guildId: string) =>
    request<Queue>(`/api/queues/from-discord?guild_id=${encodeURIComponent(guildId)}`, { method: "POST" }),

  syncDiscord: (queueId: number) =>
    request<Queue>(`/api/queues/${queueId}/sync-discord`, { method: "POST" }),

  getMySettings: (queueId: number) =>
    request<UserQueueSettings>(`/api/queues/${queueId}/my-settings`),

  updateMySettings: (
    queueId: number,
    data: { schedule?: WeekSchedule; timezone?: string; sev1_off_hours_opt_out?: boolean },
  ) =>
    request<UserQueueSettings>(`/api/queues/${queueId}/my-settings`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// API Keys
export const apiKeysApi = {
  list: () => request<ApiKey[]>("/api/api-keys/"),

  create: (name: string) =>
    request<ApiKeyCreateResponse>("/api/api-keys/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  revoke: (keyId: number) =>
    request<void>(`/api/api-keys/${keyId}`, { method: "DELETE" }),
};

export const api = {
  // Users
  getUsers: () => request<User[]>("/api/users/"),

  updateMe: (data: { display_name?: string }) =>
    request<User>("/api/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  createUser: (data: { username: string; display_name: string }) =>
    request<User>("/api/users/", { method: "POST", body: JSON.stringify(data) }),

  // Tickets
  getTickets: (filters?: TicketFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.queue_id) params.set("queue_id", String(filters.queue_id));
      filters.status?.forEach((s) => params.append("status", s));
      filters.priority?.forEach((p) => params.append("priority", p));
      if (filters.assignee_id) params.set("assignee_id", String(filters.assignee_id));
      if (filters.assigner_id) params.set("assigner_id", String(filters.assigner_id));
      if (filters.search) params.set("search", filters.search);
      if (filters.due_before) params.set("due_before", filters.due_before);
      if (filters.due_after) params.set("due_after", filters.due_after);
      if (filters.category) params.set("category", filters.category);
      if (filters.type) params.set("type", filters.type);
      if (filters.item) params.set("item", filters.item);
      if (filters.sort_by) params.set("sort_by", filters.sort_by);
      if (filters.sort_order) params.set("sort_order", filters.sort_order);
      if (filters.skip) params.set("skip", String(filters.skip));
      if (filters.limit) params.set("limit", String(filters.limit));
    }
    const qs = params.toString();
    return request<TicketListResponse>(`/api/tickets/${qs ? `?${qs}` : ""}`);
  },

  getTicket: (id: number) => request<Ticket>(`/api/tickets/${id}`),

  createTicket: (data: {
    title: string;
    description?: string;
    assignee_id: number;
    queue_id: number;
    priority?: string;
    due_date?: string;
    category?: string;
    type?: string;
    item?: string;
  }) => request<Ticket>("/api/tickets/", { method: "POST", body: JSON.stringify(data) }),

  updateTicket: (id: number, data: Record<string, unknown>) =>
    request<Ticket>(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteTicket: (id: number) =>
    request<void>(`/api/tickets/${id}`, { method: "DELETE" }),

  getTicketStats: (params: { queue_id: number; assignee_id?: number; assigner_id?: number }) => {
    const qs = new URLSearchParams();
    qs.set("queue_id", String(params.queue_id));
    if (params.assignee_id) qs.set("assignee_id", String(params.assignee_id));
    if (params.assigner_id) qs.set("assigner_id", String(params.assigner_id));
    return request<TicketStats>(`/api/tickets/stats?${qs.toString()}`);
  },

  // Comments
  getComments: (ticketId: number) =>
    request<Comment[]>(`/api/tickets/${ticketId}/comments`),

  addComment: (ticketId: number, content: string) =>
    request<Comment>(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  updateComment: (ticketId: number, commentId: number, content: string) =>
    request<Comment>(`/api/tickets/${ticketId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  deleteComment: (ticketId: number, commentId: number) =>
    request<void>(`/api/tickets/${ticketId}/comments/${commentId}`, {
      method: "DELETE",
    }),

  escalateTicket: (ticketId: number) =>
    request<Ticket>(`/api/tickets/${ticketId}/escalate`, { method: "POST" }),

  pageTicket: async (
    ticketId: number,
    options?: { force?: boolean; notifyOnly?: boolean },
  ): Promise<PageResult> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (devModeUserId !== null) {
      headers["X-User-Id"] = String(devModeUserId);
    }
    const body: Record<string, boolean> = {};
    if (options?.force) body.force = true;
    if (options?.notifyOnly) body.notify_only = true;

    const response = await fetch(`/api/tickets/${ticketId}/page`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (response.status === 409) {
      const blocked: PageBlockedInfo = await response.json();
      return { ok: false, blocked };
    }

    if (!response.ok) {
      if (response.status === 401) {
        authEvents.dispatchEvent(new Event("session-expired"));
      }
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const ticket: Ticket = await response.json();
    return { ok: true, ticket };
  },

  acknowledgeTicket: (ticketId: number) =>
    request<{ status: string }>(`/api/tickets/${ticketId}/acknowledge`, { method: "POST" }),

  // Categories
  getCategories: (queueId: number) =>
    request<CategoriesResponse>(`/api/categories/?queue_id=${queueId}`),
};

// Notification API
export const notificationApi = {
  list: () => request<Notification[]>("/api/notifications/"),

  markRead: (id: number) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "POST" }),

  markAllRead: () =>
    request<void>("/api/notifications/read-all", { method: "POST" }),

  delete: (id: number) =>
    request<void>(`/api/notifications/${id}`, { method: "DELETE" }),
};

// Invite API
export const inviteApi = {
  getMyInvites: () => request<QueueInvite[]>("/api/invites"),

  acceptInvite: (inviteId: number) =>
    request<QueueInvite>(`/api/invites/${inviteId}/accept`, { method: "POST" }),

  declineInvite: (inviteId: number) =>
    request<void>(`/api/invites/${inviteId}/decline`, { method: "POST" }),
};
