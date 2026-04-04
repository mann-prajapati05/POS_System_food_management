import TableView from './TableView';

export default function FloorView({
  floors,
  selectedFloorId,
  onSelectFloor,
  selectedTableId,
  onSelectTable,
}) {
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId) || floors[0] || null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {floors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            onClick={() => onSelectFloor(floor.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${selectedFloor?.id === floor.id ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {selectedFloor ? (
        <TableView
          tables={selectedFloor.tables || []}
          selectedTableId={selectedTableId}
          onSelectTable={onSelectTable}
        />
      ) : (
        <p className="text-sm text-slate-500">No floors configured for this POS.</p>
      )}
    </section>
  );
}
