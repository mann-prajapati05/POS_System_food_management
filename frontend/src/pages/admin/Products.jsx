import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProductForm from '../../components/admin/ProductForm';
import ProductTable from '../../components/admin/ProductTable';
import { getAllCategories } from '../../services/categoryService';
import { deleteProduct, getAllProducts, updateProduct, createProduct } from '../../services/productService';
import { listPos } from '../../services/adminService';

const btnNav = "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";
const selectClass = "mt-1.5 h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm outline-none transition-colors focus:border-linen-primary";

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
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">Admin Catalog</p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">Product Management</h1>
              <p className="mt-1 text-sm text-linen-text-secondary">Manage POS products with category and search filters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={btnNav}>Console</Link>
              <Link to="/admin/categories" className={btnNav}>Categories</Link>
              <button type="button" onClick={openCreate} disabled={submitting} className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70">Create Product</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
              POS
              <select value={selectedPosId} onChange={async (e) => { const posId = e.target.value; setSelectedPosId(posId); await load(posId); }} className={selectClass}>
                {posList.map((pos) => (<option key={pos.id} value={pos.id}>{pos.name}</option>))}
              </select>
            </label>

            <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
              Filter by Category
              <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)} className={selectClass}>
                <option value="">All categories</option>
                {categories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
              </select>
            </label>

            <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
              Search
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="mt-1.5 h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary" />
            </label>
          </div>
        </header>

        {loading ? (
          <div className="rounded-linen-lg border border-linen-border bg-white p-6 text-sm text-linen-text-secondary">Loading products...</div>
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
