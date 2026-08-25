/** @type {import('next').NextConfig} */

/**
 * Hostname of the Supabase project, so uploaded images pass next/image's
 * allow-list.
 *
 * Parsed defensively: this runs while Next loads its config, so a value
 * pasted without a scheme ("xyz.supabase.co") would otherwise throw
 * ERR_INVALID_URL and fail the whole build with no useful message. A missing
 * or malformed value just means Supabase-hosted images are not allow-listed,
 * which is a far better failure than no deploy at all.
 */
function readSupabaseHost() {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).hostname;
  } catch {
    console.warn(
      `[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${JSON.stringify(raw)} — ` +
        'Supabase image hosting will not be allow-listed.',
    );
    return null;
  }
}

const supabaseHost = readSupabaseHost();

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
