import { useState, useEffect, useCallback } from "react";
import type { User, Queue } from "./types";
import { api, queueApi, setDevModeUserId } from "./api/client";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import TicketDetail from "./components/TicketDetail";
import LoginPage from "./components/LoginPage";
import QueueList from "./components/QueueList";
import CreateQueue from "./components/CreateQueue";
import QueueSettings from "./components/QueueSettings";

type View = "queue-list" | "dashboard" | "ticket-detail" | "queue-settings" | "create-queue";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, devMode, loading, login, logout, switchDevUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [currentQueueId, setCurrentQueueId] = useState<number | null>(null);
  const [view, setView] = useState<View>("queue-list");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
      // Auto-select if exactly 1 queue
      if (q.length === 1 && !currentQueueId) {
        setCurrentQueueId(q[0].id);
        setView("dashboard");
      } else if (q.length === 0 || !currentQueueId) {
        setView("queue-list");
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentQueueId]);

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

  const handleUserChange = useCallback(
    (id: number) => {
      switchDevUser(id);
      setView("queue-list");
      setCurrentQueueId(null);
      setSelectedTicketId(null);
      setQueues([]);
    },
    [switchDevUser]
  );

  const handleSelectQueue = useCallback((id: number) => {
    setCurrentQueueId(id);
    setView("dashboard");
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectTicket = useCallback((id: number) => {
    setSelectedTicketId(id);
    setView("ticket-detail");
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setView("dashboard");
    setSelectedTicketId(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleShowQueues = useCallback(() => {
    setView("queue-list");
  }, []);

  const handleShowSettings = useCallback(() => {
    setView("queue-settings");
  }, []);

  const handleShowCreateQueue = useCallback(() => {
    setView("create-queue");
  }, []);

  const handleQueueCreated = useCallback((queueId: number) => {
    setCurrentQueueId(queueId);
    setView("dashboard");
    loadQueues();
  }, [loadQueues]);

  const handleQueueDeleted = useCallback(() => {
    setCurrentQueueId(null);
    setView("queue-list");
    loadQueues();
  }, [loadQueues]);

  const handleQueueUpdated = useCallback(() => {
    loadQueues();
  }, [loadQueues]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Not authenticated and not dev mode: show login
  if (!user && !devMode) {
    return <LoginPage onLogin={login} />;
  }

  const currentUserId = user?.id ?? 0;
  const currentQueue = queues.find((q) => q.id === currentQueueId) ?? null;

  return (
    <Layout
      user={user}
      devMode={devMode}
      users={users}
      currentUserId={currentUserId}
      onUserChange={handleUserChange}
      onLogout={logout}
      currentQueue={currentQueue}
      queues={queues}
      onSwitchQueue={handleSelectQueue}
      onShowQueues={handleShowQueues}
      onShowSettings={handleShowSettings}
    >
      {view === "queue-list" && (
        <QueueList
          queues={queues}
          onSelectQueue={handleSelectQueue}
          onCreateQueue={handleShowCreateQueue}
        />
      )}
      {view === "create-queue" && (
        <CreateQueue
          devMode={devMode}
          onCreated={handleQueueCreated}
          onCancel={handleShowQueues}
        />
      )}
      {view === "dashboard" && currentQueueId && (
        <Dashboard
          key={`${refreshKey}-${currentQueueId}`}
          currentUserId={currentUserId}
          queueId={currentQueueId}
          users={users}
          onSelectTicket={handleSelectTicket}
        />
      )}
      {view === "ticket-detail" && selectedTicketId !== null && (
        <TicketDetail
          ticketId={selectedTicketId}
          currentUserId={currentUserId}
          users={users}
          onBack={handleBackToDashboard}
        />
      )}
      {view === "queue-settings" && currentQueueId && (
        <QueueSettings
          queueId={currentQueueId}
          currentUserId={currentUserId}
          onBack={handleBackToDashboard}
          onDeleted={handleQueueDeleted}
          onUpdated={handleQueueUpdated}
        />
      )}
    </Layout>
  );
}
