export const ALL_SCOPES = [
  "appointments:read",
  "appointments:write",
  "clients:read",
  "clients:write",
  "services:read",
  "webhooks:write",
] as const;

export type ApiScope = (typeof ALL_SCOPES)[number];
