# DMD cinematic storefront

Implemented on `codex/dmd-cinematic-store`, based on main commit `528b648a847f2719b7b7a03761664c856320f353`.

## Changes
- DMD-specific home and product pages; existing fundraiser routes and backend remain in place.
- Supplied OTF fonts; original wordmark with a permitted off-white variation; palette from actual guide vector swatches.
- Authentic DMD photography, optimized locally as WebP, with a full-height hero, brief session-only entrance, editorial storytelling, and reduced-motion support.
- Product categories, secondary-image hover, quick view, responsive image galleries, zoom, search, full-screen menu, cart drawer, and mobile fixed purchase control.
- Shared campaign cart and server-validated checkout retain product/variant IDs and campaign/organization attribution. Cart quantities respect the existing 100-item-per-variant checkout limit.
- Focus trapping, Escape dismissal, focus restoration, visible focus, and inert background content.
- Store information links provide assistance and direct shoppers to the applicable merchant disclosures at checkout; no return windows or delivery promises invented.

## Verification
- TypeScript compilation passed.
- Existing reporting, campaign-control, storefront, UI-audit, and notification regression suites passed.
- New `npm run test:dmd` DOM interaction suite passed: categories, URLs, quick view, required options, sold-out options, exact variant IDs, quantity/subtotal, campaign attribution, price changes, checkout errors, removal, menu Escape handling, search, gallery, zoom, and closed-store protection. Test fixtures are isolated in the test file and never feed the storefront.
- Production build uses local validation-only public Supabase values for unrelated signup prerendering; no production secrets were copied.

## Remaining launch checks
The live DMD campaign returned zero products, and Shopify search returned no matching DMD merchandise. Actual product selection and Shopify handoff cannot be verified end-to-end until the real catalog is assigned. No invented products were added.

Browser rendering at 375/390/430/1280/1440/1920px, visual contrast over imagery, font layout shift, and live checkout remain unverified: the local browser could not start and the cloud browser cannot access localhost.

An automatic approval review rejected the GitHub dry-run push, stating that explicit permission to push to the public repository is required. No changes have been pushed or deployed.
