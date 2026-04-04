import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import PosCard from "../components/PosCard";
import useAuthStore from "../store/authStore";
import {
  getActiveSession,
  getSessionSummary,
  openSession,
} from "../services/sessionService";

function getDisplayName(user) {
  return user?.name || "Team Member";
}

function getPosName(user) {
  if (!user?.posId) return "Main POS";
  return `POS ${String(user.posId).slice(0, 8).toUpperCase()}`;
}

export default function PosHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [session, setSession] = useState(null);
  const [lastClosingSale, setLastClosingSale] = useState(0);

  const isActive = session?.status === "active";

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
        toast.error(
          error?.response?.data?.error || "Failed to load session dashboard",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const onLogout = () => {
    clearAuth();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  const onOpenSession = async () => {
    setOpening(true);
    try {
      const created = await openSession({ notes: "Opened from POS dashboard" });
      setSession(created);
      setLastClosingSale(0);
      toast.success("Session opened successfully");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to open session");
    } finally {
      setOpening(false);
    }
  };

  const stats = useMemo(() => {
    if (!session) {
      return {
        headline: "Ready to begin",
        text: "No active session. Open one to start processing orders.",
      };
    }

    if (isActive) {
      return {
        headline: "Session is running",
        text: "Orders, products, and kitchen updates are now live for this POS.",
      };
    }

    return {
      headline: "Last shift closed",
      text: "You can start a new session whenever your team is ready.",
    };
  }, [session, isActive]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        posName={getPosName(user)}
        userName={getDisplayName(user)}
        onLogout={onLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <p className="mt-3 text-sm text-slate-500">
              Loading session dashboard...
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">
                {stats.headline}
              </h1>
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
      </main>
    </div>
  );
}
