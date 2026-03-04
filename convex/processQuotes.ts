import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";

const EXTRACTION_PROMPT = `You are an expert South African insurance analyst. Analyze this insurance policy document or quote schedule and extract ALL sections it contains. Personal lines policies typically have multiple sections: Motor, Buildings, Contents, All-Risk/Portable Possessions, Personal Liability, etc. Extract every section present.

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
          "name": "string - extension name, e.g. Power Surge, Geyser, Car Hire/Loss of Use, Accidental Damage, Roadside Assistance, SASRIA, Legal Costs, Personal Accident, Credit Shortfall, Towing, Glass, Windscreen",
          "included": true or false,
          "limit": "string or null - monetary limit if applicable",
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

IMPORTANT INSTRUCTIONS:
- Extract EVERY section in the document, not just motor
- For Contents sections: explicitly check for and list Power Surge cover as an extension (included true/false with limit)
- For All-Risk sections: list each scheduled item with its insured value
- For Motor sections: check for Car Hire/Loss of Use, Roadside Assistance, Windscreen, Credit Shortfall as extensions
- Capture ALL excess amounts accurately - read each line carefully, excess structures are often complex
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
            "values": { "insurerName": "string - value or Included/Excluded/Not specified" }
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
  "emailDraft": "string - a complete, professional email ready to send to the client. Use markdown formatting: **bold** for emphasis, markdown tables (| Header | Header |) for comparisons, bullet lists with - for details, and ### headings for sections. Include proper greeting (use Dear [Client Name]), the full comparison details including any shortfalls identified, the recommendation, and a professional closing. This should be comprehensive enough to serve as the record of advice."
}

IMPORTANT: The shortfalls section is CRITICAL. If a current policy is provided:
- gapsInCurrentCover = cover that exists in new quotes but the client does NOT currently have (e.g. Power Surge if current policy excludes it)
- coverAtRisk = cover the client currently has that is NOT present or is reduced in the new quote options

If no current policy is provided, set shortfalls.gapsInCurrentCover and shortfalls.coverAtRisk to empty arrays and use the analysis field to note that no current policy baseline was available.

Here is the extracted data from the documents:
`;

function sanitizeJson(raw: string): string {
  // Strip control characters that are never valid in JSON outside of string
  // values. DO NOT convert \n → \\n — that turns structural whitespace into an
  // invalid token and causes "Expected property name or '}'" at position 1.
  // With JSON mode enabled, the model already escapes string-internal newlines.
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

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

      const newQuotes = documents.filter((d) => d.documentRole !== "current_policy");
      const currentPolicy = documents.find((d) => d.documentRole === "current_policy");

      // Need at least 1 new quote. If no current policy, need at least 2 documents total.
      if (newQuotes.length < 1 || (!currentPolicy && documents.length < 2)) {
        throw new Error(
          "Upload at least 2 new quotes, or 1 current policy schedule + 1 new quote"
        );
      }

      // Phase 1: Fetch all files and upload to Gemini Files API in parallel.
      // This replaces the sequential fetch+btoa approach, eliminating the 3s
      // delays between documents and supporting files up to 2GB.
      const uploadedFiles = await Promise.all(
        documents.map(async (doc) => {
          const fileUrl = await ctx.storage.getUrl(doc.storageId);
          if (!fileUrl) throw new Error(`Could not get URL for file: ${doc.fileName}`);

          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          const mimeType = doc.mimeType ?? "application/pdf";

          // Blob is available globally in Node.js 18+ (which Convex uses)
          const blob = new Blob([arrayBuffer], { type: mimeType });
          const geminiFile = await ai.files.upload({
            file: blob,
            config: { mimeType },
          });

          return { doc, geminiFile };
        })
      );

      // Phase 2: Poll until all uploaded files are ACTIVE.
      // Small PDFs are typically ACTIVE immediately; this handles edge cases.
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

      // Phase 3: Extract data from all documents in parallel using file URIs.
      // Gemini reads the full document from its Files API storage — no base64
      // payload in the request, no 50MB PDF limit for inline data.
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

          const data = JSON.parse(sanitizeJson(jsonSource));
          const role =
            doc.documentRole === "current_policy" ? "CURRENT POLICY" : "NEW QUOTE";
          return { fileName: doc.fileName, role, data };
        })
      );

      // Phase 4: Generate comparison from structured extracted data.
      const comparisonInput =
        COMPARISON_PROMPT +
        "\n\nClient Name: " +
        args.contactName +
        "\n\n" +
        JSON.stringify(extractedDataArray, null, 2);

      const comparisonResult = (await generateWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: comparisonInput }] }],
          config: { responseMimeType: "application/json" },
        })
      )) as { text: string };

      const comparisonJsonSource =
        comparisonResult.text.match(/\{[\s\S]*\}/)?.[0] ?? comparisonResult.text;
      if (!comparisonJsonSource.trim()) {
        throw new Error("Failed to generate comparison");
      }

      const result = JSON.parse(sanitizeJson(comparisonJsonSource));

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

      // Phase 5: Clean up uploaded files from Gemini. Best-effort — files
      // expire automatically after 48 hours if this fails.
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
