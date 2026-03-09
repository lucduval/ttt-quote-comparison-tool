import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdmin } from "./lib/roles";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (isAdmin(identity)) {
      return await ctx.db.query("contacts").collect();
    }

    return await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact not found");

    if (!isAdmin(identity) && contact.userId !== identity.subject) {
      throw new Error("Contact not found");
    }
    return contact;
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const admin = isAdmin(identity);

    if (args.query.trim() === "") {
      if (admin) {
        return await ctx.db.query("contacts").collect();
      }
      return await ctx.db
        .query("contacts")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .collect();
    }

    if (admin) {
      return await ctx.db
        .query("contacts")
        .withSearchIndex("search_name", (q) => q.search("name", args.query))
        .collect();
    }

    return await ctx.db
      .query("contacts")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("userId", identity.subject)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("contacts", {
      userId: identity.subject,
      ...args,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact not found");

    if (!isAdmin(identity) && contact.userId !== identity.subject) {
      throw new Error("Contact not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(id, filteredUpdates);
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const contact = await ctx.db.get(args.id);
    if (!contact) throw new Error("Contact not found");

    if (!isAdmin(identity) && contact.userId !== identity.subject) {
      throw new Error("Contact not found");
    }

    await ctx.db.delete(args.id);
  },
});
