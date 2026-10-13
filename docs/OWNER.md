# Owner guide

buttersalt is delivered as a private concept preview. The real merchant business, food range and selling services still need confirmation. Products, prices, inventory, images, discounts, orders and fulfilment belong in **Shopify Admin**, without editing source code. This project does not create a decorative local admin or local orders.

## Create the initial draft catalogue

Use Node 22.18 or newer. The default command is offline and prints the exact draft plan:

```powershell
node scripts/catalogue-setup.mjs
```

Review the eleven provisional titles, descriptions, colours and concept-price metadata. To create drafts, set a separate least-privilege Admin token securely in the shell and then run:

```powershell
node scripts/catalogue-setup.mjs --apply --store your-store.myshopify.com
```

The script checks that `--store` matches `SHOPIFY_STORE_DOMAIN`. It queries each exact handle and always skips existing products. It never updates merchant data, stock, prices, orders or publications; it creates only missing products with `DRAFT` status. A second run skips completed drafts, including after an interrupted import. Run only one import at a time. No credentials were available here, so no live import was performed.

The default Shopify variant may have a zero/unset price. That is intentional: the illustrative amount is stored separately as `buttersalt.concept_price_aud`; it is not an approved sellable price. Do not publish until the confirmed variant, price and inventory are filled out. Imported `food_verified=false` keeps every draft blocked by the storefront gate as well.

## Confirm and maintain the actual range

1. In Products, open each draft. Confirm its name, flavour description and actual contents. Remove `development-concept` only after approval; retain the `buttersalt` tag.
2. Replace concept visuals with real, approved product photography in product Media. Place the primary bag first and the food close-up second. Set useful alternative text.
3. Create the true size variants and SKUs. Enter the approved AUD prices, taxable setting, shipping weight and tracked inventory. Use actual fulfilment locations; turn off continuing sales when out of stock unless backorders are expressly approved.
4. Define and fill the `buttersalt` product metafields listed in COMMERCE.md. Verify ingredients, allergens, nutrition, pack size and net weight against the physical product. Leave unknown fields unfilled and keep `food_verified=false`.
5. Once all data and labelling are confirmed, approve the product with `food_verified=true`, make it Active and publish it to the Headless/Storefront sales channel. Validate a complete test purchase in the private storefront before public launch.

Choose confirmed Gift and Discovery box contents and an assembled-stock or supported fixed-bundle model. Test component inventory and fulfilment. The custom mixed builder orders six actual flavour bag components grouped by `_box_group`; fulfilment staff should pack those component lines together. It does not order the illustrative `mixed-box` draft as an extra item.

Prices and inventory in the live storefront read from Shopify on each request. Discount codes are created and managed in Discounts; Shopify decides their eligibility and effects. No code-derived discount is trusted. Use Shopify Markets for approved currency/region settings and Settings → Shipping and delivery for real destinations and rates.

## Change homepage, About, gifting and policies

Create a Shopify **metaobject definition** with type `buttersalt_site_content` under Settings → Custom data → Metaobjects, with public Storefront read access. Add the text fields below, then create a Content → Metaobjects entry with exact handle `storefront` and Active status. This gives the owner a native Admin form for homepage, About, gifting and policies. Use single-line text for headings, short labels, email and legal identifiers; use multi-line text for longer copy and policies. The server content adapter reads them as plain text:

| Key | Where it appears |
| --- | --- |
| `hero_eyebrow`, `hero_heading`, `hero_description` | Homepage introduction |
| `about` | About copy |
| `gift` | Gifting introduction |
| `newsletter` | Newsletter invitation |
| `delivery` | Delivery explanation |
| `contact_email`, `legal_entity`, `business_address` | Merchant contact/legal details |
| `shipping_policy`, `returns_policy`, `privacy_policy`, `terms_policy` | Corresponding policy pages; separate paragraphs with blank lines |

The same fields can alternatively be stored as Shop metafields in namespace `buttersalt` using an appropriate Admin editor; the native `storefront` metaobject takes precedence when both exist. Product fields are directly editable under Products. Product and policy text is rendered as plain text rather than executing external HTML.

Before launch, replace all draft policies with the approved merchant policies, real business details, dispatch times and support contacts. Do not invent a founder history, awards, health/certification claims or customer testimonials. Development fallback copy is centralised in `src/lib/content.ts`; runtime owner changes belong in Shopify metafields.

## Manage customers, orders and refunds

Copy the hosted Customer accounts link from Shopify Settings into `SHOPIFY_CUSTOMER_ACCOUNT_URL`. Customers sign in and see authorised orders on Shopify. Guest checkout works through hosted checkout when the merchant enables it. Confirm the account redirect and order access with real test accounts.

Use Orders to confirm the provider's actual payment status and order line contents before fulfilment. Buy shipping labels/add tracking using the merchant's configured workflow, and mark fulfilment only when appropriate. Cancellations, refunds and restocking are performed through Shopify's order actions, subject to the merchant policy and provider capabilities. Do not treat a storefront return URL as proof of a paid order.

Configure actual payment methods in Shopify and verify them before adding any payment-method logos to the storefront. Complete supported test payments, declines, cancellation and any required authentication; check order creation, inventory decrement, discount, tax, delivery charge and refund in Admin. Actual methods available depend on the merchant's account, region and approval.

## Connect forms and protect the private preview

Provision a real HTTPS destination and bearer token for all three form types. Its endpoint must handle the documented fields and persist `Idempotency-Key`. Verify contact delivery, wholesale lead delivery and newsletter consent/subscription at the destination. The preview reports an unconnected form honestly and keeps the entered text on failure.

Host the full Next.js application, including server API routes, to use real commerce. A static exported preview is a demonstration and cannot store secure server cart sessions or call server-only merchant services. Keep any external preview behind host-level access protection, with search indexing disabled. Supply the final domain separately; public launch and live payments require an explicit owner launch instruction and completed merchant configuration.

Keep Storefront, Admin and forms tokens in encrypted environment storage. Rotate leaked tokens. Never commit `.env.local`, actual customer data, private cart cookies or provider responses containing secrets. For multi-instance hosting, complete the durable rate-limit/idempotency/session coordination described in COMMERCE.md. Merchant services, business approvals and test payments are the remaining external dependencies; no public launch or live payment was performed during this build.
