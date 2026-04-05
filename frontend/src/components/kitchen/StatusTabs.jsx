const TABS = [
  { id: "all", label: "All" },
  { id: "to_cook", label: "To Cook" },
  { id: "preparing", label: "Preparing" },
  { id: "completed", label: "Completed" },
];

export default function StatusTabs({ activeTab, counts, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === tab.id
              ? "border-sky-300 bg-sky-50 text-sky-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {tab.label}
          <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {counts[tab.id] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
