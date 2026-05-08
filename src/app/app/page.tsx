import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { demoAppointments, demoStats, demoTenant } from "@/lib/demo-data";
import { dashboardTabs } from "@/lib/navigation";

export default function DashboardPage() {
  return (
    <main className="app-layout">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <BrandMark />
          <span>{demoTenant.name}</span>
        </Link>
        <nav className="side-nav" aria-label="Dashboard navigation">
          {dashboardTabs.map((tab, index) => (
            <Link key={tab.key} href={`/app?tab=${tab.key}`} className="side-link" data-active={index === 0}>
              <span>{tab.label}</span>
              {tab.key === "rebooking" ? <span className="pill">7</span> : null}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">{demoTenant.city} | {demoTenant.timezone}</div>
            <h1 className="display">Calendar</h1>
            <p className="subtle">Sprint 0 shell using seeded demo data until Prisma-backed routes land.</p>
          </div>
          <div className="nav-actions">
            <Link href="/developers" className="btn">API docs</Link>
            <button className="btn btn-primary" type="button">New booking</button>
          </div>
        </header>

        <div className="content">
          <div className="kpi-grid">
            {demoStats.map((stat) => (
              <article className="card kpi" key={stat.label}>
                <div className="eyebrow">{stat.label}</div>
                <h3 className="display">{stat.value}</h3>
                <p className="subtle">{stat.detail}</p>
              </article>
            ))}
          </div>

          <div className="panel-grid" style={{ marginTop: 18 }}>
            <article className="card table-card">
              {demoAppointments.map((appointment) => (
                <div className="table-row" key={`${appointment.time}-${appointment.animal}`}>
                  <strong>{appointment.time}</strong>
                  <span>
                    <span className="pet-dot">{appointment.animal[0]}</span>{" "}
                    <strong>{appointment.animal}</strong>{" "}
                    <span className="subtle">| {appointment.service}</span>
                  </span>
                  <span className="pill">{appointment.status.replace("_", " ")}</span>
                </div>
              ))}
            </article>

            <aside className="card feature">
              <div className="eyebrow">Sprint roadmap</div>
              <h3>Next build target</h3>
              <p className="subtle">
                Replace this demo shell with tenant-scoped Prisma data, auth, booking availability, and n8n API routes.
              </p>
              <Link href="/developers" className="btn">Inspect API surface</Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
