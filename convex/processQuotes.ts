import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EXTRACTION_PROMPT = `You are an expert insurance analyst. Analyze this insurance policy document or quote and extract the following information in a structured JSON format.

Return ONLY valid JSON with this exact structure:
{
  "insurerName": "string - name of the insurance company",
  "premium": {
    "monthly": number or null,
    "annual": number or null,
    "currency": "string - e.g. ZAR, USD"
  },
  "coverType": "string - e.g. Comprehensive, Third Party Only, Third Party Fire & Theft",
  "basisOfIndemnity": "string - e.g. Retail Value, Market Value, Agreed Value",
  "thirdPartyLiability": "string - e.g. R2,500,000",
  "passengerLiability": "string or null",
  "sasria": "Included or Excluded",
  "territorialLimits": "string",
  "legalCover": "string - Included/Excluded/Not specified",
  "personalAccident": "string - details or Excluded",
  "roadsideAssistance": "string - details or Excluded",
  "lossOfUse": "string - details or Not included",
  "creditShortfall": "string - details or Not included",
  "excess": {
    "type": "string - Fixed or Percentage-based or Mixed",
    "accident": "string - e.g. R15,000 or 10% min R15,000",
    "theft": "string",
    "thirdParty": "string",
    "windscreen": "string",
    "actsOfNature": "string or null",
    "otherExcesses": ["string - any additional excess conditions"],
    "notes": "string - any important excess notes"
  },
  "specialConditions": ["string - list of important conditions, warranties, requirements"],
  "inclusions": ["string - list of what is included"],
  "exclusions": ["string - list of what is excluded"],
  "insuredItem": "string - description of what is insured (e.g. 2016 Hyundai i10)",
  "policyNumber": "string or null",
  "additionalNotes": "string - any other relevant information"
}

If a field cannot be determined from the document, use null.`;

const COMPARISON_PROMPT = `You are an expert insurance broker analyst. You have been provided with extracted data from multiple insurance quotes/policies for the same client.

Your task is to produce a comprehensive, professional comparison that:
1. Helps the client make an informed decision
2. Meets all compliance requirements for insurance advice
3. Clearly highlights key differentiators

Produce your output as valid JSON with this exact structure:
{
  "summary": "A brief 2-3 sentence summary of the comparison",
  "premiumComparison": {
    "items": [
      {
        "insurer": "string",
        "monthlyPremium": "string - formatted amount",
        "annualPremium": "string - formatted amount or N/A"
      }
    ],
    "difference": "string - plain language description of cost difference",
    "cheapest": "string - insurer name"
  },
  "coverComparison": {
    "features": [
      {
        "feature": "string - feature name",
        "values": { "insurerName": "string - value for this insurer" }
      }
    ]
  },
  "excessComparison": {
    "insurers": {
      "insurerName": {
        "type": "string",
        "details": ["string - excess detail lines"],
        "notes": "string"
      }
    },
    "exampleScenarios": [
      {
        "scenario": "string - description",
        "values": { "insurerName": "string - excess amount" }
      }
    ],
    "analysis": "string - professional analysis of excess structures"
  },
  "conditionsDifferences": {
    "insurers": {
      "insurerName": ["string - important condition points"]
    },
    "analysis": "string - professional analysis of conditions"
  },
  "recommendation": "string - detailed professional recommendation with reasoning. Include scenarios for different client priorities (cost vs risk). Be balanced and compliant.",
  "emailDraft": "string - a complete, professional email ready to send to the client. Use markdown formatting: **bold** for emphasis, markdown tables (| Header | Header |) for comparisons, bullet lists with - for details, and ### headings for sections. Include proper greeting (use Dear [Client Name]), the full comparison details, the recommendation, and a professional closing. This should be comprehensive enough to serve as the record of advice."
}

Here is the extracted data from the quotes:
`;

function sanitizeJson(raw: string): string {
  // Replace literal control characters inside JSON string values.
  // JSON.parse rejects unescaped control chars (U+0000–U+001F) inside strings.
  return raw.replace(/[\u0000-\u001F\u007F]/g, (ch) => {
    switch (ch) {
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\t": return "\\t";
      default:   return "";
    }
  });
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
      const is429 =
        error instanceof Error &&
        (error.message.includes("429") ||
          error.message.toLowerCase().includes("resource exhausted") ||
          error.message.toLowerCase().includes("too many requests"));

      if (is429 && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    try {
      await ctx.runMutation(api.comparisons.updateStatus, {
        id: args.comparisonId,
        status: "processing",
      });

      const documents = await ctx.runQuery(api.documents.listByComparison, {
        comparisonId: args.comparisonId,
      });

      if (documents.length < 2) {
        throw new Error("At least 2 documents are required for comparison");
      }

      // Step 1: Extract data from each PDF
      const extractedDataArray: Array<{ fileName: string; data: unknown }> = [];

      for (let i = 0; i < documents.length; i++) {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        const doc = documents[i];
        const fileUrl = await ctx.storage.getUrl(doc.storageId);
        if (!fileUrl) {
          throw new Error(`Could not get URL for file: ${doc.fileName}`);
        }

        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 32768;
        const chunks: string[] = [];
        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
          chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
        }
        const base64Data = btoa(chunks.join(""));

        const extractionResult = (await generateWithRetry(() =>
          model.generateContent([
            EXTRACTION_PROMPT,
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
          ])
        )) as Awaited<ReturnType<typeof model.generateContent>>;

        const extractionText = extractionResult.response.text();
        const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error(
            `Failed to extract data from ${doc.fileName}`
          );
        }

        const extractedData = JSON.parse(sanitizeJson(jsonMatch[0]));
        extractedDataArray.push({
          fileName: doc.fileName,
          data: extractedData,
        });
      }

      // Step 2: Generate comparison
      const comparisonInput =
        COMPARISON_PROMPT +
        "\n\nClient Name: " +
        args.contactName +
        "\n\n" +
        JSON.stringify(extractedDataArray, null, 2);

      const comparisonResult = (await generateWithRetry(() =>
        model.generateContent(comparisonInput)
      )) as Awaited<ReturnType<typeof model.generateContent>>;
      const comparisonText = comparisonResult.response.text();
      const comparisonJsonMatch = comparisonText.match(/\{[\s\S]*\}/);

      if (!comparisonJsonMatch) {
        throw new Error("Failed to generate comparison");
      }

      const result = JSON.parse(sanitizeJson(comparisonJsonMatch[0]));

      await ctx.runMutation(api.comparisons.storeResult, {
        id: args.comparisonId,
        result: {
          summary: result.summary || "",
          premiumComparison: result.premiumComparison || {},
          coverComparison: result.coverComparison || {},
          excessComparison: result.excessComparison || {},
          conditionsDifferences: result.conditionsDifferences || {},
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
