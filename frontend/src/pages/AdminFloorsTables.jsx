import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createFloor,
  createTable,
  deleteFloor,
  deleteTable,
  listFloorsTables,
  listPos,
  updateFloor,
  updateTable,
} from "../services/adminService";

export default function AdminFloorsTables() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [posList, setPosList] = useState([]);
  const [selectedPosId, setSelectedPosId] = useState("");
  const [floors, setFloors] = useState([]);

  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorActive, setNewFloorActive] = useState(true);

  const [newTableByFloor, setNewTableByFloor] = useState({});

  const loadPosAndFloors = async (targetPosId = null) => {
    setLoading(true);
    try {
      const pos = await listPos();
      setPosList(pos);

      const resolvedPosId = targetPosId || selectedPosId || pos[0]?.id || "";
      setSelectedPosId(resolvedPosId);

      if (!resolvedPosId) {
        setFloors([]);
        return;
      }

      const floorsData = await listFloorsTables(resolvedPosId);
      setFloors(floorsData);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Failed to load floors and tables",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosAndFloors();
  }, []);

  const reloadFloors = async (posId = selectedPosId) => {
    if (!posId) return;
    const floorsData = await listFloorsTables(posId);
    setFloors(floorsData);
  };

  const onCreateFloor = async (event) => {
    event.preventDefault();
    if (!selectedPosId) {
      toast.error("Select a POS first");
      return;
    }

    if (!newFloorName.trim()) {
      toast.error("Floor name is required");
      return;
    }

    setSaving(true);
    try {
      await createFloor({
        posId: selectedPosId,
        name: newFloorName.trim(),
        isActive: newFloorActive,
      });
      setNewFloorName("");
      setNewFloorActive(true);
      await reloadFloors(selectedPosId);
      toast.success("Floor created");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to create floor");
    } finally {
      setSaving(false);
    }
  };

  const onUpdateFloor = async (floor) => {
    if (!selectedPosId) return;
    setSaving(true);
    try {
      await updateFloor(floor.id, {
        posId: selectedPosId,
        name: floor.name,
        isActive: floor.is_active,
      });
      toast.success("Floor updated");
      await reloadFloors(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update floor");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteFloor = async (floorId) => {
    if (!selectedPosId) return;
    setSaving(true);
    try {
      await deleteFloor(floorId, { posId: selectedPosId });
      toast.success("Floor deleted");
      await reloadFloors(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete floor");
    } finally {
      setSaving(false);
    }
  };

  const getNewTableDraft = (floorId) => {
    return (
      newTableByFloor[floorId] || {
        tableNumber: "",
        seats: 4,
        status: "available",
        isActive: true,
      }
    );
  };

  const setNewTableDraft = (floorId, patch) => {
    setNewTableByFloor((prev) => ({
      ...prev,
      [floorId]: {
        ...getNewTableDraft(floorId),
        ...patch,
      },
    }));
  };

  const onCreateTable = async (floorId) => {
    if (!selectedPosId) return;
    const draft = getNewTableDraft(floorId);

    const tableNumber = Number(draft.tableNumber);
    const seats = Number(draft.seats);

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      toast.error("Table number must be a positive integer");
      return;
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      toast.error("Seats must be a positive integer");
      return;
    }

    setSaving(true);
    try {
      await createTable(floorId, {
        posId: selectedPosId,
        tableNumber,
        seats,
        status: draft.status,
        isActive: Boolean(draft.isActive),
      });
      setNewTableDraft(floorId, {
        tableNumber: "",
        seats: 4,
        status: "available",
        isActive: true,
      });
      toast.success("Table created");
      await reloadFloors(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to create table");
    } finally {
      setSaving(false);
    }
  };

  const onUpdateTable = async (table) => {
    if (!selectedPosId) return;

    setSaving(true);
    try {
      await updateTable(table.id, {
        posId: selectedPosId,
        tableNumber: Number(table.table_number),
        seats: Number(table.seats),
        status: table.status,
        isActive: Boolean(table.is_active),
      });
      toast.success("Table updated");
      await reloadFloors(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update table");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTable = async (tableId) => {
    if (!selectedPosId) return;

    setSaving(true);
    try {
      await deleteTable(tableId, { posId: selectedPosId });
      toast.success("Table deleted");
      await reloadFloors(selectedPosId);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to delete table");
    } finally {
      setSaving(false);
    }
  };

  const onChangeFloorLocal = (floorId, patch) => {
    setFloors((prev) =>
      prev.map((floor) =>
        floor.id === floorId ? { ...floor, ...patch } : floor,
      ),
    );
  };

  const onChangeTableLocal = (floorId, tableId, patch) => {
    setFloors((prev) =>
      prev.map((floor) => {
        if (floor.id !== floorId) return floor;
        return {
          ...floor,
          tables: floor.tables.map((table) =>
            table.id === tableId ? { ...table, ...patch } : table,
          ),
        };
      }),
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Admin Layout
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Floors & Tables Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create, update, and delete floors/tables for any POS.
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
                to="/admin/analytics"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Analytics
              </Link>
              <Link
                to="/admin/realtime-orders"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Real-time Orders
              </Link>
              <Link
                to="/admin/pos"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open POS
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="text-sm font-semibold text-slate-700">
              POS
              <select
                value={selectedPosId}
                onChange={async (event) => {
                  const posId = event.target.value;
                  setSelectedPosId(posId);
                  if (posId) {
                    setLoading(true);
                    try {
                      const data = await listFloorsTables(posId);
                      setFloors(data);
                    } catch (error) {
                      toast.error(
                        error?.response?.data?.error ||
                          "Failed to load POS floors",
                      );
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                {posList.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} ({pos.unique_id})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => loadPosAndFloors(selectedPosId)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reload
            </button>
          </div>

          <form
            onSubmit={onCreateFloor}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"
          >
            <label className="text-sm font-semibold text-slate-700">
              New Floor Name
              <input
                value={newFloorName}
                onChange={(event) => setNewFloorName(event.target.value)}
                placeholder="Ground Floor"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newFloorActive}
                onChange={(event) => setNewFloorActive(event.target.checked)}
              />
              Active
            </label>

            <button
              type="submit"
              disabled={saving || !selectedPosId}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              Create Floor
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Loading floors and tables...
            </div>
          ) : floors.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              No floors found for selected POS.
            </div>
          ) : (
            floors.map((floor) => (
              <article
                key={floor.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
                  <label className="text-sm font-semibold text-slate-700">
                    Floor Name
                    <input
                      value={floor.name}
                      onChange={(event) =>
                        onChangeFloorLocal(floor.id, {
                          name: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(floor.is_active)}
                      onChange={(event) =>
                        onChangeFloorLocal(floor.id, {
                          is_active: event.target.checked,
                        })
                      }
                    />
                    Active
                  </label>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onUpdateFloor(floor)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Save Floor
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onDeleteFloor(floor.id)}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete Floor
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Table #</th>
                        <th className="px-3 py-2">Seats</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Active</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floor.tables.map((table) => (
                        <tr
                          key={table.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={table.table_number}
                              onChange={(event) =>
                                onChangeTableLocal(floor.id, table.id, {
                                  table_number: Number(event.target.value || 0),
                                })
                              }
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={table.seats}
                              onChange={(event) =>
                                onChangeTableLocal(floor.id, table.id, {
                                  seats: Number(event.target.value || 0),
                                })
                              }
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={table.status}
                              onChange={(event) =>
                                onChangeTableLocal(floor.id, table.id, {
                                  status: event.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-200 px-2 py-1"
                            >
                              <option value="available">available</option>
                              <option value="occupied">occupied</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(table.is_active)}
                              onChange={(event) =>
                                onChangeTableLocal(floor.id, table.id, {
                                  is_active: event.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => onUpdateTable(table)}
                                className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-100"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => onDeleteTable(table.id)}
                                className="rounded-lg border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      <tr className="border-t border-slate-100 bg-slate-50/50">
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={getNewTableDraft(floor.id).tableNumber}
                            onChange={(event) =>
                              setNewTableDraft(floor.id, {
                                tableNumber: event.target.value,
                              })
                            }
                            placeholder="New #"
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={getNewTableDraft(floor.id).seats}
                            onChange={(event) =>
                              setNewTableDraft(floor.id, {
                                seats: event.target.value,
                              })
                            }
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={getNewTableDraft(floor.id).status}
                            onChange={(event) =>
                              setNewTableDraft(floor.id, {
                                status: event.target.value,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1"
                          >
                            <option value="available">available</option>
                            <option value="occupied">occupied</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              getNewTableDraft(floor.id).isActive,
                            )}
                            onChange={(event) =>
                              setNewTableDraft(floor.id, {
                                isActive: event.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => onCreateTable(floor.id)}
                            className="rounded-lg bg-slate-900 px-3 py-1 text-white hover:bg-slate-800"
                          >
                            Add Table
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
