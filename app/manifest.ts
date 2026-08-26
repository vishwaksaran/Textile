import type { MetadataRoute } from 'next';
import { STORE } from '@/lib/config';

/**
 * Web manifest, so the store installs to a home screen with the brand emblem
 * rather than a screenshot of the page. Icons come from `npm run icons`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STORE.name,
    short_name: STORE.name,
    description: STORE.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8f0',
    theme_color: '#4A0404',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
