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

  /**
   * Security headers.
   *
   * The CSP is deliberately not locked down to nonces: Next's App Router
   * inlines hydration payloads and Razorpay injects its own checkout frame,
   * so a strict policy would need a nonce plumbed through every render and
   * would break the payment modal. This is the useful middle ground — it
   * stops arbitrary third-party script origins and framing of the site,
   * without pretending to be a defence this app cannot yet support.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // Razorpay's checkout script and Next's inlined hydration data.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase, Razorpay and the image CDN.
      "connect-src 'self' https: wss:",
      // The Razorpay payment modal renders in an iframe.
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
