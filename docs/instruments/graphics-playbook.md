# Raising the look of the chain dials: the Course Builder playbook applied

Source: `course-builder/docs/graphics-howto.md` (three.js golf landscape). This
page maps each of its steps onto Chain Dials, says what was built, and where.
The playbook's own warning carries over: the systems below are in place and
tested, and that is not proof the dials look finished. Only review on the
harness counts.

## 0. The order

| Playbook | Here | Status |
| --- | --- | --- |
| 1 Art bible | `docs/instruments/art-direction.md` | written |
| 2 Review harness | `/review/instruments` | built |
| 3 Lighting, shadows, fog | one light rig, quality tiers, fog context-loss | done |
| 4 Ground and surfaces | frame glass, stage well, calibration marks | existing, documented |
| 5 Vegetation | the instrument art itself, shape rules per family | rules written, art unchanged |
| 6 Asset pipeline | `docs/instruments/ATTRIBUTION.md` | recorded |
| 7 Performance and robustness | frame metrics, resource inventory, context loss | done |
| 8 Review in motion | harness spec and `docs/instruments/visual-review.md` | run |

Don't start with step 5. A dial on a bad frame under a bad light still looks bad.

## 1. Art bible

`docs/instruments/art-direction.md`: identity sentence, light rules, locked
palette with hex values, do/don't shape rules for each of the five instrument
families, quality tiers, acceptance views. Reference captures stay in the repo
under `docs/instruments/reference/` so pixel comparison is always possible.

## 2. Review harness

`src/components/review/InstrumentReviewHarness.tsx`, served at
`/review/instruments` (noindex in metadata and `public/robots.txt`).

| Playbook control | Harness control |
| --- | --- |
| Named cameras (Tee, Approach, Bunker floor…) | Views: Board, Wall, Stage; stage buttons 01–05 |
| 1.7 m eye-height views | Stage view at 1920×1080: the close view |
| Morning / Neutral light switch | Light: Accent / Neutral (grey accent, glows off) |
| Hide planting | Chrome: Frames / Bare art (dial must read alone) |
| Fixed 1920×1080 render target | Spec sets fixed viewports; captures clip to `#review-target` |
| Scripted camera run with JSON report | Run review: 4 chains × 3 scenarios × 2 views × 2 lights, frame p50/p95/fps, node inventory, readings |
| Test graphics recovery | Forces `WEBGL_lose_context` on the atmosphere fog and restores it |
| One curated hole | Fixture readings from `src/lib/review/fixtures.ts`, scenarios Nominal, Late tip, No data |

Extra, specific to dials: a Tier switch (Auto / Desktop / Mobile) and a check
that readings are identical under both lights (`readingDrift`).

## 3. Lighting, shadows, fog

- **One rig**: `src/lib/dial-light.ts` holds the key light (40 %, 30 %), the rim
  diagonal and the contact shadow. `DialBezel`, Block Metronome, Tip Sigil and
  Hashrate Forge now share it. Before this the three older BTC dials each had
  their own highlight position (42/38, 40/35, 40/35).
- **Quality tiers**: `useQualityTier()` treats `pointer: coarse` as mobile.
  Mobile halves bezel ticks and drops the `feGaussianBlur` passes, which were a
  per-frame cost on a hand that moves every 250 ms.
- **Fog rig created once, toggled, never rebuilt per style switch**: the
  atmosphere fog attaches once per canvas. The playbook's CSM gotcha applies.
- **Context loss**: the fog canvas now handles `webglcontextlost` with
  `preventDefault()` and re-attaches on `webglcontextrestored`. The 2D sky paints
  in between. Previously a lost context was only noticed on the next effect run.

## 4. Ground and surfaces

The frame is the ground: `.instrument-frame` glass, `.instrument-stage-well`,
calibration crosses, sheen and vignette in `src/app/globals.css`. Rule carried
over verbatim: presentation never changes gameplay. Here, presentation never
changes a reading, and the harness report proves it per run.

## 5. The art

The playbook's botanical lessons translate to the shape rules in the art bible:
branch-led structure (hand, ticks, scale, then halo), no balloon crowns (no
structureless glow blobs), no billboards (no spinning sprites in the fog), and
flowers on the whole envelope (labels placed on the face, not stacked on top).
This pass changed no instrument geometry on purpose: light and harness first.

## 6. Asset pipeline

There are no sourced meshes or textures. Fonts, icons and the noise texture are
recorded with licence in `docs/instruments/ATTRIBUTION.md`. If a CC0 asset is
ever added, record author, URL, licence, date and sha256 there before use.

## 7. Performance and robustness

| Concern | Here | File |
| --- | --- | --- |
| Hidden tab renders | `InstrumentActivity` and `useDocumentVisible` suspend motion | existing |
| Context loss crashes | fog lost/restored handlers | `src/components/viz/MempoolAtmosphere.tsx` |
| "Is it fast?" guesses | ring buffer with median, p95, fps; reads never disturb it | `src/lib/frame-metrics.ts` |
| VRAM creep | node, SVG filter/gradient and canvas-byte inventory (estimate, labelled) | `src/lib/resource-inventory.ts` |
| Teardown | harness restores accent, motion, tier and chrome attributes on unmount | harness |

Each pure part has a unit test under `src/lib/*.test.ts`.

## 8. Reviewing

`tests/browser/review-harness.spec.ts` drives the harness through the UI,
writes the reference captures and `review-report.json`, asserts no overflow,
no reading drift, a working mobile tier and fog recovery. The human findings
go in `docs/instruments/visual-review.md`.

## Lessons carried over

1. Passing tests does not mean it looks good. Say so in every report.
2. Look at it close (stage) and moving (live motion), not only on the board.
3. Check in neutral light. The accent glow hides muddy faces.
4. Fix light and frame before redrawing a dial.
5. Presentation reads data and never writes it.
6. Record provenance before using any outside asset.
7. Keep the reference captures in the repo.
8. Label development geometry. The harness banner says it is not approved art.
