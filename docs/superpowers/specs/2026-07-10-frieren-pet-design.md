# Frieren Codex Pet Design

## Goal

Create a Codex-compatible v2 animated pet inspired by Frieren: Beyond Journey's End. The result should be immediately recognizable as Frieren at pet scale while remaining clean, readable, and animation-safe.

## Visual Design

- Compact anime chibi proportions with a large head and short body.
- Long pale silver-white hair, pointed elf ears, calm green eyes, and a restrained expression.
- White-and-gold mage clothing with dark trim and a small wooden staff kept physically attached to a hand.
- Clean cel-shaded illustration style with bold readable shapes and minimal fine detail.
- Flat removable chroma-key background during generation; no scenery, text, logos, floor shadows, glow, or detached magic effects.

## Animation Contract

The pet will use the Codex v2 8-by-11 atlas contract with 192-by-208 cells. Standard rows cover idle, directional running, waving, jumping, failure, waiting for input, active work, and review. Two additional rows provide 16 clockwise look directions anchored by explicit up, right, down, and left poses.

Identity, proportions, clothing, hair, staff, palette, and cel-shaded finish must remain consistent across all rows. The staff remains attached and follows the hand naturally. Humanoid look motion is led by the eyes, eyelids, and head, with subtle upper-body and hair follow-through; the feet and lower body stay registered.

## Production And QA

Use the built-in image generation path for the base and generated animation strips. The hatch-pet scripts will deterministically extract frames, assemble the atlas, remove chroma spill once, render QA sheets and previews, and validate the final 1536-by-2288 v2 spritesheet.

Acceptance requires non-empty used cells, transparent unused cells, no clipped or overlapping poses, no identity drift, no forbidden detached effects, unmistakable cardinal gaze directions, a coherent 16-direction loop, successful blind direction review, and `spriteVersionNumber: 2` packaging.

## Deliverables

- Installed custom pet containing `pet.json` and `spritesheet.webp`.
- Final validated v2 spritesheet.
- Extended contact sheet, direction QA sheet, motion previews, validation report, and run summary.

