import type {
  User,
  Queue,
  QueueMember,
  Ticket,
  Comment,
  TicketStats,
  AuthStatus,
  CategoriesResponse,
  UserQueueSettings,
  UrgentTicketsResponse,
} from '../../types';

export const mockUser: User = {
  id: 1,
  username: 'jdoe',
  display_name: 'Jane Doe',
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z',
};

export const mockUser2: User = {
  id: 2,
  username: 'bsmith',
  display_name: 'Bob Smith',
  avatar_url: null,
  created_at: '2025-01-02T00:00:00Z',
};

export const mockQueue: Queue = {
  id: 10,
  name: 'Infra',
  description: 'Infrastructure queue',
  icon_url: null,
  discord_guild_id: null,
  member_max_severity: 'SEV3',
  member_count: 5,
  my_role: 'OWNER',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockMember: QueueMember = {
  id: 100,
  user: mockUser,
  role: 'OWNER',
  joined_at: '2025-01-01T00:00:00Z',
};

export const mockMember2: QueueMember = {
  id: 101,
  user: mockUser2,
  role: 'MEMBER',
  joined_at: '2025-01-02T00:00:00Z',
};

export const mockTicket: Ticket = {
  id: 42,
  title: 'Fix production outage',
  description: 'Database connections exhausted',
  priority: 'SEV1',
  status: 'OPEN',
  queue_id: 10,
  assignee: mockUser,
  assigner: mockUser2,
  on_behalf_of: null,
  due_date: null,
  category: null,
  type: null,
  item: null,
  created_at: '2025-06-01T12:00:00Z',
  updated_at: '2025-06-01T12:00:00Z',
  comment_count: 3,
  next_escalation_at: null,
  next_page_at: null,
  escalation_paused: false,
  page_acknowledged: false,
};

export const mockTicketOverdue: Ticket = {
  ...mockTicket,
  id: 43,
  title: 'Overdue task',
  due_date: '2024-01-01T00:00:00Z',
  status: 'IN_PROGRESS',
  queue_name: 'Infra',
};

export const mockTicketDueSoon: Ticket = {
  ...mockTicket,
  id: 44,
  title: 'Due soon task',
  due_date: new Date(Date.now() + 86400000).toISOString(),
  status: 'OPEN',
  queue_name: 'Frontend',
};

export const mockUrgentResponse: UrgentTicketsResponse = {
  overdue: [mockTicketOverdue],
  due_soon: [mockTicketDueSoon],
  overdue_count: 1,
  due_soon_count: 1,
};

export const mockUrgentResponseEmpty: UrgentTicketsResponse = {
  overdue: [],
  due_soon: [],
  overdue_count: 0,
  due_soon_count: 0,
};

export const mockComment: Comment = {
  id: 200,
  ticket_id: 42,
  user: mockUser,
  on_behalf_of: null,
  content: 'Working on this now',
  created_at: '2025-06-01T13:00:00Z',
  updated_at: null,
};

export const mockComment2: Comment = {
  id: 201,
  ticket_id: 42,
  user: mockUser2,
  on_behalf_of: null,
  content: 'Any updates?',
  created_at: '2025-06-01T14:00:00Z',
  updated_at: null,
};

export const mockStats: TicketStats = {
  open_count: 5,
  in_progress_count: 3,
  blocked_count: 1,
  completed_count: 12,
  overdue_count: 2,
  total: 23,
};

export const mockAuthStatus: AuthStatus = {
  authenticated: true,
  user: mockUser,
  dev_mode: false,
  discord_client_id: 'test-client-id',
};

export const mockCategories: CategoriesResponse = {
  categories: ['Backend', 'Frontend'],
  types: ['Bug', 'Feature'],
  items: ['API', 'UI'],
};

export const mockUserQueueSettings: UserQueueSettings = {
  id: 1,
  user_id: 1,
  queue_id: 10,
  schedule: {
    monday: {start: '09:00', end: '17:00'},
    tuesday: {start: '09:00', end: '17:00'},
    wednesday: {start: '09:00', end: '17:00'},
    thursday: {start: '09:00', end: '17:00'},
    friday: {start: '09:00', end: '17:00'},
    saturday: null,
    sunday: null,
  },
  timezone: 'America/New_York',
  sev1_off_hours_opt_out: false,
};
