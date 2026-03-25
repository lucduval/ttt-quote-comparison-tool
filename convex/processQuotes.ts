import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { safeJsonParse } from "./lib/jsonParse";

const EXTRACTION_PROMPT = `You are an expert South African insurance analyst. Analyze this insurance policy document or quote schedule and extract ALL sections it contains.

FIRST, look for a "Summary of Cover", "Schedule of Benefits", "Contents of Cover", "Policy Benefits", or "Cover at a Glance" section — this is the primary source of truth for what is and is not covered. Use this section to determine inclusions and exclusions before reading individual section details.

Personal lines policies typically have multiple sections: Motor, Buildings, Contents, All-Risk/Portable Possessions, Personal Liability, etc. Extract every section present.

Return ONLY valid JSON with this exact structure:
{
  "insurerName": "string - name of the insurance company",
  "policyNumber": "string or null",
  "insuredName": "string or null",
  "effectiveDate": "string or null",
  "totalPremium": {
    "monthly": number or null,
    "annual": number or null,
    "currency": "ZAR"
  },
  "sections": [
    {
      "sectionName": "string - exact section name as it appears (e.g. Motor, Buildings, Contents, All-Risk, Personal Liability, Accidental Damage)",
      "sectionType": "motor | buildings | contents | all_risk | liability | other",
      "insuredItem": "string - what is insured (e.g. 2020 Toyota Corolla, Dwelling at 12 Main St, Contents of home)",
      "sumInsured": "string or null - insured amount e.g. R500,000",
      "sumInsuredUncertain": true or false,
      "premium": {
        "monthly": number or null,
        "annual": number or null
      },
      "basisOfIndemnity": "string or null - e.g. Retail Value, Market Value, Replacement Value, First Loss",
      "excess": {
        "standard": "string - the standard/basic excess amount or formula",
        "special": ["string - any additional or special excess clauses, e.g. driver under 25 excess, theft excess"]
      },
      "extensions": [
        {
          "name": "string - extension name, e.g. Power Surge, Geyser, Car Hire/Loss of Use, Accidental Damage, Roadside Assistance, SASRIA, Legal Costs, Personal Accident, Credit Shortfall, Towing, Glass, Windscreen, Tyre and Rim, Scratch and Dent, Excess Waiver",
          "included": true or false,
          "limit": "string or null - monetary limit if applicable, or 'No Cover' if nil/zero/excluded",
          "uncertain": true or false,
          "details": "string or null - any relevant details or conditions"
        }
      ],
      "inclusions": ["string - specific items or perils included"],
      "exclusions": ["string - specific exclusions for this section"],
      "specialConditions": ["string - warranties, requirements, endorsements"]
    }
  ],
  "sasria": "Included or Excluded or Not specified",
  "additionalNotes": "string - any other relevant policy-wide information"
}

CRITICAL INSTRUCTIONS:
- Extract EVERY section in the document, not just motor
- For Contents sections: explicitly check for and list Power Surge cover as an extension (included true/false with limit)
- For All-Risk sections: list each scheduled item with its insured value
- For Motor sections: check for Car Hire/Loss of Use, Roadside Assistance, Windscreen, Tyre and Rim, Scratch and Dent, Credit Shortfall, Excess Waiver as extensions
- For Buildings sections: check for Geyser, Power Surge, Accidental Damage as extensions
- Capture ALL excess amounts accurately - read each line carefully, excess structures are often complex
- NIL LIMITS: If an extension has a nil, zero, or R0 limit, set limit to "No Cover" and included to false. Do NOT list it as included with a blank limit.
- EXCLUSIONS: Do NOT list an item as an extension with included:true if the Summary of Cover or policy wording marks it as excluded, not covered, or not included. Set included:false instead.
- UNCERTAIN FLAG: Set uncertain:true on any extension or sumInsuredUncertain:true on any sum insured where you cannot clearly read the value, the document is ambiguous, or you are making an educated guess. Set to false when you are confident.
- If a field cannot be determined from the document, use null
- Do not invent information - only extract what is explicitly stated`;

