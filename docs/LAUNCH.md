# Merchant setup and launch

The checked-in catalogue and imagery are development concepts. A public launch and live payments require the owner's explicit launch instruction, confirmed business data and configured merchant services. The private preview must stay excluded from indexing until that work is complete.

## Business information to confirm

- Legal seller name, ABN where applicable, business address, support email and telephone.
- Final eight-flavour range and approved retail product names.
- Actual pack sizes, net weights, ingredients, allergens, nutrition, country-of-origin labelling, storage and best-before handling for every variant. Review product labels with a qualified food compliance adviser before publishing.
- Real product and packaging photography, or explicit approval that concept imagery accurately represents manufactured products.
- Confirmed prices in AUD, GST treatment, stock and maximum purchase quantities.
- Delivery countries/postcodes, shipping rates, fulfilment timing, order cut-offs, dispatch location and unavailable destinations.
- Returns/refund conditions and privacy/terms text, reviewed for the actual business operations.
- Newsletter consent text, wholesale process, contact recipient and bulk-order pricing policy.

## Shopify configuration

1. Create or select the actual merchant store. Use Shopify Admin for products, inventory, prices, discounts, orders, fulfilment and refunds. Review existing products before any catalogue import; start with draft products and do not overwrite merchant data.
2. Supply the store domain and least-privilege Storefront API access required by the adapter. Keep Admin API credentials server-only. Use a secure deployment secret store, never source code or browser-visible variables.
3. Map every approved catalogue variant to its provider product and variant ID. Publish only products whose food information, media and actual availability are verified.
4. Configure the mixed box as a fulfilment-compatible Shopify product/bundle representation, with confirmed component mapping and quantities. Verify component inventory and inspect the resulting order line items before enabling it for customers.
5. Configure taxes, shipping markets and rates, payment methods and inventory locations in Shopify. Display payment badges only for enabled, verified methods.
6. Configure customer account authentication and registered callback/return URLs. Verify account access restrictions and order ownership with two separate test accounts.
7. Configure actual form destinations and newsletter subscription service. Submit test messages, verify delivery at the destination and only then enable the forms.
8. The adapter reads commerce and owner content without a local cache. It has no inbound Shopify webhook endpoint. If future order automation or caching introduces one, implement signature verification and durable duplicate-event handling, then verify retries before exposing that endpoint.

The authoritative deployment variable names and catalogue mapping format are in `.env.example` and the commerce documentation. This checklist does not substitute for configuring those values.

## Required provider sandbox verification

Development-mode tests do not establish a live order or a verified payment. Before enabling selling, complete and retain evidence for:

- Guest checkout and account checkout, including returning from hosted checkout.
- Successful, declined, cancelled and authentication-required test payments where Shopify supports each scenario.
- Provider-backed prices, valid and invalid discounts, tax and shipping calculations.
- Unsupported shipping destinations and inventory/price changes after adding an item.
- Add/update/remove, cart recovery, stale cart identifiers and network recovery.
- Mixed-box fulfilment contents, component stock enforcement and correct order pricing.
- Correct order creation and provider-confirmed payment status. Never treat a client redirect as payment confirmation.
- Cancellation, refund and fulfilment using Shopify Admin.
- Duplicate form submissions, real form delivery, webhook retries and replay handling.

## Private preview deployment

Deploy the reproducible production build to a Next.js-compatible hosting service. Use a password-protected deployment or provider access control for the preview, retain `noindex`/robots exclusions and supply the configured site URL. Protect sensitive environment variables, enable HTTPS and inspect response security headers. A repository alone does not constitute a deployed preview.

Run the production checks documented in [QA.md](QA.md) against the deployment URL before approving launch. Confirm image optimisation, hosted checkout, callbacks and form delivery from the deployed hostname.

The local production build and private static export were both tested. The static export passed cart/box/form smoke checks and accepts no payment. The full Next.js build contains the server commerce adapter. Current evidence records 80 unit/integration checks and 153 distinct browser checks passing after repairs. Home mobile laboratory LCP remains 3.003 seconds against the 2.5-second aim; SEO is intentionally blocked while the catalogue is private. Review deployed performance, actual devices and public SEO before launch.

Configure `NEXT_PUBLIC_VITALS_ENDPOINT` only after supplying a same-origin collection service and reviewing the actual privacy/consent requirements. The hook reports standard web-vitals measurements, including INP, but no field data has been collected or verified in this project.

## Approval to publish

The owner must explicitly authorise public launch and live payments after merchant sandbox checks, business content review and preview inspection. At that point, configure the live provider, canonical public domain, public robots/sitemap behaviour and verified product structured data. Re-run SEO and commerce checks on the final domain. Laboratory measurements are not field performance; review real-user LCP, CLS and INP after release.
