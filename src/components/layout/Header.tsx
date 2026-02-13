import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { Bell, LogOut, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type AuthUser } from '../../services/authApi';

interface HeaderProps {
  title: string;
  lastUpdated: string | null;
}

export function Header({ title, lastUpdated }: HeaderProps): React.JSX.Element {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const user = await authApi.getMe();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
        }
      }
    };

    void loadCurrentUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      setMenuOpen(false);
      setLoggingOut(false);
      navigate('/auth/login', { replace: true });
    }
  };

  const userFullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Current User';
  const userInitials = currentUser
    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()
    : 'U';

  return (
    <header className="z-10 h-[60px] min-h-[60px] shrink-0 border-b border-slate-200 bg-slate-200 px-4 shadow-md sm:px-6">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-linear-to-br from-brand-500 to-brand-700 shadow-card">
            <img src="/assets/logo.webp" alt="PlantTrack logo" className="h-10 w-10 object-cover" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">
              {lastUpdated
                ? `Last sync ${moment(lastUpdated).fromNow()} (${moment(lastUpdated).format('MMM D, YYYY HH:mm')})`
                : 'Waiting for first sync'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-300/70"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-800" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full bg-slate-100 pl-1 pr-3 py-1 transition hover:bg-slate-300/70"
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                {userInitials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold leading-tight text-slate-800">{userFullName}</span>
                <span className="block text-[11px] leading-tight text-slate-500">{currentUser?.email ?? ''}</span>
              </span>
              <UserCircle2 className="h-4 w-4 text-slate-600" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-12 min-w-64 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{userFullName}</p>
                  <p className="text-xs text-slate-600">{currentUser?.email ?? 'Unknown email'}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{currentUser?.role ?? 'user'}</p>
                </div>
                <div className="my-1 border-t border-slate-200" />
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
