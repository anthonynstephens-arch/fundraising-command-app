import { LegalLinks } from '@/components/legal/LegalLinks'
import './legal.css'
import './globals.css'
import './light-overrides.css'
import './storefront.css'
import './audit-fixes.css'
import './onboarding.css'
import './dmd.css'
import './dmd-store.css'
import './macac-portal.css'
import './plymouth.css'
import './payout-engine.css'
export const metadata={title:'Fundraiser Command',description:'Fundraising and agency commerce command center',manifest:'/manifest.webmanifest',icons:{icon:'/brand/fundraiser-command-icon.svg',apple:'/apple-icon'},appleWebApp:{capable:true,title:'Fundraiser Command',statusBarStyle:'black-translucent' as const}}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<footer className="fc-legal-footer"><span>Fundraiser Command · Detroit Decal &amp; Apparel, LLC</span><LegalLinks /></footer></body></html>}
