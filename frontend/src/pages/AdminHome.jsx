import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import {
  createPos,
  deletePos,
  listPos,
  updatePos,
  togglePosActive,
} from "../services/adminService";

const btnNav =
  "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";

export default function AdminHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [posList, setPosList] = useState([]);
  const [newPosName, setNewPosName] = useState("");
  const [selectedPosId, setSelectedPosId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");

  const loadPos = async () => {
    setLoading(true);
    try {
      const data = await listPos();
      setPosList(data);
      const firstPosId = data[0]?.id || "";
      setSelectedPosId((prev) => prev || firstPosId);
      const selected = data.find(
        (pos) => pos.id === (selectedPosId || firstPosId),
      );
      setRenameDraft(selected?.name || "");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load POS list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPos();
  }, []);

  useEffect(() => {
    if (!selectedPosId) return;
    const selected = posList.find((pos) => pos.id === selectedPosId);
    setRenameDraft(selected?.name || "");
  }, [selectedPosId, posList]);

  const onCreatePos = async (event) => {
    event.preventDefault();
    if (!newPosName.trim()) {
      toast.error("POS name is required");
      return;
    }

    setCreating(true);
    try {
      const created = await createPos({ name: newPosName.trim() });
      setPosList((prev) => [created, ...prev]);
      setNewPosName("");
      toast.success(`POS created. Unique ID: ${created.unique_id}`);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to create POS");
    } finally {
      setCreating(false);
    }
  };

  const onRenamePos = async () => {
    if (!selectedPosId) {
      toast.error("Select a POS first");
      return;
    }

    const nextName = String(renameDraft || "").trim();
    if (!nextName) {
      toast.error("POS name is required");
      return;
    }

    setUpdating(true);
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
      setUpdating(false);
    }
  };

  const onDeletePos = async () => {
    if (!selectedPosId) {
      toast.error("Select a POS first");
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

    setDeleting(true);
    try {
      await deletePos(selectedPosId, secretCode);
      const nextList = await listPos();
      setPosList(nextList);
      setSelectedPosId(nextList[0]?.id || "");
      toast.success("POS deleted successfully");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete POS");
    } finally {
      setDeleting(false);
    }
  };

  const onTogglePosActive = async () => {
    if (!selectedPosId) {
      toast.error("Select a POS first");
      return;
    }

    const selectedPos = posList.find((pos) => pos.id === selectedPosId);
    if (!selectedPos) return;

    const nextActive = !selectedPos.is_active;
    setToggling(true);
    try {
      const updated = await togglePosActive(selectedPosId, nextActive);
      setPosList((prev) =>
        prev.map((pos) =>
          pos.id === updated.id ? { ...pos, ...updated } : pos,
        ),
      );
      toast.success(
        nextActive
          ? "POS activated successfully"
          : "POS deactivated successfully",
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Failed to toggle POS active status",
      );
    } finally {
      setToggling(false);
    }
  };

  const onManagePos = (posId, posName) => {
    setSelectedPosId(posId);
    setRenameDraft(posName);
    // Scroll management section into view
    setTimeout(() => {
      document
        .querySelector(".pos-management-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  return (
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
                Admin Console
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">
                Welcome, {user?.name || "Admin"}
              </h1>
              <p className="mt-1 text-sm text-linen-text-secondary">
                Create new POS and manage POS names + unique IDs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/analytics" className={btnNav}>
                Analytics
              </Link>
              <Link to="/admin/realtime-orders" className={btnNav}>
                Real-time Orders
              </Link>
              <Link to="/admin/categories" className={btnNav}>
                Categories
              </Link>
              <Link to="/admin/products" className={btnNav}>
                Products
              </Link>
              <Link to="/admin/floors-tables" className={btnNav}>
                Floors & Tables
              </Link>
              <Link to="/admin/pos" className={btnNav}>
                Open POS
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

        <div className="rounded-linen-lg border border-linen-border bg-white p-6 pos-management-section">
          <form
            onSubmit={onCreatePos}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={newPosName}
              onChange={(event) => setNewPosName(event.target.value)}
              placeholder="New POS name"
              className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
            />
            <button
              type="submit"
              disabled={creating}
              className="h-11 shrink-0 rounded-linen bg-linen-primary px-5 text-sm font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70"
            >
              {creating ? "Creating..." : "Create POS"}
            </button>
          </form>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center">
            <select
              value={selectedPosId}
              onChange={(event) => setSelectedPosId(event.target.value)}
              className="h-11 rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors focus:border-linen-primary"
            >
              {posList.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
            <input
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder="Update POS name"
              className="h-11 rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
            />
            <button
              type="button"
              onClick={onRenamePos}
              disabled={!selectedPosId || updating}
              className="h-11 rounded-linen border border-linen-border px-5 text-sm font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:opacity-70"
            >
              {updating ? "Updating..." : "Update POS"}
            </button>
            <button
              type="button"
              onClick={onTogglePosActive}
              disabled={!selectedPosId || toggling}
              className="h-11 rounded-linen border border-linen-border px-5 text-sm font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:opacity-70"
            >
              {toggling
                ? "..."
                : posList.find((pos) => pos.id === selectedPosId)?.is_active
                  ? "Deactivate"
                  : "Activate"}
            </button>
            <button
              type="button"
              onClick={onDeletePos}
              disabled={!selectedPosId || deleting}
              className="h-11 rounded-linen bg-[#DC2626] px-5 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-70"
            >
              {deleting ? "Deleting..." : "Delete POS"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-linen-lg border border-linen-border bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-linen-border bg-linen-surface-2">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  POS Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  Unique ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-linen-text-secondary"
                  >
                    Loading POS list...
                  </td>
                </tr>
              ) : posList.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-linen-text-secondary"
                  >
                    No POS found yet.
                  </td>
                </tr>
              ) : (
                posList.map((pos) => (
                  <tr key={pos.id} className="border-t border-linen-surface-2">
                    <td className="px-4 py-3 font-medium text-linen-text-primary">
                      {pos.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-linen-text-secondary">
                      {pos.unique_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-linen-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase ${pos.is_active ? "bg-[#DCFCE7] text-linen-success" : "bg-linen-surface-2 text-linen-text-muted"}`}
                      >
                        {pos.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onManagePos(pos.id, pos.name)}
                        className="rounded-linen border border-linen-border px-3 py-1.5 text-xs font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
