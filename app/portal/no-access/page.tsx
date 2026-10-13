import CollectionSwitcher from '@/components/portal/CollectionSwitcher'
export default function NoCollectionAccess(){return <main style={{maxWidth:680,margin:'60px auto',padding:24}}><h1>No collections assigned</h1><p>Contact your administrator to authorize collection access.</p><CollectionSwitcher/><a href="/login">Return to sign in</a></main>}
