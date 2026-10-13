# Commerce integration and configuration

The checked-in storefront is a private development preview. Its eleven products are concepts, food fields are empty, prices are illustrative AUD amounts, and browser baskets do not create orders. No Shopify store, payment service or form destination was available during implementation. An unconfigured checkout returns `503 DEVELOPMENT_MODE`; it does not simulate a payment or an order.

## Supported provider and API

The server adapter uses Shopify Storefront GraphQL **2026-10**, the latest stable version verified on 14 October 2026 against Shopify's [version schedule](https://shopify.dev/docs/api/usage/versioning) and [ProductVariant reference](https://shopify.dev/docs/api/storefront/2026-10/objects/ProductVariant). It uses `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cartDiscountCodesUpdate` and a fresh `checkoutUrl`, following Shopify's [cart workflow](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage). Payments, tax, shipping, guest checkout, order confirmation, orders, fulfilment and refunds are delegated to Shopify's hosted checkout and Admin.

The backend integration is implemented, with mock-based tests; live provider behaviour cannot be verified without a merchant store and token. Current API references are pinned for repeatability. Review Shopify's quarterly deprecations and upgrade deliberately rather than substituting `latest` or a release candidate.

## Server-only environment

Set secrets in the deployment service's encrypted environment, or in an ignored local `.env.local`. Never put them in a `NEXT_PUBLIC_*` variable. The Admin import token is separate from the Storefront token and is unnecessary at runtime.

| Variable | Purpose |
| --- | --- |
| `COMMERCE_MODE` | `development` by default; `live` activates real Shopify reads and carts. This does not approve public launch. |
| `SHOPIFY_STORE_DOMAIN` | Exact merchant `your-store.myshopify.com` domain; no scheme or path. |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Private Storefront API token, used only by the server. |
| `SHOPIFY_CHECKOUT_ENABLED` | `false` by default. Set `true` only after the owner configures and authorises hosted checkout testing or live selling. |
| `SHOPIFY_CHECKOUT_HOST` | Optional exact merchant checkout hostname if Shopify returns a custom domain. Shopify's standard hosted checkout domains are checked automatically. |
| `SHOPIFY_CUSTOMER_ACCOUNT_URL` | Exact HTTPS customer account link copied from Shopify Admin Settings → Customer accounts. Shopify owns login, session security and order authorisation. |
| `SHOPIFY_VERIFIED_PRODUCT_HANDLES` | Optional comma-separated owner-approved handles; food data remains mandatory. Prefer the product approval metafield. |
| `MARKET_COUNTRY` / `MARKET_CURRENCY` | `AU` / `AUD` defaults. Shopify Markets must support the selected country/currency. |
| `NEXT_PUBLIC_SITE_URL` | Exact storefront origin. Required for correct metadata and same-origin checks on a deployed site. |
| `FORMS_WEBHOOK_URL` | HTTPS endpoint which accepts the forms contract below and honours `Idempotency-Key`. |
| `FORMS_WEBHOOK_TOKEN` | Destination bearer token; minimum 16 characters. |
| `TRUST_PROXY_HEADERS` | `false` default. Set `true` only where the hosting proxy replaces, rather than passes through, user-supplied `X-Forwarded-For`. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Optional local import-only token with `read_products` and `write_products`; do not grant order/customer/payment scopes or install it in the runtime. |

Use Shopify's Headless channel or supported application configuration for the private Storefront token. Give it only the product/variant, inventory availability, metaobject reads and cart permissions required by the adapter. Product metafields and the owner-content metaobject must permit public Storefront reads; stock access must permit `quantityAvailable`. No Admin token, card details or customer password is accepted by this storefront.

## Product approval gate

Shopify products must carry the exact `buttersalt` tag and be published to the configured Storefront sales channel. The adapter reads plain product descriptions and these product metafields in namespace `buttersalt`:

