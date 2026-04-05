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
          className={`rounded-linen border px-4 py-2 text-[13px] font-medium transition-all ${
            activeTab === tab.id
              ? "border-white/20 bg-white/10 text-white"
              : "border-[#2A2A2A] bg-[#1A1A1A] text-[#888888] hover:bg-[#222222] hover:text-[#CCCCCC]"
          }`}
        >
          {tab.label}
          <span className="ml-2 rounded-linen-sm bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">
            {counts[tab.id] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
