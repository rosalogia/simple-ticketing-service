import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import type { User, Queue } from "./types";
import { api, queueApi, setDevModeUserId } from "./api/client";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import DocsLayout from "./components/docs/DocsLayout";
import LoginPage from "./components/LoginPage";
import QueueList from "./components/QueueList";
import CreateQueue from "./components/CreateQueue";
import ApiKeysPage from "./components/ApiKeysPage";
import {
  LayoutWrapper,
  DashboardRoute,
  TicketDetailRoute,
  QueueSettingsRoute,
  PerformanceDashboardRoute,
} from "./routes";

export default function App() {
  return (
    <Routes>
      <Route path="/docs" element={<DocsLayout />} />
      <Route path="/docs/:section" element={<DocsLayout />} />
      <Route
        path="*"
        element={
          <AuthProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AuthProvider>
        }
      />
    </Routes>
  );
}

function AppContent() {
  const { user, devMode, loading, switchDevUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // In dev mode, auto-select first user if none selected
  useEffect(() => {
    if (devMode && !user && users.length > 0) {
      setDevModeUserId(users[0].id);
      switchDevUser(users[0].id);
    }
  }, [devMode, user, users, switchDevUser]);

  const loadQueues = useCallback(async () => {
    try {
      const q = await queueApi.getQueues();
      setQueues(q);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch user list (needed for dev mode switcher before a user is selected)
  useEffect(() => {
    if (user || devMode) {
      api.getUsers().then(setUsers).catch(console.error);
    }
  }, [user, devMode]);

  // Fetch queues only after a user is authenticated
  useEffect(() => {
    if (user) {
      loadQueues();
    }
  }, [user, loadQueues]);

  // Auto-redirect: if exactly 1 queue and on /queues list, go to that queue
  useEffect(() => {
    if (queues.length === 1 && location.pathname === "/queues") {
      navigate(`/queues/${queues[0].id}`, { replace: true });
    }
  }, [queues, location.pathname, navigate]);

  const handleUserChange = useCallback(
    (id: number) => {
      switchDevUser(id);
      setQueues([]);
      navigate("/queues");
    },
    [switchDevUser, navigate]
  );

  const handleLogout = useAuth().logout;

  const handleQueueDeleted = useCallback(() => {
    loadQueues();
    navigate("/queues");
  }, [loadQueues, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Not authenticated and not dev mode: show login
  if (!user && !devMode) {
    return <LoginPage onLogin={useAuth().login} />;
  }

  const currentUserId = user?.id ?? 0;

  return (
    <Routes>
      <Route
        element={
          <LayoutWrapper
            user={user}
            devMode={devMode}
            users={users}
            currentUserId={currentUserId}
            onUserChange={handleUserChange}
            onLogout={handleLogout}
            queues={queues}
            onInviteAccepted={loadQueues}
          />
        }
      >
        <Route
          path="/queues"
          element={
            <QueueList
              queues={queues}
              onSelectQueue={(id) => navigate(`/queues/${id}`)}
              onCreateQueue={() => navigate("/queues/new")}
            />
          }
        />
        <Route
          path="/queues/new"
          element={
            <CreateQueue
              devMode={devMode}
              onCreated={(queueId) => {
                loadQueues();
                navigate(`/queues/${queueId}`);
              }}
              onCancel={() => navigate("/queues")}
            />
          }
        />
        <Route
          path="/queues/:queueId"
          element={
            <DashboardRoute currentUserId={currentUserId} users={users} />
          }
        />
        <Route
          path="/queues/:queueId/tickets/:ticketId"
          element={<TicketDetailRoute currentUserId={currentUserId} />}
        />
        <Route
          path="/queues/:queueId/settings"
          element={
            <QueueSettingsRoute
              currentUserId={currentUserId}
              onDeleted={handleQueueDeleted}
              onUpdated={loadQueues}
            />
          }
        />
        <Route
          path="/queues/:queueId/performance/:userId"
          element={
            <PerformanceDashboardRoute />
          }
        />
        <Route
          path="/settings/api-keys"
          element={
            <ApiKeysPage currentUserId={currentUserId} onBack={() => navigate(-1)} />
          }
        />
        <Route path="*" element={<Navigate to="/queues" replace />} />
      </Route>
    </Routes>
  );
}
