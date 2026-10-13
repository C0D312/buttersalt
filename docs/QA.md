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

On 14 October 2026, **54 targeted unit/integration tests passed** across input validation, Shopify adapter behaviour with mocked provider responses, HTTP boundaries and the forms route with mocked destinations. Evidence: `test-results/unit-results.json`. Test/configuration lint passed with no errors or warnings. In this restricted Windows environment, the native Vitest configuration loader avoids an esbuild parent-directory permission error.

These checks verified strict request validation, food approval gates, provider prices, stock/currency/quantity enforcement, six-component box representation, duplicate-add recovery, mixed-box completeness at checkout, allowlisted HTTPS destinations, query retry and non-repeated uncertain mutations. Forms tests verified HTTP acceptance before success, deduplication, content mismatch rejection, failed-destination errors and retry after an uncertain result. HTTP tests verified bounded chunked input, cross-origin rejection, unknown-error redaction and cookie-resistant anonymous rate limits.

Production browser and Lighthouse measurements are pending the first production build. Do not interpret their coverage list above as a passing result. The private preview's intentional `noindex` policy may prevent a 100 SEO score; preserving that policy takes precedence over indexing the provisional catalogue.
