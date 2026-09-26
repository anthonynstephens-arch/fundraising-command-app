import LegalDocument from '@/components/legal/LegalDocument'
import { terms } from '@/lib/legal/policies'
export const metadata = { title: 'Terms of Service | Fundraiser Command', description: 'Terms for Fundraiser Command accounts, campaigns, merchandise orders and payouts.', alternates: { canonical: 'https://fundraisercommand.com/terms' } }
export default function TermsPage() { return <LegalDocument title="Terms of Service" content={terms} /> }
