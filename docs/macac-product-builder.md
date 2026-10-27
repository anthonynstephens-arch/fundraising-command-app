# MACAC product builder

MACAC managers can open **Create a Product** in the portal, search the existing Design Studio catalog, customize a garment in the existing editor, and return the saved production design and fresh proofs to the portal. The editor uses an allowlisted origin, opener identity and one-use correlation nonce for the handoff; no Shopify credentials go to the browser.

The portal calculates live retail prices by size. Each product contains the selected color and all its sizes, preserving garment price differences. Base price is the live source garment variant price plus the number of decorated placements multiplied by `CUSTOMIZER_DECORATION_LOCATION_FEE` (default $5, matching the existing customizer). The manager adds a fixed donation per item. Self-service publishing supports Printing; embroidery requires a separate quote.

Save creates a Shopify DRAFT without assigning it to a live collection. A stable, campaign-scoped handle makes retries update the same product. Saved products are immutable in this first version; use Create another for a new design. The Shopify `fundraiser_builder.record` JSON metafield preserves the original artwork URLs, Fabric placement data, proofs, original blank SKUs, base prices, creator, campaign and donation.

Publish verifies the saved campaign and its assigned Shopify collection again, checks that Shopify processed the proofs, activates and publishes the product to the Online Store, adds it to the selected MACAC collection, and syncs it into Fundraiser Command. Failed channel publication rolls a new draft back to DRAFT. A retry reuses the existing product and retries collection assignment and sync. Collection sync reads the saved donation so webhook and scheduled syncs preserve it.

Required Shopify scopes: read_products, write_products, read_publications, write_publications. The catalog defaults to the same `customizable-apparel` collection as Design Studio; `SHOPIFY_CUSTOMIZABLE_COLLECTION_HANDLE` can override it. MACAC must have an assigned Shopify collection. No database migration or shared secret is required.

Verification: `npm run test:product-builder`, the existing full build test chain, TypeScript, a production Next build, and Shopify 2026-07 schema validation. The paired Design Studio patch adds `exportForFundraiser` and the Review design “Use in MACAC store” action, with origin/correlation tests. Deploy both repositories for the complete flow.
