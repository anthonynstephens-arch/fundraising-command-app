type Membership = { organization_id: string; role: string }
type Pin = { organizationId: string; role: string }
// Explicit organization requests never fall back to another tenant.
export function resolvePortalContext(requested: string | undefined, platform: boolean, memberships: Membership[], pin: Pin | null) {
  const organizationId = requested || (platform ? null : pin?.organizationId) || memberships[0]?.organization_id || null
  const member = memberships.find(m => m.organization_id === organizationId)
  const emailAllowed = platform || !!member
  const matchingPin = !emailAllowed && pin?.organizationId === organizationId ? pin : null
  return { organizationId, denied: !!organizationId && !emailAllowed && !matchingPin, usePin: !!matchingPin, role: emailAllowed ? member?.role || null : matchingPin?.role || null }
}
export function stationNavigation(id: string) {
  const home = '/station/' + id
  return [
    ['Overview', home, '▦'], ['Collections', home + '/collections', '⬡'],
    ['Sales', home + '/sales', '⌑'], ['Orders', home + '/orders', '◇'],
    ['Products', home + '/products', '⬡'], ['Collection Progress', home + '/progress', '◎'],
    ['Payout Engine', home + '/payouts', '▣'], ['Reports', home + '/reports', '▤'],
    ['Agency Contacts', home + '/contacts', '♙'], ['Marketing Tools', home + '/marketing', '⌁'], ['Notifications', home + '/notifications', '◉'], ['Help', home + '/help', '?'],
    ['Station Settings', home + '/settings', '⚙'],
  ]
}
