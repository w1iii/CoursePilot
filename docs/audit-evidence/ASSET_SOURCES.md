# Asset sources and third-party materials

**Basis:** inspected repository imports/references and official upstream license sources. Asset use is separate from exclusive authorship, redistribution permission, or a complete legal-compliance audit.

## Verified fonts and icons

Implementation: [root layout at audited revision](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/src/app/layout.tsx#L3-L44).

| Material | Use / official source | License evidence |
|---|---|---|
| Material Symbols Outlined | UI icon font loaded from Google Fonts; [official guide](https://developers.google.com/fonts/docs/material_symbols), [icon library](https://fonts.google.com/icons), [source repository](https://github.com/google/material-design-icons) | Guide specifies [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| DM Sans | UI body font via `next/font/google`; [Google Fonts](https://fonts.google.com/specimen/DM+Sans) | [Upstream OFL.txt](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt): SIL Open Font License 1.1 |
| DM Mono | UI code/label font; [Google Fonts](https://fonts.google.com/specimen/DM+Mono) | [Upstream OFL.txt](https://github.com/google/fonts/blob/main/ofl/dmmono/OFL.txt): SIL Open Font License 1.1 |
| Fraunces | Display font; [Google Fonts](https://fonts.google.com/specimen/Fraunces) | [Upstream OFL.txt](https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt): SIL Open Font License 1.1 |

Follow applicable notice and redistribution requirements when bundling font/icon files; a source link alone is not a blanket licensing certification. Brand/trademark use can have separate conditions.

## Other inspected materials

- **Procedural sounds:** [loom-sound.ts](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/src/lib/loom-sound.ts) synthesizes audio using Web Audio oscillators/noise. This path does not load downloaded audio clips; exclusive code authorship is not inferred.
- **Inline SVG and CSS artwork/animations:** present in landing/dashboard components. No external original-source attribution was established for every design/snippet. Do not label all graphics “original” without owner confirmation.
- **Anime.js:** imported by UI animation components. [Official repository/license](https://github.com/juliangarnier/anime); exact installed version remains in package lock. Library use is distinct from artwork ownership.
- **Canvas onboarding screenshots:** referenced from `public/onboarding/canvas/` by [OnboardingFlow.tsx](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/src/app/onboarding/OnboardingFlow.tsx). Original capture author, institutional permission and removal of personal information require owner confirmation. Do not publish new unredacted screenshots as evidence.
- **Canvas course material:** retrieved for authorized study use. No ownership transfer or permission for public redistribution is assumed; prefer synthetic examples in public AI evaluation.
- **Scaffold SVG files:** `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` exist under `public/`. No references were found in inspected `src` for those filenames; presence does not prove deployed use or original provenance.
- **Documentation template:** instructor-supplied `CSP221A_Final_Technical_Documentation_Template.docx`; source template left unchanged.

## Dependencies and service tiers

Package source/version disclosure: [web package lock](https://github.com/w1iii/CoursePilot/blob/12a2855d40ca52b9dbc4631907898fa1a3b5fdc0/package-lock.json) and [backend uv lock](https://github.com/w1iii/CoursePilot-RAG/blob/c50770126f4f6c6a3d6120c56bfa6d6b0b41d494/uv.lock). Backend evidence requires permission.

Owner reports free tiers for Vercel, Railway, Supabase, Clerk, Groq and R2; Gemini student Google AI Pro subscription. Billing dashboards, exact quotas, overage exposure and promotional expiry were not independently inspected.

**Gemini distinction:** student Google AI Pro subscription is not evidence of Gemini API billing tier/included usage. API project billing is separate; see [official billing guide](https://ai.google.dev/gemini-api/docs/billing). Do not infer unlimited/free inference from the student subscription.
