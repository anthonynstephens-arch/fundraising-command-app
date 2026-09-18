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

const registeredTopics = read('app/api/shopify/register-webhooks/route.ts')
const webhookHandler = read('app/api/shopify/webhooks/route.ts')
assert.ok(registeredTopics.includes("'COLLECTIONS_UPDATE'"), 'Collection updates must be registered with Shopify')
assert.ok(webhookHandler.includes("topic === 'collections/update'"), 'Collection update events must be handled')
assert.ok(webhookHandler.includes('syncCollection('), 'Collection update events must refresh campaign products')

const customerSync = read('app/api/portal/campaign-sync/route.ts')
assert.ok(customerSync.includes('authorizeCampaignManagement'), 'Manual customer sync must be tenant-authorized')
assert.ok(customerSync.includes('syncCollection('))

console.log('PASS: admin/customer goal controls, authorized manual refresh, and automatic Shopify collection updates are wired.')