const COMPARISON_PROMPT = `You are an expert South African insurance broker analyst. You have been provided with extracted data from insurance documents for the same client.

One document may be labelled [CURRENT POLICY] — this is the client's existing cover and serves as the baseline. All others are labelled [NEW QUOTE] and represent alternative options being considered.

If no [CURRENT POLICY] is present, treat all documents as quotes being compared side-by-side.

Your task is to produce a comprehensive, professional, compliance-aware comparison.

Produce your output as valid JSON with this exact structure:
{
  "summary": "A brief 2-3 sentence summary of the comparison, mentioning whether a current policy baseline was provided",
  "premiumComparison": {
    "items": [
      {
        "insurer": "string",
        "role": "Current Policy or New Quote",
        "monthlyPremium": "string - formatted amount",
        "annualPremium": "string - formatted amount or N/A"
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
    "analysis": "string - professional analysis of excess structures"
  },
  "shortfalls": {
    "gapsInCurrentCover": [
      {
        "item": "string - cover/extension name",
        "section": "string - which policy section e.g. Contents, Motor",
        "availableIn": ["string - insurer names that offer this"],
        "details": "string - brief explanation of what the client is missing"
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
    "analysis": "string - professional summary of shortfalls and risks"
  },
  "conditionsDifferences": {
    "insurers": {
      "insurerName": ["string - important condition points"]
    },
    "analysis": "string - professional analysis of conditions"
  },
  "recommendation": "string - detailed professional recommendation with reasoning. If comparing against a current policy, reference it explicitly. Include scenarios for different client priorities (cost vs risk). Be balanced and compliant.",
  "emailDraft": "string - a complete, professional email ready to send to the client. Use the following strict formatting rules: (1) HEADINGS: ALL CAPS for section headings, e.g. PREMIUM COMPARISON, MOTOR COVER COMPARISON. (2) DIVIDERS: a line of dashes (----------) between major sections. (3) BULLETS: a dash followed by a space (- ) for bullet points. (4) TABLES: for ALL comparative or side-by-side data, you MUST use markdown pipe tables with a header separator row, for example: | Insurer | Role | Monthly Premium | followed by |---------|------|------------------| followed by data rows. Use tables for: the premium comparison (columns: Insurer, Role, Monthly Premium), each cover section comparison (columns: Feature, then one column per insurer), and the excess comparison (columns: Insurer, Section, Excess). (5) Blank lines between every section. Include: greeting (Dear [Client Name]), premium comparison table, per-section cover comparison table(s), excess comparison table, shortfalls summary, recommendation, and professional closing. The email must be comprehensive enough to serve as the record of advice."
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

const RENEWAL_PROMPT = `You are an expert South African insurance broker analyst. You have been provided with extracted data from TWO documents for the same client:
- [PREVIOUS SCHEDULE] — the client's policy from the prior period (last year's schedule)
- [RENEWAL QUOTE] — the insurer's renewal terms for the upcoming period

Your task is to identify EVERY change between the previous schedule and the renewal quote. Focus entirely on what has changed — do not simply describe what stays the same.

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
  "recommendation": "string - professional recommendation for the broker. Comment on whether the renewal represents good value, flag any concerns (significant excess increases, removed cover, large premium hike), and suggest any action items.",
  "emailDraft": "string - a complete, professional email to the client summarising the renewal changes. Use the following strict formatting rules: (1) HEADINGS: ALL CAPS for section headings, e.g. PREMIUM CHANGE, COVER CHANGES. (2) DIVIDERS: a line of dashes (----------) between major sections. (3) BULLETS: a dash followed by a space (- ) for bullet points. (4) TABLES: for ALL comparative or side-by-side data, you MUST use markdown pipe tables with a header separator row. Use a table for the premium change (columns: | | Previous | Renewed | Change |), a table for excess changes (columns: Section | Item | Previous | Renewed), and a table for cover changes (columns: Item | Section | Previous | Renewed). (5) Blank lines between every section. Include: greeting (Dear [Client Name]), premium change table, excess changes table (if any), cover changes table (if any), any concerns or recommendations, and professional closing."
}

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

// Shared helper: fetch files, upload to Gemini, poll until ACTIVE
async function uploadAndActivateFiles(
  ai: GoogleGenAI,
  documents: Array<{
    _id: string;
    fileName: string;
    storageId: string;
    mimeType?: string;
    insurerName?: string;
    documentRole?: string;
  }>,
  ctx: { storage: { getUrl: (id: string) => Promise<string | null> } }
) {
  const uploadedFiles = await Promise.all(
    documents.map(async (doc) => {
      const fileUrl = await ctx.storage.getUrl(doc.storageId as Parameters<typeof ctx.storage.getUrl>[0]);
      if (!fileUrl) throw new Error(`Could not get URL for file: ${doc.fileName}`);

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const mimeType = doc.mimeType ?? "application/pdf";

      const blob = new Blob([arrayBuffer], { type: mimeType });
      const geminiFile = await ai.files.upload({
        file: blob,
        config: { mimeType },
      });

      return { doc, geminiFile };
    })
  );

  const activeFiles = await Promise.all(
    uploadedFiles.map(async ({ doc, geminiFile }) => {
      let file = geminiFile;
      let attempts = 0;
      while (file.state === "PROCESSING" && attempts < 15) {
        await new Promise((r) => setTimeout(r, 2000));
        file = await ai.files.get({ name: file.name! });
        attempts++;
      }
      if (file.state !== "ACTIVE") {
        throw new Error(`File failed to become ready: ${doc.fileName}`);
      }
      return { doc, geminiFile: file };
    })
  );

  return activeFiles;
}

