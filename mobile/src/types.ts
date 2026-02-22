export type TicketPriority = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';
export type QueueRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
  dev_mode: boolean;
  discord_client_id: string | null;
}

export interface Queue {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  discord_guild_id: string | null;
  member_max_severity: TicketPriority;
  member_count: number;
  my_role: QueueRole | null;
  created_at: string;
}

export interface QueueMember {
  id: number;
  user: User;
  role: QueueRole;
  joined_at: string;
}

export interface DiscordServerInfo {
  guild_id: string;
  name: string;
  icon_url: string | null;
  member_count: number | null;
  bot_present: boolean;
}

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  queue_id: number;
  assignee: User;
  assigner: User;
  on_behalf_of: User | null;
  due_date: string | null;
  category: string | null;
  type: string | null;
  item: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  next_escalation_at: string | null;
  next_page_at: string | null;
  escalation_paused: boolean;
  page_acknowledged: boolean;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user: User;
  on_behalf_of: User | null;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface TicketStats {
  open_count: number;
  in_progress_count: number;
  blocked_count: number;
  completed_count: number;
  overdue_count: number;
  total: number;
}

export interface CategoriesResponse {
  categories: string[];
  types: string[];
  items: string[];
}

export type DaySchedule = { start: string; end: string } | null;
export type WeekSchedule = Record<string, DaySchedule>;

export interface UserQueueSettings {
  id: number;
  user_id: number;
  queue_id: number;
  schedule: WeekSchedule;
  timezone: string;
  sev1_off_hours_opt_out: boolean;
}

export interface QueueInvite {
  id: number;
  queue: Queue;
  role: QueueRole;
  invited_by: User;
  created_at: string;
}

export interface TicketFilters {
  queue_id?: number;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  assignee_id?: number;
  assigner_id?: number;
  search?: string;
  due_before?: string;
  due_after?: string;
  category?: string;
  type?: string;
  item?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}
