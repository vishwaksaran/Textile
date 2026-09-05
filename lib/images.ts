/**
 * Google's usercontent CDN serves a small default rendition (512px wide)
 * unless the URL carries a size suffix — which is why an unsuffixed URL looks
 * soft once it is stretched into a 3:4 card or a full-bleed hero. Asking for
 * a large width returns the native original, capped by the CDN.
 *
 * Anything not on that CDN (Supabase Storage uploads, for instance) is
 * returned untouched.
 */
const SIZEABLE_HOST = /^https:\/\/lh3\.googleusercontent\.com\//;
const ALREADY_SIZED = /=[a-z]+\d+(-[a-z]+)*$/i;

/** Requested width. The CDN clamps this to the image's true resolution. */
export const IMAGE_REQUEST_WIDTH = 2048;

export function upgradeImageUrl<T extends string | null | undefined>(url: T): T {
  if (!url || !SIZEABLE_HOST.test(url) || ALREADY_SIZED.test(url)) return url;
  return `${url}=w${IMAGE_REQUEST_WIDTH}-rw` as T;
}

export function upgradeImageUrls(urls: string[] | null | undefined): string[] {
  if (!urls) return [];
  return urls.map((url) => upgradeImageUrl(url));
}

/**
 * A small rendition, for an email.
 *
 * The storefront asks for 2048px because it stretches art into a hero. An
 * inbox is showing a 64px thumbnail beside a line of text, and a mail client
 * downloads whatever it is given — a full-resolution saree photograph per
 * line, on a phone, over mobile data, to be drawn at the size of a postage
 * stamp.
 *
 * Twice the drawn size, so it stays sharp on a retina screen.
 */
export function emailThumbUrl<T extends string | null | undefined>(url: T): T {
  if (!url || !SIZEABLE_HOST.test(url)) return url;
  /*
    Replaces a size already on the URL rather than leaving it alone.
    Everywhere else an existing suffix is the shop's own choice and is
    respected; here honouring it would mean posting a 2048px saree down a
    phone line to be drawn at 48.
  */
  return `${url.replace(ALREADY_SIZED, '')}=w160-rw` as T;
}
