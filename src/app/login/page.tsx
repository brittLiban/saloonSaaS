"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Login failed."); return; }
      router.push(data.redirect ?? "/app/today");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="brand" style={{ marginBottom: 8 }}>
          <span className="brand-mark" style={{ background: "var(--acc)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/>
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">Glasshound</span>
          </span>
        </Link>
        <h1>Welcome back</h1>
        <p>Sign in to your salon dashboard.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="owner@salon.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button className="btn btn-orange auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--ink-3)" }}>
          Demo: <strong>nina@example.com</strong> / <strong>demo-password</strong>
        </p>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: "var(--acc)", fontWeight: 600 }}>Start free trial</Link>
        </p>
      </div>
    </div>
  );
}
