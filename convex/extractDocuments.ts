"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { safeJsonParse } from "./lib/jsonParse";

const EXTRACTION_PROMPT = `You are an expert South African insurance analyst. You have been given the OCR-extracted text of an insurance policy document or quote schedule.

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
          "name": "string - extension name, e.g. Power Surge, Geyser, Solar Panels/PV System, Inverter/Battery System, Solar Geyser, Car Hire/Loss of Use, Accidental Damage, Roadside Assistance, SASRIA, Legal Costs, Personal Accident, Credit Shortfall, Towing, Glass, Windscreen, Tyre and Rim, Scratch and Dent, Excess Waiver",
          "included": true or false,
          "limit": "string or null - monetary limit if applicable, or 'No Cover' if nil/zero/excluded",
          "uncertain": true or false,
          "details": "string or null - any relevant details or conditions"
        }
      ],
      "inclusions": ["string - specific items or perils included"],
      "exclusions": ["string - specific exclusions for this section"],
      "specialConditions": ["string - warranties, requirements, endorsements"],
      "pointCount": number
    }
  ],
  "sasria": "Included or Excluded or Not specified",
  "additionalNotes": "string - any other relevant policy-wide information"
}

CRITICAL INSTRUCTIONS:
- Extract EVERY section in the document, not just motor
- For Contents sections: explicitly check for and list Power Surge cover AND Accidental Damage cover as extensions (included true/false with limit). Extract security measures/requirements (alarm type, burglar bars, security gates, armed response, etc.) as specialConditions.
- For All-Risk sections: list each scheduled item with its insured value as a separate extension entry. Include the replacement value for each item.
- For Motor sections: check for Car Hire/Loss of Use, Roadside Assistance, Windscreen, Tyre and Rim, Scratch and Dent, Credit Shortfall, Excess Waiver as extensions. Extract the regular driver name in the insuredItem or as a specialCondition (e.g. "Regular Driver: John Smith"). Extract daytime and nighttime parking addresses as specialConditions. Extract any listed vehicle extras/accessories (towbars, bullbars, spotlights, canopies, etc.) as specialConditions — if none are listed, add "No vehicle extras/accessories declared" as a specialCondition.
- For Buildings sections: check for Geyser, Power Surge, Accidental Damage, Solar Panels/PV System, Inverter/Battery System, Solar Geyser as extensions. If geysers are covered, include the number of geysers in the Geyser extension details field (e.g. "2 geysers insured"). Extract the power surge protection clause/warranty wording as a specialCondition if present.
- Capture ALL excess amounts accurately - read each line carefully, excess structures are often complex
- NIL LIMITS: If an extension has a nil, zero, or R0 limit, set limit to "No Cover" and included to false. Do NOT list it as included with a blank limit.
- EXCLUSIONS: Do NOT list an item as an extension with included:true if the Summary of Cover or policy wording marks it as excluded, not covered, or not included. Set included:false instead.
- UNCERTAIN FLAG: Set uncertain:true on any extension or sumInsuredUncertain:true on any sum insured where you cannot clearly read the value, the document is ambiguous, or you are making an educated guess. Set to false when you are confident.
- pointCount: Count the total data points in each section (extensions + inclusions + exclusions + specialConditions + 1 for premium + 1 for excess + 1 for sum insured). This helps the user gauge extraction completeness.
- If a field cannot be determined from the document, use null
- Do not invent information - only extract what is explicitly stated`;

async function callMistralOcr(
  apiKey: string,
  fileBase64: string,
  mimeType: string
): Promise<{ markdown: string; pageCount: number }> {
  const isImage = mimeType.startsWith("image/");
  const dataUri = `data:${mimeType};base64,${fileBase64}`;

  const documentPayload = isImage
    ? { type: "image_url", image_url: dataUri }
    : { type: "document_url", document_url: dataUri };

  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: documentPayload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral OCR failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const pages: Array<{ index: number; markdown: string }> = result.pages ?? [];
  const markdown = pages.map((p) => p.markdown).join("\n\n--- PAGE BREAK ---\n\n");

  return { markdown, pageCount: pages.length };
}

