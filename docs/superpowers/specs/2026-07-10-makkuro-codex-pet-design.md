# Makkuro Codex Pet Design

## Goal

Create a Codex-compatible v2 animated pet that evokes the familiar charm of the Maxwell Cat meme without copying a particular photograph. The pet will be named **Makkuro** and packaged as an 8-column by 11-row atlas with all standard animations and 16 clockwise look directions.

## Visual Direction

Makkuro is a compact black-and-white tuxedo cat with a rounded loaf-like body, a black back and crown, a broad white chest and muzzle, small triangular ears, short paws, and a mildly blank but lovable expression. The rendering style is a smooth, clean sticker illustration with a dark outline and large readable markings. No props, text, scenery, shadows, detached effects, or photographic details will be used.

The design must remain legible in a 192 by 208 pixel cell. Fur texture will be suggested with a few broad shapes rather than fine strands so chroma-key removal stays reliable.

## Animation Contract

Rows 0–8 contain idle, running right, running left, waving, jumping, failed, waiting, active work, and review states. Running left may be derived from an approved right-facing row because the markings and silhouette are intentionally symmetric.

Rows 9–10 contain 16 clockwise look directions. The lower body stays anchored while the eyes lead, the head turns or tilts subtly, and the ears follow. Cardinal poses must read unmistakably as up, screen-right, down, and screen-left.

## Generation and QA

The base image and all generated animation strips use the built-in image generation path required by `hatch-pet`. The approved base becomes the canonical identity reference for every row. Deterministic skill scripts will extract frames, assemble the atlas, remove chroma spill once, validate v2 dimensions and occupancy, and produce contact sheets and previews.

Three isolated reviewers will classify the blind look-direction sheet, followed by an independent final visual review. Packaging occurs only if structural validation passes, standard rows preserve identity and state semantics, and all four cardinal directions are unambiguous.

## Deliverables

- `pet.json` with `spriteVersionNumber: 2`
- `spritesheet.webp` at 1536 by 2288 pixels
- retained validation, contact-sheet, direction, continuity, preview, and run-summary QA artifacts
- installed pet package under the local Codex pets directory

