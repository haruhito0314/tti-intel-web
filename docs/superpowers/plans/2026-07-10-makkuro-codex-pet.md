# Makkuro Codex Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `hatch-pet` lightweight visual workers to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, validate, and install a Codex-compatible v2 animated tuxedo-cat pet named Makkuro with internet-meme charm.

**Architecture:** `hatch-pet` prepares prompts and deterministic layout guides. Isolated `imagegen` workers create one canonical base image and one coherent strip per state; bundled deterministic scripts extract, register, assemble, despill, and validate the final atlas before packaging.

**Tech Stack:** Codex built-in image generation, hatch-pet Python scripts, Pillow from the bundled workspace runtime, jq, WebP/PNG.

## Global Constraints

- Final atlas is exactly 1536 by 2288 pixels using 192 by 208 pixel cells.
- `pet.json` contains `spriteVersionNumber: 2`.
- Makkuro remains a black-and-white rounded tuxedo cat in a smooth sticker style across every row.
- No text, scenery, shadows, guide marks, detached effects, or specific-photo copying.
- Four cardinal gaze poses are hard gates; all 16 directions require explicit semantic review.
- The final v2 atlas receives exactly one deterministic chroma despill pass.

---

### Task 1: Prepare the pet run

**Files:**
- Create: `output/hatch-pet/makkuro/pet_request.json`
- Create: `output/hatch-pet/makkuro/imagegen-jobs.json`
- Create: `output/hatch-pet/makkuro/prompts/`

- [ ] Run `prepare_pet_run.py` with pet name `Makkuro`, sticker style, and the approved tuxedo-cat visual description.
- [ ] Inspect every manifest job for dependencies, inputs, prompts, and output paths.

### Task 2: Establish canonical identity

**Files:**
- Create: `output/hatch-pet/makkuro/decoded/base.png`
- Create: `output/hatch-pet/makkuro/references/canonical-base.png`

- [ ] Dispatch one isolated `imagegen` worker for the base job.
- [ ] Copy the selected image to the manifest output and canonical reference paths.
- [ ] Mark the base job complete only after both files exist.

### Task 3: Generate and validate standard animation rows

**Files:**
- Create: `output/hatch-pet/makkuro/decoded/*.png`
- Create: `output/hatch-pet/makkuro/qa/rows/*/review.json`
- Create: `output/hatch-pet/makkuro/final/spritesheet.webp`
- Create: `output/hatch-pet/makkuro/qa/contact-sheet.png`
- Create: `output/hatch-pet/makkuro/qa/previews/*.gif`

- [ ] Generate `idle` and `running-right` first and immediately run extraction and frame inspection.
- [ ] Mirror `running-left` only if the approved right-facing strip preserves symmetric identity and timing when flipped.
- [ ] Generate waving, jumping, failed, waiting, active-work, and review strips with separate isolated workers.
- [ ] Extract all rows, inspect connected components, assemble the intermediate atlas, and render contact sheet plus previews.
- [ ] Independently review row identity, state semantics, cadence, clipping, and effects.

### Task 4: Generate and validate 16 look directions

**Files:**
- Create: `output/hatch-pet/makkuro/qa/look-mechanics.md`
- Create: `output/hatch-pet/makkuro/decoded/look-anchors-approved.png`
- Create: `output/hatch-pet/makkuro/decoded/look-row-9.png`
- Create: `output/hatch-pet/makkuro/decoded/look-row-10.png`
- Create: `output/hatch-pet/makkuro/qa/direction-semantics.json`

- [ ] Record gaze mechanics: lower body anchored, eyes lead, head turns or tilts, ears follow.
- [ ] Generate and approve the up, screen-right, down, and screen-left cardinal strip.
- [ ] Generate row 9, register it, and pass edge plus semantic checks before generating row 10.
- [ ] Generate row 10 using row 9 and the approved cardinals as continuity evidence.
- [ ] Assemble the v2 atlas and create labeled and blind direction QA sheets.
- [ ] Collect exactly three isolated blind verdicts and combine them by strict majority.

### Task 5: Final QA and packaging

**Files:**
- Create: `output/hatch-pet/makkuro/final/spritesheet-extended.webp`
- Create: `output/hatch-pet/makkuro/final/validation-extended.json`
- Create: `output/hatch-pet/makkuro/qa/run-summary.json`
- Create: `~/.codex/pets/makkuro/pet.json`
- Create: `~/.codex/pets/makkuro/spritesheet.webp`

- [ ] Run the single chroma despill pass and require `ok: true`.
- [ ] Run atlas validation with `--require-v2` and the run chroma key.
- [ ] Independently inspect standard and extended contact sheets, previews, direction semantics, blind validation, and continuity.
- [ ] Package only after all deterministic hard gates and final visual QA pass.
- [ ] Retain the required QA artifacts and remove disposable generation intermediates.

