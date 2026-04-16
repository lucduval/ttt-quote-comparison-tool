import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      ownerId: identity.subject,
      description: args.description,
    });

    // Add creator as owner member
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: identity.subject,
      userName: identity.name ?? undefined,
      userEmail: identity.email ?? undefined,
      role: "owner",
    });

    return teamId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team ? { ...team, myRole: m.role } : null;
      })
    );

    return teams.filter(Boolean);
  },
});

export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.id);
    if (!team) throw new Error("Team not found");

    // Verify membership
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.id).eq("userId", identity.subject)
      )
      .first();

    if (!membership) throw new Error("Team not found");

    return { ...team, myRole: membership.role };
  },
});

export const listMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Verify caller is a member
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", identity.subject)
      )
      .first();

    if (!membership) throw new Error("Not a team member");

    return await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const addMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== identity.subject) {
      throw new Error("Only the team owner can add members");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();

    if (existing) throw new Error("User is already a team member");

    return await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      role: "member",
    });
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== identity.subject) {
      throw new Error("Only the team owner can remove members");
    }

    if (args.userId === identity.subject) {
      throw new Error("Cannot remove yourself from the team");
    }

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .first();

    if (!membership) throw new Error("User is not a team member");

    await ctx.db.delete(membership._id);
  },
});

export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.id);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== identity.subject) {
      throw new Error("Only the team owner can update the team");
    }

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const team = await ctx.db.get(args.id);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== identity.subject) {
      throw new Error("Only the team owner can delete the team");
    }

    // Remove all members
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.id);
  },
});
