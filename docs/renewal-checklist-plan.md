# Renewal Checklist Review - Implementation Plan

## Context

Broker feedback: the renewal email sent to clients should always include a standard review checklist. The AI should analyse the renewal documents against this checklist and flag which covers are missing or not taken, then draft the email accordingly.

The email has two parts:
1. **Standard boilerplate** (always included) - the intro paragraphs about reviewing policy details, premium change reasons, etc.
2. **Dynamic checklist** (AI-generated) - per-section bullet points flagging which covers are NOT currently on the policy and may be worth adding.

---

## Gap Analysis: Current System vs Required

### Already Extracted (no changes needed)
| Checklist Item | Where |
|---|---|
| Power surge cover (Buildings) | `extractDocuments.ts` - Buildings extensions |
| Accidental damage (Buildings) | `extractDocuments.ts` - Buildings extensions |
| Geyser extension (Buildings) | `extractDocuments.ts` - Buildings extensions |
| Power surge cover (Contents) | `extractDocuments.ts` - Contents extensions |
| Car hire (Motor) | `extractDocuments.ts` - Motor extensions |
| Credit shortfall (Motor) | `extractDocuments.ts` - Motor extensions |
| Tyre and rim (Motor) | `extractDocuments.ts` - Motor extensions |
| Scratch and dent (Motor) | `extractDocuments.ts` - Motor extensions |
| Roadside assistance (Motor) | `extractDocuments.ts` - Motor extensions |
| Excess amounts (Motor) | `extractDocuments.ts` - excess object |
| Specified all-risk items list | `extractDocuments.ts` - All-Risk sections |

### Needs to be Added to Extraction
| Checklist Item | Section | What to Extract |
|---|---|---|
| Solar systems declared | Buildings | New extension: `Solar Panels/PV System` - included true/false, sum insured |
| Inverters declared | Buildings | New extension: `Inverter/Battery` - included true/false, sum insured |
| Solar geysers declared | Buildings | New extension: `Solar Geyser` - included true/false |
| Number of geysers | Buildings | New field or extension detail: geyser count |
| Power surge protection clause | Buildings | New special condition: surge protection warranty wording |
| Accidental damage (Contents) | Contents | Add to Contents extension checklist (currently only Buildings) |
| Security measures | Contents | Extract from special conditions / warranties |
| Regular driver | Motor | New field per vehicle section |
| Daytime/nighttime parking | Motor | New field per vehicle section |
| Vehicle extras/accessories | Motor | Extract listed accessories or flag if none declared |

### Not Extraction - Logic/Email Changes
| Item | What Needs to Happen |
|---|---|
| Standard boilerplate email text | Always prepend to email draft |
| Flag missing covers in email | AI analyses extraction and lists covers NOT taken |
| Contents underinsurance warning | Compare sum insured against a general prompt to review |
| All-risk replacement values | Prompt client to verify values are current |

---

## Implementation Steps

### Phase 1: Enhance Extraction Prompt

**File:** `convex/extractDocuments.ts`

Update the `EXTRACTION_PROMPT` to explicitly instruct extraction of the missing data points:

1. **Buildings section** - add to the "For Buildings sections" instruction:
   - Check for Solar Panels/PV System as extension (included true/false, sum insured)
   - Check for Inverter/Battery System as extension (included true/false, sum insured)
   - Check for Solar Geyser as extension (included true/false)
   - Extract number of geysers if stated
   - Extract power surge protection clause/warranty wording as a special condition

2. **Contents section** - add a new instruction line:
   - Check for Accidental Damage as extension (included true/false, limit)
   - Extract security measures/requirements from special conditions or warranties (alarm type, burglar bars, security gates, armed response, etc.)

3. **Motor section** - add to the "For Motor sections" instruction:
   - Extract regular driver name for each vehicle
   - Extract daytime and nighttime parking addresses
   - Extract any listed vehicle extras/accessories (towbars, bullbars, spotlights, etc.), or note if none are declared

No schema changes needed - these all fit into the existing `extensions[]`, `specialConditions[]`, and `details` fields.

### Phase 2: Add Renewal Checklist to Processing Prompt

**File:** `convex/processQuotes.ts`

Add a new `renewalChecklist` output field to the `RENEWAL_PROMPT` JSON structure:

```json
"renewalChecklist": [
  {
    "section": "string - Buildings, Contents, Motor, All Risk",
    "item": "string - e.g. Solar Panels/PV System",
    "status": "covered | not_covered | verify",
    "currentValue": "string or null - current limit/detail if covered",
    "recommendation": "string - 1 sentence action for client"
  }
]
```

Add these instructions to the renewal prompt:

```
RENEWAL CHECKLIST:
After analysing changes, review the RENEWAL QUOTE for the following covers and flag their status.
For each item, determine if it is covered (included with a limit), not covered (excluded, nil, or absent), or needs verification (uncertain).

Buildings:
- Solar Panels / PV System declared
- Inverter / Battery System declared
- Solar Geyser declared
- Number of geysers correct
- Power Surge cover included
- Accidental Damage cover included
- Power Surge Protection clause noted

Contents:
- Power Surge cover included
- Accidental Damage cover included
- Security measures stated and accurate
- Total contents sum insured adequate (flag if no contents inventory reference)

Motor (per vehicle):
- Car Hire / Loss of Use included
- Credit Shortfall cover included
- Tyre and Rim cover included
- Scratch and Dent cover included
- Roadside Assistance included
- Regular driver noted
- Daytime and nighttime parking address stated
- Vehicle extras and accessories listed

All Risk:
- Specified items list present and up to date
- Replacement values stated for each item

Only include items in the checklist where the section exists on the policy.
Items with status "not_covered" are the most important — these become recommendations in the email.
```

### Phase 3: Update Email Draft Instructions

**File:** `convex/processQuotes.ts`

Replace the current `emailDraft` instruction in `RENEWAL_PROMPT` with a two-part structure:

```
"emailDraft": "string - a professional renewal email structured as follows:

PART 1 — STANDARD RENEWAL NOTICE (always include verbatim):
Include the standard renewal greeting, review instructions, and premium change reasons paragraph.
Use the client name from the policy. Use the renewal effective date.

PART 2 — RENEWAL ANALYSIS:
After the standard text, include:
- Premium change table (Previous | Renewed | Change)
- Key changes table (5-8 most material changes only)
- 2-3 bullet point concerns

PART 3 — COVER REVIEW RECOMMENDATIONS:
For each checklist item with status 'not_covered', include a bullet point recommending the client consider adding it. Group by section (Buildings, Contents, Motor, All Risk).
Only include sections relevant to the client's policy.
Example: '- Your policy does not currently include Tyre and Rim cover on your motor section. If you would like to add this, please let us know.'

PART 4 — CLOSING:
Standard closing asking client to advise on changes, with note that renewal will proceed as-is if no response."
```

Store the standard boilerplate paragraphs as a constant (`RENEWAL_EMAIL_BOILERPLATE`) so it is always included verbatim rather than relying on the AI to reproduce it.

### Phase 4: Update Schema & Result Type

**File:** `convex/schema.ts`

Add `renewalChecklist` to the result type stored in comparisons. This is already a flexible JSON field, so the main change is ensuring the TypeScript types are updated.

### Phase 5: Update UI to Display Checklist

**File:** `components/renewal-result.tsx`

Add a new card/section to the renewal results view:

- **"Policy Cover Review"** card after the changes sections
- Table or card list showing each checklist item grouped by section
- Visual indicators:
  - Green check for `covered` items
  - Red/orange warning for `not_covered` items (these are the key flags)
  - Yellow for `verify` items
- Expandable per-section groups
- "not_covered" items shown prominently at the top

### Phase 6: Pre-populate Custom Instructions (Optional Enhancement)

**File:** `app/(authenticated)/renewal/new/page.tsx`

Consider adding a "Use standard renewal checklist" toggle or pre-filling the custom AI instructions field with the checklist prompt. This gives brokers the ability to customise per-renewal while having a strong default.

---

## Priority Order

1. **Phase 2 + Phase 3** (highest impact, least effort) - Update the renewal prompt to include the checklist analysis and restructure the email. Most of the data is already being extracted.
2. **Phase 1** (medium effort) - Enhance extraction for solar, inverter, security measures, regular driver, parking. This improves accuracy of Phase 2.
3. **Phase 5** (medium effort) - UI to display the checklist results.
4. **Phase 4** (small effort) - Schema/type updates, done alongside Phase 5.
5. **Phase 6** (optional) - Pre-populate instructions toggle.

---

## Key Design Decisions

1. **Boilerplate in code vs AI-generated**: The standard renewal intro text should be stored as a constant and prepended, NOT generated by the AI. This ensures it is always word-perfect. The AI only generates the dynamic analysis sections.

2. **Checklist scope**: Only check items for sections that exist on the policy. A client without a motor section should not get motor checklist items.

3. **"Not covered" is the signal**: The whole point is to flag what the client does NOT have. "Covered" items are confirmation; "not_covered" items are the actionable recommendations.

4. **Extraction vs inference**: Some items (solar panels, inverters) may simply not be mentioned in the document. Absence should be treated as "not_covered" or "verify" — the AI should not assume coverage exists if it's not explicitly stated.
