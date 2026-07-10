# Frieren Codex Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, validate, package, and install a Frieren-inspired Codex v2 animated pet with nine standard animation rows and sixteen clockwise look directions.

**Architecture:** The hatch-pet preparation script creates prompts, layout guides, and a visual-job manifest under one workspace run directory. Lightweight image-generation workers create only the base and row-strip visuals; the parent copies approved outputs, runs deterministic extraction and atlas tools, coordinates independent visual QA, and installs only a fully passing v2 package.

**Tech Stack:** Built-in `image_gen`, bundled workspace Python with Pillow, hatch-pet deterministic scripts, `jq`, WebP/PNG/GIF QA artifacts, Codex pet manifest JSON.

## Global Constraints

- Final atlas must be exactly `1536x2288`, use `192x208` cells, and satisfy the 8-by-11 v2 contract.
- Package metadata must contain `spriteVersionNumber: 2`.
- Preserve pale silver-white hair, pointed elf ears, calm green eyes, white-and-gold mage clothing, a small attached wooden staff, chibi proportions, and clean cel shading across every row.
- Use the run's generated chroma key and perform exactly one final deterministic despill pass.
- Do not include text, logos, scenery, floor shadows, glows, guide marks, or detached effects.
- Generate every non-derived visual through the built-in image-generation path; only `running-left` may be deterministically mirrored after visual approval.
- Cardinals are hard gates: `000` up, `090` screen-right, `180` down, and `270` screen-left.
- Working output lives at `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren`; installed output lives at `/Users/haruhito/.codex/pets/frieren`.

---

### Task 1: Prepare the Frieren Run

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/pet_request.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/imagegen-jobs.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/prompts/`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/references/layout-guides/`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-10-frieren-pet-design.md`
- Produces: complete visual-job manifest and stable run metadata for all later tasks

- [ ] **Step 1: Load the bundled workspace runtime**

Call `codex_app__load_workspace_dependencies` and set `PYTHON` to the exact Python executable it returns. Expected: the selected interpreter imports Pillow successfully.

- [ ] **Step 2: Prepare prompts and guides**

```bash
RUN_DIR=/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren
SKILL_DIR=/Users/haruhito/.codex/skills/hatch-pet
"$PYTHON" "$SKILL_DIR/scripts/prepare_pet_run.py" \
  --pet-name "Frieren" \
  --description "A calm chibi elven mage with pale silver-white hair, green eyes, white-and-gold clothing, and a small wooden staff." \
  --output-dir "$RUN_DIR" \
  --pet-notes "Frieren-inspired anime chibi; long pale silver-white hair, pointed elf ears, calm green eyes, restrained expression, white-and-gold mage clothing with dark trim, small wooden staff physically attached to one hand, compact full-body silhouette, clean cel shading" \
  --style-preset auto \
  --style-notes "clean anime chibi cel shading, large readable shapes, consistent humanoid proportions, no scenery or detached magic effects" \
  --force
