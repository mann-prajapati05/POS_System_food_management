import TableView from './TableView';

export default function FloorView({
  floors,
  selectedFloorId,
  onSelectFloor,
  selectedTableId,
  onSelectTable,
}) {
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId) || floors[0] || null;

  const tabBase =
    "h-8 rounded-linen-pill border px-3 text-[13px] font-medium transition-all duration-150 whitespace-nowrap";
  const tabActive = "border-linen-primary bg-linen-primary text-white";
  const tabInactive =
    "border-linen-border bg-transparent text-linen-text-secondary hover:border-linen-border-strong hover:bg-linen-surface-2";

  return (
    <section className="space-y-4">
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
          {selectedFloor?.name || "Floor"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              onClick={() => onSelectFloor(floor.id)}
              className={`${tabBase} ${selectedFloor?.id === floor.id ? tabActive : tabInactive}`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </div>

      {selectedFloor ? (
        <TableView
          tables={selectedFloor.tables || []}
          selectedTableId={selectedTableId}
          onSelectTable={onSelectTable}
        />
      ) : (
        <p className="text-sm text-linen-text-secondary">No floors configured for this POS.</p>
      )}
    </section>
  );
}
