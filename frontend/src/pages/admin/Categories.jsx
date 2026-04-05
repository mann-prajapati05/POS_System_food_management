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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Admin Catalog
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Category Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create and maintain categories per POS.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Console
              </Link>
              <Link
                to="/admin/products"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Products
              </Link>
              <button
                type="button"
                onClick={openCreate}
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                Create Category
              </button>
            </div>
          </div>

          <div className="mt-4 max-w-sm">
            <label className="block text-sm font-semibold text-slate-700">
              POS
              <select
                value={selectedPosId}
                onChange={async (e) => {
                  const posId = e.target.value;
                  setSelectedPosId(posId);
                  await load(posId);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading categories...
          </div>
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
