import LegalDocument from '@/components/legal/LegalDocument'
import { privacy } from '@/lib/legal/policies'
export const metadata = { title: 'Privacy Policy | Fundraiser Command', description: 'How Fundraiser Command collects, uses and protects personal information, and how to contact us about privacy.', alternates: { canonical: 'https://fundraisercommand.com/privacy' } }
export default function PrivacyPage() { return <LegalDocument title="Privacy Policy" content={privacy} /> }
