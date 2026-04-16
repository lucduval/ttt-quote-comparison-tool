# Email Output Improvements

Comparison of current email output against a broker-approved example to identify changes needed in the AI prompt and output structure.

---

## 1. Tone and Language

### Problem
The current output reads like a system-generated report, not a broker writing to their client.

| Current | Target |
|---------|--------|
| "Dear Luc Duval" | "Hi Dr. Mahlatji" (use first name or title naturally) |
| "My analysis highlights several key differences that warrant your careful consideration" | "I've compared your current insurance with the alternative options, focusing on your premium, vehicle, and household contents cover." |
| "Expert South African Insurance Broker Analyst" | No title — just a name |
| "[Your Name/Brokerage Name]" | Actual broker name if available, otherwise just "Kind regards" |

### Changes needed
- **Greeting**: Warm and personal — "Hi [Name]" or "Hi Dr. [Surname]", followed by a line like "I trust that you are well" or "Hope you're doing well."
- **Intro paragraph**: One sentence that tells the client exactly what was compared and what categories are covered. No filler about "careful consideration."
- **Throughout**: Write in first person as the broker. Conversational but professional. Avoid legalese, jargon, and overly formal phrasing.
- **Sign-off**: "Let me know what you think or if you'd like to discuss this in more detail." — not "Please contact me if you wish to discuss this further."
- **No titles or taglines** after the broker's name.

---

## 2. Premium Comparison Table

### Problem
The current table includes a "Role" column (Current Policy / New Quote) which adds noise. Full legal entity names are used instead of friendly names.

**Current:**
| Insurer | Role | Monthly Premium |
|---------|------|-----------------|
| ONE Insurance Limited T/A ONE | New Quote | R 1,458.40 |

**Target:**
| Option | Monthly Premium |
|--------|-----------------|
| Hybrid | R1,203 |
| Howdie | R1,225 |
| Current (Old Mutual) | R1,701 |

### Changes needed
- **Drop the "Role" column.** Use the column header "Option" instead of "Insurer."
- **Use friendly/short insurer names.** "ONE Insurance Limited T/A ONE" → "ONE Insurance". Where the insurer is the current policy, append it: "Current (Budget)".
- **Order by premium** (cheapest first).
- **Add a one-line note** after the table: e.g., "Hybrid offers the most competitive premium, with a meaningful saving compared to your current cover." Keep it to one sentence, not a percentage breakdown unless it's meaningful.

---

## 3. Cover Comparison Structure

### Problem
The current output lumps all features into a single "KEY COVER DIFFERENCES" table. The good example breaks comparisons into **separate tables per coverage category** (Vehicle Cover, Household Contents, Power Surge Cover), each with only the features that matter for that category.

**Current:** One flat table with everything mixed together.

**Target:** Multiple focused tables, one per logical grouping.

### Changes needed
- **Split cover comparison by category** (e.g., Vehicle, Contents, Buildings, All Risk, Liability) — each gets its own headed section with its own table.
- **Within each category, only include features where there are material differences** or where the client needs to understand what they're getting. Don't list features that are identical across all quotes.
- **Contextual sub-topics**: When a specific coverage area has enough nuance to warrant its own section (e.g., power surge behavior under loadshedding, geyser cover specifics), break it out into a mini-table. The AI should use judgement here — if a topic has 2+ rows of meaningful variation across insurers, it can become its own section.
- **Use plain language for feature names.** "Basis of Indemnity" is fine for brokers but clients might benefit from "How claims are valued" or at minimum a parenthetical.

---

## 4. Replace "Critical Shortfalls" with "Key Points to Consider"

### Problem
The current "CRITICAL SHORTFALLS AND RISKS" section is one-sided and alarmist. It only highlights negatives of the new quote. The good example uses a balanced "Key Points to Consider" section that lists **pros and cons for each option**, letting the client make an informed decision.

**Current:**
> CRITICAL SHORTFALLS AND RISKS WITH ONE INSURANCE
> - The ONE quote offers a significantly lower Sum Insured...
> - Crucial liability covers... are entirely absent...

