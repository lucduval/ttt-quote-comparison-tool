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
      v.literal("extracting"),
      v.literal("extracted"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    selectedCategories: v.optional(v.array(v.string())),
    insuranceType: v.optional(v.string()),
    comparisonType: v.optional(v.union(v.literal("comparison"), v.literal("renewal"))),
    customPrompt: v.optional(v.string()),
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
    extractionStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("scanning"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("failed")
    )),
    ocrPageCount: v.optional(v.number()),
    documentRole: v.optional(v.union(v.literal("current_policy"), v.literal("new_quote"))),
  }).index("by_comparison", ["comparisonId"]),

  sessions: defineTable({
    userId: v.string(),
  }).index("by_user", ["userId"]),

  teams: defineTable({
    name: v.string(),
    ownerId: v.string(),
    description: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  shares: defineTable({
    resourceType: v.union(v.literal("comparison"), v.literal("renewal")),
    resourceId: v.id("comparisons"),
    sharedByUserId: v.string(),
    sharedByName: v.optional(v.string()),
    sharedWithUserId: v.string(),
    sharedWithName: v.optional(v.string()),
    permission: v.union(v.literal("view"), v.literal("edit")),
    note: v.optional(v.string()),
  })
    .index("by_resource", ["resourceId"])
    .index("by_recipient", ["sharedWithUserId"])
    .index("by_sharer", ["sharedByUserId"]),

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
