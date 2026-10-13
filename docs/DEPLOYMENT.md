# Public preview and production deployment

## GitHub Pages

The owner has authorised public preview sharing. The direct website is https://c0d312.github.io/buttersalt/ and requires no ChatGPT or GitHub sign-in. The repository is public. GitHub Pages uses GitHub Actions as its publishing source; .github/workflows/pages.yml exports and deploys out/ on pushes to main or manual dispatch.

The workflow obtains NEXT_PUBLIC_BASE_PATH and NEXT_PUBLIC_SITE_URL from actions/configure-pages, then runs npm run build:preview. Next navigation/chunks, the static image loader and metadata icons retain the repository path. To verify locally, set NEXT_PUBLIC_BASE_PATH=/buttersalt for both build:preview and serve:preview. Open http://127.0.0.1:3000/buttersalt/.

This is a public development preview with a demonstration basket; payments, orders and form delivery are unavailable. Public sharing does not enable live commerce. GitHub Pages serves static files and does not execute the Shopify API routes. Future pushes to main publish to Pages automatically. The earlier Sites deployment remains separate and requires its own deployment workflow when updating it.

## Full Next.js application

Deploy the repository to a host supporting Next.js 16 server routes and Node.js, such as Vercel. Use npm ci, npm run build and the hosting provider's normal Next.js runtime; npm start is the local production-server command. This deployment contains the real server-only Shopify adapter and configured form delivery. Do not deploy the static export as a selling system.

Set NEXT_PUBLIC_SITE_URL to the actual HTTPS preview origin, COMMERCE_MODE=development, SHOPIFY_CHECKOUT_ENABLED=false and INDEXING_ENABLED=false. Use deployment protection if a future preview requires private access. Store secret credentials only in encrypted server environment variables. Do not put secret values in NEXT_PUBLIC variables, repository files, build logs or browser storage.

The complete environment template is .env.example. Shopify/form variables are described in [COMMERCE.md](COMMERCE.md). NEXT_PUBLIC_VITALS_ENDPOINT is optional and must be a same-origin destination accepting the small web-vitals payload. No collection destination is configured in the checked-in project; field LCP, CLS and INP remain to be measured after deploying that destination.

Configure HTTPS, canonical origin, same-origin request checks and the real customer-account URL. Inspect security headers on the deployed hostname. Set TRUST_PROXY_HEADERS=true only if the host replaces untrusted forwarded headers. Runtime locks, replay caches and rate limits are process-local; a scaled deployment needs shared durable controls as described in COMMERCE.md.

## Sites static review export

Run npm run build:preview to create out/. The script verifies the project root, temporarily renames src/app/api to .build-api, and moves the previous .next inside that backup so stale generated API types cannot enter compilation. It forces BUTTERSALT_STATIC=1, development commerce, disabled checkout/indexing and disconnected merchant/form services. Existing exported output is preserved while the new export builds.

The preview uses tsconfig.preview.json to check application source while server-only API tests are isolated; the normal typecheck and test commands still check the complete project. It also temporarily moves the live sitemap to .build-api/.sitemap-previous.ts, then writes an empty private sitemap.xml into out/. The live sitemap retains its fresh provider-backed behaviour.

After building, the script restores API source, the live sitemap and the previous .next in finally. If export fails, it restores the earlier out/. A successful static export is intentionally separate from npm run build; run the normal build before npm start or a server deployment. Stop active build/test operations before switching build targets.

Sites should upload only out/ as the static site output. The existing Sites hosting project can register npm run build:preview as its build command and out as its output directory. Omit NEXT_PUBLIC_BASE_PATH when building for its root URL. Do not include .env.local, API backups, .next, source credentials or originals in the upload. Preserve its owner-approved public preview visibility.

The canonical GitHub repository contains large original images and raw QA archives. The Sites source service rejected those archival Git objects. After committing the canonical source and building out/, scripts/prepare-sites-source.mjs can create a new, empty .sites-deploy checkout with the same runtime source and tested export, omitting assets/originals and docs/evidence. The Sites source helper owns this checkout's separate Git history and publication; use the same project ID and audience. The script refuses to replace an existing deployment checkout. Retain it and use the Sites source workflow for future updates. Complete originals/evidence remain in GitHub and the main workspace.

On this Windows host, the Sites packager needs the installed Git Bash and GNU tools on PATH (C:\Program Files\Git\bin and C:\Program Files\Git\usr\bin). Set TAR_OPTIONS=--force-local for the helper process so its tar command treats Windows drive-letter paths as local files. Keep repository credentials in memory/stdin only. The verified deployment identifiers and source commits are in [deployment-record.json](deployment-record.json).

The static review has development fixture products and a browser-local demonstration basket. No backend API, live inventory, provider totals, customer authentication, checkout, payments, orders or delivered forms exists in this target. The build embeds NEXT_PUBLIC_STATIC_PREVIEW=true; cart initialization selects development mode directly, avoiding a dependency on the host's missing-route response. Forms clearly report that they are not connected before any network submission; they never claim successful delivery. Configuring merchant secrets cannot turn the static export into live commerce. Omit NEXT_PUBLIC_STATIC_PREVIEW from a full server build.

For local inspection, npm run serve:preview serves out on loopback port 3000. PORT changes the port. The server provides GET /api/cart as development mode with no provider cart, and clear nested JSON 503 errors for unconnected forms/commerce endpoints. It adds CSP, noindex, MIME and other security headers, uses no-cache HTML, and preserves exported routes/404 pages. A remote static host must configure equivalent headers itself.

## Interrupted preview build recovery

Ordinary failures restore backups automatically. If the process or machine is killed before finally completes, stop builds and inspect .build-api before starting again. It contains the original API directory and may contain .next-previous and .out-previous. Preserve those directories.

Restore .next-previous to the project .next after moving any incomplete generated .next aside. Restore .out-previous to out after moving incomplete out aside, unless a complete new export has already been verified. If .sitemap-previous.ts is present, restore it to src/app/sitemap.ts. Then move the remaining .build-api directory back to src/app/api. Verify all resolved paths are within this project before any recursive removal. Re-run npm run typecheck and the intended build. The build refuses to overwrite an existing .build-api backup.

## Owner dependencies before launch

The deliverable is ready for public review, not live selling. Supply verified food/business/policy data, configure the merchant store, actual inventory/prices, shipping/tax/payment settings, customer accounts and form destination, then retain real provider sandbox evidence. Check mixed-box component inventory and resulting order lines. Verify successful/declined/cancelled/authentication-required payments where supported, account ownership, fulfilment and refunds.

Public preview sharing is authorised; live selling and payments still require owner authorisation. Enable indexing only on the approved public origin, with approved products and final metadata; confirm robots, sitemap and social previews there. Re-run production browser/accessibility/performance checks after hosting changes. See [LAUNCH.md](LAUNCH.md) for the full business and provider checklist.
