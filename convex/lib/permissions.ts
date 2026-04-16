import type { GenericQueryCtx } from "convex/server";
import type { UserIdentity } from "convex/server";
import { isAdmin } from "./roles";
import type { DataModel } from "../_generated/dataModel";
import type { Id } from "../_generated/dataModel";

export type Permission = "owner" | "admin" | "view" | "edit";

export async function getComparisonAccess(
  ctx: GenericQueryCtx<DataModel>,
  identity: UserIdentity,
  comparisonId: Id<"comparisons">
): Promise<{ allowed: boolean; permission: Permission | null }> {
  const comparison = await ctx.db.get(comparisonId);
  if (!comparison) return { allowed: false, permission: null };

  if (comparison.userId === identity.subject) {
    return { allowed: true, permission: "owner" };
  }

  if (isAdmin(identity)) {
    return { allowed: true, permission: "admin" };
  }

  // Check shares table
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_resource", (q) => q.eq("resourceId", comparisonId))
    .collect();

  const share = shares.find((s) => s.sharedWithUserId === identity.subject);
  if (share) {
    return { allowed: true, permission: share.permission };
  }

  return { allowed: false, permission: null };
}
