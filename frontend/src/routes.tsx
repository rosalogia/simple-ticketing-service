import { useParams, useNavigate, Outlet } from "react-router-dom";
import type { User, Queue } from "./types";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import TicketDetail from "./components/TicketDetail";
import QueueSettings from "./components/QueueSettings";

// ── Layout Wrapper ──────────────────────────────────────────────────

interface LayoutWrapperProps {
  user: User | null;
  devMode: boolean;
  users: User[];
  currentUserId: number;
  onUserChange: (id: number) => void;
  onLogout: () => void;
  queues: Queue[];
}

export function LayoutWrapper({
  user,
  devMode,
  users,
  currentUserId,
  onUserChange,
  onLogout,
  queues,
}: LayoutWrapperProps) {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const currentQueue = queueId
    ? queues.find((q) => q.id === Number(queueId)) ?? null
    : null;

  return (
    <Layout
      user={user}
      devMode={devMode}
      users={users}
      currentUserId={currentUserId}
      onUserChange={onUserChange}
      onLogout={onLogout}
      currentQueue={currentQueue}
      queues={queues}
      onSwitchQueue={(id) => navigate(`/queues/${id}`)}
      onShowQueues={() => navigate("/queues")}
      onShowSettings={() =>
        queueId ? navigate(`/queues/${queueId}/settings`) : undefined
      }
    >
      <Outlet />
    </Layout>
  );
}

// ── Route Wrappers ──────────────────────────────────────────────────

interface RouteProps {
  currentUserId: number;
  users: User[];
}

export function DashboardRoute({ currentUserId, users }: RouteProps) {
  const { queueId } = useParams();
  const navigate = useNavigate();

  if (!queueId) return null;

  return (
    <Dashboard
      currentUserId={currentUserId}
      queueId={Number(queueId)}
      users={users}
      onSelectTicket={(id) => navigate(`/queues/${queueId}/tickets/${id}`)}
    />
  );
}

export function TicketDetailRoute({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const { queueId, ticketId } = useParams();
  const navigate = useNavigate();

  if (!ticketId) return null;

  return (
    <TicketDetail
      ticketId={Number(ticketId)}
      currentUserId={currentUserId}
      onBack={() => navigate(`/queues/${queueId}`)}
    />
  );
}

export function QueueSettingsRoute({
  currentUserId,
  onDeleted,
  onUpdated,
}: {
  currentUserId: number;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const { queueId } = useParams();
  const navigate = useNavigate();

  if (!queueId) return null;

  return (
    <QueueSettings
      queueId={Number(queueId)}
      currentUserId={currentUserId}
      onBack={() => navigate(`/queues/${queueId}`)}
      onDeleted={onDeleted}
      onUpdated={onUpdated}
    />
  );
}
