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
    comparisonType: v.optional(v.union(v.literal("comparison"), v.literal("renewal"))),
    result: v.optional(
      v.object({
        summary: v.string(),
        premiumComparison: v.any(),
        coverComparison: v.any(),
        excessComparison: v.any(),
        conditionsDifferences: v.any(),
        shortfalls: v.optional(v.any()),
        renewalChanges: v.optional(v.any()),
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
    mimeType: v.optional(v.string()),
    insurerName: v.optional(v.string()),
    extractedData: v.optional(v.any()),
    documentRole: v.optional(v.union(v.literal("current_policy"), v.literal("new_quote"))),
  }).index("by_comparison", ["comparisonId"]),

  claims: defineTable({
    userId: v.string(),
    contactId: v.id("contacts"),
    insurer: v.string(),
    claimType: v.union(v.literal("motor"), v.literal("property")),
    status: v.union(v.literal("draft"), v.literal("submitted")),
    incidentDate: v.optional(v.string()),
    description: v.optional(v.string()),
    estimatedLoss: v.optional(v.string()),
    policeCaseNumber: v.optional(v.string()),
    policyNumber: v.optional(v.string()),
    result: v.optional(
      v.object({
        formDraft: v.string(),
        emailDraft: v.string(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_contact", ["contactId"]),
});
