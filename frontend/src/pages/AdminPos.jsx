import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PosCard from '../components/PosCard';
import useAuthStore from '../store/authStore';
import {
  getActiveSession,
  getSessionSummary,
  openSession,
} from '../services/sessionService';

function getDisplayName(user) {
  return user?.name || 'Admin';
}

function getPosName(user) {
  if (!user?.posId) return 'Main POS';
  return `POS ${String(user.posId).slice(0, 8).toUpperCase()}`;
}

export default function AdminPos() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [session, setSession] = useState(null);
  const [lastClosingSale, setLastClosingSale] = useState(0);

  const isActive = session?.status === 'active';

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setLoading(true);
      try {
        const current = await getActiveSession();
        if (!mounted) return;

        setSession(current);

        if (current?.id) {
          try {
            const summary = await getSessionSummary(current.id);
            if (mounted) {
              setLastClosingSale(summary?.summary?.revenue || 0);
            }
          } catch {
            if (mounted) setLastClosingSale(0);
          }
        } else {
          setLastClosingSale(0);
        }
      } catch (error) {
        if (!mounted) return;
        toast.error(error?.response?.data?.error || 'Failed to load POS dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const onOpenSession = async () => {
    setOpening(true);
    try {
      const created = await openSession({ notes: 'Opened from admin POS view' });
      setSession(created);
      setLastClosingSale(0);
      toast.success('Session opened successfully');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to open session');
    } finally {
      setOpening(false);
    }
  };

  const stats = useMemo(() => {
    if (!session) {
      return {
        headline: 'POS ready to start',
        text: 'No active session. Open a session to begin operations.',
      };
    }

    if (isActive) {
      return {
        headline: 'Session is running',
        text: 'This POS is active. Analytics and real-time details continue updating in admin views.',
      };
    }

    return {
      headline: 'Last shift closed',
      text: 'Open a new session when your team is ready.',
    };
  }, [session, isActive]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin POS</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Operational POS</h1>
              <p className="mt-1 text-sm text-slate-500">Signed in as {getDisplayName(user)}. Manage POS session while staying in admin UI.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Console</Link>
              <Link to="/admin/analytics" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Analytics</Link>
              <Link to="/admin/realtime-orders" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Real-time Orders</Link>
              <Link to="/admin/floors-tables" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Floors & Tables</Link>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  navigate('/admin/login', { replace: true });
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <p className="mt-3 text-sm text-slate-500">Loading POS session...</p>
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{stats.headline}</h2>
              <p className="mt-2 text-slate-600">{stats.text}</p>
            </section>

            <PosCard
              posName={getPosName(user)}
              lastOpenDate={session?.opened_at}
              lastClosingSale={lastClosingSale}
              isActive={isActive}
              session={session}
              opening={opening}
              onOpenSession={onOpenSession}
            />
          </>
        )}
      </section>
    </main>
  );
}
