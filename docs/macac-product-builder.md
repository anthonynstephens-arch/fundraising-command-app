# MACAC product builder

MACAC managers can open **Create a Product** in the portal, search the existing Design Studio catalog, customize a garment in the existing editor, and return the saved production design and fresh proofs to the portal. The editor uses an allowlisted origin, opener identity and one-use correlation nonce for the handoff; no Shopify credentials go to the browser.

The base price is the source garment variant price plus printed-placement fees (`CUSTOMIZER_DECORATION_LOCATION_FEE`, default $5). Selling price = base + markup. MACAC keeps 75% of the markup; Detroit Decal receives 25% of the markup in addition to the base. Amounts round to cents. Version 3 pricing records preserve this rule during sync; existing version 2 products retain their saved pricing agreement. Printing only; embroidery requires a quote.

Save creates a Shopify DRAFT without assigning it to a live collection. A stable, campaign-scoped handle makes retries update the same product. Saved products are immutable in this first version; use Create another for a new design. The Shopify `fundraiser_builder.record` JSON metafield preserves the original artwork URLs, Fabric placement data, proofs, original blank SKUs, customizer and base prices, customer prices, source SKUs, per-size proceeds, creator and campaign.

Publish verifies the saved campaign and its assigned Shopify collection again, checks that Shopify processed the proofs, activates and publishes the product to the Online Store, adds it to the selected MACAC collection, and syncs it into Fundraiser Command. Failed channel publication rolls a new draft back to DRAFT. A retry reuses the existing product and retries collection assignment and sync. Collection sync matches each size to its saved base by unique product SKU (or variant title), then records the current retail price minus that base as its fixed contribution. Webhook and scheduled syncs therefore retain the 20% base and the correct per-size proceeds. Legacy drafts with a fixed markup remain compatible.

Required Shopify scopes: read_products, write_products, read_publications, write_publications. The catalog defaults to the same `customizable-apparel` collection as Design Studio; `SHOPIFY_CUSTOMIZABLE_COLLECTION_HANDLE` can override it. MACAC must have an assigned Shopify collection. No database migration or shared secret is required.

Verification: `npm run test:product-builder`, the existing full build test chain, TypeScript, a production Next build, and Shopify 2026-07 schema validation. The paired Design Studio patch adds `exportForFundraiser` and the Review design “Use in MACAC store” action, with origin/correlation tests. Deploy both repositories for the complete flow.

Live verification on 2026-10-27: the editor handoff, fresh proofs, and live Navy S–5XL retail prices passed. Shopify denied the draft write because the Fundraiser Command app lacks `write_products`. Grant `write_products`, `read_publications`, and `write_publications` in that app’s Shopify configuration, authorize the updated access, then use Recheck store connection. This clears the cached client-credentials token. The MACAC manual collection is linked; no test product was created or published.

2026-10-27 retry: the installed Shopify app now returns no missing scopes after refreshing its token. The original pricing was replaced by the DMD formula in pricing version 3.

Live save and publish verification passed on 2026-10-27: the test item used a $17.14 customizer price, $20.57 base, and $30 standard-size retail price. Shopify product creation, Online Store publication, collection assignment, and Fundraiser Command sync all succeeded. All eight sizes recorded $9.43 in fixed MACAC proceeds. The test item was returned to DRAFT afterward.

Catalog browsing now uses the Design Studio hierarchy (category and subcategory counts) and its alphabetical brand list. These filters combine with keywords before catalog pagination. The portal resolves relative prepared-thumbnail URLs against the Design Studio origin and falls back to the Shopify product image if a thumbnail fails. Requests are cancelled when filters change to prevent stale results.
