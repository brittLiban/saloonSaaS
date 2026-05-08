import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId:   string;
  tenantId: string;
  role:     "OWNER" | "MANAGER" | "STAFF" | "READONLY";
  name:     string;
  email:    string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "development-secret-please-change-in-production-32ch",
  cookieName: "gh_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
