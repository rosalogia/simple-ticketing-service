import { Link } from "react-router-dom";

interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center animate-[fadeIn_0.4s_ease-out]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink mb-1">
            STS
          </h1>
          <p className="text-stone-500 text-sm font-mono tracking-wider uppercase">
            Collaborative Tickets
          </p>
        </div>
        <p className="text-stone-600 mb-8 max-w-xs mx-auto leading-relaxed">
          Sign in with your Discord account to start creating and managing
          tickets with your friends.
        </p>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-3 px-6 py-3 bg-[#5865F2] text-white rounded-lg font-medium hover:bg-[#4752C4] active:bg-[#3C45A5] transition-colors shadow-sm cursor-pointer"
        >
          <svg width="20" height="15" viewBox="0 0 71 55" fill="none">
            <path
              d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 01.2 0c11.6 5.3 24.1 5.3 35.5 0a.2.2 0 01.3 0l1 .9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.6.2.2 0 00-.1.4 47.1 47.1 0 003.7 5.8.2.2 0 00.2.1 58.5 58.5 0 0017.7-9v-.1c1.4-15-2.3-28.4-9.8-40.1a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7zm23.3 0c-3.5 0-6.3-3.2-6.3-7s2.8-7 6.3-7 6.4 3.2 6.3 7-2.8 7-6.3 7z"
              fill="currentColor"
            />
          </svg>
          Sign in with Discord
        </button>
        <div className="mt-6">
          <Link
            to="/docs"
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
          >
            Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
