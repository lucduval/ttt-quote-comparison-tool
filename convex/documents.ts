import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByComparison = query({
  args: { comparisonId: v.id("comparisons") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_comparison", (q) =>
        q.eq("comparisonId", args.comparisonId)
      )
      .collect();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

export const addDocument = mutation({
  args: {
    comparisonId: v.id("comparisons"),
    fileName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      comparisonId: args.comparisonId,
      fileName: args.fileName,
      storageId: args.storageId,
    });
  },
});
