import { getTenantCtx } from "@/lib/tenant";
import { DashSidebar } from "@/components/DashSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantCtx();
  return (
    <>
      <div className="dash-bg" />
      <div className="dash-layout">
        <DashSidebar name={ctx?.name ?? ""} role={ctx?.role ?? "STAFF"} />
        <main className="dash-main">{children}</main>
      </div>
    </>
  );
}
