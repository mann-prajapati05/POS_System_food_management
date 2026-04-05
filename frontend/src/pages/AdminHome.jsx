import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { createPos, listPos } from '../services/adminService';

export default function AdminHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [posList, setPosList] = useState([]);
  const [newPosName, setNewPosName] = useState('');

  const loadPos = async () => {
    setLoading(true);
    try {
      const data = await listPos();
      setPosList(data);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load POS list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPos();
  }, []);

  const onCreatePos = async (event) => {
    event.preventDefault();
    if (!newPosName.trim()) {
      toast.error('POS name is required');
      return;
    }

    setCreating(true);
    try {
      const created = await createPos({ name: newPosName.trim() });
      setPosList((prev) => [created, ...prev]);
      setNewPosName('');
      toast.success(`POS created. Unique ID: ${created.unique_id}`);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to create POS');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin Console</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome, {user?.name || 'Admin'}</h1>
            <p className="mt-1 text-sm text-slate-500">Create new POS and manage POS names + unique IDs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/analytics" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Analytics</Link>
            <Link to="/admin/realtime-orders" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Real-time Orders</Link>
            <Link to="/admin/categories" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Categories</Link>
            <Link to="/admin/products" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Products</Link>
            <Link to="/admin/floors-tables" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Floors & Tables</Link>
            <Link to="/admin/pos" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Open POS</Link>
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

        <form onSubmit={onCreatePos} className="mb-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={newPosName}
            onChange={(event) => setNewPosName(event.target.value)}
            placeholder="New POS name"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {creating ? 'Creating...' : 'Create POS'}
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 text-left text-sm text-slate-500">
              <tr>
                <th className="px-4 py-3">POS Name</th>
                <th className="px-4 py-3">Unique ID</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">Loading POS list...</td>
                </tr>
              ) : posList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No POS found yet.</td>
                </tr>
              ) : (
                posList.map((pos) => (
                  <tr key={pos.id} className="border-t border-slate-100 text-sm">
                    <td className="px-4 py-3 font-semibold text-slate-700">{pos.name}</td>
                    <td className="px-4 py-3 text-slate-600">{pos.unique_id}</td>
                    <td className="px-4 py-3 text-slate-600">{pos.is_active ? 'Active' : 'Inactive'}</td>
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
