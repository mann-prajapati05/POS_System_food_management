import TableCard from "../components/TableCard";

export default function TableView({ tables, selectedTableId, onSelectTable }) {
  if (!tables?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-linen-lg border border-dashed border-linen-border bg-white px-6 py-16 text-center">
        <svg className="h-12 w-12 text-linen-border" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <p className="mt-3 text-sm text-linen-text-secondary">No tables found on this floor</p>
        <p className="mt-1 text-[13px] text-linen-text-muted">Tables will appear here once configured</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
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
