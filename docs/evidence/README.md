# Verified evidence

Evidence was collected on 14 October 2026, Australia/Sydney. All original reports are retained; failures are documented rather than removed from the history.

- [Final verification summary](final-verification.json): 153 distinct browser checks with their latest observed outcome, all passing, and 80 passing unit/integration checks.
- [Unit and integration results](unit-results.json): six test files covering validation, HTTP, provider adapter, actual form route/destination acceptance, quantity rules and sitemap gates.
- [Archive manifest](archive-manifest.json): byte counts and SHA-256 hashes of each raw JSON report. Gzip archives restore the exact original JSON; compression round trips were hash-verified. The largest earlier reports contain inline screenshot/axe attachments. New reports reference evidence files to avoid embedding large images in JSON.

## Browser runs

| Report | Actual result | Purpose |
| --- | --- | --- |
| [Full run](browser-full-results.json.gz) | 140 passed, 10 failed | Complete Chromium/Firefox/WebKit run. Found 320px typography overflow and WebKit navigation timing; two failures were test expectations affected by new guards/experimental axe rules. |
| [First repair run](browser-repair-first-results.json.gz) | 38 passed, 4 failed | Verified stock guard and axe corrections, complete image loading and captures. Identified bundle typography and the remaining navigation timing race. |
| [Final layout/focus/cart repair](browser-repair-results.json.gz) | 18 passed | All routes at 320px, all-engine focus, selected-variant cart and provider minimum/increment checks, home captures. |
| [Aggregate cap](browser-quantity-cap-results.json.gz) | 3 passed | All three engines prevent increasing a variant beyond the total across mixed-box groups. |
| [Final fonts, responsive](browser-font-responsive-results.json.gz) | 3 passed | All 28 routes at 320px in each engine after font subsetting. |
| [Final fonts, screenshots](browser-font-screenshot-results.json.gz) | 10 passed | All five required page captures at mobile/desktop sizes, complete imagery decoded. |
| [Private static export smoke](static-smoke-results.json.gz) | 4 passed | Chromium on port 3001: variant/cart persistence/removal, blocked checkout, six-bag builder, truthful form errors. |

The readable final summary derives the latest actual result per project/file/test name from these production reports, retaining their original run statistics. It does not alter or fabricate an original run. The static export smoke remains a separate deployment check.

For example, decompress a raw report using `gzip -dk browser-full-results.json.gz`, or use Node's built-in `zlib.gunzip` on Windows. The resulting file's SHA-256 is listed in the manifest.

## Mobile performance

[Final Lighthouse summary](lighthouse/summary.json) contains the three-run medians and exact conditions. The [QA report](../QA.md) documents the remaining home LCP aim and intentional SEO exclusion. Laboratory results do not establish field performance.

| Page | JSON | HTML |
| --- | --- | --- |
| Home | [1](lighthouse/home-1.json), [2](lighthouse/home-2.json), [3](lighthouse/home-3.json) | [1](lighthouse/home-1.html), [2](lighthouse/home-2.html), [3](lighthouse/home-3.html) |
| Shop | [1](lighthouse/shop-1.json), [2](lighthouse/shop-2.json), [3](lighthouse/shop-3.json) | [1](lighthouse/shop-1.html), [2](lighthouse/shop-2.html), [3](lighthouse/shop-3.html) |
| Product | [1](lighthouse/products-salted-caramel-1.json), [2](lighthouse/products-salted-caramel-2.json), [3](lighthouse/products-salted-caramel-3.json) | [1](lighthouse/products-salted-caramel-1.html), [2](lighthouse/products-salted-caramel-2.html), [3](lighthouse/products-salted-caramel-3.html) |

[The earlier performance summary](lighthouse-before-font-optimisation.json) records the 93/98/95 performance medians which prompted further font optimisation. Its raw reports remain under `test-results/lighthouse-pre-optimisation/` in the working project. Initial reports are retained under `test-results/lighthouse-initial/`.

## Final screenshot inspection

These Chromium captures use 390 × 844 and 1440 × 1000 browser viewports. Full-page images are completely loaded and decoded. The responsive tests separately inspect 320, 375, 390, 430, 768, 1024 and 1440 pixels in all three engines.

| Page | Mobile | Desktop |
| --- | --- | --- |
| Home | [390px](screenshots/home-390.png) | [1440px](screenshots/home-1440.png) |
| Shop | [390px](screenshots/shop-390.png) | [1440px](screenshots/shop-1440.png) |
| Product | [390px](screenshots/product-390.png) | [1440px](screenshots/product-1440.png) |
| Builder | [390px](screenshots/builder-390.png) | [1440px](screenshots/builder-1440.png) |
| Cart | [390px](screenshots/cart-390.png) | [1440px](screenshots/cart-1440.png) |

Merchant-backed orders, payments, discounts, destination shipping, authentication, real form delivery and fulfilment are credential-blocked. See [LAUNCH.md](../LAUNCH.md). No physical-device or field performance results are claimed.
