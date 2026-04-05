import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import CategoryForm from "../../components/admin/CategoryForm";
import CategoryTable from "../../components/admin/CategoryTable";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../../services/categoryService";
import { listPos } from "../../services/adminService";

const btnNav = "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";

export default function Categories() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  const [posList, setPosList] = useState([]);
  const [selectedPosId, setSelectedPosId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingCategory, setEditingCategory] = useState(null);

  const load = async (posIdOverride = null) => {
    setLoading(true);
    try {
      const pos = await listPos();
      setPosList(pos);
      const resolvedPosId = posIdOverride || selectedPosId || pos[0]?.id || "";
      setSelectedPosId(resolvedPosId);

      if (!resolvedPosId) {
        setCategories([]);
        return;
      }

      const list = await getAllCategories({ posId: resolvedPosId });
      setCategories(list);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setFormMode("create");
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category) => {
    setFormMode("edit");
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (!selectedPosId) return;

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await createCategory({ ...payload, posId: selectedPosId });
        toast.success("Category created");
      } else {
        await updateCategory(editingCategory.id, {
          ...payload,
          posId: selectedPosId,
        });
        toast.success("Category updated");
      }

      setFormOpen(false);
      await load(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!selectedPosId) return;
    const ok = window.confirm(`Delete category "${category.name}"?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      await deleteCategory(category.id, { posId: selectedPosId });
      toast.success("Category deleted");
      await load(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">Admin Catalog</p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">Category Management</h1>
              <p className="mt-1 text-sm text-linen-text-secondary">Create and maintain categories per POS.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={btnNav}>Console</Link>
              <Link to="/admin/products" className={btnNav}>Products</Link>
              <button type="button" onClick={openCreate} disabled={submitting} className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70">
                Create Category
              </button>
            </div>
          </div>

          <div className="mt-4 max-w-sm">
            <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
              POS
              <select
                value={selectedPosId}
                onChange={async (e) => {
                  const posId = e.target.value;
                  setSelectedPosId(posId);
                  await load(posId);
                }}
                className="mt-1.5 h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm outline-none transition-colors focus:border-linen-primary"
              >
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {loading ? (
          <div className="rounded-linen-lg border border-linen-border bg-white p-6 text-sm text-linen-text-secondary">Loading categories...</div>
        ) : (
          <CategoryTable
            categories={categories}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}

        <CategoryForm
          open={formOpen}
          mode={formMode}
          initialValues={editingCategory}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      </section>
    </main>
  );
}
