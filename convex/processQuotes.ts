import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";
import { safeJsonParse, extractJsonObject } from "./lib/jsonParse";

const GEMINI_MODEL = "gemini-2.5-flash";

const COMPARISON_PROMPT = `You are an expert South African insurance broker analyst. You have been provided with extracted data from insurance documents for the same client.

One document may be labelled [CURRENT POLICY] — this is the client's existing cover and serves as the baseline. All others are labelled [NEW QUOTE] and represent alternative options being considered.

If no [CURRENT POLICY] is present, treat all documents as quotes being compared side-by-side.

Your task is to produce a concise, professional, compliance-aware comparison.

CRITICAL STYLE RULES — apply to ALL text fields in the JSON output:
- Be CONCISE. Summarise — do not enumerate every detail.
- Use short, direct sentences. Avoid filler, preamble, and repetition.
- Each "analysis" field must be 1-2 sentences MAX highlighting only the most material point(s).
- Each "details" field must be 1 sentence MAX.
- The "recommendation" must be 3-5 sentences MAX — give a clear, decisive verdict, not an essay.
- The "emailDraft" is the PRIMARY deliverable — the actual email the broker sends to their client. It must read like a personal, conversational message from a broker, not a system-generated report. Include all material comparison detail directly in the email with per-category tables.
- Never repeat information already shown in tables within prose sections.
- Only flag cover differences that are MATERIAL to the client's risk profile.

Produce your output as valid JSON with this exact structure:
{
  "summary": "A brief 2-3 sentence summary of the comparison, mentioning whether a current policy baseline was provided",
  "premiumComparison": {
    "items": [
      {
        "insurer": "string",
        "role": "Current Policy or New Quote",
        "monthlyPremium": "string - formatted amount"
      }
    ],
    "difference": "string - plain language description of cost difference vs current policy (or between quotes if no current policy)",
    "cheapest": "string - insurer name"
  },
  "coverComparison": {
    "sections": [
      {
        "sectionName": "string - e.g. Motor, Contents, Buildings, All-Risk",
        "features": [
          {
            "feature": "string - feature or extension name",
            "values": { "insurerName": "string - value or Included/Excluded/Not specified/No Cover" }
          }
        ]
      }
    ]
  },
  "excessComparison": {
    "insurers": {
      "insurerName": {
        "type": "string",
        "details": ["string - excess detail lines per section"],
        "notes": "string"
      }
    },
    "exampleScenarios": [
      {
        "scenario": "string - description e.g. Motor accident claim, Contents theft claim",
        "values": { "insurerName": "string - excess amount" }
      }
    ],
    "analysis": "string - 1-2 sentences on the most significant excess difference only"
  },
  "shortfalls": {
    "gapsInCurrentCover": [
      {
        "item": "string - cover/extension name",
        "section": "string - which policy section e.g. Contents, Motor",
        "availableIn": ["string - insurer names that offer this"],
        "details": "string - one sentence: what is missing and why it matters"
      }
    ],
    "coverAtRisk": [
      {
        "item": "string - cover/extension name",
        "section": "string - which policy section",
        "currentDetails": "string - what the current policy provides",
        "newQuoteDetails": "string - what the new quote provides or does not provide"
      }
    ],
    "analysis": "string - 1-2 sentences on the most critical shortfall or risk only"
  },
  "conditionsDifferences": {
    "insurers": {
      "insurerName": ["string - important condition points"]
    },
    "analysis": "string - 1-2 sentences on the most important conditions difference only"
  },
  "recommendation": "string - 3-5 sentences MAX. Give a clear, decisive verdict: which option is best and why. Briefly note 1-2 trade-offs for alternatives. Do not repeat premium figures or cover details already in the tables.",
  "emailDraft": "string - The actual email the broker sends to their client. This is the PRIMARY deliverable — it must read like a personal, conversational message from a knowledgeable broker, NOT a system-generated report.\\n\\nTONE RULES:\\n- Write as the broker speaking directly to their client in first person.\\n- Greeting: 'Hi [Client Name],' followed by a warm opener like 'I trust that you are well.' — never 'Dear [Client Name],'.\\n- Conversational but professional throughout. No legalese, no jargon, no filler phrases like 'warrants your careful consideration'.\\n- Sign off with something like 'Let me know what you think or if you\\'d like to discuss this in more detail.' then 'Kind regards,' — NO titles, taglines, or 'Expert South African Insurance Broker Analyst' after the name.\\n\\nSTRUCTURE (follow this order exactly):\\n\\n1. GREETING + CONTEXT: 'Hi [Name],' + warm opener + ONE sentence explaining what was compared and which cover categories are included (e.g. 'I\\'ve compared your current insurance with the alternative options, focusing on your premium, vehicle, and household contents cover.').\\n\\n2. MONTHLY PREMIUM COMPARISON: Use a ## heading. Create a markdown pipe table with columns: Option | Monthly Premium. Use short friendly insurer names (not full legal entity names). For the current policy, format as 'Current ([ShortName])'. Order rows cheapest first. Follow the table with ONE sentence noting the cheapest option and the saving (e.g. 'Hybrid offers the most competitive premium, with a meaningful saving compared to your current cover.'). Currency format: R1,203 (no space after R, drop .00 decimals).\\n\\n3. COVER COMPARISON PER CATEGORY: For EACH coverage category present (e.g. Vehicle Cover, Household Contents, Buildings), create a SEPARATE ## headed section with its OWN markdown pipe table. Columns: Feature | Insurer1 | Insurer2 | etc. Only include features with MATERIAL differences between insurers — skip features that are identical across all options. Use short, client-friendly feature names. After each table, add ONE sentence highlighting the most notable difference. If a specific sub-topic within a category has enough nuance to warrant its own section (2+ rows of meaningful variation across insurers, e.g. Power Surge behaviour under loadshedding, Geyser Cover specifics), break it out into its own ### mini-section with its own table.\\n\\n4. KEY POINTS TO CONSIDER: Use a ## heading. List per-insurer bullet points. For EACH insurer, use **InsurerName:** as a bold label followed by 3-5 concise bullet points listing BOTH pros AND cons. Every insurer must have at least one pro and one con. Keep each bullet to one line.\\n\\n5. RECOMMENDATION: Use a ## heading. Maximum 2-3 sentences. One sentence for the recommendation, one for the primary reason, one deferring to the client (e.g. 'but we can proceed in whichever way you prefer'). Do NOT repeat the full analysis or premium figures. Do NOT use catastrophizing language like 'exposing you to considerable financial risks'.\\n\\n6. CLOSING: A warm close like 'Let me know what you think, have any questions, or if you\\'d like to discuss this in more detail.' then 'Kind regards,'\\n\\nFORMATTING RULES:\\n- Use ## for section headings in title case (e.g. '## Monthly Premium Comparison') — NOT ALL CAPS with dash dividers.\\n- Use markdown pipe tables with header separator rows for ALL tabular data.\\n- Use - for bullet points.\\n- Currency: R1,203 format (no space after R, no unnecessary .00).\\n- Use short/friendly insurer names throughout, not full legal entity names (e.g. 'ONE Insurance' not 'ONE Insurance Limited T/A ONE')."
}

IMPORTANT:
- The shortfalls section is CRITICAL. If a current policy is provided:
  - gapsInCurrentCover = cover that exists in new quotes but the client does NOT currently have
  - coverAtRisk = cover the client currently has that is NOT present or is reduced in the new quote options
- If no current policy is provided, set shortfalls.gapsInCurrentCover and shortfalls.coverAtRisk to empty arrays.
- NO COVER: If an extension has included:false or limit:"No Cover" in the extracted data, show "No Cover" in the comparison values for that insurer — never leave it blank.
- UNCERTAIN VALUES: If any extracted value has uncertain:true or sumInsuredUncertain:true, prefix the corresponding value in the comparison output with "⚠ VERIFY: " (e.g. "⚠ VERIFY: R500,000").

Here is the extracted data from the documents:
`;

