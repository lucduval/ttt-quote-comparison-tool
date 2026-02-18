import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contacts: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

  comparisons: defineTable({
    userId: v.string(),
    contactId: v.id("contacts"),
    title: v.string(),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    insuranceType: v.optional(v.string()),
    result: v.optional(
      v.object({
        summary: v.string(),
        premiumComparison: v.any(),
        coverComparison: v.any(),
        excessComparison: v.any(),
        conditionsDifferences: v.any(),
        recommendation: v.string(),
        emailDraft: v.string(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_contact", ["contactId"]),

  documents: defineTable({
    comparisonId: v.id("comparisons"),
    fileName: v.string(),
    storageId: v.id("_storage"),
    insurerName: v.optional(v.string()),
    extractedData: v.optional(v.any()),
  }).index("by_comparison", ["comparisonId"]),
});
