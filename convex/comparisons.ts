import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("comparisons")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const listByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("comparisons")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("comparisons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comparison = await ctx.db.get(args.id);
    if (!comparison || comparison.userId !== identity.subject) {
      throw new Error("Comparison not found");
    }
    return comparison;
  },
});

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    title: v.string(),
    insuranceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("comparisons", {
      userId: identity.subject,
      contactId: args.contactId,
      title: args.title,
      status: "uploading",
      insuranceType: args.insuranceType,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("comparisons"),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const storeResult = mutation({
  args: {
    id: v.id("comparisons"),
    result: v.object({
      summary: v.string(),
      premiumComparison: v.any(),
      coverComparison: v.any(),
      excessComparison: v.any(),
      conditionsDifferences: v.any(),
      recommendation: v.string(),
      emailDraft: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "completed",
      result: args.result,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("comparisons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comparison = await ctx.db.get(args.id);
    if (!comparison || comparison.userId !== identity.subject) {
      throw new Error("Comparison not found");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_comparison", (q) => q.eq("comparisonId", args.id))
      .collect();

    for (const doc of documents) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(doc._id);
    }

    await ctx.db.delete(args.id);
  },
});
