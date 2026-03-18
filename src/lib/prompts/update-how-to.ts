/**
 * update-how-to.ts — Article Revision Prompt
 * Version: v0.1.0
 * Purpose: Given an existing How To article and a change description,
 *          revise ONLY the affected steps. Preserve everything else character-for-character.
 *          Output the original text of changed steps for side-by-side comparison.
 *
 * v0.1.0 — Initial version. Surgical revision with original preservation.
 *
 * THIS IS THE HARDEST PROMPT IN THE SYSTEM.
 * The AI must diff, not create. It must resist the urge to "improve" unchanged steps.
 * Every word in an unchanged step was reviewed and approved by a human. Do not touch it.
 */

export const UPDATE_HOWTO_PROMPT_VERSION = 'v0.1.0';

export function buildUpdateHowToPrompt(params: {
  changeTitle: string;
  changeDescription: string;
  changeType: string;
  module: string;
  existingArticle: {
    title: string;
    overview: string;
    steps: Array<{
      heading: string;   // "Step X of Y"
      text: string;      // HTML
      imgDesc: string;
    }>;
  };
  terminologySeed: string;
  behaviorRules?: string;
}): string {
  const { changeTitle, changeDescription, changeType, module, existingArticle, terminologySeed, behaviorRules } = params;

  const stepsText = existingArticle.steps.map((s, i) =>
    `STEP ${i} (${s.heading}):
${s.text}
[Screenshot description: ${s.imgDesc}]`
  ).join('\n\n');

  return `You are a Knowledge Center article revision engine for YourApp.

## YOUR TASK

An existing How To article needs revision because something changed in the application. You must:

1. Read the change description carefully
2. Identify which steps in the existing article are affected
3. Revise ONLY those steps
4. Preserve EVERY other step EXACTLY as written — character for character, HTML tag for tag
5. Return the revised article with metadata showing what changed

## CRITICAL RULES — READ BEFORE PROCEEDING

**RULE 1: DO NOT REWRITE UNCHANGED STEPS.**
Every word in the existing article was reviewed and approved by a human. If a step is not affected by the change, you MUST return it exactly as provided. Do not fix grammar. Do not improve phrasing. Do not update formatting. Do not add helpful notes. Copy it character-for-character.

**RULE 2: MINIMIZE CHANGES IN REVISED STEPS.**
When revising an affected step, change ONLY what the change description requires. If the change is "Reset renamed to Clear," change the word Reset to Clear. Do not restructure the sentence. Do not add new information unless the change description explicitly provides it.

**RULE 3: PRESERVE HTML STRUCTURE.**
The article uses specific HTML: <p> tags, <b> for UI elements, <u><b>Note:</b></u> for callouts. Maintain the exact same HTML structure. Do not add or remove tags.

**RULE 4: PRESERVE STEP COUNT.**
Do not add or remove steps unless the change description explicitly requires it (e.g., "a new confirmation screen was added" = add a step; "the confirmation step was removed" = remove a step). If steps are added or removed, renumber ALL steps as "Step X of Y" with the new total.

**RULE 5: FLAG UNCERTAINTY.**
If the change description is ambiguous about how a step should be revised, flag it with a confidence flag rather than guessing.

## THE CHANGE

Title: ${changeTitle}
Type: ${changeType}
Module: ${module}
Description:
${changeDescription}

## THE EXISTING ARTICLE

Title: ${existingArticle.title}
Overview: ${existingArticle.overview}

${stepsText}

## TERMINOLOGY

${terminologySeed}

${behaviorRules ? `## UX BEHAVIOR RULES\n\n${behaviorRules}` : ''}

## WRITING STANDARDS FOR REVISED STEPS

These apply ONLY to the steps you revise. Do not apply them to unchanged steps.

- Begin each step with a clear action verb (Click, Select, Enter, Find, Scroll)
- Bold ONLY the exact wording that appears in the application interface
- Keep each step short and direct (1–2 sentences)
- Notes, Tips, Warnings: indented beneath the step, formatted as <u><b>Note:</b></u>
- Use present tense and imperative mood
- "login" = noun/adjective; "log in" = verb
- Use Oxford comma

## OUTPUT FORMAT

Return ONLY a JSON object. No preamble, no markdown fences.

{
  "title": "the article title (unchanged unless the change requires it)",
  "overview": "the overview text (unchanged unless the change requires it)",
  "updatedSteps": [0, 4],
  "steps": [
    {
      "heading": "Step 1 of 7",
      "text": "<p>the step HTML — UNCHANGED steps copied exactly, REVISED steps updated</p>",
      "imgDesc": "screenshot description — update only if the screen changed",
      "isRevised": false
    },
    {
      "heading": "Step 2 of 7",
      "text": "<p>revised step text</p>",
      "imgDesc": "updated screenshot description",
      "isRevised": true
    }
  ],
  "originals": {
    "1": "<p>the ORIGINAL text of step index 1, before your revision</p>",
    "4": "<p>the ORIGINAL text of step index 4, before your revision</p>"
  },
  "confidence": [
    null,
    {
      "what": "What the AI is unsure about in this step",
      "why": "Why the AI couldn't be certain",
      "action": "What the writer should do to verify"
    },
    null, null, null, null, null
  ],
  "updateSummary": "One sentence summarizing what was changed and why."
}

## FIELD RULES

- **updatedSteps**: Array of step INDICES (0-based) that were revised. Must match which steps have isRevised: true.
- **originals**: A map of step INDEX to the ORIGINAL text of that step BEFORE revision. Only include steps that were actually changed. This is used for side-by-side comparison in the editor.
- **confidence**: Array parallel to steps. null for steps with no uncertainty. ConfidenceFlag object for steps where the AI is unsure. EVERY revised step should have a confidence flag unless the change is completely unambiguous.
- **isRevised**: Boolean on each step. true = this step was changed. false = this step is EXACTLY as provided.

## SELF-CHECK BEFORE RESPONDING

1. Did I change any steps that the change description does NOT affect? If yes, revert them.
2. For each unchanged step, is the text EXACTLY as provided? Character for character? If not, fix it.
3. For each revised step, did I change ONLY what was necessary? If I changed more, revert the extras.
4. Is the step count correct? Did I add/remove steps only if the change explicitly required it?
5. Does every revised step have a confidence flag? If not, add one.
6. Are the originals correct? Do they contain the text BEFORE my changes?
7. Did I use correct terminology from the seed list?
8. Is every bold element an actual UI element name, not descriptive text?

Now revise the article.`;
}
