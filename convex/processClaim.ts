import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

const CLAIM_PROMPT = `You are an expert South African insurance claims specialist. Generate a pre-filled claim summary and a professional submission email for a client's insurance claim.

Use PLAIN TEXT only in all output — no markdown symbols, no asterisks, no pipe characters, no hashtags. For section headings use ALL CAPS. Use blank lines between sections. Use a dash (- ) for bullet points.

Return ONLY valid JSON with this exact structure:
{
  "formDraft": "string - a plain text pre-filled claim form narrative. Structure it with the following sections in ALL CAPS: CLAIM DETAILS, INSURED PARTY, INCIDENT INFORMATION, DESCRIPTION OF LOSS, ADDITIONAL INFORMATION. Fill in all known details from the provided information. Use blank lines between sections and dashes for list items. Clearly mark fields that need to be completed by the broker/client as [TO BE COMPLETED].",
  "emailDraft": "string - a complete, professional plain text email to submit the claim to the insurer. Include: greeting to the claims department, policy holder details, claim type and incident summary, list of attached documents (leave placeholders), a request for a claim reference number, and a professional closing with the broker's name placeholder. Use ALL CAPS for section headings and dashes for bullet points."
}

Here is the claim information:
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
        console.log(`Transient error, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

function sanitizeJson(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

export const processClaim = action({
  args: {
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const claim = await ctx.runQuery(api.claims.get, { id: args.claimId });
    const contact = await ctx.runQuery(api.contacts.get, {
      id: claim.contactId,
    });

    const claimTypeLabel =
      claim.claimType === "motor" ? "Motor Vehicle" : "Property Loss or Damage";

    const claimInfo = {
      clientName: contact.name,
      clientEmail: contact.email ?? "[Not provided]",
      clientPhone: contact.phone ?? "[Not provided]",
      clientCompany: contact.company ?? "[Not provided]",
      insurer: claim.insurer,
      claimType: claimTypeLabel,
      policyNumber: claim.policyNumber ?? "[Not provided]",
      incidentDate: claim.incidentDate ?? "[Not provided]",
      description: claim.description ?? "[Not provided]",
      estimatedLoss: claim.estimatedLoss ?? "[Not provided]",
      policeCaseNumber: claim.policeCaseNumber ?? "[Not applicable]",
    };

    const prompt = CLAIM_PROMPT + JSON.stringify(claimInfo, null, 2);

    const result = (await generateWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" },
      })
    )) as { text: string };

    const jsonSource = result.text.match(/\{[\s\S]*\}/)?.[0] ?? result.text;
    if (!jsonSource.trim()) throw new Error("Failed to generate claim documents");

    const parsed = JSON.parse(sanitizeJson(jsonSource));

    await ctx.runMutation(api.claims.storeResult, {
      id: args.claimId,
      result: {
        formDraft: parsed.formDraft || "",
        emailDraft: parsed.emailDraft || "",
      },
    });

    return { success: true };
  },
});
