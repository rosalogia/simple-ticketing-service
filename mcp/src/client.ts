import type {
  CategoriesResponse,
  Comment,
  Queue,
  QueueMember,
  Ticket,
  TicketListResponse,
  TicketStats,
  User,
} from "./types.js";

export class StsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      let detail: string;
      try {
        detail = JSON.parse(text).detail ?? text;
      } catch {
        detail = text;
      }
      throw new Error(`STS API ${method} ${path} failed (${res.status}): ${detail}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  // ── Users ───────────────────────────────────────────────────────────

  async listUsers(): Promise<User[]> {
    return this.request<User[]>("GET", "/users");
  }

  // ── Queues ──────────────────────────────────────────────────────────

  async listQueues(): Promise<Queue[]> {
    return this.request<Queue[]>("GET", "/queues");
  }

  async getQueueMembers(queueId: number): Promise<QueueMember[]> {
    return this.request<QueueMember[]>("GET", `/queues/${queueId}/members`);
  }

  // ── Tickets ─────────────────────────────────────────────────────────

  async listTickets(params: {
    queue_id: number;
    status?: string[];
    priority?: string[];
    assignee_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    limit?: number;
    skip?: number;
  }): Promise<TicketListResponse> {
    const query = new URLSearchParams();
    query.set("queue_id", String(params.queue_id));
    if (params.status) {
      for (const s of params.status) query.append("status", s);
    }
    if (params.priority) {
      for (const p of params.priority) query.append("priority", p);
    }
    if (params.assignee_id !== undefined)
      query.set("assignee_id", String(params.assignee_id));
    if (params.search) query.set("search", params.search);
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.sort_order) query.set("sort_order", params.sort_order);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.skip !== undefined) query.set("skip", String(params.skip));

    return this.request<TicketListResponse>(
      "GET",
      `/tickets?${query.toString()}`
    );
  }

  async getTicket(ticketId: number): Promise<Ticket> {
    return this.request<Ticket>("GET", `/tickets/${ticketId}`);
  }

  async createTicket(data: {
    queue_id: number;
    title: string;
    assignee_id: number;
    priority?: string;
    description?: string;
    due_date?: string;
    category?: string;
    type?: string;
    item?: string;
    on_behalf_of?: number;
  }): Promise<Ticket> {
    return this.request<Ticket>("POST", "/tickets", data as Record<string, unknown>);
  }

  async updateTicket(
    ticketId: number,
    data: {
      title?: string;
      description?: string;
      assignee_id?: number;
      priority?: string;
      status?: string;
      due_date?: string;
      category?: string;
      type?: string;
      item?: string;
    }
  ): Promise<Ticket> {
    return this.request<Ticket>(
      "PATCH",
      `/tickets/${ticketId}`,
      data as Record<string, unknown>
    );
  }

  // ── Comments ────────────────────────────────────────────────────────

  async getComments(ticketId: number): Promise<Comment[]> {
    return this.request<Comment[]>(
      "GET",
      `/tickets/${ticketId}/comments`
    );
  }

  async addComment(ticketId: number, content: string, onBehalfOf?: number): Promise<Comment> {
    const body: Record<string, unknown> = { content };
    if (onBehalfOf !== undefined) {
      body.on_behalf_of = onBehalfOf;
    }
    return this.request<Comment>("POST", `/tickets/${ticketId}/comments`, body);
  }

  // ── Stats & Categories ──────────────────────────────────────────────

  async getTicketStats(queueId: number): Promise<TicketStats> {
    return this.request<TicketStats>(
      "GET",
      `/tickets/stats?queue_id=${queueId}`
    );
  }

  async getCategories(queueId: number): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>(
      "GET",
      `/categories?queue_id=${queueId}`
    );
  }
}
