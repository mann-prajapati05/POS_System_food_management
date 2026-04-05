import { NavLink } from "react-router-dom";

function navLinkClass({ isActive }) {
  const base =
    "rounded-linen px-4 py-2 text-[13px] font-medium transition-all duration-150";
  return isActive
    ? `${base} bg-linen-surface-2 text-linen-text-primary`
    : `${base} text-linen-text-secondary hover:bg-linen-bg hover:text-linen-text-primary`;
}

export default function Navbar({ posName, userName, onLogout }) {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-linen-border bg-white">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-linen bg-linen-primary font-mono text-[13px] font-semibold text-white">
            POS
          </div>
          <div>
            <p className="text-[15px] font-semibold text-linen-text-primary">
              Odoo POS Cafe
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
              {posName}
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
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
            <p className="text-[11px] uppercase tracking-[0.07em] text-linen-text-muted">Signed in as</p>
            <p className="text-[13px] font-medium text-linen-text-primary">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="h-9 rounded-linen border border-linen-border bg-white px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:border-linen-border-strong hover:bg-linen-surface-2"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
