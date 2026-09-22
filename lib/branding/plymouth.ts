export const PLYMOUTH_SLUG = 'plymouth-township-fire-department'
export const PLYMOUTH_LOGIN = '/stores/plymouth/login'
export const isPlymouthOrganization = (org: {slug?: string} | null) => org?.slug === PLYMOUTH_SLUG
