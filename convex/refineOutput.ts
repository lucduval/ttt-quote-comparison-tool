import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { safeJsonParse, extractJsonObject } from "./lib/jsonParse";

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
          msg.includes("overloaded") ||
          msg.includes("rate limit") ||
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const comparison = await ctx.runQuery(api.comparisons.get, {
      id: args.comparisonId,
    });

    if (!comparison?.result) {
      throw new Error("No result found to refine");
    }

    const client = new Anthropic({ apiKey });

    const currentResultJson = JSON.stringify(comparison.result, null, 2);

    const systemPrompt = `You are an expert South African insurance broker AI assistant. A previous AI has generated an insurance analysis, and the user wants to refine it.

Apply the user's instruction to the analysis below. Return ONLY valid JSON in exactly the same structure as the input — do not add, remove, or rename any keys. Only change the content of the values as directed by the user.`;

    const userPrompt = `USER INSTRUCTION: ${args.userMessage}

CURRENT OUTPUT:
${currentResultJson}`;

    const response = (await generateWithRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      })
    )) as Anthropic.Message;

    const textBlock = response.content.find(
      (block) => block.type === "text"
    );
    const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

    const jsonSource = extractJsonObject(rawText);

    if (!jsonSource.trim()) {
      throw new Error("Claude returned an empty response");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refinedResult = safeJsonParse(jsonSource, "refinement") as any;

    await ctx.runMutation(api.comparisons.storeResult, {
      id: args.comparisonId,
      result: refinedResult,
    });

    return { success: true };
  },
});
