/**
 * Shared JSON sanitization and repair utilities for parsing AI-generated JSON.
 *
 * AI models (especially with maxOutputTokens limits) may return truncated JSON.
 * These helpers attempt to repair common truncation patterns before failing.
 */

export function sanitizeJson(raw: string): string {
  // Strip control characters that are never valid in JSON outside string values.
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

/**
 * Attempt to repair truncated JSON by closing open brackets/braces and
 * trimming trailing partial tokens.
 */
function repairTruncatedJson(raw: string): string {
  let s = raw;

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If we ended inside a string, close it
  if (inString) {
    s += '"';
  }

  // Remove any trailing comma or partial key/value after the last complete value
  s = s.replace(/,\s*$/, "");

  // Close all remaining open brackets/braces
  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

/**
 * Parse JSON with automatic repair for truncated AI output.
 * Tries raw parse first, then attempts truncation repair.
 */
export function safeJsonParse(raw: string, context: string): unknown {
  const sanitized = sanitizeJson(raw);
  try {
    return JSON.parse(sanitized);
  } catch (firstError) {
    try {
      const repaired = repairTruncatedJson(sanitized);
      console.warn(
        `JSON parse failed for ${context}, repaired truncated output successfully`
      );
      return JSON.parse(repaired);
    } catch {
      throw new Error(
        `Failed to parse JSON for ${context}: ${firstError instanceof Error ? firstError.message : firstError}`
      );
    }
  }
}
