const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

const adminForm = read('components/admin/CampaignBrandingForm.tsx')
assert.ok(adminForm.includes('name="goal_amount"'), 'Admin form must expose the fundraising goal')
assert.ok(adminForm.includes('name="sales_goal"'), 'Admin form must expose the sales goal')

const customerEditor = read('components/portal/CampaignGoalEditor.tsx')
assert.ok(customerEditor.includes("/api/portal/campaign-goals"), 'Customer goal editor must use the protected campaign goal endpoint')
assert.ok(customerEditor.includes('name="goalAmount"'))
assert.ok(customerEditor.includes('name="salesGoalAmount"'))

const goalRoute = read('app/api/portal/campaign-goals/route.ts')
assert.ok(goalRoute.includes('authorizeCampaignManagement'), 'Goal changes must be tenant-authorized')
assert.ok(goalRoute.includes('goal_amount: goalAmount'))
assert.ok(goalRoute.includes('sales_goal: salesGoalAmount'))

const storefrontEditor = read('components/portal/StorefrontHeaderEditor.tsx')
const storefrontRoute = read('app/api/portal/storefront-header/route.ts')
const storefront = read('components/storefront/CampaignStorefront.tsx')
assert.ok(storefrontEditor.includes('/api/portal/storefront-header'), 'Portal users must have a storefront header editor')
assert.ok(storefrontRoute.includes('authorizeCampaignStorefrontEditing'), 'Storefront header changes must be tenant-authorized')
assert.ok(storefront.includes('storefront_header_message'), 'The public store must render the editable header announcement')

const registeredTopics = read('app/api/shopify/register-webhooks/route.ts')
const webhookHandler = read('app/api/shopify/webhooks/route.ts')
assert.ok(registeredTopics.includes("'COLLECTIONS_UPDATE'"), 'Collection updates must be registered with Shopify')
assert.ok(webhookHandler.includes("topic === 'collections/update'"), 'Collection update events must be handled')
assert.ok(webhookHandler.includes('syncCollection('), 'Collection update events must refresh campaign products')

const customerSync = read('app/api/portal/campaign-sync/route.ts')
assert.ok(customerSync.includes('authorizeCampaignManagement'), 'Manual customer sync must be tenant-authorized')
assert.ok(customerSync.includes('syncCollection('))

const portalShell = read('components/portal/PortalShell.tsx')
assert.ok(portalShell.includes('agency-menu-toggle'), 'Mobile portal navigation must use a menu toggle')
assert.ok(portalShell.includes('mobile-open'), 'Mobile portal navigation must stay collapsed until opened')
assert.ok(portalShell.includes('View Storefront'), 'Agency navigation must link to the public storefront')
assert.ok(portalShell.includes('campaign?.slug'), 'The storefront link must follow the selected campaign')

const organizationGate = read('lib/portal/authorize-organization-management.ts')
const portalMembers = read('app/portal/members/page.tsx')
assert.ok(organizationGate.includes("'manager'"), 'Managers must be allowed to manage organization access')
assert.ok(organizationGate.includes('getPortalPinSession'), 'PIN managers must be authorized without an email session')
assert.ok(portalMembers.includes('getPortalPinSession'), 'Manage Access must accept active PIN sessions')

const productUpdate = read('app/api/campaign-products/update/route.ts')
const portalData = read('lib/portal/data.ts')
assert.ok(productUpdate.includes("pinSession?.role === 'owner'"), 'Only a PIN owner may change contribution rules')
assert.ok(productUpdate.includes("member.role === 'owner'"), 'Only an organization owner may change contribution rules')
assert.ok(portalData.includes('canEditContributions'), 'Contribution editing must have a separate owner-only permission')

const preferencesRoute = read('app/api/portal/preferences/route.ts')
const onboarding = read('components/portal/PortalOnboarding.tsx')
assert.ok(preferencesRoute.includes('portal_notification_preferences'), 'Notification preferences must persist per portal identity')
assert.ok(onboarding.includes('Add the app to your Home Screen'), 'First-login tutorial must include home-screen installation')

console.log('PASS: campaign controls, Shopify sync, mobile navigation, and manager access are wired.')
