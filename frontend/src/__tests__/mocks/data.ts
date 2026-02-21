import type {
  User,
  Queue,
  Ticket,
  Comment,
  TicketStats,
  QueueMember,
  ApiKey,
  ApiKeyCreateResponse,
  CategoriesResponse,
  AuthStatus,
  UserQueueSettings,
} from "../../types";

export const mockUser: User = {
  id: 1,
  username: "testuser",
  display_name: "Test User",
  avatar_url: null,
  created_at: "2025-01-01T00:00:00Z",
};

export const mockOtherUser: User = {
  id: 2,
  username: "otheruser",
  display_name: "Other User",
  avatar_url: null,
  created_at: "2025-01-01T00:00:00Z",
};

export const mockQueue: Queue = {
  id: 1,
  name: "Test Queue",
  description: "A test queue",
  icon_url: null,
  discord_guild_id: null,
  member_max_severity: "SEV1",
  member_count: 2,
  my_role: "OWNER",
  created_at: "2025-01-01T00:00:00Z",
};

export const mockQueueMember: QueueMember = {
  id: 1,
  user: mockUser,
  role: "OWNER",
  joined_at: "2025-01-01T00:00:00Z",
};

export const mockTicket: Ticket = {
  id: 1,
  title: "Test Ticket",
  description: "A test ticket description",
  priority: "SEV3",
  status: "OPEN",
  queue_id: 1,
  assignee: mockUser,
  assigner: mockOtherUser,
  on_behalf_of: null,
  due_date: null,
  category: null,
  type: null,
  item: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  comment_count: 0,
  next_escalation_at: null,
  next_page_at: null,
  escalation_paused: false,
  page_acknowledged: false,
};

export const mockComment: Comment = {
  id: 1,
  ticket_id: 1,
  user: mockUser,
  on_behalf_of: null,
  content: "Test comment",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: null,
};

export const mockStats: TicketStats = {
  open_count: 3,
  in_progress_count: 2,
  blocked_count: 1,
  completed_count: 5,
  overdue_count: 1,
  total: 11,
};

export const mockApiKey: ApiKey = {
  id: 1,
  key_prefix: "sts_abcd",
  name: "Test Key",
  created_at: "2025-01-01T00:00:00Z",
  last_used_at: null,
  revoked_at: null,
};

export const mockAuthStatus: AuthStatus = {
  authenticated: true,
  user: mockUser,
  dev_mode: true,
  discord_client_id: null,
};

export const mockCategories: CategoriesResponse = {
  categories: ["Bug", "Feature"],
  types: ["Frontend", "Backend"],
  items: ["Button", "API"],
};

export const mockSettings: UserQueueSettings = {
  id: 1,
  user_id: 1,
  queue_id: 1,
  schedule: {
    mon: { start: "09:00", end: "17:00" },
    tue: { start: "09:00", end: "17:00" },
    wed: { start: "09:00", end: "17:00" },
    thu: { start: "09:00", end: "17:00" },
    fri: { start: "09:00", end: "17:00" },
    sat: { start: "09:00", end: "17:00" },
    sun: { start: "09:00", end: "17:00" },
  },
  timezone: "America/New_York",
  sev1_off_hours_opt_out: false,
};
