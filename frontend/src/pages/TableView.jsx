import TableCard from "../components/TableCard";

export default function TableView({ tables, selectedTableId, onSelectTable }) {
  if (!tables?.length) {
    return (
      <p className="text-sm text-slate-500">No tables found on this floor.</p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          active={selectedTableId === table.id}
          onClick={() => onSelectTable(table)}
        />
      ))}
    </div>
  );
}