async function callMistralChat(
  apiKey: string,
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            max_tokens: 65536,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        if ((status === 429 || status >= 500) && attempt < maxRetries) {
          const delay = 2000 * Math.pow(2, attempt);
          console.log(`Mistral ${status}, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(
          `Mistral chat failed (${status}): ${errorText}`
        );
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error: unknown) {
      if (attempt < maxRetries) {
        const msg =
          error instanceof Error ? error.message.toLowerCase() : "";
        if (
          msg.includes("429") ||
          msg.includes("503") ||
          msg.includes("rate")
        ) {
          const delay = 2000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error("Mistral chat failed after retries");
}

export const extractDocuments = action({
  args: {
    comparisonId: v.id("comparisons"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; extractedCount: number }> => {
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw new Error("MISTRAL_API_KEY not configured");
    }

    try {
      // Set comparison to extracting
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "extracting",
      });

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      if (documents.length === 0) {
        throw new Error("No documents to extract");
      }

      // Mark all documents as pending
      for (const doc of documents) {
        await ctx.runMutation(api.documents.updateExtractionStatus, {
          id: doc._id,
          extractionStatus: "pending",
        });
      }

      // Process documents sequentially (up to 5)
      const docsToProcess = documents.slice(0, 5);

      for (const doc of docsToProcess) {
        try {
          // Phase 1: OCR with Mistral
          await ctx.runMutation(api.documents.updateExtractionStatus, {
            id: doc._id,
            extractionStatus: "scanning",
          });

          const fileUrl = await ctx.storage.getUrl(doc.storageId);
          if (!fileUrl)
            throw new Error(`Could not get URL for file: ${doc.fileName}`);

          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = doc.mimeType ?? "application/pdf";

          const { markdown, pageCount } = await callMistralOcr(
            mistralKey,
            base64,
            mimeType
          );

          // Update with page count
          await ctx.runMutation(api.documents.updateExtractionStatus, {
            id: doc._id,
            extractionStatus: "analyzing",
            ocrPageCount: pageCount,
          });

          // Phase 2: Structural extraction with Mistral
          const structurePrompt =
            EXTRACTION_PROMPT +
            "\n\nDOCUMENT TEXT (OCR-extracted, " +
            pageCount +
            " pages):\n\n" +
            markdown;

          const extractionJson = await callMistralChat(
            mistralKey,
            structurePrompt
          );

          const jsonSource =
            extractionJson.match(/\{[\s\S]*\}/)?.[0] ?? extractionJson;
          if (!jsonSource.trim()) {
            throw new Error(
              `Empty extraction result for ${doc.fileName}`
            );
          }

          const data = safeJsonParse(
            jsonSource,
            `extraction of ${doc.fileName}`
          );

          // Override insurer name with broker-supplied name if present
          if (doc.insurerName) {
            (data as Record<string, unknown>).insurerName = doc.insurerName;
          }

          // Store extracted data on the document
          await ctx.runMutation(api.documents.storeExtractedData, {
            id: doc._id,
            extractedData: data,
          });
        } catch (docError) {
          console.error(
            `Extraction failed for ${doc.fileName}:`,
            docError
          );
          await ctx.runMutation(api.documents.updateExtractionStatus, {
            id: doc._id,
            extractionStatus: "failed",
          });
          // Continue with other documents rather than failing entirely
        }
      }

      // Check if at least one document succeeded
      const updatedDocs: Array<{ extractionStatus?: string }> =
        await ctx.runQuery(api.documents.listByComparison, {
          comparisonId: args.comparisonId,
        });
      const successCount: number = updatedDocs.filter(
        (d: { extractionStatus?: string }) => d.extractionStatus === "done"
      ).length;

      if (successCount === 0) {
        throw new Error("All document extractions failed");
      }

      // Set comparison to extracted
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "extracted",
      });

      return { success: true, extractedCount: successCount };
    } catch (error) {
      console.error("Extraction failed:", error);
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "failed",
      });
      throw error;
    }
  },
});
