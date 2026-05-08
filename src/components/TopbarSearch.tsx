"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/server/actions/search";

const QUICK_LINKS = [
  { label: "Clients",   href: "/app/clients",   icon: <PersonIcon /> },
  { label: "Animals",   href: "/app/animals",   icon: <PawIcon /> },
  { label: "Calendar",  href: "/app/calendar",  icon: <CalIcon /> },
  { label: "Bookings",  href: "/app/bookings",  icon: <ListIcon /> },
  { label: "Rebooking", href: "/app/rebooking", icon: <RefreshIcon /> },
];

export function TopbarSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, start]    = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 40); }
    else { setQuery(""); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    start(async () => {
      const res = await globalSearch(query);
      setResults(res);
    });
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1.5px solid var(--d-line-2)",
          borderRadius: 12, padding: "0 14px",
          height: 38, width: 300, cursor: "pointer", flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--d-ink-4)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span style={{ flex: 1, fontSize: 13, color: "var(--d-ink-4)" }}>
          Search clients, pets, invoices…
        </span>
        <kbd style={{
          background: "var(--bg-tint)", border: "1px solid var(--d-line-2)",
          borderRadius: 6, padding: "1px 5px",
          fontSize: 10, color: "var(--d-ink-3)", fontFamily: "var(--dash-mono)",
        }}>⌘K</kbd>
      </div>

      {/* Overlay + modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(22, 22, 22, 0.50)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: 80,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 18,
              border: "1px solid var(--d-line-2)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
              width: 540,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              maxHeight: "70vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid var(--d-line)",
            }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: isPending ? "var(--acc)" : "var(--d-ink-4)", flexShrink: 0, transition: "color 0.15s" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, pets…"
                style={{
                  flex: 1, border: "none", outline: "none",
                  fontSize: 15, fontFamily: "var(--dash-sans)", color: "var(--d-ink)",
                  background: "transparent",
                }}
              />
              <kbd style={{
                background: "#f3f4f6", border: "1px solid var(--d-line-2)",
                borderRadius: 6, padding: "2px 6px",
                fontSize: 11, color: "var(--d-ink-4)", fontFamily: "var(--dash-mono)",
                flexShrink: 0, cursor: "pointer",
              }} onClick={() => setOpen(false)}>esc</kbd>
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1 }}>

              {/* Quick links — only when no query */}
              {query.trim().length === 0 && (
                <div style={{ padding: "8px 8px 12px" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: "var(--d-ink-4)",
                    padding: "8px 10px 6px",
                  }}>Quick links</div>
                  {QUICK_LINKS.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", border: "none", background: "transparent",
                        cursor: "pointer", textAlign: "left", borderRadius: 10,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: "#f3f4f6", border: "1px solid var(--d-line-2)",
                        display: "grid", placeItems: "center", color: "var(--d-ink-3)",
                      }}>
                        {link.icon}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--d-ink-2)" }}>
                        {link.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Typing hint — 1 char */}
              {query.trim().length === 1 && (
                <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--d-ink-4)", fontSize: 13 }}>
                  Keep typing to search…
                </div>
              )}

              {/* No results */}
              {query.trim().length >= 2 && !isPending && results.length === 0 && (
                <div style={{ padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 14, color: "var(--d-ink-3)", marginBottom: 4 }}>
                    No results for <strong>&ldquo;{query}&rdquo;</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--d-ink-4)" }}>
                    Try a client name, pet name, or phone number
                  </div>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div style={{ padding: "6px 8px 10px" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: "var(--d-ink-4)",
                    padding: "8px 10px 6px",
                  }}>Results</div>
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => navigate(r.href)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "9px 10px", border: "none", background: "transparent",
                        cursor: "pointer", textAlign: "left", borderRadius: 10,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: r.type === "client" ? "#f3f4f6" : "#fef3e8",
                        border: "1px solid var(--d-line-2)",
                        display: "grid", placeItems: "center", color: r.type === "client" ? "var(--d-ink-3)" : "var(--acc)",
                      }}>
                        {r.type === "client" ? <PersonIcon size={16} /> : <PawIcon size={16} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--d-ink)", marginBottom: 1 }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.subtitle}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, color: "var(--d-ink-4)", textTransform: "capitalize",
                        background: "#f3f4f6", padding: "2px 8px", borderRadius: 6, flexShrink: 0,
                        border: "1px solid var(--d-line-2)",
                      }}>
                        {r.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Inline SVG icons ── */
function PersonIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function PawIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
    </svg>
  );
}

function CalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function ListIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}

function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}
