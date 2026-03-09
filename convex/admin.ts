import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdmin } from "./lib/roles";

// ── System-wide totals ─────────────────────────────────────────────────────

export const getSystemStats = query({
  args: {
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdmin(identity)) throw new Error("Unauthorized");

    const from = args.fromTs ?? 0;
    const to = args.toTs ?? Date.now();

    const inRange = (ts: number) => ts >= from && ts <= to;
    const matchUser = (uid: string) => !args.userId || uid === args.userId;

    const [contacts, comparisons, claims, sessions] = await Promise.all([
      ctx.db.query("contacts").collect(),
      ctx.db.query("comparisons").collect(),
      ctx.db.query("claims").collect(),
      ctx.db.query("sessions").collect(),
    ]);

    const filteredContacts = contacts.filter(
      (c) => inRange(c._creationTime) && matchUser(c.userId)
    );
    const filteredComparisons = comparisons.filter(
      (c) => inRange(c._creationTime) && matchUser(c.userId)
    );
    const filteredClaims = claims.filter(
      (c) => inRange(c._creationTime) && matchUser(c.userId)
    );
    const filteredSessions = sessions.filter(
      (s) => inRange(s._creationTime) && matchUser(s.userId)
    );

    const uniqueUsers = new Set([
      ...filteredContacts.map((c) => c.userId),
      ...filteredComparisons.map((c) => c.userId),
      ...filteredClaims.map((c) => c.userId),
    ]).size;

    const totalComparisons = filteredComparisons.filter(
      (c) => c.comparisonType !== "renewal"
    ).length;
    const totalRenewals = filteredComparisons.filter(
      (c) => c.comparisonType === "renewal"
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const loginsToday = sessions.filter(
      (s) =>
        s._creationTime >= today.getTime() &&
        matchUser(s.userId)
    ).length;

    return {
      uniqueUsers,
      totalContacts: filteredContacts.length,
      totalComparisons,
      totalRenewals,
      totalClaims: filteredClaims.length,
      loginsToday,
      totalLogins: filteredSessions.length,
    };
  },
});

// ── Per-user breakdown ─────────────────────────────────────────────────────

export const getUserBreakdown = query({
  args: {
    fromTs: v.optional(v.number()),
    toTs: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdmin(identity)) throw new Error("Unauthorized");

    const from = args.fromTs ?? 0;
    const to = args.toTs ?? Date.now();

    const inRange = (ts: number) => ts >= from && ts <= to;
    const matchUser = (uid: string) => !args.userId || uid === args.userId;

    const [contacts, comparisons, claims] = await Promise.all([
      ctx.db.query("contacts").collect(),
      ctx.db.query("comparisons").collect(),
      ctx.db.query("claims").collect(),
    ]);

    const userMap = new Map<
      string,
      {
        userId: string;
        contacts: number;
        comparisons: number;
        renewals: number;
        claims: number;
        lastActive: number;
      }
    >();

    const ensure = (userId: string) => {
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          contacts: 0,
          comparisons: 0,
          renewals: 0,
          claims: 0,
          lastActive: 0,
        });
      }
      return userMap.get(userId)!;
    };

    for (const c of contacts) {
      if (!inRange(c._creationTime) || !matchUser(c.userId)) continue;
      const u = ensure(c.userId);
      u.contacts++;
      if (c._creationTime > u.lastActive) u.lastActive = c._creationTime;
    }

    for (const c of comparisons) {
      if (!inRange(c._creationTime) || !matchUser(c.userId)) continue;
      const u = ensure(c.userId);
      if (c.comparisonType === "renewal") u.renewals++;
      else u.comparisons++;
      if (c._creationTime > u.lastActive) u.lastActive = c._creationTime;
    }

    for (const c of claims) {
      if (!inRange(c._creationTime) || !matchUser(c.userId)) continue;
      const u = ensure(c.userId);
      u.claims++;
      if (c._creationTime > u.lastActive) u.lastActive = c._creationTime;
    }

    return Array.from(userMap.values()).sort(
      (a, b) => b.lastActive - a.lastActive
    );
  },
});

// ── Daily activity timeline ────────────────────────────────────────────────

export const getActivityTimeline = query({
  args: {
    fromTs: v.number(),
    toTs: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isAdmin(identity)) throw new Error("Unauthorized");

    const matchUser = (uid: string) => !args.userId || uid === args.userId;

    const [comparisons, claims, sessions] = await Promise.all([
      ctx.db.query("comparisons").collect(),
      ctx.db.query("claims").collect(),
      ctx.db.query("sessions").collect(),
    ]);

    const toDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);

    type DayBucket = {
      date: string;
      comparisons: number;
      renewals: number;
      claims: number;
      logins: number;
    };

    const buckets = new Map<string, DayBucket>();

    const ensureDay = (date: string): DayBucket => {
      if (!buckets.has(date)) {
        buckets.set(date, { date, comparisons: 0, renewals: 0, claims: 0, logins: 0 });
      }
      return buckets.get(date)!;
    };

    // Pre-fill every day in the range so the chart has no gaps
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const days = Math.min(366, Math.ceil((args.toTs - args.fromTs) / MS_PER_DAY));
    for (let i = 0; i < days; i++) {
      const d = new Date(args.fromTs + i * MS_PER_DAY).toISOString().slice(0, 10);
      ensureDay(d);
    }

    for (const c of comparisons) {
      if (c._creationTime < args.fromTs || c._creationTime > args.toTs) continue;
      if (!matchUser(c.userId)) continue;
      const b = ensureDay(toDay(c._creationTime));
      if (c.comparisonType === "renewal") b.renewals++;
      else b.comparisons++;
    }

    for (const c of claims) {
      if (c._creationTime < args.fromTs || c._creationTime > args.toTs) continue;
      if (!matchUser(c.userId)) continue;
      ensureDay(toDay(c._creationTime)).claims++;
    }

    for (const s of sessions) {
      if (s._creationTime < args.fromTs || s._creationTime > args.toTs) continue;
      if (!matchUser(s.userId)) continue;
      ensureDay(toDay(s._creationTime)).logins++;
    }

    return Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  },
});
