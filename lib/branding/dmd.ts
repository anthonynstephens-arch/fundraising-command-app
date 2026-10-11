// RGB values extracted from the actual vector swatches on page 28 of the supplied
// April 2026 standards. Printed hex labels in that document are placeholders.
export const DMD_SLUG = "detroit-metropolitan-dance"
export const DMD_LOGO = "/brand/dmd/wordmark.svg"
export const DMD_MONOGRAM = "/brand/dmd/monogram.svg"
export const DMD_LOGIN = "/stores/dmd/login"
export function isDmdOrganization(org: {slug?: string; name?: string} | null | undefined) {
  return org?.slug === DMD_SLUG
}

// These Shopify orders were DMD samples, not fundraiser sales.
export function isDmdSampleOrder(organizationId: string, orderNumber: unknown) {
  return organizationId === '4eaaf553-8adf-478c-8118-5ddb9795326c' &&
    ['4791', '4792'].includes(String(orderNumber ?? '').trim().replace(/^#/, ''))
}
