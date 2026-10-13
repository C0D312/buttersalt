# buttersalt

A complete contemporary popcorn brand and custom Next.js storefront, built for Australian English and AUD. The checked-in range is a private development catalogue: eight flavour concepts, discovery/mixed/gift boxes, original editable branding, generated concept photography and illustrative prices. The preview accepts no payments and creates no orders.

## Start locally

Use Node.js 22 LTS or a compatible newer supported release, and npm. Install the exact dependency tree from the lockfile:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell use Copy-Item .env.example .env.local instead of cp if preferred. Open the address printed by Next.js. For the full server-rendered production application:

```sh
npm run build
npm start
```

The production application uses Next.js 16, React 19, strict TypeScript and Tailwind CSS 4. Server-only commerce routes provide the Shopify adapter; interactive browser code handles navigation, searching/filtering/sorting, variant choices, cart controls, mixed boxes and forms.

## Static private review

```sh
npm run build:preview
npm run serve:preview
```

Open http://127.0.0.1:3000. This separate export is for visual and development-basket review on Sites or another static host. It has no backend. The build temporarily isolates API routes and old Next generated types, forces development mode and restores source/previous Next build in finally. Browser fixture baskets persist locally; discounts, checkout, orders, customer authentication and form delivery remain unavailable. The local preview server gives explicit JSON development responses and applies security/noindex headers. Set PORT to use another local port.

Static hosting must apply its own access control and response headers; the local preview server is not deployed by copying out/. Noindex is an indexing control, not password protection. Use the intended private Sites visibility or hosting provider authentication. [Deployment instructions](docs/DEPLOYMENT.md) explain both deployment targets and recovery.

## What is included

- Home, shop, collections, every product, discovery/bundles, six-bag mixed-box builder, gifts/enquiries, about, FAQ, contact, cart, checkout/account handoffs, policies and useful unavailable/empty/404 states.
- Original custom SVG logo/mark, transparent PNG variants, icons, social card, editable flavour labels, licensed local fonts and brand guide.
- Original generated bags and close-ups for all eight flavours, campaign/bundle/lifestyle concepts, responsive WebP exports, retained high-resolution originals and prompts.
- Shopify Storefront cart integration, protected server sessions, product approval gates, provider-backed prices/inventory, hosted checkout/account access, grouped component lines for mixed boxes and actual destination forms when configured.
- Reproducible catalogue tooling, owner documentation, CI and test evidence.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Install the browser binaries supported by your environment before Playwright runs. [QA.md](docs/QA.md) records what actually ran and the limitations; assertions about the merchant backend require merchant sandbox verification. Laboratory performance results are not measured field performance.

## Owner and launch handover

Use Shopify Admin for confirmed products, prices, images, inventory, discounts, orders, fulfilment and refunds. [OWNER.md](docs/OWNER.md) covers ongoing management and homepage content. [COMMERCE.md](docs/COMMERCE.md) defines the exact integration, product approval fields, mixed-box representation, form contract and session limitations. The draft-catalogue script never grants approval or enables sales by itself.

Before selling, supply the merchant store/token, verified product sizes/weights/ingredients/allergens/nutrition, actual stock/prices, business contact/legal details, approved policies, delivery/tax/payment configuration and connected form destination. Complete real provider payment/order/account/fulfilment tests and approve the imagery against manufactured products. Public launch and live payments require the owner's explicit launch instruction.

See [LAUNCH.md](docs/LAUNCH.md), [BRAND.md](docs/BRAND.md), [ASSET-LICENCES.md](docs/ASSET-LICENCES.md), [flavour generation prompts](docs/image-prompts.json) and [campaign prompts](docs/campaign-prompts.json). The source repository is intended to remain private during development.
