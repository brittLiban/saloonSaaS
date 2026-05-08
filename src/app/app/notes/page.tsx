import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const TAG_PILL: Record<string, string> = {
  general:    "pill pill-gray",
  allergy:    "pill pill-red",
  behavior:   "pill pill-brass",
  grooming:   "pill pill-blue",
  medical:    "pill pill-red",
  followup:   "pill pill-green",
};

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { tag, q } = await searchParams;

  const notes = await db.groomingNote.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(tag ? { tag } : {}),
      ...(q ? { body: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      animal: true,
      client: true,
      author: true,
      appointment: { include: { service: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const tags = ["general", "allergy", "behavior", "grooming", "medical", "followup"];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Notes</div>
          <div className="topbar-sub">{notes.length} note{notes.length !== 1 ? "s" : ""}{tag ? ` · ${tag}` : ""}</div>
        </div>
        <div className="topbar-actions">
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <select name="tag" defaultValue={tag ?? ""} className="d-input" style={{ width: 140 }}>
              <option value="">All tags</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input name="q" defaultValue={q} placeholder="Search note text…" className="d-input" style={{ width: 220 }} />
            <button className="d-btn" type="submit">Search</button>
          </form>
          <button className="d-btn d-btn-primary" type="button">+ Add note</button>
        </div>
      </header>

      <div className="dash-content">
        {notes.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: "center", color: "var(--d-ink-4)", fontStyle: "italic" }}>
            {tag || q ? "No notes match that filter." : "No notes yet. Add your first care note!"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map((n) => (
              <div key={n.id} className="glass-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                      <span className={TAG_PILL[n.tag] ?? "pill pill-gray"} style={{ fontSize: 10 }}>{n.tag}</span>
                      {n.visibility === "CLIENT_VISIBLE" && (
                        <span className="pill pill-blue" style={{ fontSize: 10 }}>Client visible</span>
                      )}
                      {n.animal && (
                        <Link href={`/app/animals/${n.animal.id}`} style={{ fontSize: 12, color: "var(--oxblood)", textDecoration: "none" }}>
                          {petEmoji(n.animal.species)} {n.animal.name}
                        </Link>
                      )}
                      {n.client && (
                        <Link href={`/app/clients/${n.client.id}`} style={{ fontSize: 12, color: "var(--d-ink-3)", textDecoration: "none" }}>
                          · {n.client.name}
                        </Link>
                      )}
                      {n.appointment && (
                        <span style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                          · {n.appointment.service.name} on {n.appointment.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--d-ink)" }}>{n.body}</div>

                    {/* Footer */}
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--d-ink-4)" }}>
                      {n.author?.name ?? "System"} · {n.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at {n.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <button className="d-btn" style={{ fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
