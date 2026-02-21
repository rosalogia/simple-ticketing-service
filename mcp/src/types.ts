export type TicketPriority = "SEV1" | "SEV2" | "SEV3" | "SEV4";
export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";
export type QueueRole = "OWNER" | "MEMBER" | "VIEWER";

export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
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

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  queue_id: number;
  assignee: User;
  assigner: User;
  due_date: string | null;
  category: string | null;
  type: string | null;
  item: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
}

export interface Comment {
  id: number;
  ticket_id: number;
  user: User;
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
