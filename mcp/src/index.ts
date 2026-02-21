import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StsClient } from "./client.js";

const STS_API_URL = process.env.STS_API_URL;
const STS_API_KEY = process.env.STS_API_KEY;

if (!STS_API_URL || !STS_API_KEY) {
  console.error("STS_API_URL and STS_API_KEY environment variables are required");
  process.exit(1);
}

const client = new StsClient(STS_API_URL, STS_API_KEY);

// Resolved at startup — the "Claude" bot user ID for ticket attribution
let botUserId: number | undefined;

const server = new McpServer({
  name: "sts",
  version: "0.1.0",
});

// ── list_queues ───────────────────────────────────────────────────────

server.tool("list_queues", "List queues the authenticated user is a member of", {}, async () => {
  const queues = await client.listQueues();
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(queues, null, 2),
      },
    ],
  };
});

// ── get_queue_members ─────────────────────────────────────────────────

server.tool(
  "get_queue_members",
  "List members of a queue",
  { queue_id: z.number().describe("Queue ID") },
  async ({ queue_id }) => {
    const members = await client.getQueueMembers(queue_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(members, null, 2),
        },
      ],
    };
  }
);

// ── list_tickets ──────────────────────────────────────────────────────

server.tool(
  "list_tickets",
  "Search and filter tickets in a queue",
  {
    queue_id: z.number().describe("Queue ID"),
    status: z
      .array(z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]))
      .optional()
      .describe("Filter by status(es)"),
    priority: z
      .array(z.enum(["SEV1", "SEV2", "SEV3", "SEV4"]))
      .optional()
      .describe("Filter by priority(ies)"),
    assignee_id: z.number().optional().describe("Filter by assignee user ID"),
    search: z.string().optional().describe("Search in title and description"),
    sort_by: z
      .enum(["created_at", "updated_at", "due_date", "title", "priority"])
      .optional()
      .describe("Sort field"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
    limit: z.number().optional().describe("Max results (default 50, max 100)"),
  },
  async (params) => {
    const result = await client.listTickets(params);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ── get_ticket ────────────────────────────────────────────────────────

server.tool(
  "get_ticket",
  "Get full ticket details including escalation/page info",
  { ticket_id: z.number().describe("Ticket ID") },
  async ({ ticket_id }) => {
    const ticket = await client.getTicket(ticket_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ticket, null, 2),
        },
      ],
    };
  }
);

// ── create_ticket ─────────────────────────────────────────────────────

server.tool(
  "create_ticket",
  "Create a new ticket in a queue",
  {
    queue_id: z.number().describe("Queue ID"),
    title: z.string().describe("Ticket title"),
    assignee_id: z.number().describe("User ID to assign the ticket to"),
    priority: z
      .enum(["SEV1", "SEV2", "SEV3", "SEV4"])
      .optional()
      .describe("Priority (default SEV3)"),
    description: z.string().optional().describe("Ticket description"),
    due_date: z
      .string()
      .optional()
      .describe("Due date in YYYY-MM-DD format"),
    category: z.string().optional().describe("Category"),
    type: z.string().optional().describe("Type"),
    item: z.string().optional().describe("Item"),
  },
  async (params) => {
    const ticket = await client.createTicket({
      ...params,
      ...(botUserId !== undefined ? { on_behalf_of: botUserId } : {}),
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ticket, null, 2),
        },
      ],
    };
  }
);

// ── update_ticket ─────────────────────────────────────────────────────

server.tool(
  "update_ticket",
  "Update fields on an existing ticket",
  {
    ticket_id: z.number().describe("Ticket ID"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    assignee_id: z.number().optional().describe("New assignee user ID"),
    priority: z
      .enum(["SEV1", "SEV2", "SEV3", "SEV4"])
      .optional()
      .describe("New priority"),
    status: z
      .enum(["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"])
      .optional()
      .describe("New status"),
    due_date: z
      .string()
      .optional()
      .describe("New due date (YYYY-MM-DD)"),
    category: z.string().optional().describe("New category"),
    type: z.string().optional().describe("New type"),
    item: z.string().optional().describe("New item"),
  },
  async ({ ticket_id, ...updates }) => {
    const ticket = await client.updateTicket(ticket_id, updates);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ticket, null, 2),
        },
      ],
    };
  }
);

// ── get_comments ──────────────────────────────────────────────────────

server.tool(
  "get_comments",
  "Get comments on a ticket",
  { ticket_id: z.number().describe("Ticket ID") },
  async ({ ticket_id }) => {
    const comments = await client.getComments(ticket_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(comments, null, 2),
        },
      ],
    };
  }
);

// ── add_comment ───────────────────────────────────────────────────────

server.tool(
  "add_comment",
  "Add a comment to a ticket",
  {
    ticket_id: z.number().describe("Ticket ID"),
    content: z.string().describe("Comment text"),
  },
  async ({ ticket_id, content }) => {
    const comment = await client.addComment(ticket_id, content, botUserId);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(comment, null, 2),
        },
      ],
    };
  }
);

// ── get_ticket_stats ──────────────────────────────────────────────────

server.tool(
  "get_ticket_stats",
  "Get ticket statistics for a queue",
  { queue_id: z.number().describe("Queue ID") },
  async ({ queue_id }) => {
    const stats = await client.getTicketStats(queue_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }
);

// ── get_categories ────────────────────────────────────────────────────

server.tool(
  "get_categories",
  "Get CTI (category/type/item) autocomplete values for a queue",
  { queue_id: z.number().describe("Queue ID") },
  async ({ queue_id }) => {
    const categories = await client.getCategories(queue_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(categories, null, 2),
        },
      ],
    };
  }
);

// ── Start server ──────────────────────────────────────────────────────

async function main() {
  // Discover the Claude bot user for ticket attribution
  try {
    const users = await client.listUsers();
    const bot = users.find((u) => u.username === "claude-bot");
    if (bot) {
      botUserId = bot.id;
      console.error(`[sts] Using bot user: ${bot.display_name} (id=${bot.id})`);
    } else {
      console.error("[sts] Warning: claude-bot user not found, tickets will be attributed to API key owner");
    }
  } catch (err) {
    console.error("[sts] Warning: could not look up bot user:", err);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