const RENEWAL_EMAIL_BOILERPLATE = `We have pleasure in enclosing your Renewal due on: {RENEWAL_DATE}

As your broker, we aim to ensure that your policy cover remains suitable for your needs and circumstances. At renewal we review the information currently recorded on your policy; however, we rely on you to inform us of any changes to your circumstances, assets, or insurance requirements that may affect your cover. Please read through all the documentation to ensure that you are familiar with the details regarding your cover, including the cover exclusions, and to confirm that the information noted on your policy schedule is correct, as your premium is based thereon. Incorrect information may invalidate cover or prejudice future claims. Please advise on any changes or amendments that need to be made.

Please familiarise yourself with any updated excesses payable in the event of a loss. The policy wording provides the terms, conditions and cover applicable to your policy and must be read together with the policy schedule. Please note that an annual renewal constitutes a new contract of insurance, and all warranties, endorsements and conditions noted on the renewal schedule will apply from the renewal date.

Main reasons why premiums may change at renewal include:
- 10% increase in insured values on various sections covered (excluding the motor section).
- Vehicle sum insured updated to the current retail value.
- Increase in costs associated with vehicle repairs.
- Any claims and/or non-payment of premiums during the last 12 months.
- Changes in risk factors which may influence your risk profile.`;

const RENEWAL_PROMPT = `You are an expert South African insurance broker analyst. You have been provided with extracted data from TWO documents for the same client:
- [PREVIOUS SCHEDULE] — the client's policy from the prior period (last year's schedule)
- [RENEWAL QUOTE] — the insurer's renewal terms for the upcoming period

Your task is to:
1. Identify EVERY change between the previous schedule and the renewal quote. Focus entirely on what has changed — do not simply describe what stays the same.
2. Review the RENEWAL QUOTE against a standard broker checklist and flag which optional covers are NOT currently on the policy.

CRITICAL STYLE RULES — apply to ALL text fields in the JSON output:
- Be CONCISE. Summarise — do not enumerate every detail in prose.
- Use short, direct sentences. Avoid filler, preamble, and repetition.
- Each "details" field must be 1 sentence MAX.
- The "recommendation" must be 3-5 sentences MAX — decisive, not an essay.
- The "emailDraft" must follow the exact structure described below.
- Never repeat information already shown in tables within prose sections.

Produce your output as valid JSON with this exact structure:
{
  "summary": "string - 2-3 sentence overview of the renewal, mentioning the premium change and the most significant cover or excess changes",
  "premiumChange": {
    "previous": "string - e.g. R2,340/month",
    "renewed": "string - e.g. R2,650/month",
    "changePercent": "string - e.g. +13.2% or -2.1%",
    "annualPrevious": "string or null",
    "annualRenewed": "string or null",
    "note": "string - plain language summary e.g. Premium has increased by R310/month"
  },
  "excessChanges": [
    {
      "section": "string - e.g. Motor, Buildings",
      "item": "string - e.g. Basic Excess, Windscreen Excess",
      "previous": "string - previous excess amount",
      "renewed": "string - renewed excess amount",
      "direction": "increased or decreased or changed"
    }
  ],
  "sumInsuredChanges": [
    {
      "section": "string",
      "item": "string - e.g. Dwelling, Contents, Vehicle",
      "previous": "string - previous sum insured",
      "renewed": "string - renewed sum insured",
      "direction": "increased or decreased"
    }
  ],
  "coverAdded": [
    {
      "item": "string - extension or cover name",
      "section": "string",
      "details": "string - what has been added and any limits"
    }
  ],
  "coverRemoved": [
    {
      "item": "string - extension or cover name",
      "section": "string",
      "details": "string - what has been removed and its previous value"
    }
  ],
  "coverChanged": [
    {
      "item": "string - extension or cover name",
      "section": "string",
      "previous": "string - previous terms/limit",
      "renewed": "string - renewed terms/limit",
      "direction": "increased or decreased or changed"
    }
  ],
  "conditionsChanged": [
    {
      "item": "string - condition name e.g. Surge Arrestor Requirement",
      "section": "string",
      "previous": "string or null",
      "renewed": "string"
    }
  ],
  "renewalChecklist": [
    {
      "section": "string - e.g. Buildings, Contents, Motor, All Risk",
      "item": "string - the cover or detail being checked, e.g. Solar Panels/PV System, Car Hire, Regular Driver",
      "status": "covered or not_covered or verify",
      "currentValue": "string or null - current limit, detail, or value if covered (e.g. 'R50,000 limit', '2 geysers', 'John Smith')",
      "recommendation": "string - 1 sentence action for the client, e.g. 'Please confirm that any solar panels at your property are declared on the policy.'"
    }
  ],
  "recommendation": "string - 3-5 sentences MAX. State whether the renewal is fair value, flag the 1-2 biggest concerns, and suggest clear action items. Do not repeat figures already in the tables.",
  "emailDraft": "string - a professional renewal email. IMPORTANT: The email MUST follow this exact structure:\\n\\nPART 1 — GREETING AND STANDARD NOTICE (always include):\\nStart with 'Dear {CLIENT_NAME},' then include the following standard renewal boilerplate VERBATIM (replace {RENEWAL_DATE} with the actual renewal effective date from the documents):\\n\\n${RENEWAL_EMAIL_BOILERPLATE}\\n\\nPART 2 — RENEWAL ANALYSIS:\\nAfter the standard text, add a section headed 'RENEWAL SUMMARY' with:\\n- A premium change table (| | Previous | Renewed | Change |)\\n- ONE combined key changes table for the 5-8 most material excess, sum insured, and cover changes (columns: Item | Previous | Renewed | Impact)\\n- 2-3 bullet point concerns\\n\\nPART 3 — COVER REVIEW RECOMMENDATIONS:\\nAdd a section headed 'COVER REVIEW' with: 'As part of your policy renewal, please review your policy schedule to ensure that all information and cover amounts remain accurate and suitable for your needs. The points below highlight covers and policy details that are either not currently selected on your policy or that we recommend you verify:'\\nThen for EACH renewalChecklist item with status 'not_covered' or 'verify', include a bullet point grouped by section. Examples:\\n- 'Your Buildings section does not currently include Solar Panels/PV System cover. If you have installed solar panels, please let us know so we can add this to your policy.'\\n- 'Please ensure that the regular driver noted on your Motor section is correct.'\\nOnly include sections that exist on the client's policy. If ALL checklist items are 'covered', write: 'Based on our review, your policy covers all standard items. Please still review the schedule to ensure all details are accurate.'\\n\\nPART 4 — CLOSING:\\nEnd with: 'Should you wish to update any information, adjust sums insured, or add any of the covers mentioned above, please let us know so that we can amend your policy accordingly.\\n\\nIf we do not hear from you, we will proceed with the renewal based on the current information and cover as reflected on your policy schedule.'\\nThen a professional sign-off.\\n\\nFORMATTING RULES: (1) HEADINGS: ALL CAPS. (2) DIVIDERS: dashes (----------) between sections. (3) TABLES: markdown pipe tables with header separator rows. (4) BULLETS: dash + space."
}

RENEWAL CHECKLIST INSTRUCTIONS:
Review the RENEWAL QUOTE data for the following items and populate the renewalChecklist array. Only include checklist items for sections that exist on the policy.

For Buildings sections:
- Solar Panels/PV System: Is solar panel cover declared? (not_covered if absent or not mentioned)
- Inverter/Battery System: Is inverter or battery cover declared? (not_covered if absent or not mentioned)
- Solar Geyser: Is a solar geyser declared? (not_covered if absent or not mentioned)
- Geyser Count: Is the number of geysers stated? (verify — ask client to confirm count is correct)
- Power Surge Cover: Is power surge included as an extension?
- Accidental Damage Cover: Is accidental damage included as an extension?
- Power Surge Protection Clause: Is a surge protection warranty/clause noted? (verify — client should take note)

For Contents sections:
- Power Surge Cover: Is power surge included as an extension?
- Accidental Damage Cover: Is accidental damage included as an extension?
- Security Measures: Are security measures stated in conditions? (verify — ask client to confirm they are accurate)
- Contents Sum Insured: Is the total contents value adequate? (verify — recommend client use a contents inventory to check)

For Motor sections (check per vehicle if multiple):
- Car Hire/Loss of Use: Is car hire cover included?
- Credit Shortfall: Is credit shortfall cover included?
- Tyre and Rim Cover: Is tyre and rim cover included?
- Scratch and Dent Cover: Is scratch and dent cover included?
- Roadside Assistance: Is roadside assistance included?
- Regular Driver: Is the regular driver noted? (verify — ask client to confirm it is correct)
- Parking Address: Are daytime and nighttime parking addresses stated? (verify — ask client to confirm they are correct)
- Vehicle Excess: Note the excess applicable. (verify — ask client to take note of excess payable)
- Vehicle Extras/Accessories: Are extras listed? (not_covered if none declared — remind client that towbars, bullbars, spotlights, etc. must be listed to be insured)

For All Risk / Specified Items sections:
- Specified Items List: Is the list of specified items present? (verify — ask client to ensure list is up to date)
- Replacement Values: Are replacement values stated for each item? (verify — ask client to review and ensure values are correct)

STATUS RULES:
- "covered": The item is explicitly included with a limit or value on the renewal quote.
- "not_covered": The item is absent, excluded, nil, or has "No Cover" on the renewal quote. These are the most important flags.
- "verify": The item is present but the client should confirm the details are still accurate (e.g. regular driver name, parking address, geyser count, contents value).

IMPORTANT:
- If there are NO changes in a category (e.g. no cover was removed), return an empty array for that field.
- NO COVER: If an extension has a nil/zero limit in either document, note it as 'No Cover'.
- UNCERTAIN VALUES: If any extracted value has uncertain:true, prefix it with '⚠ VERIFY: '.
- Focus on material changes — minor wording differences that do not affect cover need not be listed.

Here is the extracted data:
`;

