import type { UserIdentity } from "convex/server";

type IdentityWithMetadata = UserIdentity & {
  publicMetadata?: { role?: string };
};

export function isAdmin(identity: UserIdentity): boolean {
  return (
    (identity as IdentityWithMetadata).publicMetadata?.role === "admin"
  );
}
