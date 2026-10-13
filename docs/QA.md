# Quality verification

This document separates implemented test coverage from checks that have actually run. Final measured results and remaining failures are recorded below when the production build is available.

## Reproduce the checks

Use Node.js 22 and the committed lockfile:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

The browser suite starts the production server with `npm run start`. To use an already running production server or a protected staging deployment, set `PLAYWRIGHT_BASE_URL`. Tests are configured for Chromium, Firefox and WebKit, and preserve a report, JSON results, failure traces and screenshots in `test-results/`.

For the performance evidence, start the production build and run:

```sh
npm run start
node tests/run-lighthouse.mjs
```

The performance script performs three consecutive mobile measurements each for the homepage, shop and Salted Caramel product page with the same simulated mobile throttling, using one Chromium session. Raw HTML and JSON reports and their medians are preserved under `test-results/lighthouse/`. Record any browser or CPU conditions that differ when comparing future runs.

## Browser coverage

- Every required public route at 320, 375, 390, 430, 768, 1024 and 1440 pixels.
- One primary heading, valid page response, no unintended horizontal overflow, missing image alternatives, broken visible images or unhandled browser exceptions.
- Mobile and desktop evidence screenshots of home, shop, product, mixed-box builder and cart.
- Automated WCAG A/AA checks on all page templates and reduced-motion behaviour.
- Search, filtering, sorting, all eight galleries and both flavour variants.
- Single-item and bundle preview selection, quantity edits, removal, empty basket, persistence, mixed-box capacity, fulfilment metadata and coexistence with standalone items.
- Corrupted local storage recovery, recomputed fixture prices, truthful unconnected form errors, preserved form contents, invalid discounts and keyboard drawer focus.
- Actual production API status, origin checks, unavailable account access and development checkout gates.

Automated accessibility checks cannot establish WCAG conformance alone. Keyboard focus, drawer containment/restoration, readable small-screen layouts and image composition require manual browser inspection. Browser emulation also does not establish actual-device coverage.

## Commerce verification limits

No merchant credentials or approved product food information were supplied with this project. The development catalogue must remain unavailable for live sale. Fixture cart tests establish adapter/UI behaviour only, not fulfilment, provider order creation or payment success. Required merchant checks are listed in [LAUNCH.md](LAUNCH.md).

## Results

On 14 October 2026, **80 targeted unit/integration tests passed** across six files. **153 distinct production browser checks passed after repairs**, with the latest observed outcome for each case recorded in [the verification summary](evidence/final-verification.json). These results combine the full three-engine run and targeted follow-up runs; they do not represent one uninterrupted 153-test run. Original reports, including the failures that led to repairs, are preserved in [the evidence index](evidence/README.md).

The production build, strict TypeScript check and full lint passed with no errors or warnings. In this restricted Windows environment, the native Vitest configuration loader avoids an esbuild parent-directory permission error.

These checks verified strict request validation, food approval gates, provider prices, stock/currency/quantity enforcement, six-component box representation, duplicate-add recovery, mixed-box completeness at checkout, allowlisted HTTPS destinations, query retry and non-repeated uncertain mutations. Forms tests verified HTTP acceptance before success, deduplication, content mismatch rejection, failed-destination errors and retry after an uncertain result. HTTP tests verified bounded chunked input, cross-origin rejection, unknown-error redaction and cookie-resistant anonymous rate limits.

Browser verification used Playwright Chromium 156, Firefox 157 and WebKit 27.2 on Windows. The completed matrix covers 28 routes at all seven required widths in all three engines: **588 route/viewport combinations**. No unintended horizontal overflow, missing visible images, broken internal links, unhandled console errors or hydration exceptions remained in these checks. Mobile navigation and bag drawers retain keyboard focus and restore it on Escape. Saved screenshots were visually inspected for cropping, legibility and overlap; each screenshot loads and decodes the entire page's imagery before capture.

The private static export also passed **four Chromium smoke checks** on `http://127.0.0.1:3001`: selected variant/quantity/persistence/removal, discovery bundle with checkout blocked, six-bag builder capacity, and truthful unconnected form errors with preserved input. This validates the static preview branch separately; it does not claim that the static deployment runs the Shopify server adapter.

## Production mobile Lighthouse

Three consistent measurements were run per page after font and image optimisation. Medians:

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 95 | 100 | 100 | 69 | 3.003 s | 0 |
| Shop | 99 | 100 | 100 | 69 | 1.954 s | 0.00054 |
| Salted Caramel | 99 | 100 | 100 | 69 | 2.105 s | 0 |

The performance, accessibility and best-practices score targets were met on all three measured pages. **The home LCP remains above the 2.5-second aim.** Shop and product LCP, and all three CLS measurements, meet their aims. The intentional private `noindex`/robots exclusion prevents the requested 100 SEO score. Keep the concept catalogue private; re-test SEO after an explicitly approved public launch. One home run also recorded a Chrome IO-stream timeout retrieving robots.txt; a direct production request returned valid robots text with HTTP 200. Its individual SEO score was 61; the three-run median remained 69.

Measurements used Lighthouse 13.5.0 and headless Chrome 154 against the local **production Next.js build** at `http://127.0.0.1:3000`, with a 412 × 823 mobile viewport, device scale factor 1.75, simulated mobile networking (150 ms RTT, 1638.4 Kbps throughput) and 4× CPU slowdown. Full configuration, browser environment and benchmark index are recorded in [the summary](evidence/lighthouse/summary.json); all nine raw JSON and HTML reports are retained. These are laboratory results, not measured field performance or a measurement of the hosted static preview.

No physical iPhone, Android phone or tablet was available. Actual-device behaviour, deployed CDN performance and real-user LCP/CLS/INP remain unverified. The `next/web-vitals` instrumentation is ready for a configured same-origin collection endpoint; no field INP result or 200 ms achievement is claimed.
