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
  DiscordServerInfo,
  UserQueueSettings,
} from '../types';

// Base URL — full URL required for mobile (no relative paths)
const API_BASE = __DEV__
  ? 'http://localhost:8000'
  : 'https://simple-ticketing-service.up.railway.app';

// Token management — set by AuthContext after loading from keychain
let _token: string | null = null;
let _onSessionExpired: (() => void) | null = null;

export function setToken(token: string | null) {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function setOnSessionExpired(handler: () => void) {
  _onSessionExpired = handler;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    _token = null;
    _onSessionExpired?.();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({detail: response.statusText}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth API
export const authApi = {
  getStatus: () => request<AuthStatus>('/api/auth/me'),

  getLoginUrl: () => request<{url: string}>('/api/auth/login/mobile'),

  callbackMobile: (code: string) =>
    request<{session_id: string; user: User}>(
      `/api/auth/callback/mobile?code=${encodeURIComponent(code)}`,
    ),

  devLogin: (userId: number) =>
    request<{session_id: string; user: User}>('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({user_id: userId}),
    }),

  logout: () => request<void>('/api/auth/logout', {method: 'POST'}),
};

// Queue API
export const queueApi = {
  getQueues: () => request<Queue[]>('/api/queues/'),

  createQueue: (data: {name: string; description?: string}) =>
    request<Queue>('/api/queues/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getQueue: (id: number) => request<Queue>(`/api/queues/${id}`),

  updateQueue: (
    id: number,
    data: {name?: string; description?: string; member_max_severity?: string},
  ) =>
    request<Queue>(`/api/queues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteQueue: (id: number) =>
    request<void>(`/api/queues/${id}`, {method: 'DELETE'}),

  getMembers: (queueId: number) =>
    request<QueueMember[]>(`/api/queues/${queueId}/members`),

  addMember: (queueId: number, userId: number, role: QueueRole = 'MEMBER') =>
    request<QueueMember>(`/api/queues/${queueId}/members`, {
      method: 'POST',
      body: JSON.stringify({user_id: userId, role}),
    }),

  updateMemberRole: (queueId: number, userId: number, role: QueueRole) =>
    request<QueueMember>(`/api/queues/${queueId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({role}),
    }),

  removeMember: (queueId: number, userId: number) =>
    request<void>(`/api/queues/${queueId}/members/${userId}`, {
      method: 'DELETE',
    }),

  getDiscordServers: () =>
    request<DiscordServerInfo[]>('/api/queues/discord-servers'),

  createFromDiscord: (guildId: string) =>
    request<Queue>(
      `/api/queues/from-discord?guild_id=${encodeURIComponent(guildId)}`,
      {method: 'POST'},
    ),

  syncDiscord: (queueId: number) =>
    request<Queue>(`/api/queues/${queueId}/sync-discord`, {method: 'POST'}),
};

// Ticket + Comment + User API
export const api = {
  getUsers: () => request<User[]>('/api/users/'),

  createUser: (data: {username: string; display_name: string}) =>
    request<User>('/api/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTickets: (filters?: TicketFilters) => {
    const parts: string[] = [];
    if (filters) {
      if (filters.queue_id) parts.push(`queue_id=${filters.queue_id}`);
      filters.status?.forEach(s => parts.push(`status=${encodeURIComponent(s)}`));
      filters.priority?.forEach(p => parts.push(`priority=${encodeURIComponent(p)}`));
      if (filters.assignee_id) parts.push(`assignee_id=${filters.assignee_id}`);
      if (filters.assigner_id) parts.push(`assigner_id=${filters.assigner_id}`);
      if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters.due_before) parts.push(`due_before=${encodeURIComponent(filters.due_before)}`);
      if (filters.due_after) parts.push(`due_after=${encodeURIComponent(filters.due_after)}`);
      if (filters.category) parts.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters.type) parts.push(`type=${encodeURIComponent(filters.type)}`);
      if (filters.item) parts.push(`item=${encodeURIComponent(filters.item)}`);
      if (filters.sort_by) parts.push(`sort_by=${filters.sort_by}`);
      if (filters.sort_order) parts.push(`sort_order=${filters.sort_order}`);
      if (filters.skip) parts.push(`skip=${filters.skip}`);
      if (filters.limit) parts.push(`limit=${filters.limit}`);
    }
    const qs = parts.join('&');
    return request<TicketListResponse>(`/api/tickets/${qs ? `?${qs}` : ''}`);
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
  }) =>
    request<Ticket>('/api/tickets/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTicket: (id: number, data: Record<string, unknown>) =>
    request<Ticket>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTicket: (id: number) =>
    request<void>(`/api/tickets/${id}`, {method: 'DELETE'}),

  getTicketStats: (params: {
    queue_id: number;
    assignee_id?: number;
    assigner_id?: number;
  }) => {
    const parts: string[] = [`queue_id=${params.queue_id}`];
    if (params.assignee_id) parts.push(`assignee_id=${params.assignee_id}`);
    if (params.assigner_id) parts.push(`assigner_id=${params.assigner_id}`);
    return request<TicketStats>(`/api/tickets/stats?${parts.join('&')}`);
  },

  getComments: (ticketId: number) =>
    request<Comment[]>(`/api/tickets/${ticketId}/comments`),

  addComment: (ticketId: number, content: string) =>
    request<Comment>(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({content}),
    }),

  updateComment: (ticketId: number, commentId: number, content: string) =>
    request<Comment>(`/api/tickets/${ticketId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({content}),
    }),

  deleteComment: (ticketId: number, commentId: number) =>
    request<void>(`/api/tickets/${ticketId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  getCategories: (queueId: number) =>
    request<CategoriesResponse>(`/api/categories/?queue_id=${queueId}`),

  escalateTicket: (ticketId: number) =>
    request<Ticket>(`/api/tickets/${ticketId}/escalate`, {method: 'POST'}),

  pageTicket: (ticketId: number) =>
    request<Ticket>(`/api/tickets/${ticketId}/page`, {method: 'POST'}),

  acknowledgeTicket: (ticketId: number) =>
    request<{status: string}>(`/api/tickets/${ticketId}/acknowledge`, {
      method: 'POST',
    }),
};

// Device Token API
export const deviceApi = {
  registerToken: (token: string, platform: 'android' | 'ios') =>
    request<{status: string}>('/api/devices/token', {
      method: 'POST',
      body: JSON.stringify({token, platform}),
    }),

  unregisterToken: (token: string, platform: 'android' | 'ios') =>
    request<{status: string}>('/api/devices/token', {
      method: 'DELETE',
      body: JSON.stringify({token, platform}),
    }),
};

// Queue Settings API
export const settingsApi = {
  getMySettings: (queueId: number) =>
    request<UserQueueSettings>(`/api/queues/${queueId}/my-settings`),

  updateMySettings: (
    queueId: number,
    data: {
      pageable_start?: string;
      pageable_end?: string;
      timezone?: string;
      sev1_off_hours_opt_out?: boolean;
    },
  ) =>
    request<UserQueueSettings>(`/api/queues/${queueId}/my-settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
