# buttersalt handover

The project includes the complete responsive Next.js storefront, all eight flavour concepts, three boxes, mixed-box builder, search/filter/sort, persistent development basket, original editable identity, generated packaging and food imagery, optimised assets, retained originals and prompts, Shopify adapter, catalogue setup tool, owner documentation and CI.

- [Private source repository](https://github.com/C0D312/buttersalt)
- [Private preview address](https://buttersalt.kamal23q.chatgpt.site)
- [Owner guide](OWNER.md), [commerce integration](COMMERCE.md), [deployment](DEPLOYMENT.md), [brand guide](BRAND.md)

The Sites preview is a static development storefront. It accepts no payments, creates no orders and sends no forms. Its basket persists in the browser. Deploy the full Next.js server application with configured merchant services for the selling system.

## Verified quality

The production build, strict TypeScript and lint pass. All 80 unit/integration tests pass. Across the complete browser run and targeted repair runs, all 153 distinct production browser tests have a passing latest result in Chromium, Firefox and WebKit. Routes were inspected at 320, 375, 390, 430, 768, 1024 and 1440 pixels. Tests and manual browser review cover galleries, search, variants, quantities, bundles, mixed-box component metadata, basket persistence/recovery, keyboard navigation, forms and responsive layouts. These are emulated browsers, not physical-device tests.

Three consistent mobile Lighthouse measurements per page produced median performance/accessibility/best-practices scores of 95/100/100 for home and 99/100/100 for shop and product. LCP medians were 3.003s, 1.954s and 2.105s respectively; homepage LCP remains above the 2.5s aim. CLS stayed below 0.001. SEO remains 69 because this private concept catalogue intentionally disallows indexing. Field performance and INP have not been measured.

See [QA.md](QA.md) and [retained evidence](evidence/) for exact test scope, repairs, measurements and limitations.

The exported static preview also passed four Chromium smoke tests for variant selection and persistent quantities/removal, discovery-bundle checkout blocking, six-bag mixed boxes and truthful unconnected-form errors with preserved input.

## Commerce verification and remaining dependencies

Mocked provider tests verify authoritative prices, stock and quantity rules, product approval gates, mixed-box line representation, duplicate mutation recovery, checkout gating, protected cart sessions and truthful form errors/success after upstream acceptance. They do not verify real merchant payments, orders, delivery or authentication.

Before live selling, supply the Shopify merchant domain and scoped credentials; verified food information, sizes, weights, stock and prices; actual business contact details and approved policies; shipping, tax, payment and account settings; and a real forms destination. Replace or approve concept photography against manufactured stock. Run real merchant sandbox checkout, successful/declined/cancelled/authentication-required payment, order, account, inventory, mixed-box fulfilment and refund tests. Scaled server deployments need shared durable rate-limit/replay controls. Public launch and live payments require an explicit owner instruction. The complete checklist is in [LAUNCH.md](LAUNCH.md).