| Key | Type and use |
| --- | --- |
| `food_verified` | Boolean. Owner approval after checking the real product and applicable labelling obligations. |
| `ingredients` | Multi-line text, verified ingredients statement. |
| `allergens` | Multi-line text, verified allergens and any applicable precautionary statement. Never substitute an unsupported free-from claim. |
| `nutrition` | Multi-line text, verified nutrition information. |
| `pack_size` | Single-line text, confirmed pack size. |
| `weight_label` | Single-line text, confirmed net weight display. Actual shipping weight belongs on the Shopify variant. |
| `category` | Single-line text: `sweet`, `savoury` or `bundles`. |
| `short_name`, `note` | Single-line text, concise storefront copy. |
| `colour`, `accent` | Single-line text, six-digit hex colours. Invalid colours fall back to the brand palette. |

Create these definitions under Settings → Custom data → Products, then enable Storefront access. Approval requires `food_verified=true` **or** an explicitly allowlisted handle **and** non-empty ingredients, allergens, nutrition, pack size and weight fields. An unapproved product's variants are unavailable, even if Shopify's inventory says they are in stock. Prices, currency, availability, quantity rules and totals always come from Shopify in live mode. The browser cannot submit prices, sale prices, arbitrary attributes or inventory.

Buyers are limited to twelve units of each variant across the basket, further constrained by provider inventory and minimum/maximum/increment rules. Configure any critical merchant quantity maximum in Shopify too; process-local locks do not coordinate across separate servers. Shopify remains responsible for final inventory enforcement at checkout. Backorder/continue-selling settings should be enabled only when intentionally approved by the owner.

## Cart and request contract

`GET /api/catalogue` returns `{mode, products}`. `GET /api/cart` creates or recovers a secure live cart and returns `{mode, cart}`; development returns `cart:null`. Wait for the initial live GET before enabling mutations.

`POST /api/cart` requires the exact storefront `Origin`, JSON content type and one strict action:

```json
{ "action": "add", "variantId": "gid://shopify/ProductVariant/123", "quantity": 1, "requestId": "a-fresh-UUID" }
```

Other actions: `update` with `lineId,quantity`; `remove` with `lineId`; `discount` with `code`; `box` with `components:[{variantId,quantity}]`. Every action requires a UUID `requestId`. Discount empty string removes the code; Shopify returns applicability and its own totals. Update quantities are absolute, and repeated removals are harmless. Errors use `{error:{code,message}}` with a useful HTTP status.

The full cart ID, including Shopify's secret `?key=`, stays in an HttpOnly, SameSite=Lax cookie with a ten-day browser lifetime, Secure in production. It never appears in public JSON or browser storage. Line IDs and merchandise IDs are safe presentation identifiers. The cookie must stay private; do not forward it to analytics. Stale/expired provider carts recover to a new empty cart. The UI must explain that state rather than silently treating earlier items as a confirmed order.

Only GraphQL queries retry automatically, once. Mutations use persisted `_request_id` and `_request_fingerprint` line metadata to recover an uncertain add/box response without adding the same request twice. Retry the **same** UUID after network uncertainty, refresh the basket first, and never generate a new UUID for an uncertain retry. Changing a request's items while reusing its ID is rejected. Absolute update/remove/discount operations can be retried safely. Process-local serialization reduces overlapping mutations in one server; multi-instance deployments need a durable shared lock/rate/dedup service, plus provider quantity enforcement.

Cart totals are provider-backed estimates. Shipping destinations, shipping charges, tax, duties and payment methods are resolved at hosted checkout. No shipping promise, final tax amount or payment badge is implied by the preview. `POST /api/checkout` re-reads the cart, checks approval and inventory, verifies complete box groups, and returns only a fresh trusted HTTPS checkout URL.

## Fulfilment-compatible boxes

The custom mixed box contains exactly **six individual flavour bags**. A single request sends the real Shopify merchandise IDs and quantities of those components; there is no decorative parent SKU. Each order line receives `_box_group` (the request UUID) and `_box_size=6` for the fulfilment team. Identical flavour selections are merged within that box. Price is the sum of provider component prices, less any actual Shopify discount. Component stock is checked against quantities already in the basket. Bundle products cannot be components.

