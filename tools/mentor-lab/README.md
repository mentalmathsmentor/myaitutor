# Mentor asset lab

Local-only inspection tool for a replacement Mentor Mate. This is separate from the application and its unfinished `/learn` work. No model, third-party library, provider integration or account is committed here.

The controller starts `serve.py` through its controlled tools, supplying the installed Three.js/three-vrm runtime directory and optional existing sample/thumbnail paths. It binds only to loopback and exposes only explicitly mounted files. It has no upload endpoint. The owner operates the preview through its graphical controls; no Terminal steps are required.

The initial page loads a small controller and sample thumbnail. The 3D libraries and model are requested only after a model is selected. A file chosen through **Open a GLB or VRM file** is parsed locally. Binary models must be self-contained: external buffer/image URIs are rejected before parsing. This first lab supports the baseline uncompressed models; compressed replacements will require the corresponding configured decoders and further validation.

Still is the default. Quiet motion plays the first embedded clip, if present; VRM supports blinking. It does not invent seated body animation for assets with no clips. Minimise and Projection suspend continuous rendering. Reduced motion and hidden/offscreen states suspend the loop. Expressions are mapped where supported and reported unavailable otherwise. A replacement will need an explicit expression mapping rather than assuming every creator uses VRM names.

The existing sample is Seed-san by VirtualCast, Inc., with required credit according to embedded VRM metadata. It is a technical reference, not the chosen visual direction. Original model bytes are preserved. Commercial licence verification and a final asset manifest remain prerequisites to commercial integration.

Limits: this lab does not validate an asset licence, prove mobile performance, optimise mesh/texture data, add a missing facial rig or retarget body animations. It does not generate a new character. See the accompanying research decision for the replacement brief and acceptance targets.
