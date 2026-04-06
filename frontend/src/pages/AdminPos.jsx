import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PosCard from "../components/PosCard";
import useAuthStore from "../store/authStore";
import { ADMIN_POS_CONTEXT_KEY } from "../services/api";
import {
  deletePos,
  getAdminActiveSession,
  getAdminSessionSummary,
  listPos,
  openAdminSession,
  updatePos,
} from "../services/adminService";

function getDisplayName(user) {
  return user?.name || "Admin";
}

const btnNav =
  "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";
const selectClass =
  "h-9 rounded-linen border border-linen-border bg-white px-3 text-[13px] text-linen-text-primary outline-none transition-colors focus:border-linen-primary";

export default function AdminPos() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [session, setSession] = useState(null);
  const [lastClosingSale, setLastClosingSale] = useState(0);
  const [posList, setPosList] = useState([]);
  const [selectedPosId, setSelectedPosId] = useState("");
  const [posNameDraft, setPosNameDraft] = useState("");
  const [savingPosName, setSavingPosName] = useState(false);
  const [deletingPos, setDeletingPos] = useState(false);

  const isActive = session?.status === "active";

  const selectedPos = useMemo(
    () => posList.find((pos) => pos.id === selectedPosId) || null,
    [posList, selectedPosId],
  );

  useEffect(() => {
    setPosNameDraft(selectedPos?.name || "");
  }, [selectedPos?.id, selectedPos?.name]);

  const loadSessionForPos = async (posId) => {
    if (!posId) {
      setSession(null);
      setLastClosingSale(0);
      return;
    }

    const current = await getAdminActiveSession(posId);
    setSession(current);

    if (current?.id) {
      try {
        const summary = await getAdminSessionSummary(current.id, { posId });
        setLastClosingSale(summary?.summary?.revenue || 0);
      } catch {
        setLastClosingSale(0);
      }
    } else {
      setLastClosingSale(0);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      setLoading(true);
      try {
        const posData = await listPos();
        if (!mounted) return;

        setPosList(posData);
        const defaultPosId =
          user?.posId && posData.some((pos) => pos.id === user.posId)
            ? user.posId
            : posData[0]?.id || "";
        setSelectedPosId(defaultPosId);
        if (defaultPosId) {
          localStorage.setItem(ADMIN_POS_CONTEXT_KEY, defaultPosId);
        }

        await loadSessionForPos(defaultPosId);
      } catch (error) {
        if (!mounted) return;
        toast.error(
          error?.response?.data?.error || "Failed to load POS dashboard",
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

  const onOpenSession = async () => {
    if (!selectedPosId) {
      toast.error("Select POS first");
      return;
    }

    setOpening(true);
    try {
      const created = await openAdminSession({
        posId: selectedPosId,
        notes: "Opened from admin POS view",
      });
      setSession(created);
      setLastClosingSale(0);
      toast.success("Session opened successfully");
    } catch (error) {
      if (error?.response?.status === 409 && error?.response?.data?.session) {
        setSession(error.response.data.session);
        toast.success(
          "Session already active. You can enter Staff or Kitchen view.",
        );
        return;
      }
      toast.error(error?.response?.data?.error || "Unable to open session");
    } finally {
      setOpening(false);
    }
  };

  const onSelectPos = async (posId) => {
    setSelectedPosId(posId);
    if (posId) {
      localStorage.setItem(ADMIN_POS_CONTEXT_KEY, posId);
    } else {
      localStorage.removeItem(ADMIN_POS_CONTEXT_KEY);
    }
    setLoading(true);
    try {
      await loadSessionForPos(posId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load POS session");
    } finally {
      setLoading(false);
    }
  };

  const onRenamePos = async () => {
    if (!selectedPosId) {
      toast.error("Select POS first");
      return;
    }

    const nextName = String(posNameDraft || "").trim();
    if (!nextName) {
      toast.error("POS name is required");
      return;
    }

    setSavingPosName(true);
    try {
      const updated = await updatePos(selectedPosId, { name: nextName });
      setPosList((prev) =>
        prev.map((pos) =>
          pos.id === updated.id ? { ...pos, ...updated } : pos,
        ),
      );
      toast.success("POS name updated");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update POS");
    } finally {
      setSavingPosName(false);
    }
  };

  const onDeletePos = async () => {
    if (!selectedPosId) {
      toast.error("Select POS first");
      return;
    }

    const enteredSecret = window.prompt(
      "Enter admin secret code to delete this POS:",
    );
    if (enteredSecret === null) {
      return;
    }

    const secretCode = String(enteredSecret).trim();
    if (!secretCode) {
      toast.error("Secret code is required");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure? This will permanently delete this POS and all its data. This cannot be undone.",
    );
    if (!confirmed) return;

    setDeletingPos(true);
    try {
      await deletePos(selectedPosId, secretCode);
      const nextPosList = await listPos();
      setPosList(nextPosList);
      const nextPosId = nextPosList[0]?.id || "";
      setSelectedPosId(nextPosId);
      if (nextPosId) {
        localStorage.setItem(ADMIN_POS_CONTEXT_KEY, nextPosId);
      } else {
        localStorage.removeItem(ADMIN_POS_CONTEXT_KEY);
      }
      await loadSessionForPos(nextPosId);
      toast.success("POS deleted successfully");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete POS");
    } finally {
      setDeletingPos(false);
    }
  };

  const stats = useMemo(() => {
    if (!session) {
      return {
        headline: "POS ready to start",
        text: "No active session. Open a session to begin operations.",
      };
    }

    if (isActive) {
      return {
        headline: "Session is running",
        text: "This POS is active. Analytics and real-time details continue updating in admin views.",
      };
    }

    return {
      headline: "Last shift closed",
      text: "Open a new session when your team is ready.",
    };
  }, [session, isActive]);

  return (
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
                Admin POS
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">
                Operational POS
              </h1>
              <p className="mt-1 text-sm text-linen-text-secondary">
                Signed in as {getDisplayName(user)}. Manage POS session while
                staying in admin UI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={btnNav}>
                Console
              </Link>
              <Link to="/admin/analytics" className={btnNav}>
                Analytics
              </Link>
              <Link to="/admin/realtime-orders" className={btnNav}>
                Real-time Orders
              </Link>
              <Link to="/admin/floors-tables" className={btnNav}>
                Floors & Tables
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  navigate("/admin/login", { replace: true });
                }}
                className={btnNav}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid place-items-center rounded-linen-lg border border-linen-border bg-white p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-linen-border border-t-linen-primary" />
            <p className="mt-3 text-sm text-linen-text-secondary">
              Loading POS session...
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-linen-lg border border-linen-border bg-white p-6">
              <h2 className="text-xl font-semibold text-linen-text-primary">
                {stats.headline}
              </h2>
              <p className="mt-2 text-sm text-linen-text-secondary">
                {stats.text}
              </p>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.07em] text-linen-text-muted">
                  POS
                </label>
                <select
                  value={selectedPosId}
                  onChange={(e) => onSelectPos(e.target.value)}
                  className={selectClass}
                >
                  {posList.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={posNameDraft}
                    onChange={(e) => setPosNameDraft(e.target.value)}
                    placeholder="Rename POS"
                    className="h-9 w-64 rounded-linen border border-linen-border bg-white px-3 text-[13px] text-linen-text-primary outline-none transition-colors focus:border-linen-primary"
                  />
                  <button
                    type="button"
                    onClick={onRenamePos}
                    disabled={!selectedPosId || savingPosName}
                    className="h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPosName ? "Saving..." : "Update Name"}
                  </button>
                  <button
                    type="button"
                    onClick={onDeletePos}
                    disabled={!selectedPosId || deletingPos}
                    className="h-9 rounded-linen bg-[#DC2626] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingPos ? "Deleting..." : "Delete POS"}
                  </button>
                </div>
              </div>
            </section>

            <PosCard
              posName={selectedPos?.name || "POS"}
              lastOpenDate={session?.opened_at}
              lastClosingSale={lastClosingSale}
              isActive={isActive}
              session={session}
              opening={opening}
              onOpenSession={onOpenSession}
            />

            <section className="rounded-linen-lg border border-linen-border bg-white p-6">
              <h3 className="text-base font-semibold text-linen-text-primary">
                Session Access
              </h3>
              <p className="mt-1 text-sm text-linen-text-secondary">
                If no active session exists, create one first. If active, choose
                where to enter.
              </p>
              {selectedPos && !selectedPos.is_active && (
                <div className="mt-3 rounded-linen-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3">
                  <p className="text-[13px] font-medium text-[#DC2626]">
                    ⚠️ This POS is inactive. Please activate it from the Admin
                    Console before proceeding.
                  </p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenSession}
                  disabled={opening || !selectedPos?.is_active}
                  className="h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:opacity-70"
                >
                  {opening
                    ? "Checking..."
                    : isActive
                      ? "Use Active Session"
                      : "Create Session"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPosId) {
                      localStorage.setItem(
                        ADMIN_POS_CONTEXT_KEY,
                        selectedPosId,
                      );
                    }
                    navigate(`/pos/terminal?posId=${selectedPosId}`);
                  }}
                  disabled={!isActive || !selectedPos?.is_active}
                  className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enter Staff View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPosId) {
                      localStorage.setItem(
                        ADMIN_POS_CONTEXT_KEY,
                        selectedPosId,
                      );
                    }
                    navigate(`/kitchen?posId=${selectedPosId}`);
                  }}
                  disabled={!isActive || !selectedPos?.is_active}
                  className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enter Kitchen View
                </button>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
