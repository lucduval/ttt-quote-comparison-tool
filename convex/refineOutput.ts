import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

function sanitizeJson(raw: string): string {
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

export const refineOutput = action({
  args: {
    comparisonId: v.id("comparisons"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const comparison = await ctx.runQuery(api.comparisons.get, {
      id: args.comparisonId,
    });

    if (!comparison?.result) {
      throw new Error("No result found to refine");
    }

    const ai = new GoogleGenAI({ apiKey });

    const currentResultJson = JSON.stringify(comparison.result, null, 2);

    const prompt = `You are an expert South African insurance broker AI assistant. A previous AI has generated an insurance analysis, and the user wants to refine it.

USER INSTRUCTION: ${args.userMessage}

Apply the user's instruction to the analysis below. Return ONLY valid JSON in exactly the same structure as the input — do not add, remove, or rename any keys. Only change the content of the values as directed by the user.

CURRENT OUTPUT:
${currentResultJson}`;

    const response = (await generateWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      })
    )) as { text: string };

    const jsonSource =
      response.text.match(/\{[\s\S]*\}/)?.[0] ?? response.text;

    if (!jsonSource.trim()) {
      throw new Error("Gemini returned an empty response");
    }

    const refinedResult = JSON.parse(sanitizeJson(jsonSource));

    await ctx.runMutation(api.comparisons.storeResult, {
      id: args.comparisonId,
      result: refinedResult,
    });

    return { success: true };
  },
});
