import { mutation } from "./_generated/server";

export const track = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.insert("sessions", { userId: identity.subject });
  },
});