Editing/removing one box line can leave a partial box. Checkout rejects any remaining group which does not contain six bags; restore the missing component or remove the remaining lines. The grouping attributes are not proof of payment. Confirm the component lines and box reference in an actual test order before launch. If special packaging must be charged or separately tracked, configure an approved inventory-tracked packaging item or adopt a tested Shopify bundle app/model; do not silently add an unfulfilled parent product.

The Discovery and Gift boxes require confirmed backend fulfilment models. They may use an approved stocked assembled SKU or Shopify's supported fixed-bundle product model, with actual component data and stock. A concept draft alone is insufficient. Confirm the contents, food statements, pricing, inventory decrements and order lines in a test order. The draft Mixed Box SKU is never used by the custom builder.

## Forms and customer accounts

`POST /api/forms` accepts `{type:'contact'|'wholesale'|'newsletter', email, name?, message?, company?, quantity?, consent:true, website:'', submissionId:UUID}`. Contact/wholesale require a name and message of at least ten characters. `website` is an empty honeypot; unknown fields and invalid consent/email are rejected. The server sends authenticated JSON to the configured HTTPS destination, with `Idempotency-Key: submissionId`. The destination must return a 2xx response **only after it has accepted the submission**, and must persist that ID to prevent duplicate delivery across retries/instances. A successful response means destination acceptance, not a claim that a human read the message or that an email arrived.

Choose a maintained destination such as a merchant-managed webhook service which creates a real support record/email delivery, a wholesale lead, or a consented newsletter subscription according to `type`. Provision it with a secret bearer token and durable idempotency handling. Perform one accepted and one duplicate request for all three types, and verify actual delivery in the destination. Until then, the form returns `503 FORM_UNCONNECTED`, preserves user input and does not show success. Network/5xx/redirect failures are surfaced, not swallowed. Avoid logging payloads or personal data.

The bundled rate limits and successful-request deduplication are in memory, limited to one process and reset on restart. Anonymous traffic shares a rate cap when trusted client IP is unavailable. They are development and single-instance controls, not a distributed abuse service. Before scaled public use, add provider/edge bot protection and a durable shared rate limit/dedup store. Respect the destination's consent, double-opt-in and unsubscribe policy.

`GET /api/account` redirects to the owner-configured Shopify hosted customer account page. The storefront stores no customer password, access token or private order data. Test two accounts to confirm one cannot see the other's orders. Customer Account API OAuth is unnecessary for this hosted-account design; do not add a decorative local login form.

## Cache and webhooks

Commerce and owner-content reads use `cache:'no-store'` and API responses use `Cache-Control:no-store`. This avoids a stale local price/inventory/content cache. There is no inbound Shopify webhook endpoint in this implementation, and no claim of webhook signature or order-payment verification. Shopify's Admin and hosted order status are the authoritative surfaces.

If adding cached catalogue data or order automations later, validate the raw-body `X-Shopify-Hmac-Sha256` signature with a constant-time comparison, persist webhook/event IDs with a unique constraint, enqueue work, and handle duplicates/out-of-order delivery before exposing a public endpoint. Do not use a product-update webhook as the checkout stock authority.

## Credential-blocked acceptance

The following require an actual configured merchant store and remain unverified: live GraphQL scopes/schema against that store; published product and metafield reads; genuine out-of-stock changes; actual discounts/tax/shipping destinations; fixed-bundle inventory and mixed-box order lines; checkout return paths; successful, declined, cancelled and authentication-required test payments; true order creation and payment status; hosted account sign-in/order separation; real form destination delivery and duplicate handling. Run Shopify's supported test-payment configuration, verify orders in Admin, then disable test mode deliberately before an explicitly approved public launch. Never infer payment success from a URL or a browser state.
