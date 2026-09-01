"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const nav = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/organizations", label: "Departments" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/shopify", label: "Shopify" },
  { href: "/dashboard/launch-check", label: "Launch Check" },
]

export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="fc-app">
      <aside className="fc-app-sidebar">
        <Link href="/dashboard" className="fc-app-brand">
          <span className="fc-app-brand-mark">FC</span>
          <span className="fc-app-brand-copy">
            <strong>Fundraising Command</strong>
            <small>Operations Portal</small>
          </span>
        </Link>

        <nav className="fc-app-nav">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="fc-app-sidebar-footer">
          <Link href="/fundraisers" target="_blank">Public Fundraisers ↗</Link>
          <Link href="/apply" target="_blank">Public Application ↗</Link>
        </div>
      </aside>

      <main className="fc-app-main">
        <div className="fc-app-mobile-brand">
          <span className="fc-app-brand-mark">FC</span>
          <strong>Fundraising Command</strong>
        </div>
        <div className="fc-app-content">{children}</div>
      </main>
    </div>
  )
}