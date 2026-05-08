"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PawIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/>
    <circle cx="6" cy="10.5" r="1.8"/>
    <circle cx="12" cy="8" r="1.8"/>
    <circle cx="18" cy="10.5" r="1.8"/>
  </svg>
);

const tabs = [
  {
    key: "today", label: "Today", href: "/app/today",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  },
  {
    key: "calendar", label: "Calendar", href: "/app/calendar",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  },
  {
    key: "bookings", label: "Bookings", href: "/app/bookings",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/></svg>,
  },
  {
    key: "rebooking", label: "Rebooking", href: "/app/rebooking", badge: true,
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>,
  },
  {
    key: "clients", label: "Clients", href: "/app/clients",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  },
  {
    key: "animals", label: "Animals", href: "/app/animals",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="17" rx="4.5" ry="3.4"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/></svg>,
  },
  {
    key: "services", label: "Services", href: "/app/services",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg>,
  },
  {
    key: "money", label: "Money", href: "/app/money",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    key: "notes", label: "Notes", href: "/app/notes",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  },
];

function DashSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      <Link href="/app/today" className="sidebar-brand" style={{ textDecoration: "none" }}>
        <div className="sidebar-brand-mark"><PawIcon /></div>
        <div>
          <div className="sidebar-brand-name">Glasshound</div>
          <div className="sidebar-brand-sub">Pet Salon</div>
        </div>
      </Link>

      <nav className="side-nav">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/app" && pathname.startsWith(tab.href));
          return (
            <Link key={tab.key} href={tab.href} className={`side-link${active ? " active" : ""}`}>
              <span className="side-link-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && <span className="side-badge">!</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">N</div>
          <div>
            <div className="sidebar-user-name">Nina Reyes</div>
            <div className="sidebar-user-role">Owner</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="side-link"
          style={{ width: "100%", marginTop: 4, background: "none", border: 0, cursor: "pointer", textAlign: "left" }}
        >
          <span className="side-link-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="dash-bg" />
      <div className="dash-layout">
        <DashSidebar />
        <main className="dash-main">{children}</main>
      </div>
    </>
  );
}
