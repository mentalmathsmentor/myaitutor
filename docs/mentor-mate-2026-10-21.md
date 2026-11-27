# Mentor Mate: realistic character and small browser runtime

Status: local research and asset lab, 21/10/2026. No final character, service purchase, provider integration, publication or deployment is represented by this document.

## Decision

Author or acquire one realistic, rigged character, export a self-contained GLB and serve that file from the website. Load Three.js only after the lesson is ready and the character is enabled. Keep the optional character independent of teaching and learning functions. Preserve VRM as an import option for evaluating existing work; ship the VRM runtime only if the final asset benefits from it.

The character brief is an adult male with natural proportions, blonde hair, glasses, chinos, an athletic build and understated Australian smart casual clothing. The preferred starting wardrobe is a muted blue or sage open-collar shirt and stone chinos. Natural eye proportions, simple hair geometry and restrained PBR materials matter more than expensive rendering effects. Do not try to fix an anime head by adding skin shaders. Dense strand hair, depth of field, realtime shadows and extra skin passes are not first-release requirements.

## Existing Arthur app inspection

Both inspected Arthur app assets are byte-identical:

- `.local/arthur-butler-alpha/build-alpha2-stage/public/assets/arthur.vrm`
- `.local/repo-split-2026-08-20/arthur-operations-candidate/apps/arthur-butler/public/assets/arthur.vrm`

These paths are relative to the enclosing Playground workspace. Their SHA-256 is `624d0d554bc205bbdc33e22a68a2c3c20edebb3e573011ead8878a65e5329b23`. Embedded metadata identifies **Seed-san by VirtualCast, Inc.**, requires credit, and declares a VRM 1.0 asset. The embedded thumbnail and a real browser rendering confirm anime styling. This is a reusable technical reference, not the selected visual design or proof that a separate custom VRoid project has been found.

Computed binary inventory: 10,917,800 bytes; 45,058 indexed triangles; 21 primitives; 17 materials; 15 embedded images; 5 skins; up to 43 morph targets per primitive; no embedded animation clips. VRM preset expressions include blink, happy, surprised, relaxed and visemes. Counts come from the GLB JSON/accessors, not a phone benchmark. A targeted search of the app/staging folders did not establish a separate editable `.vroid` source.

The Arthur renderer demonstrates useful ideas: conditional VRM loading, expression controls, reduced motion, visibility pausing and disposal. Its avatar visuals and application context should not be copied into the learning product.

## Creator shortlist

Primary pages checked on 21/10/2026. The remembered cheap subscription site remains unidentified.

| Route | Fit | Remaining check |
|---|---|---|
| [MetaPerson Creator](https://avatarsdk.com/metaperson-creator/) | First practical trial for a realistic human. The provider offers a first avatar/export free and downloadable model formats; premade starting avatars avoid using a personal selfie. | Confirm the chosen outfit, facial rig, actual downloaded file and commercial web redistribution rights before commercial use. The free authoring offer is distinct from embedding its paid creator in the product. |
| [Avaturn T2](https://docs.avaturn.me/docs/integration/bodies/) | Alternative humanoid with animatable face. T2 supports ARKit blendshapes and visemes. | Do not choose T1 merely because it is lighter: its face is static. Verify the exact export, licence and fit. |
| [Meshy](https://www.meshy.ai/pricing) | A plausible match for the remembered inexpensive subscription; its official help lists a Pro tier and body rigging/animation features. | The remembered service is not confirmed. A generated mesh or body rig does not establish a usable facial expression rig, reliable topology or the desired appearance. Test an actual export before paying or selecting this path. |
| [ActorCore](https://actorcore.reallusion.com/) | Potential one-off acquisition if a stock realistic male character is already close to the brief. | The dynamic product listing did not expose a verifiable price in this controller's direct read. Do not treat the research agent's example price as confirmed. Check licence and matching appearance on the actual asset. |

[MetaPerson pricing](https://avatarsdk.com/pricing-cloud/) explicitly separates individual exports from creator embedding/API plans. [Avaturn pricing](https://avaturn.me/pricing/) also describes developer integration. A recurring creator/API subscription is unnecessary at runtime when the site only needs to render one legally exportable model. This is an architecture recommendation; export rights still depend on the actual asset licence.

## Proposed budgets, not measured results

Start with a character transfer target around 3 MB, roughly 20,000 triangles, a small material count, and mostly 1K textures. Treat these as trial budgets, not universal quality or phone limits. Facial morphs, hair overdraw, decoded texture memory, skinning and draw calls all need inspection; reducing file size alone does not prove faster rendering.

Use a still portrait before loading. Make Still, Quiet, Minimise and Projection explicit choices. Still and reduced-motion modes have no autonomous blink. Minimise uses a portrait rather than a tiny continuously rendered 3D scene. Hidden/offscreen states stop the render loop. Cap quiet rendering around 30 frames per second. Keep a neutral expression and a small verified expression mapping, then add seated body clips only when the asset actually has them.

Use same-origin assets, optional same-origin decoders and immutable content-hashed production filenames. Standard GLB with Three.js is the default; import three-vrm only for VRM. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) supports the relevant extensions with configured loaders/plugins. Compression needs a separate visual regression pass so it does not damage eyelids, lips, morph order or bone bindings.

## Local lab

`tools/mentor-lab/` is a standalone local tool, not a change to `/learn`. The controller starts its loopback server. The interface loads the existing Arthur sample or opens a self-contained GLB/VRM from the device; file selection does not upload the model. The 3D runtime is deferred until selection. It reports model counts and maps available expressions. It supports still, quiet, minimised and projection modes, reduced-motion and visibility pausing, and explicit disposal.

The lab intentionally does not create a new character, optimise the file or manufacture missing seated animation. No third-party model or library is committed. Existing installed runtime files are mounted read-only for the local preview. Compressed models without configured decoders may fail cleanly and need a later decoder integration.

## Validation and remaining work

Local browser checks cover sample loading, real VRM expression control and the visible presence modes. A separate native read-only review identified asynchronous disposal, unsupported-expression mutation and inherited HTTP HEAD handling; those paths were corrected. Retain the task's detailed QA receipt outside the application source.

Before app integration: approve the actual character visually; inspect the chosen export/licence and provenance; add an explicit bone/expression manifest; make a seated clip; profile rendering and memory on real phones; test repeated enable/disable, reduced motion, context loss, corrupt assets and network failure. A narrow desktop viewport does not establish physical-phone performance.

## Agent work and limits

Separate research/design tasks used native GPT Luna, AGY Flash and native Claude Sonnet through subscriptions. The Flash tasks produced wardrobe and motion ideas; Sonnet produced the asset contract. They were not a cross-family verification council. Current primary-source checks and local computations determine factual claims. No private profiles, personal photographs or lesson records were included in the screened external design briefs.

The controller rejected expensive rendering suggestions, still-mode blinking and claims about automatic battery-saver detection as requirements. Still means still. Device performance, the remembered site identity and the final model's appearance remain unresolved.

## Git and rollback

Keep the pre-existing `App.jsx`, `Navigation.jsx` and practice files outside the lab commit. This change adds only the isolated lab and this decision record. Rollback removes or reverts those exact additions; no live environment or data migration is involved. Push and deployment need their own approval.
