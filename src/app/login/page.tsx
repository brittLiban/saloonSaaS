import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  return (
    <main className="login-wrap">
      <section className="card login-card">
        <Link href="/" className="brand">
          <BrandMark />
          <span>Glasshound</span>
        </Link>
        <h1 className="display">Sign in</h1>
        <p className="subtle">Authentication is scaffolded for Sprint 1. This form will connect to secure tenant sessions.</p>
        <label className="field">
          Email
          <input type="email" placeholder="owner@salon.com" />
        </label>
        <label className="field">
          Password
          <input type="password" placeholder="Password" />
        </label>
        <div className="hero-actions">
          <Link href="/app" className="btn btn-primary">Open demo tenant</Link>
          <Link href="/" className="btn">Back</Link>
        </div>
      </section>
    </main>
  );
}
