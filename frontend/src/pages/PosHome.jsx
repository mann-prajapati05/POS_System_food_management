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

        if (current?.status === "active") {
          navigate("/pos/terminal", { replace: true });
          return;
        }

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
  }, [navigate]);

  const onLogout = () => {
    clearAuth();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  const onOpenSession = async () => {
    setOpening(true);
    try {
      const current = await getActiveSession();
      if (current?.status === "active") {
        setSession(current);
        toast.success("Active session found. Entering current session.");
        navigate("/pos/terminal", { replace: true });
        return;
      }

      const created = await openSession({ notes: "Opened from POS dashboard" });
      setSession(created);
      setLastClosingSale(0);
      toast.success("New session created.");
      navigate("/pos/terminal", { replace: true });
    } catch (error) {
      if (error?.response?.status === 409 && error?.response?.data?.session) {
        setSession(error.response.data.session);
        toast.success("Active session already exists. Entering current session.");
        navigate("/pos/terminal", { replace: true });
        return;
      }
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
    <div className="min-h-screen bg-linen-bg animate-fade-in">
      <Navbar
        posName={getPosName(user)}
        userName={getDisplayName(user)}
        onLogout={onLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid place-items-center rounded-linen-lg border border-linen-border bg-white p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-linen-border border-t-linen-primary" />
            <p className="mt-3 text-sm text-linen-text-secondary">
              Loading session dashboard...
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-linen-lg border border-linen-border bg-white p-6">
              <h1 className="text-xl font-semibold text-linen-text-primary">
                {stats.headline}
              </h1>
              <p className="mt-2 text-sm text-linen-text-secondary">{stats.text}</p>
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