async function generateWithRetry(
  fn: () => Promise<unknown>,
  maxRetries = 4,
  baseDelayMs = 2000
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      const isRetryable =
        error instanceof Error &&
        (msg.includes("429") ||
          msg.includes("503") ||
          msg.includes("resource exhausted") ||
          msg.includes("too many requests") ||
          msg.includes("unavailable") ||
          msg.includes("service unavailable"));

      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `Transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Filter extracted data sections by selected category types.
 * Premium metadata is always included.
 */
function filterBySelectedCategories(
  extractedData: Record<string, unknown>,
  selectedCategories: string[]
): Record<string, unknown> {
  const sections = (extractedData.sections ?? []) as Array<Record<string, unknown>>;
  const filteredSections = sections.filter((section) => {
    const sectionType = (section.sectionType as string) ?? "other";
    return selectedCategories.includes(sectionType);
  });

  return {
    ...extractedData,
    sections: filteredSections,
  };
}

/**
 * Build the extractedDataArray from documents, filtering sections by selected categories.
 */
function buildExtractedPayload(
  documents: Array<{
    fileName: string;
    documentRole?: string;
    insurerName?: string;
    extractedData?: unknown;
  }>,
  selectedCategories: string[],
  roleMapping: Record<string, string>
) {
  return documents
    .filter((doc) => doc.extractedData)
    .map((doc) => {
      const raw = doc.extractedData as Record<string, unknown>;
      const filtered = filterBySelectedCategories(raw, selectedCategories);

      const role =
        roleMapping[doc.documentRole ?? "new_quote"] ?? "NEW QUOTE";
      return { fileName: doc.fileName, role, data: filtered };
    });
}

// ──────────────────────────────────────────────────────────────────
// Stage 2: Comparison synthesis (uses pre-extracted data from Stage 1)
// ──────────────────────────────────────────────────────────────────

export const processQuotes = action({
  args: {
    comparisonId: v.id("comparisons"),
    contactName: v.string(),
    selectedCategories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "processing",
      });

      // Persist selected categories
      await ctx.runMutation(api.comparisons.storeSelectedCategories, {
        id: args.comparisonId,
        selectedCategories: args.selectedCategories,
      });

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      const comparison = await ctx.runQuery(api.comparisons.get, {
        id: args.comparisonId,
      });

      const extractedDataArray = buildExtractedPayload(
        documents,
        args.selectedCategories,
        { current_policy: "CURRENT POLICY", new_quote: "NEW QUOTE" }
      );

      if (extractedDataArray.length < 1) {
        throw new Error("No extracted data found — run extraction first");
      }

      const customPromptBlock = comparison?.customPrompt
        ? `\n\nPRIORITY INSTRUCTION FROM THE BROKER (treat this as the most important guidance for the analysis):\n${comparison.customPrompt}\n`
        : "";

      const comparisonInput =
        COMPARISON_PROMPT +
        customPromptBlock +
        "\n\nClient Name: " +
        args.contactName +
        "\n\n" +
        JSON.stringify(extractedDataArray, null, 2);

      const comparisonResult = (await generateWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: "user", parts: [{ text: comparisonInput }] }],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
          },
        })
      )) as { text: string };

      const comparisonJsonSource = extractJsonObject(comparisonResult.text);
      if (!comparisonJsonSource.trim()) {
        throw new Error("Failed to generate comparison");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = safeJsonParse(
        comparisonJsonSource,
        "comparison generation"
      ) as any;

      await ctx.runMutation(api.comparisons.storeResult, {
        id: args.comparisonId,
        result: {
          summary: result.summary || "",
          premiumComparison: result.premiumComparison || {},
          coverComparison: result.coverComparison || {},
          excessComparison: result.excessComparison || {},
          conditionsDifferences: result.conditionsDifferences || {},
          shortfalls: result.shortfalls || {},
          recommendation: result.recommendation || "",
          emailDraft: result.emailDraft || "",
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Processing failed:", error);
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw error;
    }
  },
});

// ──────────────────────────────────────────────────────────────────
// Stage 2: Renewal synthesis (uses pre-extracted data from Stage 1)
// ──────────────────────────────────────────────────────────────────

export const processRenewal = action({
  args: {
    comparisonId: v.id("comparisons"),
    contactName: v.string(),
    selectedCategories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "processing",
      });

      await ctx.runMutation(api.comparisons.storeSelectedCategories, {
        id: args.comparisonId,
        selectedCategories: args.selectedCategories,
      });

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      const comparison = await ctx.runQuery(api.comparisons.get, {
        id: args.comparisonId,
      });

      if (documents.length < 2) {
        throw new Error(
          "Renewal analysis requires exactly 2 documents: the previous schedule and the renewal quote"
        );
      }

      const extractedDataArray = buildExtractedPayload(
        documents,
        args.selectedCategories,
        { current_policy: "PREVIOUS SCHEDULE", new_quote: "RENEWAL QUOTE" }
      );

      if (extractedDataArray.length < 2) {
        throw new Error(
          "Both documents must be extracted before generating renewal analysis"
        );
      }

      const customPromptBlock = comparison?.customPrompt
        ? `\n\nPRIORITY INSTRUCTION FROM THE BROKER (treat this as the most important guidance for the analysis):\n${comparison.customPrompt}\n`
        : "";

      const renewalInput =
        RENEWAL_PROMPT +
        customPromptBlock +
        "\n\nClient Name: " +
        args.contactName +
        "\n\n" +
        JSON.stringify(extractedDataArray, null, 2);

      const renewalResult = (await generateWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: "user", parts: [{ text: renewalInput }] }],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
          },
        })
      )) as { text: string };

      const renewalJsonSource = extractJsonObject(renewalResult.text);
      if (!renewalJsonSource.trim()) {
        throw new Error("Failed to generate renewal analysis");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = safeJsonParse(
        renewalJsonSource,
        "renewal analysis"
      ) as any;

      await ctx.runMutation(api.comparisons.storeResult, {
        id: args.comparisonId,
        result: {
          summary: result.summary || "",
          premiumComparison: {},
          coverComparison: {},
          excessComparison: {},
          conditionsDifferences: {},
          renewalChanges: result,
          recommendation: result.recommendation || "",
          emailDraft: result.emailDraft || "",
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Renewal processing failed:", error);
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw error;
    }
  },
});
