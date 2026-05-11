"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createApiKey, revokeApiKey } from "@/server/actions/apikeys";
import { ALL_SCOPES } from "@/lib/api-scopes";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SettingsClient({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // New key form state
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["appointments:read", "appointments:write"]);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleGenerate() {
    if (!keyName.trim() || selectedScopes.length === 0) return;
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await createApiKey(keyName.trim(), selectedScopes);
        setNewToken(result.token);
        setShowForm(false);
        setKeyName("");
        setSelectedScopes(["appointments:read", "appointments:write"]);
        router.refresh();
      } catch (err) {
        console.error("[createApiKey]", err);
        setFormError(err instanceof Error ? err.message : String(err) ?? "Failed to generate key.");
      }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeApiKey(id);
      router.refresh();
    });
  }

  function handleCopy() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const active = apiKeys.filter((k) => !k.revokedAt);
  const revoked = apiKeys.filter((k) => k.revokedAt);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Settings</div>
          <div className="topbar-sub">API keys and integrations</div>
        </div>
        <div className="topbar-actions">
          {!showForm && !newToken && (
            <button className="d-btn d-btn-primary" type="button" onClick={() => setShowForm(true)}>
              + Generate API key
            </button>
          )}
        </div>
      </header>

      <div className="dash-content" style={{ maxWidth: 780 }}>
        {/* New token display — shown once after generation */}
        {newToken && (
          <div
            className="glass-card"
            style={{
              padding: 24, marginBottom: 20,
              border: "1.5px solid var(--oxblood)",
              background: "oklch(from var(--oxblood) l c h / 0.05)",
            }}
          >
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 6, color: "var(--oxblood)" }}>
              Copy your API key — it won&apos;t be shown again
            </div>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)", marginBottom: 14 }}>
              Store it somewhere safe. You cannot retrieve it later.
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <code
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8,
                  background: "var(--bg-deep)", fontSize: 12,
                  fontFamily: "var(--dash-mono)", wordBreak: "break-all",
                  border: "1px solid var(--d-line)",
                }}
              >
                {newToken}
              </code>
              <button className="d-btn d-btn-primary" style={{ flexShrink: 0 }} onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              className="d-btn"
              style={{ marginTop: 14, fontSize: 12 }}
              onClick={() => setNewToken(null)}
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Generate form */}
        {showForm && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 16 }}>New API key</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--d-ink-2)" }}>
                  Key name
                </label>
                <input
                  className="d-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. n8n automation"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--d-ink-2)" }}>Scopes</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_SCOPES.map((scope) => (
                    <label
                      key={scope}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                        border: `1.5px solid ${selectedScopes.includes(scope) ? "var(--oxblood)" : "var(--d-line)"}`,
                        background: selectedScopes.includes(scope) ? "oklch(from var(--oxblood) l c h / 0.07)" : "oklch(1 0 0 / 0.5)",
                        fontSize: 12, fontFamily: "var(--dash-mono)",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        style={{ accentColor: "var(--oxblood)" }}
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#fff1f0", border: "1px solid #ffa39e", color: "#c0392b", fontSize: 13 }}>
                {formError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="d-btn" onClick={() => { setShowForm(false); setFormError(null); }}>Cancel</button>
              <button
                className="d-btn d-btn-primary"
                onClick={handleGenerate}
                disabled={isPending || !keyName.trim() || selectedScopes.length === 0}
              >
                {isPending ? "Generating…" : "Generate key"}
              </button>
            </div>
          </div>
        )}

        {/* Active keys */}
        <div className="glass-card" style={{ overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--d-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16 }}>Active API keys</div>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>{active.length} key{active.length !== 1 ? "s" : ""}</div>
          </div>

          {active.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--d-ink-3)" }}>
              No active API keys. Generate one to connect n8n or other integrations.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                  {["Name", "Prefix", "Scopes", "Last used", "Created", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px", textAlign: "left", fontSize: 11,
                        fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.07em", color: "var(--d-ink-3)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((key) => (
                  <tr key={key.id} className="table-row">
                    <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>{key.name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <code style={{ fontSize: 12, fontFamily: "var(--dash-mono)", background: "var(--bg-deep)", padding: "2px 6px", borderRadius: 4 }}>
                        {key.prefix}…
                      </code>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {key.scopes.map((s) => (
                          <span key={s} className="pill pill-blue" style={{ fontSize: 10 }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--d-ink-3)" }}>{fmtDate(key.lastUsedAt)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--d-ink-3)" }}>{fmtDate(key.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        className="d-btn"
                        style={{ fontSize: 12, padding: "4px 10px", color: "var(--oxblood)" }}
                        disabled={isPending}
                        onClick={() => handleRevoke(key.id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Revoked keys (collapsed) */}
        {revoked.length > 0 && (
          <div className="glass-card" style={{ padding: "14px 20px" }}>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
              {revoked.length} revoked key{revoked.length !== 1 ? "s" : ""} not shown
            </div>
          </div>
        )}

        {/* Docs pointer */}
        <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 26 }}>🔌</div>
            <div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 4 }}>Using your API key</div>
              <div style={{ fontSize: 13, color: "var(--d-ink-3)", lineHeight: 1.6 }}>
                Pass the key as a Bearer token:{" "}
                <code style={{ background: "var(--bg-deep)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
                  Authorization: Bearer glas_xxx_yyy
                </code>
                . See the{" "}
                <a href="/developers" style={{ color: "var(--oxblood)" }}>API documentation</a>{" "}
                for full endpoint reference and n8n workflow examples.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
