import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProductForm from '../../components/admin/ProductForm';
import ProductTable from '../../components/admin/ProductTable';
import { getAllCategories } from '../../services/categoryService';
import { deleteProduct, getAllProducts, updateProduct, createProduct } from '../../services/productService';
import { listPos } from '../../services/adminService';

export default function Products() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [posList, setPosList] = useState([]);
  const [selectedPosId, setSelectedPosId] = useState('');

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);

  const load = async (posIdOverride = null) => {
    setLoading(true);
    try {
      const pos = await listPos();
      setPosList(pos);
      const resolvedPosId = posIdOverride || selectedPosId || pos[0]?.id || '';
      setSelectedPosId(resolvedPosId);

      if (!resolvedPosId) {
        setCategories([]);
        setProducts([]);
        return;
      }

      const [categoryList, productList] = await Promise.all([
        getAllCategories({ posId: resolvedPosId }),
        getAllProducts({ posId: resolvedPosId }),
      ]);
      setCategories(categoryList);
      setProducts(productList);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = !selectedCategoryFilter || product.category_id === selectedCategoryFilter;
      const searchMatch = !search || product.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [products, selectedCategoryFilter, search]);

  const openCreate = () => {
    setFormMode('create');
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setFormMode('edit');
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (!selectedPosId) return;
    setSubmitting(true);

    try {
      const requestPayload = {
        posId: selectedPosId,
        name: payload.name,
        categoryId: payload.categoryId,
        price: payload.price,
        description: payload.description,
        isAvailable: payload.isAvailable,
      };

      if (formMode === 'create') {
        await createProduct(requestPayload);
        toast.success('Product created');
      } else {
        await updateProduct(editingProduct.id, requestPayload);
        toast.success('Product updated');
      }

      setFormOpen(false);
      await load(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!selectedPosId) return;
    const ok = window.confirm(`Delete product "${product.name}"?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      await deleteProduct(product.id, { posId: selectedPosId });
      toast.success('Product deleted');
      await load(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (product) => {
    if (!selectedPosId) return;
    setSubmitting(true);
    try {
      await updateProduct(product.id, {
        posId: selectedPosId,
        isAvailable: !product.is_available,
      });
      toast.success('Product status updated');
      await load(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update product status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin Catalog</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Product Management</h1>
              <p className="mt-1 text-sm text-slate-500">Manage POS products with category and search filters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Console</Link>
              <Link to="/admin/categories" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Categories</Link>
              <button type="button" onClick={openCreate} disabled={submitting} className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">Create Product</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Filter by Category
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading products...</div>
        ) : (
          <ProductTable products={filteredProducts} onEdit={openEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
        )}

        <ProductForm
          open={formOpen}
          mode={formMode}
          categories={categories}
          initialValues={editingProduct}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      </section>
    </main>
  );
}
