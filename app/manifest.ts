import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fundraiser Command',
    short_name: 'Fundraiser',
    description: 'Live campaign sales, goals, progress, and payout management.',
    start_url: '/portal',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#071b30',
    icons: [{ src: '/brand/fundraiser-command-icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
