import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const share = mutation({
  args: {
    resourceType: v.union(v.literal("comparison"), v.literal("renewal")),
    resourceId: v.id("comparisons"),
    sharedWithUserId: v.string(),
    sharedWithName: v.optional(v.string()),
    permission: v.union(v.literal("view"), v.literal("edit")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify caller owns the resource
    const comparison = await ctx.db.get(args.resourceId);
    if (!comparison) throw new Error("Resource not found");
    if (comparison.userId !== identity.subject) {
      throw new Error("Only the owner can share this resource");
    }

    // Can't share with yourself
    if (args.sharedWithUserId === identity.subject) {
      throw new Error("Cannot share with yourself");
    }

    // Check for existing share
    const existingShares = await ctx.db
      .query("shares")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .collect();

    const existing = existingShares.find(
      (s) => s.sharedWithUserId === args.sharedWithUserId
    );

    if (existing) {
      // Update existing share
      await ctx.db.patch(existing._id, {
        permission: args.permission,
        note: args.note,
        sharedByName: identity.name ?? undefined,
        sharedWithName: args.sharedWithName,
      });
      return existing._id;
    }

    return await ctx.db.insert("shares", {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      sharedByUserId: identity.subject,
      sharedByName: identity.name ?? undefined,
      sharedWithUserId: args.sharedWithUserId,
      sharedWithName: args.sharedWithName,
      permission: args.permission,
      note: args.note,
    });
  },
});

export const updatePermission = mutation({
  args: {
    shareId: v.id("shares"),
    permission: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");
    if (share.sharedByUserId !== identity.subject) {
      throw new Error("Only the sharer can update permissions");
    }

    await ctx.db.patch(args.shareId, { permission: args.permission });
  },
});

export const revoke = mutation({
  args: { shareId: v.id("shares") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");
    if (share.sharedByUserId !== identity.subject) {
      throw new Error("Only the sharer can revoke access");
    }

    await ctx.db.delete(args.shareId);
  },
});

export const listByResource = query({
  args: { resourceId: v.id("comparisons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Only owner can see share list
    const comparison = await ctx.db.get(args.resourceId);
    if (!comparison) return [];
    if (comparison.userId !== identity.subject) return [];

    return await ctx.db
      .query("shares")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .collect();
  },
});

export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const shares = await ctx.db
      .query("shares")
      .withIndex("by_recipient", (q) =>
        q.eq("sharedWithUserId", identity.subject)
      )
      .collect();

    // Enrich with comparison data
    const enriched = await Promise.all(
      shares.map(async (share) => {
        const comparison = await ctx.db.get(share.resourceId);
        if (!comparison) return null;

        const contact = await ctx.db.get(comparison.contactId);

        return {
          ...share,
          comparison: {
            _id: comparison._id,
            title: comparison.title,
            status: comparison.status,
            insuranceType: comparison.insuranceType,
            comparisonType: comparison.comparisonType,
            _creationTime: comparison._creationTime,
          },
          contactName: contact?.name,
        };
      })
    );

    return enriched.filter(Boolean);
  },
});

export const getShareForResource = query({
  args: { resourceId: v.id("comparisons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const shares = await ctx.db
      .query("shares")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .collect();

    return (
      shares.find((s) => s.sharedWithUserId === identity.subject) ?? null
    );
  },
});
