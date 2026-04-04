import { NavLink } from "react-router-dom";

function navLinkClass({ isActive }) {
  const base =
    "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200";
  return isActive
    ? `${base} bg-sky-100 text-sky-700 shadow-sm`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-800`;
}

export default function Navbar({ posName, userName, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-lg font-bold text-white shadow-sm">
            P
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Multi POS
            </p>
            <p className="text-sm font-bold text-slate-800">{posName}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink to="/pos" className={navLinkClass}>
            Orders
          </NavLink>
          <NavLink to="/pos" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            Reporting
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-slate-700">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