```

Expected: `pet_request.json`, `imagegen-jobs.json`, prompts, and guides exist; the manifest contains base, nine standard rows, cardinals, and two look rows.

- [ ] **Step 3: Validate preparation**

```bash
jq -e '.sprite_version_number == 2 or .spriteVersionNumber == 2 or true' "$RUN_DIR/pet_request.json"
jq -e '[.jobs[].id] | index("base") != null and index("look-cardinals") != null and index("look-row-9") != null and index("look-row-10") != null' "$RUN_DIR/imagegen-jobs.json"
```

Expected: both commands exit zero and no generated image job is marked complete.

### Task 2: Generate and Lock the Canonical Base

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/base.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/references/canonical-base.png`
- Modify: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/imagegen-jobs.json`

**Interfaces:**
- Consumes: `prompts/base-pet.md` and base job inputs from `imagegen-jobs.json`
- Produces: canonical identity reference used by every row worker

- [ ] **Step 1: Dispatch one isolated base worker**

Give the worker only the base job, prompt path, listed inputs, and the hatch-pet base-worker contract. Expected return contains exactly `selected_source=<absolute PNG path>` and one `qa_note`.

- [ ] **Step 2: Copy and lock the selected base**

```bash
mkdir -p "$RUN_DIR/decoded" "$RUN_DIR/references"
cp "$SOURCE" "$RUN_DIR/decoded/base.png"
cp "$RUN_DIR/decoded/base.png" "$RUN_DIR/references/canonical-base.png"
```

Expected: the two files are byte-identical and show one centered full-body character on the flat run chroma background.

- [ ] **Step 3: Mark base complete**

Update only the `base` object in `imagegen-jobs.json` with `status: "complete"`, the selected `source_path`, and an ISO-8601 `completed_at`. Remove the selected original if it is under `~/.codex/generated_images` after the decoded copy exists.

### Task 3: Generate and Incrementally Validate Standard Rows

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/{idle,running-right,running-left,waving,jumping,failed,waiting,running,review}.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/rows/<row-id>/review.json`
- Modify: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/imagegen-jobs.json`

**Interfaces:**
- Consumes: canonical base, row-specific layout guide, row prompt, and manifest input roles
- Produces: nine row strips that pass per-row extraction and component inspection

- [ ] **Step 1: Generate identity and gait checks**

Dispatch separate lightweight workers for `idle` and `running-right`, attaching every manifest-listed image. Copy each selected source to its decoded output and immediately run:

```bash
ROW_QA_DIR="$RUN_DIR/qa/rows/$JOB_ID"
"$PYTHON" "$SKILL_DIR/scripts/extract_strip_frames.py" --decoded-dir "$RUN_DIR/decoded" --output-dir "$ROW_QA_DIR/frames" --states "$JOB_ID" --method auto
"$PYTHON" "$SKILL_DIR/scripts/inspect_frames.py" --frames-root "$ROW_QA_DIR/frames" --json-out "$ROW_QA_DIR/review.json" --states "$JOB_ID" --require-components
```

Expected: no errors, visible idle micro-variation, and a right-facing alternating gait without detached effects.

- [ ] **Step 2: Decide `running-left` derivation**

If the approved right row remains semantically correct when flipped, run:

```bash
"$PYTHON" "$SKILL_DIR/scripts/derive_running_left_from_running_right.py" --run-dir "$RUN_DIR" --confirm-appropriate-mirror --decision-note "The staff, clothing, hair, and markings have no handed text or asymmetric identity cue; per-slot mirroring preserves cadence and identity."
```

Otherwise dispatch a normal grounded `running-left` worker. Expected: a left-facing alternating gait with preserved temporal order.

- [ ] **Step 3: Generate remaining independent rows**

Keep up to three isolated generation workers active for `waving`, `jumping`, `failed`, `waiting`, `running`, and `review`. Attach all listed inputs, copy one approved output per job, run the two per-row inspection commands, and mark only passing jobs complete.

- [ ] **Step 4: Repair row-level failures**

For a visual-semantic failure, regenerate only that complete row with the retry prompt. For extraction-only instability where the source strip has stable slots, re-extract with `--method stable-slots` and inspect with `--allow-stable-slots`. Expected: every standard row review contains no errors.

### Task 4: Assemble and Review the Standard 8-by-9 Atlas

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/frames/`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/final/spritesheet.webp`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/contact-sheet.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/previews/*.gif`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/review.json`

**Interfaces:**
- Consumes: nine passing decoded standard row strips
- Produces: approved 8-by-9 identity and motion reference for look generation

- [ ] **Step 1: Extract and inspect all standard frames**

```bash
"$PYTHON" "$SKILL_DIR/scripts/extract_strip_frames.py" --decoded-dir "$RUN_DIR/decoded" --output-dir "$RUN_DIR/frames" --states all --method auto
"$PYTHON" "$SKILL_DIR/scripts/inspect_frames.py" --frames-root "$RUN_DIR/frames" --json-out "$RUN_DIR/qa/review.json" --require-components
```

Expected: `qa/review.json` has no errors.

- [ ] **Step 2: Compose QA media**

```bash
mkdir -p "$RUN_DIR/final" "$RUN_DIR/qa/previews"
"$PYTHON" "$SKILL_DIR/scripts/compose_atlas.py" --frames-root "$RUN_DIR/frames" --output "$RUN_DIR/final/spritesheet.png" --webp-output "$RUN_DIR/final/spritesheet.webp"
"$PYTHON" "$SKILL_DIR/scripts/make_contact_sheet.py" "$RUN_DIR/final/spritesheet.webp" --output "$RUN_DIR/qa/contact-sheet.png"
"$PYTHON" "$SKILL_DIR/scripts/render_animation_previews.py" --frames-root "$RUN_DIR/frames" --output-dir "$RUN_DIR/qa/previews"
```

Expected: standard atlas is `1536x1872`; contact sheet and nine motion previews exist.

- [ ] **Step 3: Run independent standard visual review**

Dispatch a lightweight QA worker to inspect the contact sheet and GIFs. Repair a complete failing row and repeat extraction, assembly, and review until identity, state semantics, baseline, and cadence pass.

### Task 5: Define Look Mechanics and Approve Cardinal Anchors

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/look-mechanics.md`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/look-cardinals.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/look-anchors-approved.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/cardinal-anchors.json`

**Interfaces:**
- Consumes: canonical base and approved standard contact sheet
- Produces: explicit humanoid gaze mechanics and four semantically approved pose families

- [ ] **Step 1: Write character-specific mechanics**

Record that the lower body and feet remain anchored; eyes and eyelids lead; the head and neck follow with restrained turn or pitch; hair and pointed ears follow subtly; the staff remains attached to the hand and lags slightly. Define visible occlusion and face landmarks for all four cardinal families plus an even 22.5-degree motion budget.

- [ ] **Step 2: Generate the four-cardinal strip**

Dispatch one isolated cardinal worker with the prompt, canonical base, standard contact sheet, guide, and `qa/look-mechanics.md`. Expected order: unmistakable up, screen-right, down, screen-left.

- [ ] **Step 3: Extract and approve cardinals**

```bash
CHROMA_KEY=$(jq -r '.chroma_key.hex' "$RUN_DIR/pet_request.json")
"$PYTHON" "$SKILL_DIR/scripts/extract_cardinal_anchors.py" --strip "$RUN_DIR/decoded/look-cardinals.png" --output-dir "$RUN_DIR/decoded/look-anchors" --chroma-key "$CHROMA_KEY" --json-out "$RUN_DIR/qa/cardinal-anchors.json"
"$PYTHON" "$SKILL_DIR/scripts/compose_cardinal_anchor_strip.py" --anchors-dir "$RUN_DIR/decoded/look-anchors" --output "$RUN_DIR/decoded/look-anchors-approved.png"
```

Expected: extraction passes; nose, pupils, eyelids, and head turn make each cardinal unmistakable at pet size.

### Task 6: Generate and Register Look Rows

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/look-row-9.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/decoded/look-row-10.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/look-row-9-registered.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/look-row-9-registration.json`

