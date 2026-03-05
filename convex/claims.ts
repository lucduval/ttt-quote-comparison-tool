import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("claims")
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
      .query("claims")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("claims") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const claim = await ctx.db.get(args.id);
    if (!claim || claim.userId !== identity.subject) {
      throw new Error("Claim not found");
    }
    return claim;
  },
});

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    insurer: v.string(),
    claimType: v.union(v.literal("motor"), v.literal("property")),
    incidentDate: v.optional(v.string()),
    description: v.optional(v.string()),
    estimatedLoss: v.optional(v.string()),
    policeCaseNumber: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("claims", {
      userId: identity.subject,
      contactId: args.contactId,
      insurer: args.insurer,
      claimType: args.claimType,
      status: "draft",
      incidentDate: args.incidentDate,
      description: args.description,
      estimatedLoss: args.estimatedLoss,
      policeCaseNumber: args.policeCaseNumber,
      policyNumber: args.policyNumber,
    });
  },
});

export const storeResult = mutation({
  args: {
    id: v.id("claims"),
    result: v.object({
      formDraft: v.string(),
      emailDraft: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "submitted",
      result: args.result,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("claims"),
    status: v.union(v.literal("draft"), v.literal("submitted")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("claims") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const claim = await ctx.db.get(args.id);
    if (!claim || claim.userId !== identity.subject) {
      throw new Error("Claim not found");
    }
    await ctx.db.delete(args.id);
  },
});
