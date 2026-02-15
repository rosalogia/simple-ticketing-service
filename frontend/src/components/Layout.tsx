import type { ReactNode } from "react";
import type { User, Queue } from "../types";
import UserSwitcher from "./UserSwitcher";
import UserProfileMenu from "./UserProfileMenu";

interface Props {
  user: User | null;
  devMode: boolean;
  users: User[];
  currentUserId: number;
  onUserChange: (id: number) => void;
  onLogout: () => void;
  currentQueue: Queue | null;
  queues: Queue[];
  onSwitchQueue: (id: number) => void;
  onShowQueues: () => void;
  onShowSettings: () => void;
  children: ReactNode;
}

export default function Layout({
  user,
  devMode,
  users,
  currentUserId,
  onUserChange,
  onLogout,
  currentQueue,
  queues,
  onSwitchQueue,
  onShowQueues,
  onShowSettings,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onShowQueues}
              className="text-lg font-bold tracking-tight text-stone-100 hover:text-white transition-colors flex-shrink-0"
            >
              STS
            </button>

            {/* Queue switcher */}
            {currentQueue && (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="text-stone-600 flex-shrink-0">/</span>
                {queues.length > 1 ? (
                  <select
                    value={currentQueue.id}
                    onChange={(e) => onSwitchQueue(Number(e.target.value))}
                    className="bg-stone-800 text-stone-100 border border-stone-600 rounded-lg px-2 sm:px-2.5 py-1 text-sm font-medium cursor-pointer hover:border-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none pr-7 min-w-0 max-w-[140px] sm:max-w-none truncate"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-stone-300 text-sm font-medium truncate">
                    {currentQueue.name}
                  </span>
                )}

                {/* Settings gear (OWNER only) */}
                {currentQueue.my_role === "OWNER" && (
                  <button
                    onClick={onShowSettings}
                    className="text-stone-500 hover:text-stone-300 transition-colors p-1 flex-shrink-0"
                    title="Queue Settings"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {!currentQueue && (
              <span className="text-stone-600 text-xs font-mono tracking-wider uppercase hidden sm:inline">
                Tickets
              </span>
            )}
          </div>
          {devMode ? (
            <UserSwitcher
              users={users}
              currentUserId={currentUserId}
              onChange={onUserChange}
            />
          ) : user ? (
            <UserProfileMenu user={user} onLogout={onLogout} />
          ) : null}
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6">{children}</main>
    </div>
  );
}