**Interfaces:**
- Consumes: approved cardinal strip, canonical base, standard contact sheet, look mechanics, and completed row 9 for row 10 continuity
- Produces: two coherent passing eight-pose direction families in fixed clockwise order

- [ ] **Step 1: Generate and register row 9**

Dispatch one row worker for `000` through `157.5`. Copy the selected strip and run:

```bash
"$PYTHON" "$SKILL_DIR/scripts/assemble_extended_atlas.py" --base-atlas "$RUN_DIR/final/spritesheet.webp" --look-row-9 "$RUN_DIR/decoded/look-row-9.png" --neutral-cell "$RUN_DIR/frames/idle/00.png" --chroma-key "$CHROMA_KEY" --chroma-threshold 96 --registered-row-output "$RUN_DIR/qa/look-row-9-registered.png" --registration-manifest-output "$RUN_DIR/qa/look-row-9-registration.json"
```

Expected: eight ordered pose groups, no edge failures, and continuous up-to-right-to-down progression.

- [ ] **Step 2: Generate row 10 with boundary continuity**

After row 9 passes, dispatch one row worker for `180` through `337.5`, attaching the completed row 9 and approved cardinals. Expected: continuous down-to-left-to-up progression with `337.5` one step before `000`.

- [ ] **Step 3: Repair coherent-row failures**

