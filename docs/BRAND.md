# buttersalt brand guide

## Idea and voice

A little crunch. A lot of joy. buttersalt brings a confident contemporary food-brand identity to eight provisional popcorn flavour concepts. Warm butter, ample cream space, soft geometric lettering and real-looking food textures balance playfulness with care. Always set the brand name in lowercase in prose. Keep copy concise, appetising and specific: “A caramel crunch with a salty finish” is useful; health promises, fabricated heritage and superlative quality claims are not.

## Original identity

The approved wordmark is custom-drawn editable SVG geometry, with a soft monoline construction, open counters and rounded ends. It is not a font or an embedded image. The compact mark is a lowercase **b** with a seed-shaped leaf, a simple silhouette that remains recognisable at small sizes. Use the full wordmark when introducing the brand and the mark for icons and supporting accents. Do not recreate the approved logo by typing the name in a font.

Masters and transparent PNG exports are in public/brand/: wordmark-dark, wordmark-light, wordmark-mono, mark-dark, mark-light, mark-mono. The dark master uses ink; the light master uses cream; the mono master is solid black. The script scripts/brand-assets.mjs preserves each individual letter as an editable path with a letter identifier. Editable front-label artwork for each flavour is packaging-{flavour}.svg.

Preserve aspect ratios. Keep clear space of at least the lowercase **u** height around the full wordmark, and half the bowl width around the compact mark. On the website use the wordmark at least 120 CSS pixels wide and the mark at least 24 pixels; favour the mark below those sizes. Do not stretch, outline, rotate, add shadows, recolour individual letters or place the logo across busy kernels. Use dark ink on light surfaces and cream on dark surfaces.

## Palette

| Role | Colour |
| --- | --- |
| Butter / brand accent | #F6CD45 |
| Cream / page surface | #FAF7EF |
| Ink / text and outlines | #26251E |
| Original Butter & Sea Salt | #F6CD45 |
| Sweet & Salty | #EAA7AB |
| Salted Caramel | #C75B2E |
| Cheddar Cheese | #3250B6 |
| Chocolate Drizzle | #752C3D |
| Chilli Lime | #667D43 |
| Truffle Parmesan | #B5A4C8 |
| Cinnamon Sugar | #C47F74 |

Flavour colours identify products; always include readable names so colour carries no essential meaning alone. Use cream type on cobalt, burgundy and moss front-label masters. Assess contrast in the real context before using flavour colours for small text or controls.

## Typography and interface

Use **Fraunces** for editorial headings, typically weights 400–600, with open line height and modest tracking. Use **DM Sans** for body, navigation, product data, controls and forms, typically weights 400–700. Both are licensed under the SIL Open Font License 1.1, with licences and local source files in public/fonts/. Use the Latin WOFF2 files in the storefront, font-display: swap, and sensible Georgia / sans-serif fallbacks. The logo geometry is independent of these fonts.

Use a 4px spacing base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Keep page gutters comfortable at 320px. Controls should have at least 44px touch targets, visible focus rings and direct action labels. Pair a pill-shaped ink primary action with a quiet outlined secondary action. Keep line icons simple, rounded and consistent, with meaningful accessible labels on icon-only controls. Motion should be subtle and disabled under reduced-motion preferences.

## Packaging and imagery

The system uses matte gusset pouches, a shared prominent wordmark position, small seed mark, spaced POPCORN label, flavour name and restrained popcorn outlines. Editable flat-label masters are development artwork, not production dielines. Add only confirmed operational and food information after the merchant and manufacturer approve it.

Sixteen flavour assets were created with the built-in image-generation tool: one bag and one close-up for every flavour. Eight subsequent image-generation edits refined the bags using the approved wordmark and seed-mark references. All final bags were inspected individually at full resolution; the complete final range was also inspected in the contact sheet at public/brand/flavour-contact-sheet.png. Packaging names are readable and spellings match the catalogue. Generated photography interprets the brand lettering; the SVG masters are the precise approved artwork for production. Print registration, gusset details, coatings and food appearance require final manufacturing review. None of these images are photographs of manufactured stock. Pre-refinement originals are retained with the -bag-v1.png suffix; selected refinements use -bag-approved.png, with canonical final originals also saved as -bag.png.

Keep lighting warm and consistent from the upper left, with cream backgrounds, believable shadows, crisp irregular kernels and restrained coatings. Desktop and mobile square product crops keep the whole pouch visible. Photography uses 960px WebP masters and 480px derivatives; high-resolution PNG originals are retained in assets/originals/. Generation prompts, exact filenames and status are in docs/image-prompts.json. Replace concept imagery with actual product photography as products are confirmed. No nutrition, weight, country, certification, dietary or verified ingredient claim is printed on the concept front labels.

## Reproducing assets

Run node scripts/brand-assets.mjs for the identity, icons, social cards and editable labels; run node scripts/brand-assets.images.mjs to rebuild optimised flavour images from retained originals. The optional BRAND_DEPENDENCY_ROOT environment variable can point to a bundled Node dependency directory containing sharp. Otherwise the scripts use project-installed sharp. The portable source manifest is scripts/brand-assets.sources.json. Keep the high-resolution originals outside the public web directory.
