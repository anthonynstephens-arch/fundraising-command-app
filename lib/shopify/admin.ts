const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07'

let cachedAccessToken: string | null = null
let accessTokenExpiresAt = 0

export function getShopifyConfig() {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

  if (!shopDomain) throw new Error('SHOPIFY_SHOP_DOMAIN is missing')
  if (!clientId) throw new Error('SHOPIFY_CLIENT_ID is missing')
  if (!clientSecret) throw new Error('SHOPIFY_CLIENT_SECRET is missing')

  return {
    shopDomain: shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    clientId,
    clientSecret,
    apiVersion: SHOPIFY_API_VERSION,
  }
}

async function getShopifyAccessToken() {
  const { shopDomain, clientId, clientSecret } = getShopifyConfig()

  if (
    cachedAccessToken &&
    accessTokenExpiresAt > Date.now() + 60000
  ) {
    return cachedAccessToken
  }

  const response = await fetch(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: 'no-store',
    }
  )

  const json = await response.json()

  if (!response.ok || !json.access_token) {
    throw new Error(
      `Shopify token request failed: ${JSON.stringify(json)}`
    )
  }

  cachedAccessToken = json.access_token
  accessTokenExpiresAt =
    Date.now() + Number(json.expires_in || 86399) * 1000

  return cachedAccessToken as string
}

export async function shopifyGraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const { shopDomain, apiVersion } = getShopifyConfig()

  let accessToken = await getShopifyAccessToken()

  const sendRequest = (token: string) =>
    fetch(
      `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      }
    )

  let response = await sendRequest(accessToken)

  if (response.status === 401) {
    cachedAccessToken = null
    accessTokenExpiresAt = 0
    accessToken = await getShopifyAccessToken()
    response = await sendRequest(accessToken)
  }

  const json = await response.json()

  if (!response.ok) {
    throw new Error(
      `Shopify API error ${response.status}: ${JSON.stringify(json)}`
    )
  }

  if (json.errors?.length) {
    throw new Error(
      `Shopify GraphQL error: ${JSON.stringify(json.errors)}`
    )
  }

  return json.data as T
}

export function stripShopifyGid(
  value?: string | number | null
) {
  if (value === null || value === undefined) return null

  const stringValue = String(value)

  return stringValue.includes('/')
    ? stringValue.split('/').pop() || stringValue
    : stringValue
}

export function toShopifyGid(
  resource: 'Product' | 'ProductVariant' | 'Order',
  value?: string | number | null
) {
  if (value === null || value === undefined) return null

  const stringValue = String(value)

  return stringValue.startsWith('gid://shopify/')
    ? stringValue
    : `gid://shopify/${resource}/${stringValue}`
}