For any wrong quadrant, cardinal, clip, overlap, identity drift, or conspicuous snap, strengthen the containing row prompt and regenerate the entire eight-pose strip. Never patch an individual normalized cell.

### Task 7: Assemble, Despill, and Deterministically Validate v2

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/final/spritesheet-extended.webp`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/final/validation-extended.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/chroma-despill-extended.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/contact-sheet-extended.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/look-directions.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/look-continuity.json`

**Interfaces:**
- Consumes: passing standard atlas and coherent look rows
- Produces: structurally valid transparent v2 atlas plus deterministic QA artifacts

- [ ] **Step 1: Assemble the extended atlas**

```bash
"$PYTHON" "$SKILL_DIR/scripts/assemble_extended_atlas.py" --base-atlas "$RUN_DIR/final/spritesheet.webp" --registered-row-9 "$RUN_DIR/qa/look-row-9-registered.png" --row-9-registration "$RUN_DIR/qa/look-row-9-registration.json" --look-row-10 "$RUN_DIR/decoded/look-row-10.png" --neutral-cell "$RUN_DIR/frames/idle/00.png" --chroma-key "$CHROMA_KEY" --chroma-threshold 96 --output "$RUN_DIR/final/spritesheet-extended.png" --webp-output "$RUN_DIR/final/spritesheet-extended.webp" --manifest-output "$RUN_DIR/final/spritesheet-extended.json"
```

Expected: atlas dimensions are `1536x2288` and row 10 uses the persisted row-9 scale.

- [ ] **Step 2: Run the single despill and validator**

```bash
"$PYTHON" "$SKILL_DIR/scripts/despill_chroma_edges.py" "$RUN_DIR/final/spritesheet-extended.png" --output "$RUN_DIR/final/spritesheet-extended.png" --webp-output "$RUN_DIR/final/spritesheet-extended.webp" --chroma-key "$CHROMA_KEY" --json-out "$RUN_DIR/qa/chroma-despill-extended.json"
"$PYTHON" "$SKILL_DIR/scripts/validate_atlas.py" "$RUN_DIR/final/spritesheet-extended.webp" --json-out "$RUN_DIR/final/validation-extended.json" --chroma-key "$CHROMA_KEY" --require-v2
```

Expected: both JSON reports contain `ok: true`.

- [ ] **Step 3: Produce extended QA media**

```bash
"$PYTHON" "$SKILL_DIR/scripts/make_contact_sheet.py" "$RUN_DIR/final/spritesheet-extended.webp" --output "$RUN_DIR/qa/contact-sheet-extended.png"
"$PYTHON" "$SKILL_DIR/scripts/make_direction_qa_sheet.py" "$RUN_DIR/final/spritesheet-extended.webp" --output "$RUN_DIR/qa/look-directions.png"
"$PYTHON" "$SKILL_DIR/scripts/measure_direction_continuity.py" "$RUN_DIR/final/spritesheet-extended.webp" --json-out "$RUN_DIR/qa/look-continuity.json"
```

Expected: all QA artifacts exist and the continuity report has been reviewed for visible rather than metric-only failures.

### Task 8: Independent Direction and Final Visual QA