export const processQuotes = action({
  args: {
    comparisonId: v.id("comparisons"),
    contactName: v.string(),
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

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      // Fetch the comparison record to check for a custom prompt
      const comparison = await ctx.runQuery(api.comparisons.get, {
        id: args.comparisonId,
      });

      const newQuotes = documents.filter((d) => d.documentRole !== "current_policy");
      const currentPolicy = documents.find((d) => d.documentRole === "current_policy");

      if (newQuotes.length < 1 || (!currentPolicy && documents.length < 2)) {
        throw new Error(
          "Upload at least 2 new quotes, or 1 current policy schedule + 1 new quote"
        );
      }

      const activeFiles = await uploadAndActivateFiles(ai, documents, ctx);

      // Phase 3: Extract data from all documents in parallel using file URIs.
      const extractedDataArray = await Promise.all(
        activeFiles.map(async ({ doc, geminiFile }) => {
          const extractionResult = (await generateWithRetry(() =>
            ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: createUserContent([
                EXTRACTION_PROMPT,
                createPartFromUri(geminiFile.uri!, geminiFile.mimeType!),
              ]),
              config: {
                responseMimeType: "application/json",
                maxOutputTokens: 65536,
              },
            })
          )) as { text: string };

          const jsonSource =
            extractionResult.text.match(/\{[\s\S]*\}/)?.[0] ?? extractionResult.text;
          if (!jsonSource.trim()) {
            throw new Error(`Failed to extract data from ${doc.fileName}`);
          }

          const data = safeJsonParse(jsonSource, `extraction of ${doc.fileName}`);

          // Prefer broker-supplied insurer name over AI-extracted name
          if (doc.insurerName) {
            (data as any).insurerName = doc.insurerName;
          }

          const role =
            doc.documentRole === "current_policy" ? "CURRENT POLICY" : "NEW QUOTE";
          return { fileName: doc.fileName, role, data };
        })
      );

      // Phase 4: Generate comparison from structured extracted data.
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
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: comparisonInput }] }],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
          },
        })
      )) as { text: string };

      const comparisonJsonSource =
        comparisonResult.text.match(/\{[\s\S]*\}/)?.[0] ?? comparisonResult.text;
      if (!comparisonJsonSource.trim()) {
        throw new Error("Failed to generate comparison");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = safeJsonParse(comparisonJsonSource, "comparison generation") as any;

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

      // Phase 5: Clean up uploaded files from Gemini.
      await Promise.allSettled(
        activeFiles.map(({ geminiFile }) =>
          ai.files.delete({ name: geminiFile.name! })
        )
      );

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

export const processRenewal = action({
  args: {
    comparisonId: v.id("comparisons"),
    contactName: v.string(),
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

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      // Fetch the comparison record to check for a custom prompt
      const comparison = await ctx.runQuery(api.comparisons.get, {
        id: args.comparisonId,
      });

      if (documents.length < 2) {
        throw new Error(
          "Renewal analysis requires exactly 2 documents: the previous schedule and the renewal quote"
        );
      }

      const activeFiles = await uploadAndActivateFiles(ai, documents, ctx);

      // Extract both documents
      const extractedDataArray = await Promise.all(
        activeFiles.map(async ({ doc, geminiFile }) => {
          const extractionResult = (await generateWithRetry(() =>
            ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: createUserContent([
                EXTRACTION_PROMPT,
                createPartFromUri(geminiFile.uri!, geminiFile.mimeType!),
              ]),
              config: { responseMimeType: "application/json" },
            })
          )) as { text: string };

          const jsonSource =
            extractionResult.text.match(/\{[\s\S]*\}/)?.[0] ?? extractionResult.text;
          if (!jsonSource.trim()) {
            throw new Error(`Failed to extract data from ${doc.fileName}`);
          }

          const data = safeJsonParse(jsonSource, `extraction of ${doc.fileName}`);

          if (doc.insurerName) {
            (data as any).insurerName = doc.insurerName;
          }

          // current_policy = previous schedule, new_quote = renewal quote
          const role =
            doc.documentRole === "current_policy" ? "PREVIOUS SCHEDULE" : "RENEWAL QUOTE";
          return { fileName: doc.fileName, role, data };
        })
      );

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
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: renewalInput }] }],
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 65536,
          },
        })
      )) as { text: string };

      const renewalJsonSource =
        renewalResult.text.match(/\{[\s\S]*\}/)?.[0] ?? renewalResult.text;
      if (!renewalJsonSource.trim()) {
        throw new Error("Failed to generate renewal analysis");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = safeJsonParse(renewalJsonSource, "renewal analysis") as any;

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

      await Promise.allSettled(
        activeFiles.map(({ geminiFile }) =>
          ai.files.delete({ name: geminiFile.name! })
        )
      );

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
