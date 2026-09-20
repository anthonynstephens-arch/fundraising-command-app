import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fundraiser Command',
    short_name: 'Fundraiser',
    description: 'Live campaign sales, goals, progress, and payout management.',
    start_url: '/portal',
    id: '/portal',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#071b30',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }
}
