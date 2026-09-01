'use client'

import {
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'

type ProductRow = {
  id: string
  shopify_product_id: string | null
  shopify_variant_id: string | null
  title: string
  variant_title: string | null
  sku: string | null
  image_url: string | null
  retail_price: number
  contribution_type:
    | 'fixed'
    | 'percentage'
  contribution_value: number
  is_active: boolean
}

export default function CampaignProductContributionManager({
  products,
}: {
  products: ProductRow[]
}) {
  const router = useRouter()

  const [selected, setSelected] =
    useState<string[]>(
      products.map(product => product.id)
    )

  const [bulkType, setBulkType] =
    useState<'fixed' | 'percentage'>(
      'fixed'
    )

  const [bulkValue, setBulkValue] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      ProductRow[]
    >()

    for (const product of products) {
      const key =
        product.shopify_product_id ||
        product.title

      const group =
        map.get(key) || []

      group.push(product)
      map.set(key, group)
    }

    return Array.from(map.values())
  }, [products])

  function toggleOne(id: string) {
    setSelected(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    )
  }

  function toggleAll() {
    setSelected(current =>
      current.length === products.length
        ? []
        : products.map(product => product.id)
    )
  }

  async function saveContribution(
    ids: string[],
    type:
      | 'fixed'
      | 'percentage',
    value: number
  ) {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        '/api/campaign-products/update',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            ids,
            contributionType: type,
            contributionValue: value,
          }),
        }
      )

      const raw = await response.text()

      let data: any

      try {
        data = JSON.parse(raw)
      } catch {
        data = {
          error:
            raw ||
            `Request failed with status ${response.status}`,
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to update contribution'
        )
      }

      setMessage(
        `✓ Updated ${data.updated} variant${data.updated === 1 ? '' : 's'}.`
      )

      router.refresh()
    } catch (error: any) {
      setMessage(
        `Error: ${
          error?.message ||
          'Unable to save contribution'
        }`
      )
    } finally {
      setSaving(false)
    }
  }

  async function applyBulk() {
    const value = Number(bulkValue)

    if (!selected.length) {
      setMessage(
        'Error: Select at least one variant.'
      )
      return
    }

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      setMessage(
        'Error: Enter a valid contribution amount.'
      )
      return
    }

    await saveContribution(
      selected,
      bulkType,
      value
    )
  }

  return (
    <div className="contribution-manager">

      <section className="shopify-panel">

        <div className="shopify-panel-header">
          <div className="shopify-eyebrow">
            CONTRIBUTION RULES
          </div>

          <h2>
            Fundraiser contribution
          </h2>

          <p>
            Set how much of each sale is
            credited to this campaign.
          </p>
        </div>

        <div className="bulk-rule-row">

          <label>
            <span>
              Contribution type
            </span>

            <select
              value={bulkType}
              onChange={event =>
                setBulkType(
                  event.target.value as
                    | 'fixed'
                    | 'percentage'
                )
              }
            >
              <option value="fixed">
                Fixed dollar amount
              </option>

              <option value="percentage">
                Percentage of sale
              </option>
            </select>
          </label>

          <label>
            <span>
              {bulkType === 'fixed'
                ? 'Amount per item'
                : 'Percentage'}
            </span>

            <div className="money-input">
              <span>
                {bulkType === 'fixed'
                  ? '$'
                  : '%'}
              </span>

              <input
                type="number"
                min="0"
                max={
                  bulkType ===
                  'percentage'
                    ? '100'
                    : undefined
                }
                step="0.01"
                value={bulkValue}
                onChange={event =>
                  setBulkValue(
                    event.target.value
                  )
                }
                placeholder={
                  bulkType === 'fixed'
                    ? '5.00'
                    : '15'
                }
              />
            </div>
          </label>

          <div className="bulk-action">
            <span>
              {selected.length} selected
            </span>

            <button
              className="primary-button"
              disabled={
                saving ||
                !selected.length
              }
              onClick={applyBulk}
            >
              {saving
                ? 'Saving…'
                : 'Apply to Selected'}
            </button>
          </div>

        </div>

        {message && (
          <div
            className={
              message.startsWith('Error:')
                ? 'shopify-message error'
                : 'shopify-message success'
            }
          >
            {message}
          </div>
        )}

      </section>

      <section className="shopify-panel">

        <div className="product-list-toolbar">

          <div>
            <div className="shopify-eyebrow">
              CAMPAIGN PRODUCTS
            </div>

            <h2>
              {grouped.length} products ·{' '}
              {products.length} variants
            </h2>
          </div>

          <button
            className="secondary-button"
            onClick={toggleAll}
          >
            {selected.length ===
            products.length
              ? 'Clear Selection'
              : 'Select All'}
          </button>

        </div>

        <div className="campaign-product-groups">

          {grouped.map(group => {
            const main = group[0]

            return (
              <div
                className="campaign-product-group"
                key={
                  main.shopify_product_id ||
                  main.title
                }
              >

                <div className="campaign-product-header">

                  {main.image_url ? (
                    <img
                      src={main.image_url}
                      alt=""
                    />
                  ) : (
                    <div className="product-image-placeholder">
                      IMG
                    </div>
                  )}

                  <div>
                    <strong>
                      {main.title}
                    </strong>

                    <span>
                      {group.length}{' '}
                      variant
                      {group.length === 1
                        ? ''
                        : 's'}
                    </span>
                  </div>

                </div>

                <div className="variant-table-wrap">

                  <table className="shopify-table">

                    <thead>
                      <tr>
                        <th></th>
                        <th>Variant</th>
                        <th>SKU</th>
                        <th>Retail</th>
                        <th>Contribution</th>
                      </tr>
                    </thead>

                    <tbody>

                      {group.map(product => (
                        <tr key={product.id}>

                          <td>
                            <input
                              type="checkbox"
                              checked={selected.includes(
                                product.id
                              )}
                              onChange={() =>
                                toggleOne(
                                  product.id
                                )
                              }
                            />
                          </td>

                          <td>
                            {product.variant_title ||
                              'Default'}
                          </td>

                          <td className="mono">
                            {product.sku || '—'}
                          </td>

                          <td>
                            $
                            {Number(
                              product.retail_price ||
                                0
                            ).toFixed(2)}
                          </td>

                          <td>
                            <strong>
                              {product.contribution_type ===
                              'percentage'
                                ? `${Number(
                                    product.contribution_value
                                  ).toFixed(
                                    2
                                  )}%`
                                : `$${Number(
                                    product.contribution_value
                                  ).toFixed(
                                    2
                                  )}`}
                            </strong>
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </div>
            )
          })}

        </div>

      </section>

    </div>
  )
}