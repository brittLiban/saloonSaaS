"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", salonName: "", timezone: "America/Los_Angeles" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Registration failed."); return; }
      router.push(data.redirect ?? "/app/today");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const timezones = [
    "America/Los_Angeles", "America/Denver", "America/Chicago",
    "America/New_York", "America/Anchorage", "Pacific/Honolulu",
  ];

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <Link href="/" className="brand" style={{ marginBottom: 8 }}>
          <span className="brand-mark" style={{ background: "var(--acc)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/>
            </svg>
          </span>
          <span className="brand-text"><span className="brand-name">Paw Reception</span></span>
        </Link>
        <h1>Start your free trial</h1>
        <p>14 days free. No credit card required.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div className="field">
              <label>Your name</label>
              <input placeholder="Nina Reyes" value={form.name} onChange={set("name")} required />
            </div>
            <div className="field">
              <label>Salon name</label>
              <input placeholder="Nina's Pet Salon" value={form.salonName} onChange={set("salonName")} required />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="owner@salon.com" value={form.email} onChange={set("email")} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="8+ characters" value={form.password} onChange={set("password")} minLength={8} required />
          </div>
          <div className="field">
            <label>Timezone</label>
            <select value={form.timezone} onChange={set("timezone")}>
              {timezones.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
            </select>
          </div>
          {error && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button className="btn btn-orange auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating your salon…" : "Create my salon →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--acc)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