**Target:**
> **Key Points to Consider**
>
> **Hybrid:**
> - Lowest premium
> - Highest contents cover
> - Some claims may have an additional excess depending on your setup
>
> **Old Mutual:**
> - Higher premium
> - Lower contents and accidental damage limits
> - More fixed and predictable structure

### Changes needed
- **Rename the section** to "Key Points to Consider" (or similar neutral heading).
- **Structure as per-insurer bullet points**, not a wall of text about one insurer.
- **Include both positives and negatives** for each option. Every insurer should have at least one pro and one con listed.
- **Keep bullets concise** — one line each, no sub-clauses.
- **Tone should be advisory, not alarming.** "Some cover limits are less clearly defined" not "crucial covers are entirely absent, exposing you to considerable financial risks."

---

## 5. Recommendation Section

### Problem
The current recommendation is a dense paragraph that reads like a legal disclaimer. The good example is 2-3 sentences with a clear verdict and a practical next step.

**Current (too long, too formal):**
> "Based on this comparison, I strongly recommend you remain with your current Budget Insurance policy. Despite ONE Insurance offering a lower standard excess and higher Power Surge cover, these benefits do not offset the substantial reductions in overall sum insured, less favourable basis of indemnity, and the complete absence of critical liability covers. Moving to the ONE quote would result in a higher premium for significantly reduced protection, exposing you to considerable financial risks. Your current policy provides broader and more comprehensive cover, better suited to your risk profile."

**Target (concise, practical):**
> "Based on the premium saving and improved contents cover, Hybrid would be my recommended option, but we can proceed in whichever way you prefer."

### Changes needed
- **Maximum 2-3 sentences.** One sentence for the recommendation, one for the primary reason, one deferring to the client's preference.
- **Don't repeat the full analysis.** The tables already show the detail — the recommendation just needs to land the verdict.
- **Always end with client agency:** "but we can proceed in whichever way you prefer" or "let me know how you'd like to proceed."
- **Avoid catastrophizing language** like "exposing you to considerable financial risks."

---

## 6. Formatting and Presentation

### Problem
The current output uses ASCII-style separators (`----------`) and all-caps headers. The good example uses clean markdown tables and natural heading styles.

### Changes needed
- **Use markdown tables** throughout (they render well in most email clients when converted).
- **Use title case for section headers**, not ALL CAPS with dashes.
- **No ASCII separators.** Use proper markdown heading levels (`##`, `###`).
- **Currency formatting**: "R1,203" not "R 1,203.00" — drop the space after R and unnecessary decimals (.00).
- **Use short, friendly insurer names** as column headers in tables, not full legal names.

---

## 7. Email Structure (Top to Bottom)

The target email structure should be:

1. **Greeting** — "Hi [Name]," + warm opener
2. **Context line** — One sentence: what was compared and which categories
3. **Premium Comparison** — Simple table, cheapest first, with one-line note
4. **Cover Comparison per Category** — Separate headed section + table per category (Vehicle, Contents, Buildings, etc.), only material differences
5. **Contextual Sub-topics** (if warranted) — e.g., Power Surge, Geyser Cover — broken out when there's enough nuance
6. **Key Points to Consider** — Per-insurer pros/cons bullets
7. **Recommendation** — 2-3 sentences max, clear verdict, client has final say
8. **Closing** — "Let me know what you think" + sign-off

---

## Summary of Changes by Component

| Area | What to Change | Where |
|------|---------------|-------|
| AI Prompt | Rewrite email draft instructions to enforce the structure and tone above | `processQuotes.ts` — `COMPARISON_PROMPT` emailDraft section |
| AI Prompt | Add examples of good vs bad tone | `processQuotes.ts` |
| AI Prompt | Instruct category-based table splitting | `processQuotes.ts` |
| AI Prompt | Replace shortfalls framing with balanced per-insurer key points | `processQuotes.ts` |
| AI Prompt | Cap recommendation length (2-3 sentences) | `processQuotes.ts` |
| AI Prompt | Enforce friendly insurer names in email (not legal entity names) | `processQuotes.ts` |
| Schema | Consider adding `friendlyName` to extracted insurer data | `schema.ts` / `extractDocuments.ts` |
| Email Preview | Ensure markdown renders cleanly in the email preview component | Email preview component |
