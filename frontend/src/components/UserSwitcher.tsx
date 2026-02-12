import type { User } from "../types";

interface Props {
  users: User[];
  currentUserId: number;
  onChange: (id: number) => void;
}

export default function UserSwitcher({ users, currentUserId, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-stone-400 text-sm tracking-wide">Viewing as</span>
      <select
        value={currentUserId}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-stone-800 text-stone-100 border border-stone-600 rounded-lg px-3 py-1.5 text-sm font-medium cursor-pointer hover:border-stone-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent appearance-none pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
