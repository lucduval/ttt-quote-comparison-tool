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
    mimeType: v.optional(v.string()),
    documentRole: v.optional(v.union(v.literal("current_policy"), v.literal("new_quote"))),
    insurerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      comparisonId: args.comparisonId,
      fileName: args.fileName,
      storageId: args.storageId,
      mimeType: args.mimeType,
      documentRole: args.documentRole,
      insurerName: args.insurerName,
    });
  },
});

export const removeDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Document not found");
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(args.id);
  },
});

export const updateInsurerName = mutation({
  args: { id: v.id("documents"), insurerName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.patch(args.id, {
      insurerName: args.insurerName || undefined,
    });
  },
});
