import './globals.css'
import './light-overrides.css'
export const metadata={title:'Fundraiser Command',description:'Fundraising and agency commerce command center',manifest:'/manifest.webmanifest',icons:{icon:'/brand/fundraiser-command-icon.svg',apple:'/brand/fundraiser-command-icon.svg'},appleWebApp:{capable:true,title:'Fundraiser Command',statusBarStyle:'black-translucent' as const}}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