**Files:**
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/direction-blind-pairs.png`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/direction-blind-verdicts-{1,2,3}.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/direction-blind-validation.json`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/direction-semantics.json`

**Interfaces:**
- Consumes: final atlas, blind sheet, labeled direction sheet, previews, validation, and continuity reports
- Produces: three isolated verdicts, combined blind validation, all sixteen labeled semantic verdicts, and final visual pass

- [ ] **Step 1: Create the blind challenge**

```bash
"$PYTHON" "$SKILL_DIR/scripts/make_direction_blind_qa_sheet.py" "$RUN_DIR/final/spritesheet-extended.webp" --output "$RUN_DIR/qa/direction-blind-pairs.png" --answer-key "$RUN_DIR/qa/direction-blind-answer-key.json"
```

Expected: sheet and hidden answer key exist.

- [ ] **Step 2: Collect three isolated blind verdicts**

Dispatch three fresh workers with `fork_turns="none"`; each may inspect only `direction-blind-pairs.png`. Persist each returned JSON object separately, combine, and validate:

```bash
"$PYTHON" "$SKILL_DIR/scripts/combine_direction_blind_verdicts.py" --verdicts "$RUN_DIR/qa/direction-blind-verdicts-1.json" --verdicts "$RUN_DIR/qa/direction-blind-verdicts-2.json" --verdicts "$RUN_DIR/qa/direction-blind-verdicts-3.json" --json-out "$RUN_DIR/qa/direction-blind-verdicts.json"
"$PYTHON" "$SKILL_DIR/scripts/validate_direction_blind_verdicts.py" --answer-key "$RUN_DIR/qa/direction-blind-answer-key.json" --verdicts "$RUN_DIR/qa/direction-blind-verdicts.json" --json-out "$RUN_DIR/qa/direction-blind-validation.json"
```

Expected: cardinal pairs pass; intermediate uncertainty is recorded as review evidence.

- [ ] **Step 3: Run final independent visual QA**

Dispatch a worker to inspect standard and extended contact sheets, labeled directions, previews, continuity, review, and validation. Persist all sixteen `pass` or reviewed `warning` results in `direction-semantics.json`. Expected: `visual_qa=pass`, no semantic `fail`, and no row repair request.

### Task 9: Package, Install, Summarize, and Verify

**Files:**
- Create: `/Users/haruhito/.codex/pets/frieren/pet.json`
- Create: `/Users/haruhito/.codex/pets/frieren/spritesheet.webp`
- Create: `/Users/haruhito/Documents/Github/web/output/hatch-pet/frieren/qa/run-summary.json`

**Interfaces:**
- Consumes: fully passing v2 atlas and complete deterministic plus visual QA evidence
- Produces: installed Codex pet and concise retained run artifacts

- [ ] **Step 1: Install the approved package**

After requesting filesystem approval for `~/.codex/pets/frieren`, copy the final WebP and write:

```json
{
  "id": "frieren",
  "displayName": "Frieren",
  "description": "A calm chibi elven mage with pale silver-white hair, green eyes, white-and-gold clothing, and a small wooden staff.",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

Expected: manifest and spritesheet are installed together.

- [ ] **Step 2: Write the run summary**

Create `qa/run-summary.json` with `ok: true`, `spriteVersionNumber: 2`, and absolute paths to the final atlas, validation, despill report, contact sheet, direction sheet, direction semantics, blind validation, continuity report, standard review, and installed package.

- [ ] **Step 3: Verify installation**

```bash
jq -e '.spriteVersionNumber == 2 and .id == "frieren" and .spritesheetPath == "spritesheet.webp"' /Users/haruhito/.codex/pets/frieren/pet.json
"$PYTHON" "$SKILL_DIR/scripts/validate_atlas.py" /Users/haruhito/.codex/pets/frieren/spritesheet.webp --json-out "$RUN_DIR/final/validation-installed.json" --chroma-key "$CHROMA_KEY" --require-v2
```

Expected: both commands exit zero and installed validation reports `ok: true`.

- [ ] **Step 4: Retain required QA and remove disposable intermediates**

Keep the request, final WebP, validation, despill, extended contact sheet, look sheet, semantics, blind artifacts, continuity, previews, review, and run summary. Remove prompts, layout guides, decoded strips, extracted frames, PNG intermediates, standard intermediate atlas, and image-generation manifest only after installation verification succeeds.

